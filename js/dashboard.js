document.addEventListener('DOMContentLoaded', async () => {
  if (!window.supabase) {
    window.location.href = 'login.html';
    return;
  }

  const { data: { session } } = await window.supabase.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return;
  }

  const { data: profile, error } = await window.supabase
    .from('profiles')
    .select('username, full_name, role, fichas')
    .eq('id', session.user.id)
    .single();

  if (error || !profile || profile.role !== 'pro') {
    window.location.href = 'login.html';
    return;
  }

  const displayName = profile.full_name || profile.username;
  const nameEl = document.getElementById('dash-name');
  const userEl = document.getElementById('user-display');
  if (nameEl) nameEl.textContent = displayName;
  if (userEl) userEl.textContent = 'Hola, ' + displayName;
});

async function logout() {
  if (window.supabase) await window.supabase.auth.signOut().catch(() => {});
  window.location.href = 'login.html';
}
