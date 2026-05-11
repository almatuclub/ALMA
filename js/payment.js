let selectedFichas   = 50;
let selectedPrice    = 16000;
let selectedPer      = 320;
let selectedDiscount = 20;

function selectCombo(el, fichas, price, per, disc) {
  document.querySelectorAll('.combo-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  selectedFichas = fichas; selectedPrice = price; selectedPer = per; selectedDiscount = disc;

  const saving = fichas * 400 - price;
  document.getElementById('sum-combo').textContent          = fichas + ' fichas';
  document.getElementById('sum-per').textContent            = '$' + per.toLocaleString();
  document.getElementById('sum-discount-label').textContent = disc > 0 ? 'Descuento (' + disc + '%)' : 'Sin descuento';
  document.getElementById('sum-discount').textContent       = disc > 0 ? '-$' + saving.toLocaleString() : '$0';
  document.getElementById('sum-total').textContent          = '$' + price.toLocaleString() + ' UYU';
  document.getElementById('pay-amount').textContent         = price.toLocaleString();

  document.getElementById('sb-fichas').textContent  = fichas;
  document.getElementById('sb-price').textContent   = '$' + price.toLocaleString() + ' UYU';
  document.getElementById('combo-desc').textContent = fichas + ' fichas';

  const sbWrap = document.getElementById('sb-saving-wrap');
  if (disc > 0) {
    document.getElementById('sb-saving').textContent = 'Ahorrás ' + disc + '% ($' + saving.toLocaleString() + ')';
    sbWrap.style.display = 'block';
  } else {
    sbWrap.style.display = 'none';
  }

  document.getElementById('psi-count').textContent  = Math.floor(fichas / 8)  + ' sesiones';
  document.getElementById('psi2-count').textContent = Math.floor(fichas / 12) + ' consultas';
  document.getElementById('nut-count').textContent  = Math.floor(fichas / 6)  + ' sesiones';
  document.getElementById('tra-count').textContent  = Math.floor(fichas / 5)  + ' sesiones';
  document.getElementById('coa-count').textContent  = Math.floor(fichas / 7)  + ' sesiones';
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

  const btn = document.getElementById('pay-btn');
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

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al crear preferencia de pago');
    }

    const { init_point } = await res.json();
    // Redirect to Mercado Pago hosted checkout
    location.href = init_point;
  } catch (err) {
    showToast(err.message, '❌', 'error');
    btn.disabled = false;
    btn.innerHTML = '💳 Pagar $<span id="pay-amount">' + selectedPrice.toLocaleString() + '</span> UYU con Mercado Pago →';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  selectCombo(document.getElementById('combo-50'), 50, 16000, 320, 20);

  // Handle redirect back from Mercado Pago
  const params  = new URLSearchParams(location.search);
  const status  = params.get('status');
  const fichas  = parseInt(params.get('fichas') || '0', 10);

  if (status === 'approved' && fichas > 0) {
    document.getElementById('payment-form-card').style.display = 'none';
    document.getElementById('success-fichas').textContent      = fichas;
    document.getElementById('payment-success').style.display  = 'flex';
    showToast('¡Pago aprobado! Fichas acreditadas en tu cuenta.', '✓', 'success');
    // Clean URL so a page refresh doesn't re-show the success screen
    history.replaceState(null, '', location.pathname);
  } else if (status === 'failure') {
    showToast('El pago no pudo procesarse. Intentá de nuevo.', '❌', 'error');
    history.replaceState(null, '', location.pathname);
  } else if (status === 'pending') {
    showToast('Tu pago está pendiente. Te avisamos cuando se acrediten las fichas.', '⏳', 'info');
    history.replaceState(null, '', location.pathname);
  }
});
