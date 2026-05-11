import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

const sbAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Map Stripe price IDs → plan names
const PRICE_TO_PLAN: Record<string, string> = {};
const priceStarter = Deno.env.get('STRIPE_PRICE_STARTER');
const pricePro     = Deno.env.get('STRIPE_PRICE_PRO');
if (priceStarter) PRICE_TO_PLAN[priceStarter] = 'starter';
if (pricePro)     PRICE_TO_PLAN[pricePro]     = 'pro';

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (e) {
    console.error('Signature verification failed:', e);
    return new Response(`Webhook error: ${e}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription') break;

        const subscriptionId = session.subscription as string;
        const subscription   = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId        = subscription.items.data[0]?.price.id;
        const plan           = PRICE_TO_PLAN[priceId] || 'free';
        const storeId        = subscription.metadata?.store_id;

        if (storeId) {
          await sbAdmin.from('stores').update({
            plan,
            stripe_subscription_id: subscriptionId,
          }).eq('id', storeId);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub     = event.data.object as Stripe.Subscription;
        const priceId = sub.items.data[0]?.price.id;
        const plan    = PRICE_TO_PLAN[priceId] || 'free';
        const storeId = sub.metadata?.store_id;

        if (storeId) {
          await sbAdmin.from('stores').update({ plan }).eq('id', storeId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub     = event.data.object as Stripe.Subscription;
        const storeId = sub.metadata?.store_id;

        if (storeId) {
          await sbAdmin.from('stores').update({
            plan: 'free',
            stripe_subscription_id: null,
          }).eq('id', storeId);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice    = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        // Log the failure; store stays on current plan until subscription is deleted
        console.warn('Payment failed for customer:', customerId);
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
