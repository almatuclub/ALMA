let donateAmount = 2;

function selectDonate(el, fichas) {
  document.querySelectorAll('.fp-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  donateAmount = fichas;
  document.getElementById('custom-fichas').value = fichas;
  updateDonateInfo(fichas);
}

function customDonate(val) {
  const n = parseInt(val) || 0;
  donateAmount = n;
  document.querySelectorAll('.fp-btn').forEach(b => b.classList.remove('selected'));
  updateDonateInfo(n);
}

function updateDonateInfo(n) {
  document.getElementById('d-btn-val').textContent = n;
}

function processDonate() {
  if (!donateAmount || donateAmount < 1) {
    showToast('Elegí al menos 1 ficha para donar', '⚠️', 'error');
    return;
  }

  const user = JSON.parse(localStorage.getItem('alma_user') || '{"fichas":0}');
  if (!user.username) {
    showToast('Iniciá sesión para donar fichas de tu cuenta', '🔒', 'info');
    setTimeout(() => { location.href = 'login.html'; }, 2000);
    return;
  }

  if (user.fichas < donateAmount) {
    showToast(`No tenés saldo suficiente. Querés donar ${donateAmount}+ pero tenés ${user.fichas}+`, '⚠️', 'error');
    setTimeout(() => { location.href = 'payment.html'; }, 2500);
    return;
  }

  user.fichas -= donateAmount;
  localStorage.setItem('alma_user', JSON.stringify(user));

  const btn = document.querySelector('#donate-form-card .btn-primary');
  btn.disabled = true;
  btn.textContent = '⟳ Procesando...';

  setTimeout(() => {
    document.getElementById('donate-form-card').style.display = 'none';
    document.getElementById('success-donated').textContent = donateAmount;
    const succ = document.getElementById('donate-success');
    succ.style.display = 'flex';
    showToast('¡' + donateAmount + ' fichas donadas! Gracias por sumar ❤️', '❤️', 'success');
    // Animate pool bar slightly
    const fill = document.querySelector('.pool-fill');
    if (fill) fill.style.width = Math.min(90, 72 + Math.round(donateAmount / 50 * 10)) + '%';
  }, 1500);
}

document.addEventListener('DOMContentLoaded', () => {
  updateDonateInfo(donateAmount);
});
