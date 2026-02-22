import { prisma } from './db';
import { Decimal } from '@prisma/client/runtime/library';

export async function getProductPricing(productId: string) {
  const pricing = await prisma.productPricing.findUnique({
    where: { productId },
    include: { product: true },
  });

  if (!pricing) return null;

  const costPerPack = pricing.costPerBox.div(pricing.product.packsPerBox);

  return {
    costPerBox: pricing.costPerBox,
    costPerPack,
    retailPricePerPack: pricing.retailPricePerPack,
    retailPricePerBox: pricing.retailPricePerBox,
    wholesalePricePerBox: pricing.wholesalePricePerBox,
    marginPerPack: pricing.retailPricePerPack.sub(costPerPack),
    marginPerBox: pricing.retailPricePerBox.sub(pricing.costPerBox),
  };
}

export async function getWholesalePrice(
  productId: string,
  storeId: string
): Promise<Decimal> {
  // Check for store-specific override first
  const override = await prisma.storePriceOverride.findUnique({
    where: { storeId_productId: { storeId, productId } },
  });

  if (override) return override.wholesalePricePerBox;

  // Fall back to default wholesale price
  const pricing = await prisma.productPricing.findUnique({
    where: { productId },
  });

  if (!pricing) throw new Error(`No pricing found for product ${productId}`);

  return pricing.wholesalePricePerBox;
}
