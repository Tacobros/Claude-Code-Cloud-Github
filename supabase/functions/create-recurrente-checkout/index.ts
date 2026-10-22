// Crea un checkout de suscripción en Recurrente para el usuario autenticado.
// El checkout lleva metadata { ps_user_id, plan }, con la que el webhook
// activa el plan exacto sin depender del correo con el que se pague.
//
// RECURRENTE_SECRET_KEY decide el ambiente (sk_test_* = sandbox, sk_live_* =
// producción). Se configura en los secretos del proyecto.
import { createClient } from "npm:@supabase/supabase-js@2";

const RECURRENTE_KEY = Deno.env.get("RECURRENTE_SECRET_KEY") || "";

const PLANS: Record<string, { name: string; amount: number }> = {
  starter: { name: "ProductSpot Starter (mensual)", amount: 4000 },
  pro: { name: "ProductSpot Pro (mensual)", amount: 8000 },
};

const SITE = "https://productspot.pages.dev";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  if (!RECURRENTE_KEY) return json({ error: "pagos no configurados" }, 500);

  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } },
  );
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return json({ error: "no autenticado" }, 401);

  let plan = "";
  try { plan = String((await req.json())?.plan || ""); } catch (_) { /* body vacío */ }
  const p = PLANS[plan];
  if (!p) return json({ error: "plan inválido" }, 400);

  const res = await fetch("https://app.recurrente.com/api/checkouts", {
    method: "POST",
    headers: { "X-SECRET-KEY": RECURRENTE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{
        name: p.name,
        currency: "GTQ",
        amount_in_cents: p.amount,
        quantity: 1,
        charge_type: "recurring",
        billing_interval: "month",
        billing_interval_count: 1,
        tax_category: "service",
        phone_requirement: "none",
        address_requirement: "none",
        payment_method_types: ["card"],
      }],
      metadata: { app: "productspot", ps_user_id: user.id, plan },
      success_url: `${SITE}/admin.html?pago=exitoso`,
      cancel_url: `${SITE}/admin.html?pago=cancelado`,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.checkout_url) {
    console.error("recurrente error", res.status, JSON.stringify(data));
    return json({ error: "no se pudo crear el pago" }, 502);
  }
  return json({ url: data.checkout_url });
});
