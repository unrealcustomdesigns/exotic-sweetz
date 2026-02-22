import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { RegisterBarcodeForm } from './RegisterBarcodeForm';
import { Prisma } from '@prisma/client';

export default async function ProductDetailPage({
  params,
}: {
  params: { productId: string };
}) {
  const user = await getAuthUser();
  const isManager = user.role === 'MANAGER';

  const product = await prisma.product.findUnique({
    where: { id: params.productId },
    include: {
      pricing: true,
      barcodes: { orderBy: { unitType: 'asc' } },
    },
  });

  if (!product) notFound();

  // On-hand inventory for this product across all locations
  const inventory = await prisma.$queryRaw<
    { location_name: string; location_type: string; unit_type: string; on_hand: number }[]
  >(
    Prisma.sql`
      SELECT
        l.name AS location_name,
        l.location_type,
        m.unit_type,
        SUM(CASE WHEN m.to_location_id = l.id THEN m.quantity ELSE 0 END)
        - SUM(CASE WHEN m.from_location_id = l.id THEN m.quantity ELSE 0 END) AS on_hand
      FROM movements m
      JOIN locations l ON l.id IN (m.from_location_id, m.to_location_id)
      WHERE m.product_id = ${params.productId}::uuid
        AND m.reversed_by_id IS NULL
        AND m.is_reversal = false
      GROUP BY l.id, l.name, l.location_type, m.unit_type
      HAVING SUM(CASE WHEN m.to_location_id = l.id THEN m.quantity ELSE 0 END)
           - SUM(CASE WHEN m.from_location_id = l.id THEN m.quantity ELSE 0 END) != 0
      ORDER BY l.location_type, l.name, m.unit_type
    `
  );

  // Recent movements
  const recentMovements = await prisma.movement.findMany({
    where: { productId: params.productId, reversedById: null, isReversal: false },
    orderBy: { performedAt: 'desc' },
    take: 15,
    include: { fromLocation: true, toLocation: true },
  });

  const costPerPack = product.pricing
    ? Number(product.pricing.costPerBox) / product.packsPerBox
    : null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Link href="/products" className="text-gray-400 hover:text-gray-600">←</Link>
        <h1 className="page-header mb-0">
          {product.name}
          {product.variant && <span className="font-normal text-gray-500"> — {product.variant}</span>}
        </h1>
      </div>
      <p className="text-xs text-gray-400 mb-4">SKU: {product.sku} · {product.packsPerBox} packs/box</p>

      {/* Pricing card */}
      {product.pricing && (
        <div className="card mb-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2">Pricing</h2>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <div className="text-gray-500">Cost / box</div>
            <div className="font-medium text-right">${Number(product.pricing.costPerBox).toFixed(2)}</div>
            <div className="text-gray-500">Cost / pack</div>
            <div className="font-medium text-right">${costPerPack?.toFixed(2)}</div>
            <div className="text-gray-500">Retail / pack</div>
            <div className="font-medium text-right text-brand-600">${Number(product.pricing.retailPricePerPack).toFixed(2)}</div>
            <div className="text-gray-500">Retail / box</div>
            <div className="font-medium text-right text-brand-600">${Number(product.pricing.retailPricePerBox).toFixed(2)}</div>
            <div className="text-gray-500">Wholesale / box</div>
            <div className="font-medium text-right">${Number(product.pricing.wholesalePricePerBox).toFixed(2)}</div>
          </div>
        </div>
      )}

      {/* Inventory */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Current Inventory</h2>
        {inventory.length === 0 ? (
          <div className="card text-center py-4 text-gray-400 text-sm">No inventory on record</div>
        ) : (
          <div className="card">
            <div className="space-y-2">
              {inventory.map((row, i) => (
                <div key={i} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="text-sm font-medium">{row.location_name}</div>
                    <div className="text-[10px] text-gray-400">{row.location_type}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold">{Number(row.on_hand)}</span>
                    <span className="text-xs text-gray-400 ml-1">{row.unit_type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Barcodes */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Barcodes</h2>
        <div className="card">
          {product.barcodes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-2">No barcodes registered</p>
          ) : (
            <div className="space-y-2">
              {product.barcodes.map((bc) => (
                <div key={bc.id} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                  <div>
                    <code className="text-sm font-mono">{bc.barcodeValue}</code>
                    {bc.label && <span className="text-xs text-gray-400 ml-2">{bc.label}</span>}
                  </div>
                  <div className="flex gap-1">
                    <span className="inline-flex items-center rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">
                      {bc.unitType}
                    </span>
                    <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                      {bc.barcodeFormat}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isManager && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <RegisterBarcodeForm productId={product.id} />
            </div>
          )}
        </div>
      </div>

      {/* Recent movements */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent Activity</h2>
        <div className="card">
          {recentMovements.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No activity yet</p>
          ) : (
            <div className="space-y-2">
              {recentMovements.map((mov) => (
                <div key={mov.id} className="py-1.5 border-b border-gray-50 last:border-0">
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium">{formatAction(mov.action)}</div>
                    <div className="text-sm font-bold">
                      {mov.quantity} {mov.unitType}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {mov.fromLocation && `${mov.fromLocation.name} →`}{' '}
                    {mov.toLocation && mov.toLocation.name}
                    {' · '}
                    {new Date(mov.performedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatAction(action: string): string {
  const map: Record<string, string> = {
    RECEIVE: '📦 Received',
    PUT_ON_SHELF: '📥 Put on Shelf',
    TAKE_OFF_SHELF: '📤 Took off Shelf',
    DELIVER_TO_STORE: '🚚 Delivered',
    RETURN_FROM_STORE: '↩️ Returned',
    CONVERT_BOX_TO_PACKS: '🔄 Converted',
    SALE_RETAIL_PACK: '💰 Sold (pack)',
    SALE_RETAIL_BOX: '💰 Sold (box)',
    ADJUSTMENT: '⚙️ Adjustment',
  };
  return map[action] || action;
}
