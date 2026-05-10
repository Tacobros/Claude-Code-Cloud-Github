// Replace these values with your Supabase project credentials
// Get them from: https://supabase.com → Your project → Settings → API
const SUPABASE_URL = "https://vowsvdzjyvpalyvkfxte.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvd3N2ZHpqeXZwYWx5dmtmeHRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NTAyNDUsImV4cCI6MjA5NDAyNjI0NX0.xXOy_369lK8tVHBOjGircCJ6d1RkJTc4eA7UJpd3sEw";

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
