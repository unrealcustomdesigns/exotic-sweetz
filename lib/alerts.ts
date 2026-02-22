import { prisma } from './db';
import { findNegativeInventory } from './inventory';
import { Prisma } from '@prisma/client';

const LOW_STOCK_THRESHOLD = 5; // boxes
const PAYMENT_OVERDUE_DAYS = 14;

/**
 * Run all daily alert checks. Call from cron job or Vercel cron.
 */
export async function runDailyAlertChecks() {
  const results = {
    negativeInventory: 0,
    lowStock: 0,
    overduePayments: 0,
  };

  // ── 1. Negative Inventory ──
  const negatives = await findNegativeInventory();
  for (const neg of negatives) {
    // Check if alert already exists (open)
    const existing = await prisma.alert.findFirst({
      where: {
        alertType: 'NEGATIVE_INVENTORY',
        productId: neg.product_id,
        locationId: neg.location_id,
        status: { in: ['OPEN', 'ACKNOWLEDGED'] },
      },
    });

    if (!existing) {
      await prisma.alert.create({
        data: {
          alertType: 'NEGATIVE_INVENTORY',
          severity: 'CRITICAL',
          title: `Negative inventory: ${neg.product_name} at ${neg.location_name}`,
          description: `On-hand is ${neg.on_hand} ${neg.unit_type}. Likely data entry error or unlogged movement.`,
          productId: neg.product_id,
          locationId: neg.location_id,
        },
      });
      results.negativeInventory++;
    }
  }

  // ── 2. Low Stock in Storage ──
  const lowStock = await prisma.$queryRaw<
    { product_id: string; product_name: string; location_id: string; location_name: string; on_hand: number }[]
  >(
    Prisma.sql`
      SELECT
        p.id AS product_id,
        p.name AS product_name,
        l.id AS location_id,
        l.name AS location_name,
        SUM(CASE WHEN m.to_location_id = l.id THEN m.quantity ELSE 0 END)
        - SUM(CASE WHEN m.from_location_id = l.id THEN m.quantity ELSE 0 END) AS on_hand
      FROM movements m
      JOIN products p ON p.id = m.product_id
      JOIN locations l ON l.id IN (m.from_location_id, m.to_location_id)
      WHERE m.reversed_by_id IS NULL
        AND m.is_reversal = false
        AND m.unit_type = 'BOX'
        AND l.location_type = 'STORAGE'
      GROUP BY p.id, p.name, l.id, l.name
      HAVING SUM(CASE WHEN m.to_location_id = l.id THEN m.quantity ELSE 0 END)
           - SUM(CASE WHEN m.from_location_id = l.id THEN m.quantity ELSE 0 END)
           BETWEEN 0 AND ${LOW_STOCK_THRESHOLD}
    `
  );

  for (const row of lowStock) {
    const existing = await prisma.alert.findFirst({
      where: {
        alertType: 'LOW_STOCK',
        productId: row.product_id,
        locationId: row.location_id,
        status: { in: ['OPEN', 'ACKNOWLEDGED'] },
      },
    });

    if (!existing) {
      await prisma.alert.create({
        data: {
          alertType: 'LOW_STOCK',
          severity: 'WARNING',
          title: `Low stock: ${row.product_name} — ${Number(row.on_hand)} boxes left`,
          description: `Only ${Number(row.on_hand)} boxes remaining at ${row.location_name}. Consider reordering.`,
          productId: row.product_id,
          locationId: row.location_id,
        },
      });
      results.lowStock++;
    }
  }

  // ── 3. Overdue Payments ──
  const stores = await prisma.store.findMany({
    where: { isActive: true },
    include: {
      storePayments: {
        orderBy: { paymentDate: 'desc' },
        take: 1,
      },
    },
  });

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - PAYMENT_OVERDUE_DAYS);

  for (const store of stores) {
    // Check if store has outstanding balance
    const deliveries = await prisma.movement.aggregate({
      where: {
        storeId: store.id,
        action: 'DELIVER_TO_STORE',
        reversedById: null,
        isReversal: false,
      },
      _count: true,
    });

    if (deliveries._count === 0) continue; // No deliveries = no debt

    const lastPayment = store.storePayments[0];
    const lastPaymentDate = lastPayment ? new Date(lastPayment.paymentDate) : null;

    const isOverdue = !lastPaymentDate || lastPaymentDate < cutoff;

    if (isOverdue) {
      const existing = await prisma.alert.findFirst({
        where: {
          alertType: 'PAYMENT_OVERDUE',
          storeId: store.id,
          status: { in: ['OPEN', 'ACKNOWLEDGED'] },
        },
      });

      if (!existing) {
        const daysSince = lastPaymentDate
          ? Math.floor((Date.now() - lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        await prisma.alert.create({
          data: {
            alertType: 'PAYMENT_OVERDUE',
            severity: 'WARNING',
            title: `Payment overdue: ${store.name}`,
            description: lastPaymentDate
              ? `Last payment was ${daysSince} days ago on ${lastPaymentDate.toLocaleDateString()}.`
              : `No payments on record for this store.`,
            storeId: store.id,
          },
        });
        results.overduePayments++;
      }
    }
  }

  return results;
}
