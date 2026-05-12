// POST /api/webhook
// Receives Mercado Pago payment notifications, verifies them by calling back
// to the MP API, then idempotently credits profiles.fichas in Supabase.
//
// Required env vars (set in Vercel dashboard):
//   MP_ACCESS_TOKEN            — Mercado Pago production access token
//   SUPABASE_URL               — e.g. https://iuhnhexotyrnflsmpzxi.supabase.co
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

  // Only process payment events
  if (type !== 'payment' || !data?.id) return res.status(200).end();

  const paymentId = String(data.id);
  console.log(`[webhook] Received payment notification: paymentId=${paymentId}`);

  /* ── 1. Fetch payment from MP to verify status and external_reference ── */
  const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` },
  });

  if (!mpRes.ok) {
    console.error(`[webhook] MP fetch failed: status=${mpRes.status} paymentId=${paymentId}`);
    return res.status(200).end(); // Acknowledge — avoid infinite retries on MP auth issues
  }

  const payment = await mpRes.json();
  console.log(`[webhook] MP payment status=${payment.status} external_reference=${payment.external_reference}`);

  if (payment.status !== 'approved') {
    console.log(`[webhook] Payment not approved (${payment.status}), skipping`);
    return res.status(200).end();
  }

  /* ── 2. Parse external_reference → "userId:fichas" ── */
  const [userId, fichasStr] = (payment.external_reference || '').split(':');
  const fichas = parseInt(fichasStr, 10);

  console.log(`[webhook] Parsed external_reference: userId=${userId} fichas=${fichas}`);

  if (!userId || !fichas || fichas < 1) {
    console.error(`[webhook] Bad external_reference: "${payment.external_reference}"`);
    return res.status(200).end();
  }

  const SUPA_URL = process.env.SUPABASE_URL;
  const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Both apikey and Authorization must use the service role key for RLS bypass
  const baseHeaders = {
    'apikey':        SUPA_KEY,
    'Authorization': `Bearer ${SUPA_KEY}`,
    'Content-Type':  'application/json',
  };

  /* ── 3. Idempotency: claim payment slot before touching profiles ──
     Primary key on payment_id prevents double-processing.
     If INSERT → 409, this webhook already ran successfully. */
  const claimRes = await fetch(`${SUPA_URL}/rest/v1/mp_payments`, {
    method:  'POST',
    headers: { ...baseHeaders, 'Prefer': 'return=minimal' },
    body:    JSON.stringify({ payment_id: paymentId, user_id: userId, fichas, status: 'approved' }),
  });

  console.log(`[webhook] mp_payments claim: status=${claimRes.status}`);

  if (claimRes.status === 409) {
    console.log(`[webhook] Payment ${paymentId} already processed (409), skipping`);
    return res.status(200).end();
  }
  if (!claimRes.ok) {
    const claimBody = await claimRes.text();
    console.error(`[webhook] mp_payments INSERT failed: status=${claimRes.status} body=${claimBody}`);
    return res.status(500).end(); // Signal MP to retry
  }

  /* ── Helper: delete the mp_payments claim so a retry can re-process ── */
  async function rollbackClaim() {
    const delRes = await fetch(
      `${SUPA_URL}/rest/v1/mp_payments?payment_id=eq.${paymentId}`,
      { method: 'DELETE', headers: baseHeaders }
    );
    console.log(`[webhook] mp_payments rollback: status=${delRes.status}`);
  }

  /* ── 4. Fetch current fichas balance ── */
  console.log(`[webhook] Fetching profile: userId=${userId}`);

  const profileRes = await fetch(
    `${SUPA_URL}/rest/v1/profiles?id=eq.${userId}&select=fichas`,
    { headers: baseHeaders }
  );

  const profileText = await profileRes.text();
  console.log(`[webhook] profileRes: status=${profileRes.status} body=${profileText}`);

  if (!profileRes.ok) {
    console.error(`[webhook] Profile fetch failed: status=${profileRes.status} userId=${userId}`);
    await rollbackClaim();
    return res.status(500).end(); // Let MP retry
  }

  let profiles;
  try {
    profiles = JSON.parse(profileText);
  } catch (e) {
    console.error(`[webhook] Failed to parse profile response: ${profileText}`);
    await rollbackClaim();
    return res.status(500).end();
  }

  if (!Array.isArray(profiles) || profiles.length === 0) {
    console.error(`[webhook] No profile row found for userId=${userId} — cannot credit fichas`);
    // Do NOT rollback: payment is confirmed by MP. Admin must credit manually.
    // Returning 200 prevents infinite MP retries for a missing profile.
    return res.status(200).end();
  }

  const currentFichas = profiles[0].fichas ?? 0;
  const newBalance    = currentFichas + fichas;

  console.log(`[webhook] Crediting fichas: userId=${userId} current=${currentFichas} + ${fichas} = ${newBalance}`);

  /* ── 5. PATCH profiles.fichas ── */
  // Use return=representation so we get the updated row back and can verify
  // the PATCH actually matched and modified a row (204+empty body hides this).
  const patchRes = await fetch(
    `${SUPA_URL}/rest/v1/profiles?id=eq.${userId}`,
    {
      method:  'PATCH',
      headers: { ...baseHeaders, 'Prefer': 'return=representation' },
      body:    JSON.stringify({ fichas: newBalance }),
    }
  );

  const patchText = await patchRes.text();
  console.log(`[webhook] patchRes: status=${patchRes.status} body=${patchText}`);

  if (!patchRes.ok) {
    console.error(`[webhook] PATCH failed: status=${patchRes.status} userId=${userId} body=${patchText}`);
    await rollbackClaim();
    return res.status(500).end(); // Let MP retry
  }

  // Confirm the row was actually updated (non-empty array means success)
  let patchedRows;
  try { patchedRows = JSON.parse(patchText); } catch (_) { patchedRows = []; }

  if (!Array.isArray(patchedRows) || patchedRows.length === 0) {
    console.error(`[webhook] PATCH matched 0 rows for userId=${userId} — profile may have been deleted`);
    await rollbackClaim();
    return res.status(500).end();
  }

  console.log(
    `[webhook] SUCCESS: userId=${userId} | fichas credited=${fichas} | new balance=${patchedRows[0]?.fichas}`
  );

  return res.status(200).end();
};
