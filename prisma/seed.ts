import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Vendors ──
  const vendor1 = await prisma.vendor.create({
    data: {
      name: 'Sweet Imports Co.',
      contactName: 'Maria Chen',
      contactPhone: '555-0101',
      contactEmail: 'maria@sweetimports.com',
    },
  });

  const vendor2 = await prisma.vendor.create({
    data: {
      name: 'Tropical Treats Wholesale',
      contactName: 'James Rivera',
      contactPhone: '555-0202',
    },
  });

  console.log('  ✓ Vendors');

  // ── Products + Pricing ──
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: 'Mango Gummy',
        variant: 'Original',
        sku: 'MG-OG-001',
        packsPerBox: 24,
        pricing: {
          create: {
            costPerBox: 18.0,
            retailPricePerPack: 1.5,
            retailPricePerBox: 30.0,
            wholesalePricePerBox: 25.0,
          },
        },
      },
    }),
    prisma.product.create({
      data: {
        name: 'Mango Gummy',
        variant: 'Peach',
        sku: 'MG-PCH-001',
        packsPerBox: 24,
        pricing: {
          create: {
            costPerBox: 18.0,
            retailPricePerPack: 1.5,
            retailPricePerBox: 30.0,
            wholesalePricePerBox: 25.0,
          },
        },
      },
    }),
    prisma.product.create({
      data: {
        name: 'Mango Gummy',
        variant: 'Yellow Peach',
        sku: 'MG-YP-001',
        packsPerBox: 24,
        pricing: {
          create: {
            costPerBox: 20.0,
            retailPricePerPack: 1.75,
            retailPricePerBox: 35.0,
            wholesalePricePerBox: 28.0,
          },
        },
      },
    }),
    prisma.product.create({
      data: {
        name: 'Tamarind Candy',
        variant: 'Spicy',
        sku: 'TC-SP-001',
        packsPerBox: 30,
        pricing: {
          create: {
            costPerBox: 22.0,
            retailPricePerPack: 1.25,
            retailPricePerBox: 32.0,
            wholesalePricePerBox: 26.0,
          },
        },
      },
    }),
    prisma.product.create({
      data: {
        name: 'Lychee Jelly',
        sku: 'LJ-001',
        packsPerBox: 20,
        pricing: {
          create: {
            costPerBox: 24.0,
            retailPricePerPack: 2.0,
            retailPricePerBox: 35.0,
            wholesalePricePerBox: 30.0,
          },
        },
      },
    }),
  ]);

  console.log('  ✓ Products + Pricing');

  // ── Barcodes (sample UPCs) ──
  await Promise.all([
    // Mango Gummy Original — pack and box barcodes
    prisma.barcode.create({
      data: { productId: products[0].id, barcodeValue: '012345678901', unitType: 'PACK', barcodeFormat: 'UPC_A', label: 'Pack UPC' },
    }),
    prisma.barcode.create({
      data: { productId: products[0].id, barcodeValue: '012345678902', unitType: 'BOX', barcodeFormat: 'UPC_A', label: 'Box UPC' },
    }),
    // Mango Gummy Peach
    prisma.barcode.create({
      data: { productId: products[1].id, barcodeValue: '012345678903', unitType: 'PACK', barcodeFormat: 'UPC_A', label: 'Pack UPC' },
    }),
    prisma.barcode.create({
      data: { productId: products[1].id, barcodeValue: '012345678904', unitType: 'BOX', barcodeFormat: 'UPC_A', label: 'Box UPC' },
    }),
    // Internal QR for Yellow Peach
    prisma.barcode.create({
      data: { productId: products[2].id, barcodeValue: 'ESWEETZ:MG-YP-001:BOX', unitType: 'BOX', barcodeFormat: 'QR_CODE', label: 'Internal QR' },
    }),
    // Tamarind Candy
    prisma.barcode.create({
      data: { productId: products[3].id, barcodeValue: '012345678905', unitType: 'PACK', barcodeFormat: 'UPC_A', label: 'Pack UPC' },
    }),
    // Lychee Jelly
    prisma.barcode.create({
      data: { productId: products[4].id, barcodeValue: '012345678906', unitType: 'BOX', barcodeFormat: 'UPC_A', label: 'Box UPC' },
    }),
  ]);

  console.log('  ✓ Barcodes');

  // ── Stores ──
  const store1 = await prisma.store.create({
    data: {
      name: 'Kwik-E-Mart Downtown',
      contactName: 'Apu Nahasapeemapetilon',
      contactPhone: '555-0301',
      address: '123 Main St',
    },
  });

  const store2 = await prisma.store.create({
    data: {
      name: 'Corner Bodega Heights',
      contactName: 'Rosa Martinez',
      contactPhone: '555-0302',
      address: '456 Heights Ave',
    },
  });

  const store3 = await prisma.store.create({
    data: {
      name: 'Sunny Mini Mart',
      contactName: 'David Kim',
      contactPhone: '555-0303',
      address: '789 Sunny Blvd',
    },
  });

  console.log('  ✓ Stores');

  // ── Locations ──
  const mainStorage = await prisma.location.create({
    data: { name: 'Main Storage', locationType: 'STORAGE' },
  });

  await prisma.location.create({
    data: { name: 'Overflow Storage', locationType: 'STORAGE' },
  });

  await prisma.location.create({
    data: { name: 'Shelf A-1', locationType: 'SHELF', parentId: mainStorage.id },
  });

  await prisma.location.create({
    data: { name: 'Shelf A-2', locationType: 'SHELF', parentId: mainStorage.id },
  });

  await prisma.location.create({
    data: { name: 'Shelf B-1', locationType: 'SHELF', parentId: mainStorage.id },
  });

  await prisma.location.create({
    data: { name: 'Delivery Truck', locationType: 'TRUCK' },
  });

  // Store locations (linked to stores)
  await prisma.location.create({
    data: { name: 'Store: Kwik-E-Mart', locationType: 'STORE', storeId: store1.id },
  });

  await prisma.location.create({
    data: { name: 'Store: Corner Bodega', locationType: 'STORE', storeId: store2.id },
  });

  await prisma.location.create({
    data: { name: 'Store: Sunny Mini Mart', locationType: 'STORE', storeId: store3.id },
  });

  console.log('  ✓ Locations');

  // ── Store Price Overrides (Sunny gets a discount) ──
  await prisma.storePriceOverride.create({
    data: {
      storeId: store3.id,
      productId: products[0].id,
      wholesalePricePerBox: 23.0,
    },
  });

  console.log('  ✓ Store price overrides');

  console.log('\n✅ Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
