// POST /api/create-preference
// Validates the caller's Supabase JWT, then creates a Mercado Pago Checkout Pro
// preference and returns the init_point URL to redirect to.
//
// Required env vars (set in Vercel dashboard):
//   MP_ACCESS_TOKEN        — Mercado Pago production access token
//   SUPABASE_URL           — e.g. https://xxx.supabase.co
//   SUPABASE_ANON_KEY      — publishable / anon key (same as db.js SUPABASE_KEY)
//   SITE_URL               — full origin, e.g. https://alma.vercel.app  (no trailing slash)

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.SITE_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  /* ── 1. Authenticate the caller via Supabase JWT ── */
  const authHeader = req.headers['authorization'] || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'apikey':        process.env.SUPABASE_ANON_KEY,
      'Authorization': authHeader,
    },
  });

  if (!userRes.ok) return res.status(401).json({ error: 'Token inválido' });

  const user = await userRes.json();
  if (!user?.id)   return res.status(401).json({ error: 'Token inválido' });

  /* ── 2. Validate request body ── */
  const { fichas, price } = req.body || {};
  if (!fichas || !price || fichas < 1 || price < 1) {
    return res.status(400).json({ error: 'Combo inválido' });
  }

  const siteUrl = process.env.SITE_URL;

  /* ── 3. Create Mercado Pago preference ── */
  const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      items: [{
        title:      `${fichas} fichas alma+`,
        quantity:   1,
        unit_price: price,        // full UYU amount, e.g. 16000
        currency_id: 'UYU',
      }],
      // Carries userId and fichas count through the payment flow
      external_reference: `${user.id}:${fichas}`,
      back_urls: {
        success: `${siteUrl}/payment?status=approved&fichas=${fichas}`,
        failure: `${siteUrl}/payment?status=failure`,
        pending: `${siteUrl}/payment?status=pending`,
      },
      auto_return:       'approved',
      notification_url:  `${siteUrl}/api/webhook`,
    }),
  });

  if (!mpRes.ok) {
    const errBody = await mpRes.text();
    console.error('[create-preference] MP error:', errBody);
    return res.status(502).json({ error: 'Error al crear preferencia de pago' });
  }

  const mpData = await mpRes.json();

  return res.status(200).json({
    init_point:         mpData.init_point,         // production checkout URL
    sandbox_init_point: mpData.sandbox_init_point,  // sandbox URL for testing
  });
};
