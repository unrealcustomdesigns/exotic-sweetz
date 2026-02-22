'use server';

import { prisma } from '@/lib/db';
import { requireStaffOrAbove, requireManager } from '@/lib/auth';
import { computeOnHand } from '@/lib/inventory';
import { getWholesalePrice } from '@/lib/pricing';
import { validateLocationTypes } from '@/lib/validation';
import { revalidatePath } from 'next/cache';

// ──────────────────────────────────────────
// RECEIVE — Vendor delivers boxes to storage
// ──────────────────────────────────────────

export async function receiveInventory(formData: FormData) {
  const user = await requireStaffOrAbove();

  const productId = formData.get('productId') as string;
  const quantity = parseInt(formData.get('quantity') as string, 10);
  const toLocationId = formData.get('toLocationId') as string;
  const vendorId = formData.get('vendorId') as string;
  const costPerBox = parseFloat(formData.get('costPerBox') as string);
  const notes = formData.get('notes') as string | null;
  const barcodeScanned = formData.get('barcodeScanned') as string | null;

  if (!productId || !quantity || !toLocationId || !vendorId || isNaN(costPerBox)) {
    throw new Error('Missing required fields');
  }
  if (quantity <= 0) throw new Error('Quantity must be > 0');

  // Validate destination is STORAGE
  const toLoc = await prisma.location.findUniqueOrThrow({ where: { id: toLocationId } });
  const check = validateLocationTypes('RECEIVE', null, toLoc.locationType);
  if (!check.valid) throw new Error(check.error);

  const movement = await prisma.movement.create({
    data: {
      action: 'RECEIVE',
      productId,
      unitType: 'BOX',
      quantity,
      toLocationId,
      vendorId,
      costSnapshot: costPerBox,
      performedBy: user.userId,
      notes: notes || undefined,
      barcodeScanned: barcodeScanned || undefined,
    },
  });

  revalidatePath('/');
  return { success: true, movementId: movement.id, quantity };
}

// ──────────────────────────────────────────
// CONVERT BOX → PACKS
// ──────────────────────────────────────────

export async function convertBoxToPacks(formData: FormData) {
  const user = await requireStaffOrAbove();

  const productId = formData.get('productId') as string;
  const boxQuantity = parseInt(formData.get('quantity') as string, 10);
  const locationId = formData.get('locationId') as string;
  const barcodeScanned = formData.get('barcodeScanned') as string | null;

  if (!productId || !boxQuantity || !locationId) throw new Error('Missing required fields');
  if (boxQuantity <= 0) throw new Error('Quantity must be > 0');

  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });

  // Check sufficient boxes on hand
  const onHand = await computeOnHand(productId, 'BOX', locationId);
  if (onHand < boxQuantity) {
    throw new Error(`Only ${onHand} boxes on hand. Cannot convert ${boxQuantity}.`);
  }

  const packsCreated = boxQuantity * product.packsPerBox;

  // Create linked pair in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Row A: boxes removed
    const boxMov = await tx.movement.create({
      data: {
        action: 'CONVERT_BOX_TO_PACKS',
        productId,
        unitType: 'BOX',
        quantity: boxQuantity,
        fromLocationId: locationId,
        performedBy: user.userId,
        barcodeScanned: barcodeScanned || undefined,
      },
    });

    // Row B: packs added
    const packMov = await tx.movement.create({
      data: {
        action: 'CONVERT_BOX_TO_PACKS',
        productId,
        unitType: 'PACK',
        quantity: packsCreated,
        toLocationId: locationId,
        linkedMovementId: boxMov.id,
        performedBy: user.userId,
      },
    });

    return { boxMovementId: boxMov.id, packMovementId: packMov.id, packsCreated };
  });

  revalidatePath('/');
  return { success: true, ...result };
}

// ──────────────────────────────────────────
// TRANSFER — Put on shelf, take off, deliver, return
// ──────────────────────────────────────────

export async function transferInventory(formData: FormData) {
  const user = await requireStaffOrAbove();

  const action = formData.get('action') as
    | 'PUT_ON_SHELF'
    | 'TAKE_OFF_SHELF'
    | 'DELIVER_TO_STORE'
    | 'RETURN_FROM_STORE';
  const productId = formData.get('productId') as string;
  const unitType = formData.get('unitType') as 'BOX' | 'PACK';
  const quantity = parseInt(formData.get('quantity') as string, 10);
  const fromLocationId = formData.get('fromLocationId') as string;
  const toLocationId = formData.get('toLocationId') as string;
  const storeId = (formData.get('storeId') as string) || undefined;
  const notes = formData.get('notes') as string | null;
  const barcodeScanned = formData.get('barcodeScanned') as string | null;

  if (!action || !productId || !unitType || !quantity || !fromLocationId || !toLocationId) {
    throw new Error('Missing required fields');
  }
  if (quantity <= 0) throw new Error('Quantity must be > 0');

  // Validate location types
  const [fromLoc, toLoc] = await Promise.all([
    prisma.location.findUniqueOrThrow({ where: { id: fromLocationId } }),
    prisma.location.findUniqueOrThrow({ where: { id: toLocationId } }),
  ]);

  const check = validateLocationTypes(action, fromLoc.locationType, toLoc.locationType);
  if (!check.valid) throw new Error(check.error);

  // Check sufficient inventory
  const onHand = await computeOnHand(productId, unitType, fromLocationId);
  if (onHand < quantity) {
    throw new Error(`Only ${onHand} ${unitType} on hand at ${fromLoc.name}. Need ${quantity}.`);
  }

  // Snapshot wholesale price for store deliveries
  let priceSnapshot: number | undefined;
  if (action === 'DELIVER_TO_STORE' && storeId) {
    const price = await getWholesalePrice(productId, storeId);
    priceSnapshot = Number(price);
  }

  const movement = await prisma.movement.create({
    data: {
      action,
      productId,
      unitType,
      quantity,
      fromLocationId,
      toLocationId,
      storeId,
      priceSnapshot,
      performedBy: user.userId,
      notes: notes || undefined,
      barcodeScanned: barcodeScanned || undefined,
    },
  });

  revalidatePath('/');
  return { success: true, movementId: movement.id };
}

