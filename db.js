/* ─────────────────────────────────────────────────────────────────────────
   db.js · alma+ v24
   Supabase client initialization + shared auth utilities.
   Loaded (defer) before every page script, so window.supabase,
   requireAuth(), optionalAuth() and getReturnUrl() are available globally.

   ⚠ STORAGEKEY FIX (v20):
     We removed storageKey:'alma_sb_v1' that was added in v17.
     Supabase computes a stable key from the project URL:
       sb-iuhnhexotyrnflsmpzxi-auth-token
     Using a custom storageKey meant existing sessions (stored under the
     default key) were invisible to getSession() → instant redirect to
     login even when the user WAS logged in.
     This file now migrates any session under the old custom key to the
     natural Supabase key so NO ONE has to re-login.
─────────────────────────────────────────────────────────────────────────── */

const SUPABASE_URL      = 'https://iuhnhexotyrnflsmpzxi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DwIRv7GbWFpeBXyDeghA1g_sfXSoyTp';

/* ── Key migration ─────────────────────────────────────────────────────── */
/* The key Supabase JS v2 uses by default: sb-<projectRef>-auth-token      */
const _SB_DEFAULT_KEY = 'sb-iuhnhexotyrnflsmpzxi-auth-token';
const _OLD_CUSTOM_KEY = 'alma_sb_v1'; /* our v17/v18/v19 custom key — now removed */

(function _migrateSessionKey() {
  try {
    const hasDefault = !!localStorage.getItem(_SB_DEFAULT_KEY);
    const hasCustom  = !!localStorage.getItem(_OLD_CUSTOM_KEY);

    console.log('[auth] localStorage keys check',
      '\n  default key present:', hasDefault,
      '\n  old custom key present:', hasCustom);

    if (!hasDefault && hasCustom) {
      /* Copy old custom key session to natural Supabase key */
      localStorage.setItem(_SB_DEFAULT_KEY, localStorage.getItem(_OLD_CUSTOM_KEY));
      console.log('[auth] ✓ Session migrated from', _OLD_CUSTOM_KEY, '→', _SB_DEFAULT_KEY);
    }

    if (hasCustom) {
      /* Clean up old key so there's no confusion */
      localStorage.removeItem(_OLD_CUSTOM_KEY);
      console.log('[auth] Old custom key removed from localStorage');
    }
  } catch (e) {
    console.warn('[auth] key migration error (non-fatal):', e.message);
  }
})();

/* ── Initialize Supabase client ────────────────────────────────────────── */
(function _initSupabase() {
  try {
    const lib = window.supabase; /* CDN sets window.supabase = { createClient, ... } */
    if (!lib || typeof lib.createClient !== 'function') {
      console.error('[auth] Supabase CDN not loaded — check <script> tag order and network.');
      return;
    }

    /*
     * NO storageKey override — let Supabase use its natural default
     * (sb-iuhnhexotyrnflsmpzxi-auth-token).  Consistent across all pages,
     * consistent with sessions stored before v17.
     */
    const client = lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession:     true,
        autoRefreshToken:   true,
        detectSessionInUrl: true, /* picks up magic-link / OAuth tokens in URL */
      },
    });

    window.supabase = client;
    console.log('[auth] Supabase client ready · project:', SUPABASE_URL.split('//')[1].split('.')[0]);
  } catch (err) {
    console.error('[auth] createClient failed:', err.message);
  }
})();

/* ═══════════════════════════════════════════════════════════════════════════
   requireAuth(redirectTo?)
   ─────────────────────────────────────────────────────────────────────────
   Call at the top of any PRIVATE page's DOMContentLoaded.
   Returns the live session, or null (and redirects) if unauthenticated.

   Strategy:
     1. getSession()        → reads from localStorage (immediate, sync-ish)
     2. onAuthStateChange   → waits up to 4 s for INITIAL_SESSION / token refresh
     3. timeout             → give up and redirect
   ═══════════════════════════════════════════════════════════════════════════ */
