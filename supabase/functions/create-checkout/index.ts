import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
});

const PRICE_IDS: Record<string, string> = {
  starter: Deno.env.get('STRIPE_PRICE_STARTER')!,
  pro:     Deno.env.get('STRIPE_PRICE_PRO')!,
};

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
      .select('id, stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (!store) return fail('Store not found', 404);

    let customerId = store.stripe_customer_id as string | null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { store_id: String(store.id), user_id: user.id },
      });
      customerId = customer.id;
      await sbAdmin
        .from('stores')
        .update({ stripe_customer_id: customerId })
        .eq('id', store.id);
    }

    const origin = req.headers.get('origin') || 'https://productspot.com';

    if (type === 'portal') {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${origin}/admin.html`,
      });
      return ok({ url: session.url });
    }

    if (type === 'checkout' && plan) {
      const priceId = PRICE_IDS[plan];
      if (!priceId) return fail('Invalid plan', 400);

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${origin}/admin.html?upgraded=1`,
        cancel_url:  `${origin}/admin.html?page=plan`,
        subscription_data: {
          metadata: { store_id: String(store.id), user_id: user.id },
        },
      });
      return ok({ url: session.url });
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
