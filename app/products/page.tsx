export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import Link from 'next/link';

export default async function ProductsPage() {
  const user = await getAuthUser();
  const isManager = user.role === 'MANAGER';

  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: [{ name: 'asc' }, { variant: 'asc' }],
    include: {
      pricing: true,
      barcodes: true,
      _count: { select: { movements: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="page-header mb-0">🍬 Products</h1>
        {isManager && (
          <Link href="/products/new" className="btn-primary text-xs">
            + Add Product
          </Link>
        )}
      </div>

      {products.length === 0 ? (
        <div className="card text-center py-8 text-gray-400">
          No products yet. {isManager ? 'Create your first product.' : 'Ask a manager to add products.'}
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((product) => (
            <Link key={product.id} href={`/products/${product.id}`} className="block">
              <div className="card hover:border-brand-300 transition">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-gray-900">
                      {product.name}
                      {product.variant && (
                        <span className="font-normal text-gray-500"> — {product.variant}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      SKU: {product.sku} · {product.packsPerBox} packs/box
                    </div>
                    <div className="flex gap-1 mt-1.5">
                      {product.barcodes.map((bc) => (
                        <span
                          key={bc.id}
                          className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600"
                        >
                          {bc.unitType} {bc.barcodeFormat === 'QR_CODE' ? 'QR' : 'UPC'}
                        </span>
                      ))}
                      {product.barcodes.length === 0 && (
                        <span className="text-[10px] text-red-400">No barcodes</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {product.pricing ? (
                      <>
                        <div className="text-sm font-bold text-brand-600">
                          ${Number(product.pricing.retailPricePerPack).toFixed(2)}/pk
                        </div>
                        <div className="text-xs text-gray-400">
                          ${Number(product.pricing.retailPricePerBox).toFixed(2)}/box
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-red-400">No pricing</span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

