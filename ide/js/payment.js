let selectedFichas   = 50;
let selectedPrice    = 16000;
let selectedPer      = 320;
let selectedDiscount = 20;

function selectCombo(el, fichas, price, per, disc) {
  document.querySelectorAll('.combo-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  selectedFichas = fichas; selectedPrice = price; selectedPer = per; selectedDiscount = disc;

  const saving = fichas * 400 - price;
  document.getElementById('sum-combo').textContent         = fichas + ' fichas';
  document.getElementById('sum-per').textContent           = '$' + per.toLocaleString();
  document.getElementById('sum-discount-label').textContent = disc > 0 ? 'Descuento (' + disc + '%)' : 'Sin descuento';
  document.getElementById('sum-discount').textContent      = disc > 0 ? '-$' + saving.toLocaleString() : '$0';
  document.getElementById('sum-total').textContent         = '$' + price.toLocaleString() + ' UYU';
  document.getElementById('pay-amount').textContent        = price.toLocaleString();

  document.getElementById('sb-fichas').textContent = fichas;
  document.getElementById('sb-price').textContent  = '$' + price.toLocaleString() + ' UYU';
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

function processPayment() {
  const btn    = document.getElementById('pay-btn');
  const inputs = document.querySelectorAll('#payment-form-card input[required]');
  let allOk    = true;

  inputs.forEach(i => {
    if (!i.value.trim()) { i.style.borderColor = 'var(--red)'; allOk = false; }
    else                  { i.style.borderColor = ''; }
  });

  if (!allOk) { showToast('Completá todos los campos requeridos', '⚠️', 'error'); return; }

  btn.disabled = true;
  btn.innerHTML = '<span style="display:inline-block;animation:spin .7s linear infinite">⟳</span> Procesando pago seguro...';

  setTimeout(() => {
    document.getElementById('payment-form-card').style.display = 'none';
    document.getElementById('success-fichas').textContent = selectedFichas;

    const user = JSON.parse(localStorage.getItem('alma_user') || '{"fichas":0}');
    user.fichas = (user.fichas || 0) + selectedFichas;
    localStorage.setItem('alma_user', JSON.stringify(user));

    const succ = document.getElementById('payment-success');
    succ.style.display = 'flex';
    showToast('¡' + selectedFichas + ' fichas acreditadas en tu cuenta!', '✓', 'success');
  }, 2200);
}

document.addEventListener('DOMContentLoaded', () => {
  // Pre-select popular combo
  selectCombo(document.getElementById('combo-50'), 50, 16000, 320, 20);

  // Card number auto-formatting
  document.getElementById('card-num').addEventListener('input', function () {
    let v = this.value.replace(/\D/g, '').substring(0, 16);
    this.value = v.replace(/(.{4})/g, '$1 ').trim();
    const icon = document.getElementById('card-icon');
    if      (v.startsWith('4')) icon.textContent = '💙';
    else if (v.startsWith('5')) icon.textContent = '🟠';
    else if (v.startsWith('3')) icon.textContent = '🟢';
    else                        icon.textContent = '💳';
  });
});
