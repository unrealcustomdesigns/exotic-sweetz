import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const [products, vendors, allLocations, stores] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: [{ name: 'asc' }, { variant: 'asc' }],
      select: { id: true, name: true, variant: true, sku: true, packsPerBox: true },
    }),
    prisma.vendor.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.location.findMany({
      where: { isActive: true },
      orderBy: [{ locationType: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, locationType: true, storeId: true, store: { select: { id: true, name: true } } },
    }),
    prisma.store.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  return NextResponse.json({
    products,
    vendors,
    stores,
    allLocations,
    storageLocations: allLocations.filter((l) => l.locationType === 'STORAGE'),
    shelfLocations: allLocations.filter((l) => l.locationType === 'SHELF'),
    truckLocations: allLocations.filter((l) => l.locationType === 'TRUCK'),
    storeLocations: allLocations.filter((l) => l.locationType === 'STORE'),
  });
}