async function requireAuth(redirectTo = 'login.html') {
  const page = location.pathname.split('/').pop() || location.pathname;
  console.log('[auth] requireAuth() · page:', page, '· href:', location.href);

  if (!window.supabase || typeof window.supabase.auth?.getSession !== 'function') {
    console.error('[auth] Supabase client missing — cannot authenticate');
    _doAuthRedirect(redirectTo);
    return null;
  }

  try {
    /* ── Fast path ── */
    console.log('[auth] calling getSession()…');
    const { data: { session }, error } = await window.supabase.auth.getSession();

    if (error) console.warn('[auth] getSession() error:', error.message);

    if (session) {
      console.log('[auth] ✓ session found (fast path) ·', session.user.email,
        '· expires:', new Date(session.expires_at * 1000).toISOString());
      return session;
    }

    /* ── Slow path: wait for auth state event ── */
    console.log('[auth] getSession() returned null — waiting up to 4 s for auth state event…');
    return await _waitForAuthState(redirectTo);

  } catch (err) {
    console.error('[auth] requireAuth() exception:', err.message, err);
    _doAuthRedirect(redirectTo);
    return null;
  }
}

function _waitForAuthState(redirectTo) {
  return new Promise(resolve => {
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      sub?.unsubscribe?.();
      console.warn('[auth] ✗ 4 s timeout — still no session. localStorage snapshot:',
        Object.keys(localStorage).filter(k => k.startsWith('sb-') || k.includes('supabase') || k.includes('alma')));
      _doAuthRedirect(redirectTo);
      resolve(null);
    }, 4000);

    const { data: { subscription: sub } } = window.supabase.auth.onAuthStateChange(
      (event, session) => {
        if (settled) return;
        console.log('[auth] onAuthStateChange event:', event, '· session:', session ? '✓ ' + session.user.email : '✗ null');

        if (session) {
          settled = true;
          clearTimeout(timer);
          sub?.unsubscribe?.();
          console.log('[auth] ✓ session via', event);
          resolve(session);

        } else if (event === 'INITIAL_SESSION' || event === 'SIGNED_OUT') {
          settled = true;
          clearTimeout(timer);
          sub?.unsubscribe?.();
          console.log('[auth] ✗ no session confirmed via', event, '→ redirecting');
          _doAuthRedirect(redirectTo);
          resolve(null);
        }
        /* TOKEN_REFRESHED / USER_UPDATED without session: keep waiting */
      }
    );
  });
}

function _doAuthRedirect(redirectTo = 'login.html') {
  /* Never redirect if already on a public page — prevents infinite loops */
  const page = location.pathname.split('/').pop() || '';
  const PUBLIC = ['login.html', 'index.html', 'professionals.html', 'about.html', 'jobs.html', ''];
  if (PUBLIC.includes(page)) {
    console.log('[auth] _doAuthRedirect: already on public page, skipping redirect');
    return;
  }

  const returnPath = (location.pathname.split('/').pop() || '') + location.search;
  const target     = `${redirectTo}?return=${encodeURIComponent(returnPath)}`;
  console.log('[auth] → redirecting to:', target);
  location.href = target;
}

/* ═══════════════════════════════════════════════════════════════════════════
   optionalAuth()
   Returns session or null. NEVER redirects.
   Use on public pages (professionals, index) to personalise navbar.
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
   Call in login.js after successful sign-in.
   ═══════════════════════════════════════════════════════════════════════════ */
function getReturnUrl(defaultUrl = 'dashboard.html') {
  const raw = new URLSearchParams(location.search).get('return');
  if (!raw) return defaultUrl;
  const decoded = decodeURIComponent(raw);
  /* Block open-redirect to external URLs */
  if (decoded.startsWith('http') || decoded.startsWith('//')) return defaultUrl;
  return decoded || defaultUrl;
}
