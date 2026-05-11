// POST /api/create-preference
// Validates the caller's Supabase JWT, then creates a Mercado Pago Checkout Pro
// preference and returns the init_point URL to redirect to.
//
// Required env vars — set all of these in the Vercel dashboard:
//   MP_ACCESS_TOKEN           — Mercado Pago production access token
//   SUPABASE_URL              — e.g. https://iuhnhexotyrnflsmpzxi.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY — service role key (standard JWT; validates user tokens via GoTrue)
//   SITE_URL                  — full origin, no trailing slash, e.g. https://alma.vercel.app
//
// NOTE: SUPABASE_ANON_KEY is NOT used here.
// The publishable/anon key (sb_publishable_…) only works through the JS SDK, not as a raw
// REST apikey header. The service role key is always a standard JWT and GoTrue accepts it.

const REQUIRED_ENV = ['MP_ACCESS_TOKEN', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SITE_URL'];

const VALID_COMBOS = [
  { fichas: 10,  price:  4000 },
  { fichas: 25,  price:  9000 },
  { fichas: 50,  price: 16000 },
  { fichas: 100, price: 28000 },
];

module.exports = async function handler(req, res) {
  const origin = process.env.SITE_URL || '*';
  res.setHeader('Access-Control-Allow-Origin',  origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  /* ── 0. Env var guard — fail fast with the variable name, never the value ── */
  const missing = REQUIRED_ENV.filter(k => !process.env[k]);
  if (missing.length) {
    console.error('[create-preference] Missing env vars:', missing.join(', '));
    return res.status(500).json({
      error: `Server misconfiguration — missing env var(s): ${missing.join(', ')}`,
    });
  }

  /* ── 1. Extract the user's Supabase JWT from the Authorization header ── */
  const authHeader = (req.headers['authorization'] || '').trim();
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Falta token de autenticación (Authorization: Bearer …)' });
  }

  // The token is the part after "Bearer "
  const userJwt = authHeader.slice(7);
  if (!userJwt) {
    return res.status(401).json({ error: 'Token vacío' });
  }

  /* ── 2. Validate the JWT against Supabase GoTrue ──
     We use SUPABASE_SERVICE_ROLE_KEY as the `apikey` because:
     - It is a standard JWT that GoTrue always accepts as a valid project key.
     - The publishable/anon key (sb_publishable_…) only works through the JS SDK,
       not as a raw REST header.
     The user's own JWT stays in Authorization — GoTrue uses that to return the user's record. */
  let user;
  try {
    const gotrueRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey':        process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${userJwt}`,
      },
    });

    const body = await gotrueRes.json().catch(() => ({}));

    if (!gotrueRes.ok) {
      // Log status + GoTrue error code — no secrets exposed
      console.error(
        '[create-preference] GoTrue /user returned', gotrueRes.status,
        '| error_code:', body.error_code || body.error || '(none)',
        '| msg:', body.msg || body.message || '(none)'
      );
      return res.status(401).json({
        error: `Sesión inválida (GoTrue ${gotrueRes.status}). Cerrá sesión, volvé a ingresar e intentá de nuevo.`,
      });
    }

    user = body;
  } catch (err) {
    console.error('[create-preference] Failed to reach Supabase GoTrue:', err.message);
    return res.status(502).json({ error: 'No se pudo verificar la sesión con Supabase' });
  }

  if (!user?.id) {
    console.error('[create-preference] GoTrue returned OK but no user.id:', JSON.stringify(user));
    return res.status(401).json({ error: 'Respuesta de sesión inesperada' });
  }

  /* ── 3. Validate request body against known combos ── */
  const { fichas, price } = req.body || {};

  if (typeof fichas !== 'number' || typeof price !== 'number') {
    return res.status(400).json({ error: 'fichas y price deben ser números' });
  }

  if (!VALID_COMBOS.some(c => c.fichas === fichas && c.price === price)) {
    return res.status(400).json({ error: 'Combo no reconocido' });
  }

  /* ── 4. Create Mercado Pago preference ── */
  const siteUrl = process.env.SITE_URL;

  let mpData;
  try {
    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        items: [{
          title:       `${fichas} fichas alma+`,
          quantity:    1,
          unit_price:  price,      // full UYU integer, e.g. 16000
          currency_id: 'UYU',
        }],
        // external_reference passes userId + fichas count to the webhook
        external_reference: `${user.id}:${fichas}`,
        back_urls: {
          success: `${siteUrl}/payment?status=approved&fichas=${fichas}`,
          failure: `${siteUrl}/payment?status=failure`,
          pending: `${siteUrl}/payment?status=pending`,
        },
        auto_return:      'approved',
        notification_url: `${siteUrl}/api/webhook`,
      }),
    });

    if (!mpRes.ok) {
      const errBody = await mpRes.text();
      console.error('[create-preference] MP returned', mpRes.status, errBody);
      return res.status(502).json({ error: 'Error al crear preferencia en Mercado Pago' });
    }

    mpData = await mpRes.json();
  } catch (err) {
    console.error('[create-preference] MP fetch failed:', err.message);
    return res.status(502).json({ error: 'No se pudo conectar con Mercado Pago' });
  }

  if (!mpData.init_point) {
    console.error('[create-preference] MP response missing init_point:', JSON.stringify(mpData));
    return res.status(502).json({ error: 'Respuesta inesperada de Mercado Pago' });
  }

  return res.status(200).json({
    init_point:         mpData.init_point,
    sandbox_init_point: mpData.sandbox_init_point,
  });
};
