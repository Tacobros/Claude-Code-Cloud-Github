-- Vigilancia de contenido: pg_cron dispara cada mañana (07:10 Guatemala)
-- la Edge Function moderation-digest, que envía por correo los productos
-- publicados en las últimas 24 horas (vía Brevo; requiere BREVO_API_KEY
-- en los secretos de Edge Functions — sin ella, la función registra y sale).
-- El parámetro ?k= lleva el secreto compartido (MODERATION_DIGEST_KEY).
create extension if not exists pg_net;
select cron.schedule('moderation-digest-daily', '10 13 * * *',
  $$select net.http_post(url := 'https://vowsvdzjyvpalyvkfxte.supabase.co/functions/v1/moderation-digest?k=<MODERATION_DIGEST_KEY>', body := '{}'::jsonb)$$);
