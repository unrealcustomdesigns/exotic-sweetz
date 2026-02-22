'use server';

import { prisma } from '@/lib/db';
import { requireStaffOrAbove, requireManager } from '@/lib/auth';
import { getWholesalePrice } from '@/lib/pricing';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';

// ──────────────────────────────────────────
// STORE COUNT — Friday physical count
// ──────────────────────────────────────────

type CountEntry = {
  productId: string;
  boxesRemaining: number;
};

export async function submitStoreCount(
  storeId: string,
  countDate: string,
  entries: CountEntry[]
) {
  const user = await requireStaffOrAbove();

  const results = [];

  for (const entry of entries) {
    // Get previous count for this store + product
    const prevCount = await prisma.storeCount.findFirst({
      where: { storeId, productId: entry.productId, countDate: { lt: new Date(countDate) } },
      orderBy: { countDate: 'desc' },
    });

    const prevRemaining = prevCount?.boxesRemaining ?? 0;
    const prevDate = prevCount?.countDate ?? new Date('2000-01-01');

    // Get deliveries between prev count and now
    const deliveries = await prisma.movement.aggregate({
      where: {
        action: 'DELIVER_TO_STORE',
        storeId,
        productId: entry.productId,
        unitType: 'BOX',
        performedAt: { gt: prevDate, lte: new Date(countDate + 'T23:59:59Z') },
        reversedById: null,
        isReversal: false,
      },
      _sum: { quantity: true },
    });

    const returns = await prisma.movement.aggregate({
      where: {
        action: 'RETURN_FROM_STORE',
        storeId,
        productId: entry.productId,
        unitType: 'BOX',
        performedAt: { gt: prevDate, lte: new Date(countDate + 'T23:59:59Z') },
        reversedById: null,
        isReversal: false,
      },
      _sum: { quantity: true },
    });

    const deliveredBetween = deliveries._sum.quantity ?? 0;
    const returnedBetween = returns._sum.quantity ?? 0;

    const expectedMax = prevRemaining + deliveredBetween - returnedBetween;
    const boxesSold = expectedMax - entry.boxesRemaining;

    // Get wholesale price
    const price = await getWholesalePrice(entry.productId, storeId);
    const amountOwed = boxesSold > 0 ? boxesSold * Number(price) : 0;

    // Flag anomalies
    if (entry.boxesRemaining > expectedMax) {
      await prisma.alert.create({
        data: {
          alertType: 'RECONCILIATION_MISMATCH',
          severity: 'CRITICAL',
          title: `Count exceeds expected: ${entry.boxesRemaining} counted, max ${expectedMax}`,
          description: `Store count shows more boxes than ledger expects. Possible unlogged delivery.`,
          productId: entry.productId,
          storeId,
        },
      });
    }

    if (boxesSold < 0) {
      await prisma.alert.create({
        data: {
          alertType: 'SHRINKAGE_DETECTED',
          severity: 'CRITICAL',
          title: `Negative sales detected: ${boxesSold} boxes`,
          description: `Expected max ${expectedMax} but counted ${entry.boxesRemaining}. Prev: ${prevRemaining}, delivered: ${deliveredBetween}, returned: ${returnedBetween}`,
          productId: entry.productId,
          storeId,
        },
      });
    }

    // Save count
    const count = await prisma.storeCount.create({
      data: {
        storeId,
        productId: entry.productId,
        countDate: new Date(countDate),
        boxesRemaining: entry.boxesRemaining,
        countedBy: user.userId,
      },
    });

    results.push({
      productId: entry.productId,
      boxesSold,
      amountOwed,
      hasAnomaly: entry.boxesRemaining > expectedMax || boxesSold < 0,
    });
  }

  revalidatePath(`/stores/${storeId}`);
  return { success: true, results };
}

// ──────────────────────────────────────────
// RECORD PAYMENT
// ──────────────────────────────────────────

export async function recordPayment(formData: FormData) {
  const user = await requireStaffOrAbove();

  const storeId = formData.get('storeId') as string;
  const amount = parseFloat(formData.get('amount') as string);
  const paymentDate = formData.get('paymentDate') as string;
  const paymentMethod = formData.get('paymentMethod') as string | null;
  const notes = formData.get('notes') as string | null;

  if (!storeId || isNaN(amount) || amount <= 0 || !paymentDate) {
    throw new Error('Missing required fields');
  }

  const payment = await prisma.storePayment.create({
    data: {
      storeId,
      amount,
      paymentDate: new Date(paymentDate),
      paymentMethod: paymentMethod || undefined,
      collectedBy: user.userId,
      notes: notes || undefined,
    },
  });

  revalidatePath(`/stores/${storeId}`);
  return { success: true, paymentId: payment.id };
}

// ──────────────────────────────────────────
// STORE BALANCE — computed from counts + payments
// ──────────────────────────────────────────

export async function getStoreBalance(storeId: string) {
  // Get all store counts and compute total owed per product
  const counts = await prisma.storeCount.findMany({
    where: { storeId },
    orderBy: [{ productId: 'asc' }, { countDate: 'asc' }],
    include: { product: { include: { pricing: true } } },
  });

  let totalOwed = 0;

  // Group counts by product, compute sold per period
  const byProduct = new Map<string, typeof counts>();
  for (const c of counts) {
    const arr = byProduct.get(c.productId) || [];
    arr.push(c);
    byProduct.set(c.productId, arr);
  }

  for (const [productId, productCounts] of byProduct) {
    const price = await getWholesalePrice(productId, storeId);

    for (let i = 0; i < productCounts.length; i++) {
      const current = productCounts[i];
      const prevRemaining = i > 0 ? productCounts[i - 1].boxesRemaining : 0;
      const prevDate = i > 0 ? productCounts[i - 1].countDate : new Date('2000-01-01');

      // Deliveries between counts
      const deliveries = await prisma.movement.aggregate({
        where: {
          action: 'DELIVER_TO_STORE',
          storeId,
          productId,
          unitType: 'BOX',
          performedAt: { gt: prevDate, lte: current.countDate },
          reversedById: null,
          isReversal: false,
        },
        _sum: { quantity: true },
      });

      const returns = await prisma.movement.aggregate({
        where: {
          action: 'RETURN_FROM_STORE',
          storeId,
          productId,
          unitType: 'BOX',
          performedAt: { gt: prevDate, lte: current.countDate },
          reversedById: null,
          isReversal: false,
        },
        _sum: { quantity: true },
      });

      const delivered = deliveries._sum.quantity ?? 0;
      const returned = returns._sum.quantity ?? 0;
      const expected = prevRemaining + delivered - returned;
      const sold = Math.max(0, expected - current.boxesRemaining);

      totalOwed += sold * Number(price);
    }
  }

  // Total payments
  const payments = await prisma.storePayment.aggregate({
    where: { storeId },
    _sum: { amount: true },
  });

  const totalPaid = Number(payments._sum.amount ?? 0);

  return {
    totalOwed: Math.round(totalOwed * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    balance: Math.round((totalOwed - totalPaid) * 100) / 100,
  };
}
