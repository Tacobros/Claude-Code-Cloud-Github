// Webhook de Recurrente: aplica upgrades de plan cuando un pago de
// suscripción es exitoso y deja bitácora de todo evento en payment_events.
//
// Seguridad: Recurrente llama a la URL registrada, que incluye ?k=<secreto>.
// El secreto vive en la variable RECURRENTE_WEBHOOK_KEY del proyecto (o en la
// constante inyectada al desplegar); la URL solo la conoce Recurrente.
import { createClient } from "npm:@supabase/supabase-js@2";

// Producto de Recurrente → plan de ProductSpot
const PLAN_BY_PRODUCT: Record<string, string> = {
  prod_zi429bkx: "starter", // ProductSpot Starter Q40/mes
  prod_kwz9ltev: "pro", // ProductSpot Pro Q80/mes
};

const WEBHOOK_KEY = Deno.env.get("RECURRENTE_WEBHOOK_KEY") || "__WEBHOOK_KEY__";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  const url = new URL(req.url);
  if (!WEBHOOK_KEY || url.searchParams.get("k") !== WEBHOOK_KEY) {
    return new Response("unauthorized", { status: 401 });
  }

  let evt: unknown;
  try {
    evt = await req.json();
  } catch (_) {
    return new Response("bad request", { status: 400 });
  }
  const raw = JSON.stringify(evt);
  const e = evt as Record<string, any>;

  const type = String(e.event_type || e.type || "unknown");
  const email = String(
    e.customer?.email || e.checkout?.customer?.email || e.user_email ||
      e.email || e.data?.customer?.email || "",
  ).trim().toLowerCase();

  // Metadata del checkout creado por create-recurrente-checkout: identifica
  // al usuario y el plan sin depender del correo con el que pagó
  const meta = e.checkout?.metadata || e.metadata || e.data?.metadata || {};
  const psUserId = typeof meta.ps_user_id === "string" && meta.ps_user_id.length >= 32
    ? meta.ps_user_id
    : null;

  let plan: string | null = ["starter", "pro"].includes(meta.plan) ? meta.plan : null;
  if (!plan) {
    // El producto puede venir en distintas rutas según el evento; con los ids
    // conocidos basta con buscarlos en el payload completo
    for (const [pid, p] of Object.entries(PLAN_BY_PRODUCT)) {
      if (raw.includes(pid)) plan = p;
    }
  }

  const isSuccess = /succeeded|paid|completed/i.test(type);
  const isCancel = /cancel/i.test(type);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let result = "logged";
  try {
    if (isSuccess && plan && (psUserId || email)) {
      let uid: string | null = psUserId;
      if (!uid && email) {
        const { data } = await admin.rpc("get_user_id_by_email", { p_email: email });
        uid = data;
      }
      if (uid) {
        const { data: updated, error } = await admin.from("stores")
          .update({ plan, status: "active" })
          .eq("user_id", uid)
          .select("id");
        result = error
          ? `update_error: ${error.message}`
          : (updated && updated.length ? `plan_applied: ${plan}` : "no_store_match");
      } else {
        result = "no_user_match";
      }
    } else if (email && isCancel && plan) {
      // Cancelación: por ahora solo se registra; la baja a free se decide manualmente
      result = "cancellation_logged";
    }
  } catch (err) {
    result = `error: ${String(err)}`;
  }

  await admin.from("payment_events").insert({
    provider: "recurrente",
    event_type: type,
    email: email || null,
    plan,
    result,
    payload: evt,
  });

  return new Response(JSON.stringify({ ok: true, result }), {
    headers: { "Content-Type": "application/json" },
  });
});
