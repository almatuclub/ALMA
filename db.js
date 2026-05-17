/* ─────────────────────────────────────────────────────────────────────────
   db.js · alma+ v17
   Supabase client initialization + shared auth utilities.
   Loaded (defer) before every page script, so window.supabase,
   requireAuth(), optionalAuth() and getReturnUrl() are available globally.
───────────────────────────────────────────────────────────────────────── */

const SUPABASE_URL      = 'https://iuhnhexotyrnflsmpzxi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DwIRv7GbWFpeBXyDeghA1g_sfXSoyTp';

/* Fixed storage key so ALL pages use the same localStorage entry regardless
   of how the SDK hashes the anon-key internally.                          */
const ALMA_STORAGE_KEY  = 'alma_sb_v1';

/* ── Initialize client ────────────────────────────────────────────────── */
(function () {
  try {
    const lib = window.supabase; // CDN exports { createClient, ... } here
    if (!lib || typeof lib.createClient !== 'function') {
      console.error('[alma+] Supabase SDK not found — CDN may not have loaded yet.');
      return;
    }
    const client = lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storageKey:         ALMA_STORAGE_KEY,  // deterministic, shared across pages
        persistSession:     true,
        autoRefreshToken:   true,
        detectSessionInUrl: true,              // picks up OAuth / magic-link tokens
      },
    });
    window.supabase = client;
    console.log('[alma+] Supabase client ready · key:', ALMA_STORAGE_KEY);
  } catch (err) {
    console.error('[alma+] Failed to init Supabase:', err.message);
  }
})();

/* ═══════════════════════════════════════════════════════════════════════════
   requireAuth(redirectTo = 'login.html')
   ─────────────────────────────────────────────────────────────────────────
   Ensures the current page has a valid session before proceeding.

   Strategy (handles every real-world case):
     1. getSession()          → immediate localStorage/memory read
     2. onAuthStateChange     → catches INITIAL_SESSION after token refresh
     3. 3-second timeout      → gives up and redirects if truly unauthenticated

   Returns the session object, or null if redirecting.
   ═══════════════════════════════════════════════════════════════════════════ */
async function requireAuth(redirectTo = 'login.html') {
  const page = location.pathname.split('/').pop() || location.pathname;
  console.log('[auth] requireAuth() on:', page);

  if (!window.supabase || typeof window.supabase.auth?.getSession !== 'function') {
    console.warn('[auth] Supabase not ready — redirecting');
    _doAuthRedirect(redirectTo);
    return null;
  }

  try {
    /* ─── Fast path: session already in localStorage/memory ─── */
    const { data: { session }, error } = await window.supabase.auth.getSession();

    if (error) console.warn('[auth] getSession() error:', error.message);

    if (session) {
      console.log('[auth] ✓ Session found (fast):', session.user.email);
      return session;
    }

    /* ─── Slow path: wait for onAuthStateChange (token refresh, PKCE, etc.) ─── */
    console.log('[auth] No immediate session — waiting up to 3s for auth state…');
    return await _waitForAuthState(redirectTo);

  } catch (err) {
    console.error('[auth] requireAuth() exception:', err.message);
    _doAuthRedirect(redirectTo);
    return null;
  }
}

function _waitForAuthState(redirectTo) {
  return new Promise(resolve => {
    let settled = false;

    /* Give up after 3 seconds */
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      sub?.unsubscribe?.();
      console.warn('[auth] ✗ 3s timeout — no session, redirecting');
      _doAuthRedirect(redirectTo);
      resolve(null);
    }, 3000);

    const { data: { subscription: sub } } = window.supabase.auth.onAuthStateChange(
      (event, session) => {
        if (settled) return;
        console.log('[auth] onAuthStateChange:', event, session ? '✓' : '✗');

        if (session) {
          /* Any event with a valid session = we're good */
          settled = true;
          clearTimeout(timer);
          sub?.unsubscribe?.();
          console.log('[auth] ✓ Session via', event, ':', session.user.email);
          resolve(session);

        } else if (event === 'INITIAL_SESSION' || event === 'SIGNED_OUT') {
          /* INITIAL_SESSION with null = localStorage had no session at all */
          settled = true;
          clearTimeout(timer);
          sub?.unsubscribe?.();
          console.log('[auth] ✗ Confirmed no session via', event);
          _doAuthRedirect(redirectTo);
          resolve(null);
        }
        /* TOKEN_REFRESHED etc. without session: keep waiting until timeout */
      }
    );
  });
}

function _doAuthRedirect(redirectTo = 'login.html') {
  /* Don't redirect if already on a public page — prevents loops */
  const page = location.pathname.split('/').pop() || '';
  const publicPages = ['login.html', 'index.html', 'professionals.html',
                       'about.html', 'jobs.html', ''];
  if (publicPages.includes(page)) return;

  const returnPath = (location.pathname.split('/').pop() || '') + location.search;
  const target = `${redirectTo}?return=${encodeURIComponent(returnPath)}`;
  console.log('[auth] Redirecting →', target);
  location.href = target;
}

/* ═══════════════════════════════════════════════════════════════════════════
   optionalAuth()
   Returns the current session or null. Never redirects.
   Use on public pages to personalize UI (navbar user info etc.)
   ═══════════════════════════════════════════════════════════════════════════ */
async function optionalAuth() {
  if (!window.supabase?.auth) return null;
  try {
    const { data: { session } } = await window.supabase.auth.getSession();
    return session || null;
  } catch {
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   getReturnUrl(defaultUrl?)
   Reads the ?return= param written by _doAuthRedirect.
   Call in login.js after successful auth to send the user back.
   ═══════════════════════════════════════════════════════════════════════════ */
function getReturnUrl(defaultUrl = 'dashboard.html') {
  const raw = new URLSearchParams(location.search).get('return');
  if (!raw) return defaultUrl;
  /* Block external redirects */
  const decoded = decodeURIComponent(raw);
  if (decoded.startsWith('http') || decoded.startsWith('//')) return defaultUrl;
  return decoded || defaultUrl;
}
