// POST /api/create-preference
// Validates the caller's Supabase JWT server-side, then creates a Mercado Pago
// Checkout Pro preference and returns the init_point URL.
//
// Required env vars — set all of these in the Vercel dashboard:
//   MP_ACCESS_TOKEN   — Mercado Pago production access token
//   SUPABASE_URL      — e.g. https://iuhnhexotyrnflsmpzxi.supabase.co
//   SUPABASE_ANON_KEY — anon/publishable key (used only to validate JWT)
//   SITE_URL          — full origin with no trailing slash, e.g. https://alma.vercel.app

const REQUIRED_ENV = ['MP_ACCESS_TOKEN', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SITE_URL'];

module.exports = async function handler(req, res) {
  // CORS — allow the browser to POST from the same Vercel domain
  const origin = process.env.SITE_URL || '*';
  res.setHeader('Access-Control-Allow-Origin',  origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  /* ── 0. Guard: fail fast with a clear message if env vars are missing ── */
  const missing = REQUIRED_ENV.filter(k => !process.env[k]);
  if (missing.length) {
    // Only the variable *names* are logged/returned — never the values
    console.error('[create-preference] Missing env vars:', missing.join(', '));
    return res.status(500).json({
      error: `Server misconfiguration — missing env var(s): ${missing.join(', ')}`,
    });
  }

  /* ── 1. Authenticate caller: validate Supabase JWT and resolve user ID ── */
  const authHeader = (req.headers['authorization'] || '').trim();
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Falta token de autenticación' });
  }

  let user;
  try {
    const userRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey':        process.env.SUPABASE_ANON_KEY,
        'Authorization': authHeader,
      },
    });

    if (!userRes.ok) {
      console.error('[create-preference] Supabase /user returned', userRes.status);
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    user = await userRes.json();
  } catch (err) {
    console.error('[create-preference] Failed to reach Supabase:', err.message);
    return res.status(502).json({ error: 'No se pudo verificar la sesión' });
  }

  if (!user?.id) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  /* ── 2. Validate request body ── */
  const { fichas, price } = req.body || {};

  if (
    typeof fichas !== 'number' || fichas < 1 ||
    typeof price  !== 'number' || price  < 1
  ) {
    return res.status(400).json({ error: 'Combo inválido — fichas y price deben ser números positivos' });
  }

  // Sanity-check against known combos (prevents arbitrary amounts)
  const VALID_COMBOS = [
    { fichas: 10,  price:  4000 },
    { fichas: 25,  price:  9000 },
    { fichas: 50,  price: 16000 },
    { fichas: 100, price: 28000 },
  ];
  if (!VALID_COMBOS.some(c => c.fichas === fichas && c.price === price)) {
    return res.status(400).json({ error: 'Combo no reconocido' });
  }

  const siteUrl = process.env.SITE_URL;

  /* ── 3. Create Mercado Pago preference ── */
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
          unit_price:  price,   // UYU, full integer amount (e.g. 16000)
          currency_id: 'UYU',
        }],
        // external_reference carries userId + fichas to the webhook securely
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
    init_point:         mpData.init_point,          // production checkout URL
    sandbox_init_point: mpData.sandbox_init_point,  // sandbox URL for testing
  });
};
