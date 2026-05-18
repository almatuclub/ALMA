/* ─────────────────────────────────────────────────────────────────────────
   js/login.js · alma+ v28
   Handles patient/professional login and registration.
   After success uses getReturnUrl() to send users back where they came from.
───────────────────────────────────────────────────────────────────────── */

let currentTab = 'patient';

function setTab(type) {
  currentTab = type;
  document.getElementById('tab-patient').classList.toggle('active', type === 'patient');
  document.getElementById('tab-pro').classList.toggle('active', type === 'pro');
  showLogin(type);
}

function showLogin(type) {
  ['patient-login', 'patient-register', 'pro-login', 'pro-register'].forEach(id => {
    document.getElementById(id)?.classList.remove('active');
  });
  document.getElementById(type + '-login')?.classList.add('active');
}

function showRegister(type) {
  ['patient-login', 'patient-register', 'pro-login', 'pro-register'].forEach(id => {
    document.getElementById(id)?.classList.remove('active');
  });
  document.getElementById(type + '-register')?.classList.add('active');
}

/* ── Login ── */
async function handleLogin(e, type) {
  e.preventDefault();
  const btn = e.target.querySelector('[type="submit"]');
  btn.disabled    = true;
  btn.textContent = 'Ingresando...';

  const inputs   = e.target.querySelectorAll('input');
  const email    = inputs[0].value.trim();
  const password = inputs[1].value;

  const { data, error } = await window.supabase.auth.signInWithPassword({ email, password });

  if (error) {
    btn.disabled    = false;
    btn.textContent = type === 'patient' ? 'Ingresar como paciente' : 'Ingresar al panel';
    const msg = error.message.toLowerCase().includes('invalid login credentials')
      ? 'Credenciales inválidas. Verificá tu email y contraseña.'
      : error.message.toLowerCase().includes('email not confirmed')
      ? 'Confirmá tu email antes de ingresar.'
      : 'Error al iniciar sesión. Intentá de nuevo.';
    showToast(msg, '✗', 'error');
    console.warn('[login] signInWithPassword error:', error.message);
    return;
  }

  console.log('[login] Login OK:', data.user.email);
  showToast('¡Inicio de sesión exitoso!', '✓', 'success');

  /* Redirect: return URL > role default */
  const dest = getReturnUrl(type === 'pro' ? 'dashboard.html' : 'professionals.html');
  console.log('[login] Redirecting to:', dest);
  setTimeout(() => { location.href = dest; }, 800);
}

/* ── Register (patient) ── */
async function handleRegister(e, type) {
  e.preventDefault();
  const btn = e.target.querySelector('[type="submit"]');
  btn.disabled    = true;
  btn.textContent = 'Creando cuenta...';

  if (type === 'patient') {
    const inputs   = e.target.querySelectorAll('input');
    const name     = inputs[0].value.trim();
    const lastName = inputs[1].value.trim();
    const email    = inputs[2].value.trim();
    const password = inputs[3].value;

    if (!name || !email || !password) {
      btn.disabled    = false;
      btn.textContent = 'Crear cuenta gratis';
      showToast('Completá todos los campos.', '✗', 'error');
      return;
    }

    const { data, error } = await window.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username:  `${name} ${lastName}`.trim(),
          full_name: `${name} ${lastName}`.trim(),
          role: 'patient',
        },
      },
    });

    if (error) {
      btn.disabled    = false;
      btn.textContent = 'Crear cuenta gratis';
      const msg = error.message.toLowerCase().includes('already registered')
        ? 'Ya existe una cuenta con ese email.'
        : 'Error: ' + error.message;
      showToast(msg, '✗', 'error');
      console.warn('[login] signUp error:', error.message);
      return;
    }

    console.log('[login] Register OK:', data.user?.email);

    /* ── Create profiles row immediately.
       Supabase Auth creates the auth.users entry but NOT the public.profiles row.
       Without this, onboarding.html and dashboard.js get null profile → redirect loop.
       ON CONFLICT DO NOTHING makes it safe if a DB trigger already created the row. ── */
    if (data.user) {
      const fullName = `${name} ${lastName}`.trim();
      const { error: profErr } = await window.supabase
        .from('profiles')
        .upsert({
          id:        data.user.id,
          username:  fullName,
          full_name: fullName,
          role:      'patient',
          fichas:    0,
          onboarding_complete: false,
        }, { onConflict: 'id', ignoreDuplicates: true });
      if (profErr) console.warn('[login] profiles upsert error (non-fatal):', profErr.code, profErr.message);
      else         console.log('[login] profiles row created for', data.user.id);
    }

    showToast('¡Cuenta creada con éxito!', '🎉', 'success');
    /* New users always go to onboarding */
    setTimeout(() => { location.href = 'onboarding.html'; }, 800);
  }
}

/* ── Password Reset ── */
function openResetModal(emailPrefill) {
  const modal = document.getElementById('reset-modal');
  if (!modal) return;
  const emailInput = document.getElementById('reset-email');
  if (emailInput && emailPrefill) emailInput.value = emailPrefill;
  document.getElementById('reset-form-state').style.display  = '';
  document.getElementById('reset-success-state').style.display = 'none';
  const btn = document.getElementById('reset-send-btn');
  if (btn) { btn.disabled = false; btn.textContent = 'Enviar link de recuperación'; }
  modal.style.display = 'flex';
  setTimeout(() => emailInput?.focus(), 100);
}

function closeResetModal() {
  const modal = document.getElementById('reset-modal');
  if (modal) modal.style.display = 'none';
}

async function sendPasswordReset() {
  const emailInput = document.getElementById('reset-email');
  const email      = emailInput?.value?.trim();
  if (!email) {
    emailInput?.classList.add('shake');
    setTimeout(() => emailInput?.classList.remove('shake'), 500);
    return;
  }
  const btn = document.getElementById('reset-send-btn');
  btn.disabled    = true;
  btn.textContent = 'Enviando...';
  const { error } = await window.supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/login.html',
  });
  if (error) {
    btn.disabled    = false;
    btn.textContent = 'Enviar link de recuperación';
    showToast('No pudimos enviar el link. Verificá el email e intentá de nuevo.', '✗', 'error');
    return;
  }
  document.getElementById('reset-form-state').style.display   = 'none';
  document.getElementById('reset-success-state').style.display = 'block';
  document.getElementById('reset-email-shown').textContent     = email;
}

/* ── Auto-switch to register if hash says so ── */
if (location.hash === '#register') showRegister(currentTab);
