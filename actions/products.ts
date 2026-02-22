'use server';

import { prisma } from '@/lib/db';
import { requireManager, requireStaffOrAbove } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { UnitType } from '@prisma/client';

// ──────────────────────────────────────────
// BARCODE LOOKUP — used by scan flow
// ──────────────────────────────────────────

export async function lookupBarcode(barcodeValue: string) {
  const barcode = await prisma.barcode.findUnique({
    where: { barcodeValue },
    include: {
      product: {
        include: { pricing: true },
      },
    },
  });

  if (!barcode) return null;

  return {
    barcodeId: barcode.id,
    barcodeValue: barcode.barcodeValue,
    unitType: barcode.unitType,
    product: {
      id: barcode.product.id,
      name: barcode.product.name,
      variant: barcode.product.variant,
      sku: barcode.product.sku,
      packsPerBox: barcode.product.packsPerBox,
    },
    pricing: barcode.product.pricing
      ? {
          retailPricePerPack: Number(barcode.product.pricing.retailPricePerPack),
          retailPricePerBox: Number(barcode.product.pricing.retailPricePerBox),
          wholesalePricePerBox: Number(barcode.product.pricing.wholesalePricePerBox),
          costPerBox: Number(barcode.product.pricing.costPerBox),
        }
      : null,
  };
}

// ──────────────────────────────────────────
// CREATE PRODUCT — Manager only
// ──────────────────────────────────────────

export async function createProduct(formData: FormData) {
  await requireManager();

  const name = formData.get('name') as string;
  const variant = formData.get('variant') as string | null;
  const sku = formData.get('sku') as string;
  const packsPerBox = parseInt(formData.get('packsPerBox') as string, 10);
  const notes = formData.get('notes') as string | null;

  // Pricing
  const costPerBox = parseFloat(formData.get('costPerBox') as string);
  const retailPricePerPack = parseFloat(formData.get('retailPricePerPack') as string);
  const retailPricePerBox = parseFloat(formData.get('retailPricePerBox') as string);
  const wholesalePricePerBox = parseFloat(formData.get('wholesalePricePerBox') as string);

  if (!name || !sku || !packsPerBox) throw new Error('Missing required fields');

  const product = await prisma.product.create({
    data: {
      name,
      variant: variant || undefined,
      sku,
      packsPerBox,
      notes: notes || undefined,
      pricing: !isNaN(costPerBox)
        ? {
            create: {
              costPerBox,
              retailPricePerPack: retailPricePerPack || 0,
              retailPricePerBox: retailPricePerBox || 0,
              wholesalePricePerBox: wholesalePricePerBox || 0,
            },
          }
        : undefined,
    },
  });

  revalidatePath('/products');
  return { success: true, productId: product.id };
}

// ──────────────────────────────────────────
// REGISTER BARCODE — Manager only
// ──────────────────────────────────────────

export async function registerBarcode(formData: FormData) {
  await requireManager();

  const productId = formData.get('productId') as string;
  const barcodeValue = formData.get('barcodeValue') as string;
  const unitType = formData.get('unitType') as UnitType;
  const barcodeFormat = (formData.get('barcodeFormat') as string) || 'UPC_A';
  const label = formData.get('label') as string | null;

  if (!productId || !barcodeValue || !unitType) throw new Error('Missing required fields');

  // Check not already registered
  const existing = await prisma.barcode.findUnique({ where: { barcodeValue } });
  if (existing) throw new Error('This barcode is already registered');

  const barcode = await prisma.barcode.create({
    data: {
      productId,
      barcodeValue,
      unitType,
      barcodeFormat,
      label: label || undefined,
    },
  });

  revalidatePath('/products');
  return { success: true, barcodeId: barcode.id };
}

// ──────────────────────────────────────────
// DEACTIVATE PRODUCT — Manager only (soft delete)
// ──────────────────────────────────────────

export async function deactivateProduct(productId: string) {
  await requireManager();

  if (!productId) throw new Error('Product ID required');

  await prisma.product.update({
    where: { id: productId },
    data: { isActive: false },
  });

  revalidatePath('/products');
  return { success: true };
}

// ──────────────────────────────────────────
// REACTIVATE PRODUCT — Manager only
// ──────────────────────────────────────────

export async function reactivateProduct(productId: string) {
  await requireManager();

  if (!productId) throw new Error('Product ID required');

  await prisma.product.update({
    where: { id: productId },
    data: { isActive: true },
  });

  revalidatePath('/products');
  return { success: true };
}

// ──────────────────────────────────────────
// GET LOCATIONS — for dropdowns
// ──────────────────────────────────────────

export async function getLocationsByType(types?: string[]) {
  const where = types
    ? { isActive: true, locationType: { in: types as any } }
    : { isActive: true };

  return prisma.location.findMany({
    where,
    orderBy: [{ locationType: 'asc' }, { name: 'asc' }],
    include: { store: true },
  });
}
