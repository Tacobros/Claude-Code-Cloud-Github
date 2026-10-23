-- El plan Starter baja de 50 a 25 productos, alineado con lo publicado
-- en Recurrente, la landing y el panel.
CREATE OR REPLACE FUNCTION enforce_product_plan_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan    TEXT;
  v_count   INTEGER;
  v_limit   INTEGER;
BEGIN
  SELECT COALESCE(plan, 'free') INTO v_plan
  FROM stores
  WHERE user_id = NEW.user_id;

  v_limit := CASE v_plan
    WHEN 'pro'     THEN 2147483647  -- ilimitado en la práctica
    WHEN 'starter' THEN 25
    ELSE                5           -- free
  END;

  SELECT COUNT(*) INTO v_count
  FROM products
  WHERE user_id = NEW.user_id;

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'plan_limit_exceeded: Tu plan % permite un máximo de % productos.',
      v_plan, v_limit;
  END IF;

  RETURN NEW;
END;
$$;
