// Cloudflare Pages Function — verifies Cloudflare Turnstile token server-side
// Requires TURNSTILE_SECRET_KEY environment variable in Cloudflare Pages settings

export async function onRequestPost({ request, env }) {
  const { token } = await request.json();

  if (!token) {
    return new Response(JSON.stringify({ success: false, error: 'Missing token' }), { status: 400 });
  }

  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // If secret not configured, allow through (dev mode)
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  const formData = new FormData();
  formData.append('secret', secret);
  formData.append('response', token);

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData,
  });

  const result = await res.json();
  return new Response(JSON.stringify({ success: result.success }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
