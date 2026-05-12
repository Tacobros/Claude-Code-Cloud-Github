-- ============================================================
-- SERVER-SIDE PLAN ENFORCEMENT — ProductSpot
-- Run this in Supabase → SQL Editor (after 001_rls_policies.sql)
-- ============================================================

-- Product count limits per plan (must match admin.js PLAN_LIMITS)
-- free: 5 | starter: 50 | pro: unlimited

CREATE OR REPLACE FUNCTION enforce_product_plan_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_plan    TEXT;
  v_count   INTEGER;
  v_limit   INTEGER;
BEGIN
  -- Get the store plan for the user inserting the product
  SELECT COALESCE(plan, 'free') INTO v_plan
  FROM stores
  WHERE user_id = NEW.user_id;

  -- Map plan to product limit
  v_limit := CASE v_plan
    WHEN 'pro'     THEN 2147483647  -- effectively unlimited
    WHEN 'starter' THEN 50
    ELSE                5           -- free
  END;

  -- Count existing products for this user
  SELECT COUNT(*) INTO v_count
  FROM products
  WHERE user_id = NEW.user_id;

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'plan_limit_exceeded: Tu plan % permite un máximo de % productos.',
      v_plan, v_limit;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger — fires before every INSERT on products
DROP TRIGGER IF EXISTS check_product_plan_limit ON products;

CREATE TRIGGER check_product_plan_limit
  BEFORE INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION enforce_product_plan_limit();
