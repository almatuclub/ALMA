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

async function processDonate() {
  if (!donateAmount || donateAmount < 1) {
    showToast('Elegí al menos 1 ficha para donar', '⚠️', 'error');
    return;
  }

  if (!window.supabase) {
    showToast('Error de conexión con el servidor', '❌', 'error');
    return;
  }

  const { data: { session } } = await window.supabase.auth.getSession();
  if (!session) {
    showToast('Iniciá sesión para donar fichas de tu cuenta', '🔒', 'info');
    setTimeout(() => { location.href = 'login.html'; }, 2000);
    return;
  }

  const { data: profile, error: profileErr } = await window.supabase
    .from('profiles')
    .select('fichas')
    .eq('id', session.user.id)
    .single();

  if (profileErr || !profile) {
    showToast('Error al verificar tu cuenta', '❌', 'error');
    return;
  }

  if (profile.fichas < donateAmount) {
    showToast(`No tenés saldo suficiente. Querés donar ${donateAmount}+ pero tenés ${profile.fichas}+`, '⚠️', 'error');
    setTimeout(() => { location.href = 'payment.html'; }, 2500);
    return;
  }

  const btn = document.querySelector('#donate-form-card .btn-primary');
  btn.disabled = true;
  btn.textContent = '⟳ Procesando...';

  const { error: updateErr } = await window.supabase
    .from('profiles')
    .update({ fichas: profile.fichas - donateAmount })
    .eq('id', session.user.id);

  if (updateErr) {
    showToast('Error al procesar donación: ' + updateErr.message, '❌', 'error');
    btn.disabled = false;
    btn.textContent = 'Donar fichas';
    return;
  }

  await window.supabase.from('donations').insert({
    donor_id: session.user.id,
    fichas: donateAmount,
  });

  document.getElementById('donate-form-card').style.display = 'none';
  document.getElementById('success-donated').textContent = donateAmount;
  document.getElementById('donate-success').style.display = 'flex';
  showToast('¡' + donateAmount + ' fichas donadas! Gracias por sumar ❤️', '❤️', 'success');

  const fill = document.querySelector('.pool-fill');
  if (fill) fill.style.width = Math.min(90, 72 + Math.round(donateAmount / 50 * 10)) + '%';
}

document.addEventListener('DOMContentLoaded', () => {
  updateDonateInfo(donateAmount);
});
