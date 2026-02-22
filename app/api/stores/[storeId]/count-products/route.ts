import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  const store = await prisma.store.findUnique({
    where: { id: params.storeId },
  });

  if (!store) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  // Find all products that have been delivered to this store
  const deliveredProducts = await prisma.movement.findMany({
    where: {
      storeId: store.id,
      action: 'DELIVER_TO_STORE',
      reversedById: null,
      isReversal: false,
    },
    select: { productId: true },
    distinct: ['productId'],
  });

  const productIds = deliveredProducts.map((d) => d.productId);

  if (productIds.length === 0) {
    return NextResponse.json({ storeName: store.name, products: [] });
  }

  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    orderBy: { name: 'asc' },
  });

  // Enrich with last count + deliveries since last count
  const enriched = await Promise.all(
    products.map(async (product) => {
      // Last count
      const lastCount = await prisma.storeCount.findFirst({
        where: { storeId: store.id, productId: product.id },
        orderBy: { countDate: 'desc' },
      });

      // Deliveries since last count
      const deliveriesSince = await prisma.movement.aggregate({
        where: {
          storeId: store.id,
          productId: product.id,
          action: 'DELIVER_TO_STORE',
          unitType: 'BOX',
          reversedById: null,
          isReversal: false,
          ...(lastCount ? { performedAt: { gt: lastCount.countDate } } : {}),
        },
        _sum: { quantity: true },
      });

      return {
        id: product.id,
        name: product.name,
        variant: product.variant,
        lastRemaining: lastCount?.boxesRemaining ?? null,
        deliveredSince: deliveriesSince._sum.quantity ?? 0,
      };
    })
  );

  return NextResponse.json({ storeName: store.name, products: enriched });
}
