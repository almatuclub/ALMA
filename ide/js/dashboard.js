document.addEventListener('DOMContentLoaded', () => {
  const user = JSON.parse(localStorage.getItem('alma_user') || '{}');

  if (!user.username || user.role !== 'pro') {
    window.location.href = 'login.html';
    return;
  }

  document.getElementById('dash-name').textContent    = user.username;
  document.getElementById('user-display').textContent = 'Hola, ' + user.username;
});

function logout() {
  if (window.supabase) window.supabase.auth.signOut().catch(() => {});
  localStorage.removeItem('alma_user');
  window.location.href = 'login.html';
}
