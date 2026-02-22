import { prisma } from './db';
import { UnitType, LocationType, Prisma } from '@prisma/client';

// ──────────────────────────────────────────
// On-hand at a specific location
// ──────────────────────────────────────────

export async function computeOnHand(
  productId: string,
  unitType: UnitType,
  locationId: string
): Promise<number> {
  const result = await prisma.$queryRaw<[{ on_hand: bigint }]>(
    Prisma.sql`
      SELECT
        COALESCE(SUM(CASE WHEN to_location_id = ${locationId}::uuid THEN quantity ELSE 0 END), 0)
        -
        COALESCE(SUM(CASE WHEN from_location_id = ${locationId}::uuid THEN quantity ELSE 0 END), 0)
        AS on_hand
      FROM movements
      WHERE product_id = ${productId}::uuid
        AND unit_type = ${unitType}::"UnitType"
        AND (to_location_id = ${locationId}::uuid OR from_location_id = ${locationId}::uuid)
        AND reversed_by_id IS NULL
        AND is_reversal = false
    `
  );
  return Number(result[0]?.on_hand ?? 0);
}

// ──────────────────────────────────────────
// Full inventory snapshot (all products × locations)
// ──────────────────────────────────────────

export type InventoryRow = {
  product_id: string;
  product_name: string;
  variant: string | null;
  sku: string;
  unit_type: UnitType;
  location_id: string;
  location_name: string;
  location_type: LocationType;
  on_hand: number;
};

export async function getFullInventory(): Promise<InventoryRow[]> {
  const rows = await prisma.$queryRaw<InventoryRow[]>(
    Prisma.sql`
      SELECT
        p.id AS product_id,
        p.name AS product_name,
        p.variant,
        p.sku,
        m.unit_type,
        l.id AS location_id,
        l.name AS location_name,
        l.location_type,
        SUM(CASE WHEN m.to_location_id = l.id THEN m.quantity ELSE 0 END)
        - SUM(CASE WHEN m.from_location_id = l.id THEN m.quantity ELSE 0 END) AS on_hand
      FROM movements m
      JOIN products p ON p.id = m.product_id
      JOIN locations l ON l.id IN (m.from_location_id, m.to_location_id)
      WHERE m.reversed_by_id IS NULL
        AND m.is_reversal = false
        AND l.is_active = true
      GROUP BY p.id, p.name, p.variant, p.sku, m.unit_type, l.id, l.name, l.location_type
      HAVING SUM(CASE WHEN m.to_location_id = l.id THEN m.quantity ELSE 0 END)
           - SUM(CASE WHEN m.from_location_id = l.id THEN m.quantity ELSE 0 END) != 0
      ORDER BY p.name, l.location_type, l.name
    `
  );

  return rows.map((r) => ({ ...r, on_hand: Number(r.on_hand) }));
}

// ──────────────────────────────────────────
// Inventory totals by location type
// ──────────────────────────────────────────

export type InventorySummaryRow = {
  product_id: string;
  product_name: string;
  variant: string | null;
  unit_type: UnitType;
  location_type: LocationType;
  total_on_hand: number;
};

export async function getInventoryByLocationType(): Promise<InventorySummaryRow[]> {
  const rows = await prisma.$queryRaw<InventorySummaryRow[]>(
    Prisma.sql`
      SELECT
        p.id AS product_id,
        p.name AS product_name,
        p.variant,
        m.unit_type,
        l.location_type,
        SUM(CASE WHEN m.to_location_id = l.id THEN m.quantity ELSE 0 END)
        - SUM(CASE WHEN m.from_location_id = l.id THEN m.quantity ELSE 0 END) AS total_on_hand
      FROM movements m
      JOIN products p ON p.id = m.product_id
      JOIN locations l ON l.id IN (m.from_location_id, m.to_location_id)
      WHERE m.reversed_by_id IS NULL
        AND m.is_reversal = false
      GROUP BY p.id, p.name, p.variant, m.unit_type, l.location_type
      HAVING SUM(CASE WHEN m.to_location_id = l.id THEN m.quantity ELSE 0 END)
           - SUM(CASE WHEN m.from_location_id = l.id THEN m.quantity ELSE 0 END) != 0
      ORDER BY p.name, l.location_type
    `
  );

  return rows.map((r) => ({ ...r, total_on_hand: Number(r.total_on_hand) }));
}

// ──────────────────────────────────────────
// Negative inventory detection
// ──────────────────────────────────────────

export type NegativeInventoryRow = {
  product_id: string;
  product_name: string;
  unit_type: UnitType;
  location_id: string;
  location_name: string;
  on_hand: number;
};

export async function findNegativeInventory(): Promise<NegativeInventoryRow[]> {
  const rows = await prisma.$queryRaw<NegativeInventoryRow[]>(
    Prisma.sql`
      SELECT
        p.id AS product_id,
        p.name AS product_name,
        m.unit_type,
        l.id AS location_id,
        l.name AS location_name,
        SUM(CASE WHEN m.to_location_id = l.id THEN m.quantity ELSE 0 END)
        - SUM(CASE WHEN m.from_location_id = l.id THEN m.quantity ELSE 0 END) AS on_hand
      FROM movements m
      JOIN products p ON p.id = m.product_id
      JOIN locations l ON l.id IN (m.from_location_id, m.to_location_id)
      WHERE m.reversed_by_id IS NULL AND m.is_reversal = false
      GROUP BY p.id, p.name, m.unit_type, l.id, l.name
      HAVING SUM(CASE WHEN m.to_location_id = l.id THEN m.quantity ELSE 0 END)
           - SUM(CASE WHEN m.from_location_id = l.id THEN m.quantity ELSE 0 END) < 0
    `
  );

  return rows.map((r) => ({ ...r, on_hand: Number(r.on_hand) }));
}
