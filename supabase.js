// Replace these values with your Supabase project credentials
// Get them from: https://supabase.com → Your project → Settings → API
const SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY_HERE";

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
