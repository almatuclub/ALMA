// POST /api/webhook
// Receives Mercado Pago payment notifications, verifies them by calling back
// to the MP API, then idempotently credits profiles.fichas in Supabase.
//
// Required env vars (set in Vercel dashboard):
//   MP_ACCESS_TOKEN            — Mercado Pago production access token
//   SUPABASE_URL               — e.g. https://xxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  — service role key (bypasses RLS)

const REQUIRED_ENV = ['MP_ACCESS_TOKEN', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const missing = REQUIRED_ENV.filter(k => !process.env[k]);
  if (missing.length) {
    console.error('[webhook] Missing env vars:', missing.join(', '));
    return res.status(500).end();
  }

  const { type, data } = req.body || {};

  // MP sends a test ping when you save the webhook URL — acknowledge and exit
  if (type === 'test') return res.status(200).end();

  // Only process payment.updated / payment.created events
  if (type !== 'payment' || !data?.id) return res.status(200).end();

  const paymentId = String(data.id);

  /* ── 1. Fetch payment from MP to verify status and external_reference ── */
  const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` },
  });

  if (!mpRes.ok) {
    console.error('[webhook] MP fetch failed for payment', paymentId, await mpRes.text());
    return res.status(200).end(); // Acknowledge to avoid MP infinite retries
  }

  const payment = await mpRes.json();

  // Only credit on a definitive approval
  if (payment.status !== 'approved') return res.status(200).end();

  /* ── 2. Parse external_reference → "userId:fichas" ── */
  const [userId, fichasStr] = (payment.external_reference || '').split(':');
  const fichas = parseInt(fichasStr, 10);
  if (!userId || !fichas || fichas < 1) {
    console.error('[webhook] Bad external_reference:', payment.external_reference);
    return res.status(200).end();
  }

  const SUPA_URL = process.env.SUPABASE_URL;
  const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const baseHeaders = {
    'apikey':        SUPA_KEY,
    'Authorization': `Bearer ${SUPA_KEY}`,
    'Content-Type':  'application/json',
  };

  /* ── 3. Idempotency: claim the payment slot before touching fichas ──
     The mp_payments.payment_id column is a PRIMARY KEY, so a duplicate
     INSERT returns HTTP 409. If that happens, this webhook already ran. */
  const claimRes = await fetch(`${SUPA_URL}/rest/v1/mp_payments`, {
    method:  'POST',
    headers: { ...baseHeaders, 'Prefer': 'return=minimal' },
    body:    JSON.stringify({ payment_id: paymentId, user_id: userId, fichas, status: 'approved' }),
  });

  if (claimRes.status === 409) {
    return res.status(200).end(); // Already processed — idempotent OK
  }
  if (!claimRes.ok) {
    console.error('[webhook] Failed to record payment:', await claimRes.text());
    return res.status(500).end(); // Signal MP to retry
  }

  /* ── 4. Fetch current fichas balance ── */
  const profileRes = await fetch(
    `${SUPA_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=fichas`,
    { headers: baseHeaders }
  );
  const profiles = await profileRes.json();

  if (!Array.isArray(profiles) || !profiles.length) {
    console.error('[webhook] Profile not found for user', userId);
    return res.status(200).end(); // Payment recorded; admin can fix manually
  }

  /* ── 5. Credit fichas ── */
  const newBalance = (profiles[0].fichas || 0) + fichas;
  const patchRes = await fetch(
    `${SUPA_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`,
    {
      method:  'PATCH',
      headers: { ...baseHeaders, 'Prefer': 'return=minimal' },
      body:    JSON.stringify({ fichas: newBalance }),
    }
  );

  if (!patchRes.ok) {
    console.error('[webhook] Failed to update fichas:', await patchRes.text());
    // Payment is already recorded in mp_payments, so we won't double-credit
    // on retry. Return 200 so MP doesn't hammer the endpoint.
  }

  return res.status(200).end();
};
