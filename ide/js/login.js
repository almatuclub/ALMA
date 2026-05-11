let currentTab = 'patient';

function setTab(type) {
  currentTab = type;
  document.getElementById('tab-patient').classList.toggle('active', type === 'patient');
  document.getElementById('tab-pro').classList.toggle('active', type === 'pro');
  showLogin(type);
}

function showLogin(type) {
  ['patient-login', 'patient-register', 'pro-login', 'pro-register'].forEach(id => {
    document.getElementById(id).classList.remove('active');
  });
  document.getElementById(type + '-login').classList.add('active');
}

function showRegister(type) {
  ['patient-login', 'patient-register', 'pro-login', 'pro-register'].forEach(id => {
    document.getElementById(id).classList.remove('active');
  });
  document.getElementById(type + '-register').classList.add('active');
}

async function handleLogin(e, type) {
  e.preventDefault();
  const btn = e.target.querySelector('[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Ingresando...';

  const inputs = e.target.querySelectorAll('input');
  const email = inputs[0].value;
  const password = inputs[1].value;

  const { data, error } = await window.supabase.auth.signInWithPassword({ email, password });

  if (error) {
    btn.disabled = false;
    btn.textContent = type === 'patient' ? 'Ingresar como paciente' : 'Ingresar al panel';
    const msg = error.message.includes('Invalid login credentials')
      ? 'Credenciales inválidas. Verificá tu email y contraseña.'
      : 'Error al iniciar sesión. Intentá de nuevo.';
    showToast(msg, '✗', 'error');
    return;
  }

  showToast('¡Inicio de sesión exitoso! Redirigiendo...', '✓', 'success');
  setTimeout(() => { location.href = type === 'pro' ? 'dashboard.html' : 'professionals.html'; }, 1500);
}

async function handleRegister(e, type) {
  e.preventDefault();
  const btn = e.target.querySelector('[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Creando cuenta...';

  if (type === 'patient') {
    const inputs = e.target.querySelectorAll('input');
    const name     = inputs[0].value;
    const lastName = inputs[1].value;
    const email    = inputs[2].value;
    const password = inputs[3].value;

    const { data, error } = await window.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username:  name + ' ' + lastName,
          full_name: name + ' ' + lastName,
          role: 'patient',
        },
      },
    });

    if (error) {
      btn.disabled = false;
      btn.textContent = 'Crear cuenta gratis';
      showToast('Error: ' + error.message, '✗', 'error');
      return;
    }

    showToast('¡Cuenta creada con éxito!', '🎉', 'success');
    setTimeout(() => { location.href = 'professionals.html'; }, 1500);
  }
}

// Auto-switch to register mode if URL hash says so
if (location.hash === '#register') {
  showRegister(currentTab);
}
