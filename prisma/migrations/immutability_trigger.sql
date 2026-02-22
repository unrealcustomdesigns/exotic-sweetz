-- Apply AFTER prisma db push / migrate
-- This trigger prevents editing or deleting movements (append-only ledger)
-- Only exception: setting reversed_by_id on an existing row

CREATE OR REPLACE FUNCTION prevent_movement_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Movements cannot be deleted. Use reversal instead.';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Allow ONLY setting reversed_by_id (from NULL to a value)
    IF OLD.reversed_by_id IS NULL AND NEW.reversed_by_id IS NOT NULL THEN
      -- Check nothing else changed
      IF OLD.action = NEW.action
        AND OLD.product_id = NEW.product_id
        AND OLD.unit_type = NEW.unit_type
        AND OLD.quantity = NEW.quantity
        AND OLD.performed_by = NEW.performed_by
      THEN
        RETURN NEW; -- Allow this specific update
      END IF;
    END IF;

    RAISE EXCEPTION 'Movements are immutable. Only reversed_by_id can be set.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS movements_immutability ON movements;

CREATE TRIGGER movements_immutability
  BEFORE UPDATE OR DELETE ON movements
  FOR EACH ROW
  EXECUTE FUNCTION prevent_movement_mutation();

-- Materialized view for fast on-hand queries (optional optimization)
-- Refresh with: REFRESH MATERIALIZED VIEW CONCURRENTLY mv_inventory;

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_inventory AS
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
GROUP BY p.id, p.name, p.variant, p.sku, m.unit_type, l.id, l.name, l.location_type
HAVING SUM(CASE WHEN m.to_location_id = l.id THEN m.quantity ELSE 0 END)
     - SUM(CASE WHEN m.from_location_id = l.id THEN m.quantity ELSE 0 END) != 0;

CREATE UNIQUE INDEX IF NOT EXISTS mv_inventory_pk
  ON mv_inventory (product_id, unit_type, location_id);
