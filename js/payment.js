let selectedFichas   = 50;
let selectedPrice    = 16000;
let selectedPer      = 320;
let selectedDiscount = 20;

// Safe getElementById — never throws on missing elements
function el(id) { return document.getElementById(id); }
function setText(id, val) { const n = el(id); if (n) n.textContent = val; }

function selectCombo(card, fichas, price, per, disc) {
  document.querySelectorAll('.combo-card').forEach(c => c.classList.remove('selected'));
  if (card) card.classList.add('selected');

  selectedFichas = fichas; selectedPrice = price; selectedPer = per; selectedDiscount = disc;

  const saving = fichas * 400 - price;

  setText('sum-combo',         fichas + ' fichas');
  setText('sum-per',           '$' + per.toLocaleString());
  setText('sum-discount-label', disc > 0 ? 'Descuento (' + disc + '%)' : 'Sin descuento');
  setText('sum-discount',      disc > 0 ? '-$' + saving.toLocaleString() : '$0');
  setText('sum-total',         '$' + price.toLocaleString() + ' UYU');
  setText('pay-amount',        price.toLocaleString());
  setText('sb-fichas',         fichas);
  setText('sb-price',          '$' + price.toLocaleString() + ' UYU');
  setText('combo-desc',        fichas + ' fichas');

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

async function initiatePayment() {
  if (!window.supabase) {
    showToast('Error de conexión con el servidor', '❌', 'error');
    return;
  }

  const { data: { session } } = await window.supabase.auth.getSession();
  if (!session) {
    showToast('Iniciá sesión para comprar fichas', '🔒', 'info');
    setTimeout(() => { location.href = 'login.html'; }, 2000);
    return;
  }

  const btn = el('pay-btn');
  if (!btn) return;
  btn.disabled = true;
  btn.innerHTML = '<span style="display:inline-block;animation:spin .7s linear infinite">⟳</span> Preparando pago...';

  try {
    const res = await fetch('/api/create-preference', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ fichas: selectedFichas, price: selectedPrice }),
    });

    let payload = {};
    try { payload = await res.json(); } catch (_) { /* empty body */ }

    if (!res.ok) {
      throw new Error(payload.error || `Error ${res.status} al crear preferencia de pago`);
    }

    if (!payload.init_point) {
      throw new Error('Respuesta inesperada del servidor de pagos');
    }

    // Redirect user to Mercado Pago hosted checkout — fichas are credited only
    // after the webhook confirms the payment, never from the frontend directly.
    location.href = payload.init_point;

  } catch (err) {
    showToast(err.message, '❌', 'error');
    btn.disabled = false;
    btn.innerHTML = '💳 Pagar $<span id="pay-amount">' + selectedPrice.toLocaleString() + '</span> UYU con Mercado Pago →';
  }
}

// Expose on window so combo card onclick attributes can still call selectCombo
// (those inline handlers are safe — selectCombo is synchronous and defined at parse time)
window.selectCombo = selectCombo;

document.addEventListener('DOMContentLoaded', () => {
  // Pre-select popular combo
  selectCombo(el('combo-50'), 50, 16000, 320, 20);

  // Wire the pay button in JS, not via inline onclick, to avoid timing issues
  // with defer-loaded scripts
  const payBtn = el('pay-btn');
  if (payBtn) payBtn.addEventListener('click', initiatePayment);

  // ── Handle redirect back from Mercado Pago ──
  const params = new URLSearchParams(location.search);
  const status = params.get('status');
  const fichas = parseInt(params.get('fichas') || '0', 10);

  if (status === 'approved' && fichas > 0) {
    const formCard = el('payment-form-card');
    const successEl = el('payment-success');
    if (formCard)  formCard.style.display  = 'none';
    if (successEl) {
      setText('success-fichas', fichas);
      successEl.style.display = 'flex';
    }
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
