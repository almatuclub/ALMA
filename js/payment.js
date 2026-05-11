let selectedFichas   = 50;
let selectedPrice    = 16000;
let selectedPer      = 320;
let selectedDiscount = 20;

function el(id)           { return document.getElementById(id); }
function setText(id, val) { const n = el(id); if (n) n.textContent = val; }

function selectCombo(card, fichas, price, per, disc) {
  document.querySelectorAll('.combo-card').forEach(c => c.classList.remove('selected'));
  if (card) card.classList.add('selected');

  selectedFichas = fichas; selectedPrice = price; selectedPer = per; selectedDiscount = disc;

  const saving = fichas * 400 - price;

  setText('sum-combo',          fichas + ' fichas');
  setText('sum-per',            '$' + per.toLocaleString());
  setText('sum-discount-label', disc > 0 ? 'Descuento (' + disc + '%)' : 'Sin descuento');
  setText('sum-discount',       disc > 0 ? '-$' + saving.toLocaleString() : '$0');
  setText('sum-total',          '$' + price.toLocaleString() + ' UYU');
  setText('pay-amount',         price.toLocaleString());
  setText('sb-fichas',          fichas);
  setText('sb-price',           '$' + price.toLocaleString() + ' UYU');
  setText('combo-desc',         fichas + ' fichas');

  const sbWrap = el('sb-saving-wrap');
  if (sbWrap) {
    if (disc > 0) {
      setText('sb-saving', 'Ahorrás ' + disc + '% ($' + saving.toLocaleString() + ')');
      sbWrap.style.display = 'block';
    } else {
      sbWrap.style.display = 'none';
    }
  }

  setText('psi-count',  Math.floor(fichas / 8)  + ' sesiones');
  setText('psi2-count', Math.floor(fichas / 12) + ' consultas');
  setText('nut-count',  Math.floor(fichas / 6)  + ' sesiones');
  setText('tra-count',  Math.floor(fichas / 5)  + ' sesiones');
  setText('coa-count',  Math.floor(fichas / 7)  + ' sesiones');
}

// Expose selectCombo so combo card onclick attributes can call it
window.selectCombo = selectCombo;

async function initiatePayment() {
  /* ── 1. Check Supabase client is ready ── */
  if (!window.supabase) {
    showToast('Error de conexión: Supabase no está listo', '❌', 'error');
    return;
  }

  /* ── 2. Get the current session — guarded so any SDK error surfaces cleanly ── */
  let session;
  try {
    const { data, error } = await window.supabase.auth.getSession();
    if (error) throw error;
    session = data?.session ?? null;
  } catch (err) {
    showToast('Error al leer la sesión: ' + err.message, '❌', 'error');
    return;
  }

  if (!session?.access_token) {
    showToast('Iniciá sesión para comprar fichas', '🔒', 'info');
    setTimeout(() => { location.href = 'login.html'; }, 2000);
    return;
  }

  /* ── 3. Lock the button and call the API ── */
  const btn = el('pay-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span style="display:inline-block;animation:spin .7s linear infinite">⟳</span> Preparando pago...';
  }

  try {
    const res = await fetch('/api/create-preference', {
      method: 'POST',
      headers: {
        // The Authorization header carries the user's Supabase JWT.
        // The server validates it against GoTrue — fichas are never credited client-side.
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ fichas: selectedFichas, price: selectedPrice }),
    });

    let payload = {};
    try { payload = await res.json(); } catch (_) { /* non-JSON body */ }

    if (!res.ok) {
      throw new Error(payload.error || `Error ${res.status} del servidor de pagos`);
    }

    if (!payload.init_point) {
      throw new Error('El servidor no devolvió una URL de pago');
    }

    // Redirect to Mercado Pago hosted checkout.
    // Fichas are credited only after the webhook confirms payment — never here.
    location.href = payload.init_point;

  } catch (err) {
    showToast(err.message, '❌', 'error');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '💳 Pagar $<span id="pay-amount">' + selectedPrice.toLocaleString() + '</span> UYU con Mercado Pago →';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  selectCombo(el('combo-50'), 50, 16000, 320, 20);

  // Wire pay button in JS — avoids inline-onclick + defer timing issues
  const payBtn = el('pay-btn');
  if (payBtn) payBtn.addEventListener('click', initiatePayment);

  /* ── Handle redirect back from Mercado Pago ── */
  const params = new URLSearchParams(location.search);
  const status = params.get('status');
  const fichas = parseInt(params.get('fichas') || '0', 10);

  if (status === 'approved' && fichas > 0) {
    const formCard  = el('payment-form-card');
    const successEl = el('payment-success');
    if (formCard)  formCard.style.display  = 'none';
    if (successEl) successEl.style.display = 'flex';
    setText('success-fichas', fichas);
    showToast('¡Pago aprobado! Fichas acreditadas en tu cuenta.', '✓', 'success');
    history.replaceState(null, '', location.pathname);

  } else if (status === 'failure') {
    showToast('El pago no pudo procesarse. Intentá de nuevo.', '❌', 'error');
    history.replaceState(null, '', location.pathname);

  } else if (status === 'pending') {
    showToast('Tu pago está pendiente. Te avisamos cuando se acrediten las fichas.', '⏳', 'info');
    history.replaceState(null, '', location.pathname);
  }
});
