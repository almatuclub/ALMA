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

/* ── Mercado Pago demo fallback (static hosting) ── */
function showPaymentDemoModal() {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML = `
    <div style="background:white;border-radius:20px;padding:36px;max-width:400px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.15);text-align:center">
      <div style="width:52px;height:52px;background:rgba(0,158,227,0.1);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#009EE3" stroke-width="2" aria-hidden="true"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>
      </div>
      <h3 style="font-size:1.1rem;font-weight:800;margin:0 0 8px;color:#18181b">Pago via Mercado Pago</h3>
      <p style="font-size:0.86rem;color:#71717a;line-height:1.65;margin:0 0 6px">
        En producción, este botón te redirige al checkout seguro de <strong>Mercado Pago</strong> para pagar con tarjeta, efectivo o transferencia.
      </p>
      <p style="font-size:0.82rem;color:#a1a1aa;margin:0 0 24px;line-height:1.5">
        El API de pagos requiere deployment en Vercel. Para esta demo, podés simular la acreditación:
      </p>
      <button onclick="simulatePaymentSuccess(${selectedFichas}); this.closest('[style*=fixed]').remove()"
        class="btn btn-primary btn-lg" style="width:100%;justify-content:center;background:#009EE3;border-color:#009EE3;margin-bottom:10px">
        Simular pago exitoso →
      </button>
      <button onclick="this.closest('[style*=fixed]').remove()"
        style="width:100%;background:none;border:none;color:#71717a;font-size:0.85rem;cursor:pointer;padding:6px">
        Cancelar
      </button>
    </div>`;
  document.body.appendChild(overlay);
}

function simulatePaymentSuccess(fichas) {
  const formCard  = el('payment-form-card');
  const successEl = el('payment-success');
  if (formCard)  formCard.style.display  = 'none';
  if (successEl) successEl.style.display = 'flex';
  setText('success-fichas', fichas);
  showToast('Demo: ¡Pago simulado! Fichas acreditadas.', '✓', 'success');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

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
    const isApiUnavailable = err instanceof TypeError ||
      (err.message && (err.message.includes('404') || err.message.includes('Failed to fetch')));
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '💳 Pagar $<span id="pay-amount">' + selectedPrice.toLocaleString() + '</span> UYU con Mercado Pago →';
    }
    if (isApiUnavailable) {
      showPaymentDemoModal();
    } else {
      showToast(err.message, '❌', 'error');
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
