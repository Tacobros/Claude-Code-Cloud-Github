// Cloudflare Pages Function — sends email when a store is suspended/activated
// Requires RESEND_API_KEY environment variable in Cloudflare Pages settings

const SUPABASE_URL  = 'https://vowsvdzjyvpalyvkfxte.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvd3N2ZHpqeXZwYWx5dmtmeHRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NTAyNDUsImV4cCI6MjA5NDAyNjI0NX0.xXOy_369lK8tVHBOjGircCJ6d1RkJTc4eA7UJpd3sEw';

// Verifica que quien llama es un superadmin autenticado (via RPC is_superadmin)
async function isSuperadmin(authHeader, env) {
  if (!authHeader) return false;
  try {
    const res = await fetch(`${env.SUPABASE_URL || SUPABASE_URL}/rest/v1/rpc/is_superadmin`, {
      method: 'POST',
      headers: {
        'apikey': env.SUPABASE_ANON_KEY || SUPABASE_ANON,
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    if (!res.ok) return false;
    return (await res.json()) === true;
  } catch {
    return false;
  }
}

export async function onRequestPost({ request, env }) {
  // Solo un superadmin autenticado puede disparar estos correos
  const authorized = await isSuperadmin(request.headers.get('Authorization'), env);
  if (!authorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  }

  const { owner_email, store_name, new_status } = await request.json();

  if (!owner_email || !store_name || !new_status) {
    return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });
  }

  const RESEND_API_KEY = env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), { status: 500 });
  }

  const isSuspended = new_status === 'suspended';

  const subject = isSuspended
    ? `Tu tienda "${store_name}" ha sido suspendida`
    : `Tu tienda "${store_name}" ha sido reactivada`;

  const body = isSuspended
    ? `<p>Hola,</p>
       <p>Tu catálogo <strong>${store_name}</strong> ha sido <strong>suspendido</strong> por el equipo de ProductSpot.</p>
       <p>Si crees que esto es un error, contáctanos respondiendo este correo o por WhatsApp desde <a href="https://productspot-5dc.pages.dev/landing.html">nuestra página</a>.</p>
       <p>— El equipo de ProductSpot</p>`
    : `<p>Hola,</p>
       <p>Tu catálogo <strong>${store_name}</strong> ha sido <strong>reactivado</strong>. Ya está disponible para tus clientes.</p>
       <p>— El equipo de ProductSpot</p>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'ProductSpot <onboarding@resend.dev>',
      to: [owner_email],
      subject,
      html: body,
    }),
  });

  const result = await res.json();
  return new Response(JSON.stringify(result), {
    status: res.ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json' },
  });
}
