// db.js
// Supabase Configuration
const SUPABASE_URL = 'https://iuhnhexotyrnflsmpzxi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_DwIRv7GbWFpeBXyDeghA1g_sfXSoyTp';

// Initialize Supabase Client
// This requires the Supabase CDN script to be loaded before this file
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
