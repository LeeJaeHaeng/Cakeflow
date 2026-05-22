-- Capacity hardening for real store operation.
-- The API keeps its user-friendly pre-check, but this trigger is the final
-- concurrency-safe guard when multiple customers submit the same pickup date.

DROP TRIGGER IF EXISTS trg_increment_capacity ON orders;
DROP FUNCTION IF EXISTS increment_capacity();

CREATE OR REPLACE FUNCTION order_counts_for_capacity(p_status order_status)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN p_status::TEXT NOT IN ('cancelled', 'refunded');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION sync_shop_capacity_for_date(p_date DATE)
RETURNS VOID AS $$
DECLARE
  actual_count INT;
BEGIN
  IF p_date IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO shop_capacity (date, current_count)
  VALUES (p_date, 0)
  ON CONFLICT (date) DO NOTHING;

  SELECT COUNT(*)::INT
    INTO actual_count
  FROM orders
  WHERE pickup_date = p_date
    AND order_counts_for_capacity(status);

  UPDATE shop_capacity
  SET current_count = actual_count
  WHERE date = p_date;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION assert_order_capacity_available()
RETURNS TRIGGER AS $$
DECLARE
  target_capacity shop_capacity%ROWTYPE;
  default_max_orders INT := 8;
  actual_count INT;
  should_check BOOLEAN := FALSE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    should_check := order_counts_for_capacity(NEW.status);
  ELSIF TG_OP = 'UPDATE' THEN
    should_check :=
      order_counts_for_capacity(NEW.status)
      AND (
        NOT order_counts_for_capacity(OLD.status)
        OR OLD.pickup_date IS DISTINCT FROM NEW.pickup_date
      );
  END IF;

  IF NOT should_check THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(value->>'max_orders', '')::INT, 8)
    INTO default_max_orders
  FROM shop_settings
  WHERE key = 'daily_capacity';

  IF default_max_orders IS NULL OR default_max_orders <= 0 THEN
    default_max_orders := 8;
  END IF;

  INSERT INTO shop_capacity (date, max_orders, current_count)
  VALUES (NEW.pickup_date, default_max_orders, 0)
  ON CONFLICT (date) DO NOTHING;

  SELECT *
    INTO target_capacity
  FROM shop_capacity
  WHERE date = NEW.pickup_date
  FOR UPDATE;

  IF target_capacity.is_holiday THEN
    RAISE EXCEPTION 'SHOP_CAPACITY_HOLIDAY' USING ERRCODE = 'P0001';
  END IF;

  SELECT COUNT(*)::INT
    INTO actual_count
  FROM orders
  WHERE pickup_date = NEW.pickup_date
    AND order_counts_for_capacity(status);

  UPDATE shop_capacity
  SET current_count = actual_count
  WHERE date = NEW.pickup_date;

  IF actual_count >= target_capacity.max_orders THEN
    RAISE EXCEPTION 'SHOP_CAPACITY_FULL' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_order_capacity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM sync_shop_capacity_for_date(NEW.pickup_date);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.pickup_date IS DISTINCT FROM NEW.pickup_date
       OR OLD.status IS DISTINCT FROM NEW.status THEN
      PERFORM sync_shop_capacity_for_date(OLD.pickup_date);
      PERFORM sync_shop_capacity_for_date(NEW.pickup_date);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM sync_shop_capacity_for_date(OLD.pickup_date);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assert_order_capacity ON orders;
CREATE TRIGGER trg_assert_order_capacity
  BEFORE INSERT OR UPDATE OF pickup_date, status ON orders
  FOR EACH ROW EXECUTE FUNCTION assert_order_capacity_available();

DROP TRIGGER IF EXISTS trg_sync_order_capacity ON orders;
CREATE TRIGGER trg_sync_order_capacity
  AFTER INSERT OR UPDATE OF pickup_date, status OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION sync_order_capacity();

DO $$
DECLARE
  capacity_date DATE;
BEGIN
  FOR capacity_date IN SELECT DISTINCT pickup_date FROM orders LOOP
    PERFORM sync_shop_capacity_for_date(capacity_date);
  END LOOP;
END;
$$;
