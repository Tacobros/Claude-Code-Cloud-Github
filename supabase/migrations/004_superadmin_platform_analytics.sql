-- RPC: superadmin_get_platform_analytics
-- Returns platform-wide analytics for the superadmin dashboard.
-- Requires is_superadmin() = true (SECURITY DEFINER bypasses RLS).

CREATE OR REPLACE FUNCTION superadmin_get_platform_analytics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  is_admin boolean;
BEGIN
  SELECT is_superadmin() INTO is_admin;
  IF NOT is_admin THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT json_build_object(

    -- Total event counts for the last 30 days
    'totals', (
      SELECT json_build_object(
        'catalog_views',    COALESCE(SUM(CASE WHEN event_type = 'catalog_view'    THEN 1 ELSE 0 END), 0),
        'whatsapp_clicks',  COALESCE(SUM(CASE WHEN event_type = 'whatsapp_click'  THEN 1 ELSE 0 END), 0),
        'product_views',    COALESCE(SUM(CASE WHEN event_type = 'product_view'    THEN 1 ELSE 0 END), 0)
      )
      FROM store_events
      WHERE created_at >= NOW() - INTERVAL '30 days'
    ),

    -- Daily catalog views for the last 7 days
    'daily_views', (
      SELECT COALESCE(json_agg(row ORDER BY day), '[]'::json)
      FROM (
        SELECT
          TO_CHAR(DATE_TRUNC('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
          COUNT(*) FILTER (WHERE event_type = 'catalog_view')   AS views,
          COUNT(*) FILTER (WHERE event_type = 'whatsapp_click') AS wa_clicks
        FROM store_events
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE_TRUNC('day', created_at AT TIME ZONE 'UTC')
      ) row
    ),

    -- Store count per plan
    'plan_distribution', (
      SELECT COALESCE(json_agg(row ORDER BY count DESC), '[]'::json)
      FROM (
        SELECT plan, COUNT(*) AS count
        FROM stores
        GROUP BY plan
      ) row
    ),

    -- Top 10 stores by total events in the last 30 days
    'top_stores', (
      SELECT COALESCE(json_agg(row ORDER BY event_count DESC), '[]'::json)
      FROM (
        SELECT
          s.name,
          s.slug,
          s.plan,
          COUNT(se.id) AS event_count,
          COUNT(se.id) FILTER (WHERE se.event_type = 'catalog_view') AS views
        FROM stores s
        LEFT JOIN store_events se
          ON se.store_id = s.id
          AND se.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY s.id, s.name, s.slug, s.plan
        ORDER BY event_count DESC
        LIMIT 10
      ) row
    ),

    -- New store registrations grouped by week (last 4 weeks)
    'weekly_registrations', (
      SELECT COALESCE(json_agg(row ORDER BY week), '[]'::json)
      FROM (
        SELECT
          TO_CHAR(DATE_TRUNC('week', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS week,
          COUNT(*) AS new_stores
        FROM stores
        WHERE created_at >= NOW() - INTERVAL '28 days'
        GROUP BY DATE_TRUNC('week', created_at AT TIME ZONE 'UTC')
      ) row
    )

  ) INTO result;

  RETURN result;
END;
$$;
