import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const PAYPAL_BASE   = Deno.env.get('PAYPAL_ENV') === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';
const CLIENT_ID     = Deno.env.get('PAYPAL_CLIENT_ID')!;
const CLIENT_SECRET = Deno.env.get('PAYPAL_CLIENT_SECRET')!;
const WEBHOOK_ID    = Deno.env.get('PAYPAL_WEBHOOK_ID')!;

const sbAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Map PayPal plan IDs → plan names
const PLAN_TO_PLAN: Record<string, string> = {};
const planStarter = Deno.env.get('PAYPAL_PLAN_ID_STARTER');
const planPro     = Deno.env.get('PAYPAL_PLAN_ID_PRO');
if (planStarter) PLAN_TO_PLAN[planStarter] = 'starter';
if (planPro)     PLAN_TO_PLAN[planPro]     = 'pro';

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

async function verifyWebhook(req: Request, body: string): Promise<boolean> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_algo:         req.headers.get('paypal-auth-algo'),
        cert_url:          req.headers.get('paypal-cert-url'),
        transmission_id:   req.headers.get('paypal-transmission-id'),
        transmission_sig:  req.headers.get('paypal-transmission-sig'),
        transmission_time: req.headers.get('paypal-transmission-time'),
        webhook_id:        WEBHOOK_ID,
        webhook_event:     JSON.parse(body),
      }),
    });
    const result = await res.json();
    return result.verification_status === 'SUCCESS';
  } catch (e) {
    console.error('Webhook verification error:', e);
    return false;
  }
}

Deno.serve(async (req) => {
  const body = await req.text();

  const valid = await verifyWebhook(req, body);
  if (!valid) {
    console.error('Invalid PayPal webhook signature');
    return new Response('Invalid webhook signature', { status: 400 });
  }

  const event    = JSON.parse(body);
  const resource = event.resource;

  try {
    switch (event.event_type) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED': {
        const storeId = resource.custom_id;
        const plan    = PLAN_TO_PLAN[resource.plan_id] || 'starter';
        if (storeId) {
          await sbAdmin.from('stores').update({
            plan,
            paypal_subscription_id: resource.id,
          }).eq('id', storeId);
        }
        break;
      }

      case 'BILLING.SUBSCRIPTION.UPDATED': {
        const storeId = resource.custom_id;
        const plan    = PLAN_TO_PLAN[resource.plan_id] || 'free';
        if (storeId) {
          await sbAdmin.from('stores').update({ plan }).eq('id', storeId);
        }
        break;
      }

      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.EXPIRED':
      case 'BILLING.SUBSCRIPTION.SUSPENDED': {
        const storeId = resource.custom_id;
        if (storeId) {
          await sbAdmin.from('stores').update({
            plan: 'free',
            paypal_subscription_id: null,
          }).eq('id', storeId);
        }
        break;
      }
    }
  } catch (e) {
    console.error('Event handler error:', e);
    return new Response('Handler error', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
