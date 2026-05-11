import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const PAYPAL_BASE    = Deno.env.get('PAYPAL_ENV') === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';
const CLIENT_ID      = Deno.env.get('PAYPAL_CLIENT_ID')!;
const CLIENT_SECRET  = Deno.env.get('PAYPAL_CLIENT_SECRET')!;

const PLAN_IDS: Record<string, string> = {
  starter: Deno.env.get('PAYPAL_PLAN_ID_STARTER')!,
  pro:     Deno.env.get('PAYPAL_PLAN_ID_PRO')!,
};

async function getAccessToken(): Promise<string> {
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors() });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return fail('Unauthorized', 401);

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await sb.auth.getUser();
    if (authError || !user) return fail('Unauthorized', 401);

    const { type, plan } = await req.json();

    const sbAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: store } = await sbAdmin
      .from('stores')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!store) return fail('Store not found', 404);

    // PayPal no tiene portal propio — redirigir a la página de suscripciones de PayPal
    if (type === 'portal') {
      return ok({ url: 'https://www.paypal.com/myaccount/autopay/' });
    }

    if (type === 'checkout' && plan) {
      const planId = PLAN_IDS[plan];
      if (!planId) return fail('Invalid plan', 400);

      const origin = req.headers.get('origin') || 'https://productspot.com';
      const token  = await getAccessToken();

      const res = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions`, {
        method: 'POST',
        headers: {
          'Authorization':    `Bearer ${token}`,
          'Content-Type':     'application/json',
          'PayPal-Request-Id': crypto.randomUUID(),
        },
        body: JSON.stringify({
          plan_id:   planId,
          custom_id: String(store.id),
          subscriber: { email_address: user.email },
          application_context: {
            brand_name:          'ProductSpot',
            locale:              'es-GT',
            shipping_preference: 'NO_SHIPPING',
            user_action:         'SUBSCRIBE_NOW',
            return_url: `${origin}/admin.html?upgraded=1`,
            cancel_url: `${origin}/admin.html?page=plan`,
          },
        }),
      });

      const subscription = await res.json();
      const approvalUrl  = subscription.links?.find((l: { rel: string; href: string }) => l.rel === 'approve')?.href;

      if (!approvalUrl) {
        console.error('PayPal response:', JSON.stringify(subscription));
        return fail('No se pudo crear la suscripción en PayPal', 500);
      }

      return ok({ url: approvalUrl });
    }

    return fail('Invalid request type', 400);
  } catch (e) {
    console.error(e);
    return fail(String(e), 500);
  }
});

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { ...cors(), 'Content-Type': 'application/json' },
  });
}

function fail(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...cors(), 'Content-Type': 'application/json' },
  });
}
