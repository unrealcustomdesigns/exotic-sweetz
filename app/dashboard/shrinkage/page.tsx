import { prisma } from '@/lib/db';
import { findNegativeInventory } from '@/lib/inventory';
import Link from 'next/link';
import { Prisma } from '@prisma/client';

export default async function ShrinkageDashboard() {
  // Negative inventory
  const negatives = await findNegativeInventory();

  // Reconciliation mismatches (from store counts vs ledger)
  const mismatches = await prisma.$queryRaw<
    {
      store_name: string;
      product_name: string;
      variant: string | null;
      expected: number;
      counted: number;
      discrepancy: number;
      count_date: Date;
    }[]
  >(
    Prisma.sql`
      WITH ledger_expected AS (
        SELECT
          m.product_id,
          m.store_id,
          SUM(CASE WHEN m.to_location_id = l.id THEN m.quantity ELSE 0 END)
          - SUM(CASE WHEN m.from_location_id = l.id THEN m.quantity ELSE 0 END) AS expected
        FROM movements m
        JOIN locations l ON l.id IN (m.from_location_id, m.to_location_id)
        WHERE l.location_type = 'STORE'
          AND m.unit_type = 'BOX'
          AND m.reversed_by_id IS NULL AND m.is_reversal = false
        GROUP BY m.product_id, m.store_id
      ),
      latest_counts AS (
        SELECT DISTINCT ON (store_id, product_id)
          store_id, product_id, boxes_remaining, count_date
        FROM store_counts
        ORDER BY store_id, product_id, count_date DESC
      )
      SELECT
        s.name AS store_name,
        p.name AS product_name,
        p.variant,
        le.expected::int AS expected,
        lc.boxes_remaining AS counted,
        (le.expected - lc.boxes_remaining)::int AS discrepancy,
        lc.count_date
      FROM ledger_expected le
      JOIN latest_counts lc ON lc.product_id = le.product_id AND lc.store_id = le.store_id
      JOIN stores s ON s.id = le.store_id
      JOIN products p ON p.id = le.product_id
      WHERE le.expected != lc.boxes_remaining
      ORDER BY ABS(le.expected - lc.boxes_remaining) DESC
    `
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">←</Link>
        <h1 className="page-header mb-0">🔍 Shrinkage Report</h1>
      </div>

      {/* Negative inventory */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Negative Inventory ({negatives.length})
      </h2>
      {negatives.length === 0 ? (
        <div className="card text-center py-4 text-green-600 text-sm mb-6">
          ✅ No negative inventory detected
        </div>
      ) : (
        <div className="space-y-2 mb-6">
          {negatives.map((neg, i) => (
            <div key={i} className="card border-red-200 bg-red-50">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-bold text-red-700">{neg.product_name}</div>
                  <div className="text-xs text-red-500">{neg.location_name}</div>
                </div>
                <div className="text-lg font-bold text-red-600">{Number(neg.on_hand)} {neg.unit_type}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Store discrepancies */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Store Count Discrepancies ({mismatches.length})
      </h2>
      {mismatches.length === 0 ? (
        <div className="card text-center py-4 text-green-600 text-sm">
          ✅ All store counts match ledger
        </div>
      ) : (
        <div className="space-y-2">
          {mismatches.map((m, i) => (
            <div key={i} className={`card ${Number(m.discrepancy) > 0 ? 'border-yellow-200' : 'border-red-200'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm font-medium">
                    {m.product_name} {m.variant && `(${m.variant})`}
                  </div>
                  <div className="text-xs text-gray-500">{m.store_name}</div>
                  <div className="text-xs text-gray-400">
                    Counted: {new Date(m.count_date).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">Expected: {Number(m.expected)}</div>
                  <div className="text-xs text-gray-400">Counted: {Number(m.counted)}</div>
                  <div className={`text-sm font-bold ${Number(m.discrepancy) > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {Number(m.discrepancy) > 0 ? '+' : ''}{Number(m.discrepancy)} box{Math.abs(Number(m.discrepancy)) !== 1 ? 'es' : ''}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
