export const dynamic = 'force-dynamic';
import { getFullInventory } from '@/lib/inventory';
import { prisma } from '@/lib/db';
import Link from 'next/link';

export default async function InventoryDashboard() {
  const inventory = await getFullInventory();

  // Group by product
  const byProduct = new Map<string, typeof inventory>();
  for (const row of inventory) {
    const key = `${row.product_id}`;
    const arr = byProduct.get(key) || [];
    arr.push(row);
    byProduct.set(key, arr);
  }

  // Compute total valuation
  const pricingMap = new Map<string, { costPerBox: number; packsPerBox: number }>();
  const products = await prisma.product.findMany({
    include: { pricing: true },
  });
  for (const p of products) {
    if (p.pricing) {
      pricingMap.set(p.id, {
        costPerBox: Number(p.pricing.costPerBox),
        packsPerBox: p.packsPerBox,
      });
    }
  }

  let totalCostValue = 0;
  for (const row of inventory) {
    const pricing = pricingMap.get(row.product_id);
    if (!pricing) continue;
    if (row.unit_type === 'BOX') {
      totalCostValue += row.on_hand * pricing.costPerBox;
    } else {
      totalCostValue += row.on_hand * (pricing.costPerBox / pricing.packsPerBox);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">←</Link>
        <h1 className="page-header mb-0">📦 Full Inventory</h1>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Total value at cost: <span className="font-bold text-gray-900">${totalCostValue.toFixed(2)}</span>
      </p>

      {Array.from(byProduct.entries()).map(([productId, rows]) => {
        const first = rows[0];
        return (
          <div key={productId} className="card mb-3">
            <div className="font-bold text-sm mb-2">
              {first.product_name}
              {first.variant && <span className="font-normal text-gray-500"> — {first.variant}</span>}
              <span className="text-xs text-gray-400 ml-2">{first.sku}</span>
            </div>
            <div className="space-y-1">
              {rows.map((row, i) => (
                <div key={i} className="flex justify-between items-center text-sm py-1 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      row.location_type === 'STORAGE' ? 'bg-blue-100 text-blue-700' :
                      row.location_type === 'SHELF' ? 'bg-green-100 text-green-700' :
                      row.location_type === 'TRUCK' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {row.location_type}
                    </span>
                    <span className="text-gray-600">{row.location_name}</span>
                  </div>
                  <div>
                    <span className={`font-bold ${row.on_hand < 0 ? 'text-red-600' : ''}`}>
                      {row.on_hand}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">{row.unit_type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {byProduct.size === 0 && (
        <div className="card text-center py-8 text-gray-400">
          No inventory recorded yet. Start by receiving products.
        </div>
      )}
    </div>
  );
}