// ──────────────────────────────────────────
// SELL — Retail pack or box sale
// ──────────────────────────────────────────

export async function recordSale(formData: FormData) {
  const user = await requireStaffOrAbove();

  const productId = formData.get('productId') as string;
  const unitType = formData.get('unitType') as 'BOX' | 'PACK';
  const quantity = parseInt(formData.get('quantity') as string, 10);
  const fromLocationId = formData.get('fromLocationId') as string;
  const pricePerUnit = parseFloat(formData.get('pricePerUnit') as string);
  const barcodeScanned = formData.get('barcodeScanned') as string | null;

  if (!productId || !unitType || !quantity || !fromLocationId || isNaN(pricePerUnit)) {
    throw new Error('Missing required fields');
  }

  // Check inventory
  const onHand = await computeOnHand(productId, unitType, fromLocationId);
  if (onHand < quantity) {
    throw new Error(`Only ${onHand} ${unitType} on hand. Cannot sell ${quantity}.`);
  }

  const action = unitType === 'PACK' ? 'SALE_RETAIL_PACK' : 'SALE_RETAIL_BOX';
  const totalPrice = pricePerUnit * quantity;

  const movement = await prisma.movement.create({
    data: {
      action: action as any,
      productId,
      unitType,
      quantity,
      fromLocationId,
      priceSnapshot: totalPrice,
      performedBy: user.userId,
      barcodeScanned: barcodeScanned || undefined,
    },
  });

  revalidatePath('/');
  return { success: true, movementId: movement.id, totalPrice };
}

// ──────────────────────────────────────────
// ADJUSTMENT — Manager only
// ──────────────────────────────────────────

export async function createAdjustment(formData: FormData) {
  const user = await requireManager();

  const productId = formData.get('productId') as string;
  const unitType = formData.get('unitType') as 'BOX' | 'PACK';
  const quantity = parseInt(formData.get('quantity') as string, 10);
  const direction = formData.get('direction') as 'ADD' | 'REMOVE';
  const locationId = formData.get('locationId') as string;
  const reason = formData.get('reason') as string;

  if (!productId || !unitType || !quantity || !direction || !locationId || !reason) {
    throw new Error('Missing required fields');
  }

  const movement = await prisma.movement.create({
    data: {
      action: 'ADJUSTMENT',
      productId,
      unitType,
      quantity,
      fromLocationId: direction === 'REMOVE' ? locationId : undefined,
      toLocationId: direction === 'ADD' ? locationId : undefined,
      adjustmentReason: reason,
      approvedBy: user.userId,
      performedBy: user.userId,
    },
  });

  revalidatePath('/');
  return { success: true, movementId: movement.id };
}

// ──────────────────────────────────────────
// REVERSE — Manager only, undo a movement
// ──────────────────────────────────────────

export async function reverseMovement(movementId: string, reason: string) {
  const user = await requireManager();

  const original = await prisma.movement.findUniqueOrThrow({ where: { id: movementId } });

  if (original.reversedById) throw new Error('Movement already reversed');
  if (original.isReversal) throw new Error('Cannot reverse a reversal');

  const result = await prisma.$transaction(async (tx) => {
    // Create reversal (swap from/to)
    const reversal = await tx.movement.create({
      data: {
        action: original.action,
        productId: original.productId,
        unitType: original.unitType,
        quantity: original.quantity,
        fromLocationId: original.toLocationId,
        toLocationId: original.fromLocationId,
        vendorId: original.vendorId,
        storeId: original.storeId,
        costSnapshot: original.costSnapshot,
        priceSnapshot: original.priceSnapshot,
        performedBy: user.userId,
        notes: `REVERSAL: ${reason}`,
        isReversal: true,
        reversesId: original.id,
      },
    });

    // Mark original as reversed (the only update we allow)
    await tx.$executeRawUnsafe(
      `UPDATE movements SET reversed_by_id = $1 WHERE id = $2`,
      reversal.id,
      original.id
    );

    return reversal;
  });

  revalidatePath('/');
  return { success: true, reversalId: result.id };
}
