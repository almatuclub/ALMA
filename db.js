// Supabase configuration — initializes the client and exposes it globally
// as window.supabase so all pages can use window.supabase.auth / .from()
const SUPABASE_URL = 'https://iuhnhexotyrnflsmpzxi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_DwIRv7GbWFpeBXyDeghA1g_sfXSoyTp';

(function () {
  const lib = window.supabase; // CDN export: { createClient, ... }
  const client = lib.createClient(SUPABASE_URL, SUPABASE_KEY);
  window.supabase = client; // replace SDK namespace with the client instance
})();
