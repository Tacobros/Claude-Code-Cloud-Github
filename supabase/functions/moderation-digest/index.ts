// Digest diario de moderación: envía por correo (Brevo API) los productos
// publicados en las últimas 24 horas en toda la plataforma, para revisión
// humana. Lo dispara pg_cron cada mañana; sin BREVO_API_KEY configurada,
// registra y sale sin error (queda la revisión manual en el superadmin).
import { createClient } from "npm:@supabase/supabase-js@2";

const DIGEST_KEY = Deno.env.get("MODERATION_DIGEST_KEY") || "__DIGEST_KEY__";
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY") || "";
const TO_EMAIL = "ljcerezo.contacto@gmail.com";
const FROM = { name: "ProductSpot Moderación", email: "productspotgt@gmail.com" };

const esc = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (!DIGEST_KEY || url.searchParams.get("k") !== DIGEST_KEY) {
    return new Response("unauthorized", { status: 401 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: prods, error } = await admin.from("products")
    .select("id, user_id, name, description, price, image_url, image_urls, available, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  if (!prods || prods.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: false, reason: "sin productos nuevos" }));
  }

  const { data: stores } = await admin.from("stores").select("user_id, name, slug");
  const byUser: Record<string, { name: string; slug: string }> = {};
  (stores || []).forEach((s: any) => { byUser[s.user_id] = s; });

  const rows = prods.map((p: any) => {
    const st = byUser[p.user_id] || { name: "?", slug: "" };
    const img = (p.image_urls && p.image_urls[0]) || p.image_url || "";
    return `<tr>
      <td style="padding:8px;">${img ? `<img src="${esc(img)}" width="56" height="56" style="object-fit:cover;border-radius:8px;" />` : "—"}</td>
      <td style="padding:8px;"><strong>${esc(p.name)}</strong> — Q${esc(p.price)}${p.available === false ? " <em>(oculto)</em>" : ""}<br/>
        <span style="color:#6b7280;font-size:12px;">${esc((p.description || "").slice(0, 110))}</span><br/>
        <a href="https://productspot.pages.dev/?s=${esc(st.slug)}&p=${p.id}" style="font-size:12px;color:#e94560;">Ver en ${esc(st.name)}</a></td>
    </tr>`;
  }).join("");

  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">
    <h2 style="color:#0f172a;">Moderación ProductSpot</h2>
    <p style="color:#5b6478;">${prods.length} producto(s) publicados en las últimas 24 horas:</p>
    <table style="width:100%;border-collapse:collapse;background:#f7f8fc;border-radius:12px;">${rows}</table>
    <p style="color:#9ca3af;font-size:12px;">Para actuar sobre una tienda: superadmin → Tiendas → Suspender.</p>
  </div>`;

  if (!BREVO_API_KEY) {
    console.log(`digest listo (${prods.length} productos) pero sin BREVO_API_KEY; no se envió`);
    return new Response(JSON.stringify({ ok: true, sent: false, reason: "sin BREVO_API_KEY", productos: prods.length }));
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": BREVO_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: FROM,
      to: [{ email: TO_EMAIL }],
      subject: `Moderación: ${prods.length} producto(s) nuevos en ProductSpot`,
      htmlContent: html,
    }),
  });
  const ok = res.ok;
  if (!ok) console.error("brevo error", res.status, await res.text());
  return new Response(JSON.stringify({ ok, sent: ok, productos: prods.length }), { status: ok ? 200 : 502 });
});
