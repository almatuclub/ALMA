/* ═══════════════════════════════════════════════════════════════════════════
   js/admin.js  ·  alma+  v15
   Admin panel — approve/reject professionals, view bookings, view stats
   ═══════════════════════════════════════════════════════════════════════════ */

const MONTHS_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

function fmtDateAdmin(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

const STATUS_MAP = {
  pending:  { label:'Pendiente',  cls:'bk-status--pending' },
  approved: { label:'Aprobado',   cls:'bk-status--confirmed' },
  rejected: { label:'Rechazado',  cls:'bk-status--cancelled' },
  confirmed:{ label:'Confirmada', cls:'bk-status--confirmed' },
  completed:{ label:'Completada', cls:'bk-status--completed' },
  cancelled:{ label:'Cancelada',  cls:'bk-status--cancelled' },
};

function statusChip(status) {
  const s = STATUS_MAP[status] || { label: status, cls: 'bk-status--pending' };
  return `<span class="bk-status ${s.cls}">${s.label}</span>`;
}

/* Store all listings for client-side filter */
let _allListings = [];

/* ─── Update listing status ─── */
async function updateListingStatus(id, newStatus, btn) {
  btn.disabled    = true;
  btn.textContent = '...';

  const { error } = await window.supabase
    .from('professional_listings')
    .update({ status: newStatus })
    .eq('id', id);

  if (error) {
    showToast('Error: ' + error.message, '❌', 'error');
    btn.disabled    = false;
    btn.textContent = newStatus === 'approved' ? 'Aprobar' : 'Rechazar';
    return;
  }

  const label = newStatus === 'approved' ? 'aprobado' : 'rechazado';
  showToast(`Profesional ${label} correctamente`, '✓', 'success');

  // Update row visually
  const row = btn.closest('tr');
  if (row) {
    row.querySelector('.admin-status-cell').innerHTML = statusChip(newStatus);
    row.querySelector('.admin-action-cell').innerHTML =
      newStatus === 'approved'
        ? `<button class="admin-btn admin-btn--danger" onclick="updateListingStatus('${id}','rejected',this)">Rechazar</button>`
        : `<button class="admin-btn admin-btn--success" onclick="updateListingStatus('${id}','approved',this)">Aprobar</button>`;
  }

  // Update pending section
  if (newStatus !== 'pending') {
    const card = document.querySelector(`.pending-card[data-id="${id}"]`);
    card?.remove();
    const remaining = document.querySelectorAll('.pending-card').length;
    const badge = document.getElementById('pending-count-badge');
    if (badge) badge.textContent = remaining;
    document.getElementById('stat-pending-pros').textContent = remaining;
    if (remaining === 0) {
      document.getElementById('pending-pros-container').innerHTML =
        `<div class="admin-empty">No hay profesionales pendientes de revisión.</div>`;
    }
  }
}

/* ─── Render pending cards ─── */
function renderPendingCard(p) {
  const initials = p.name.replace(/^(Lic\.|Dr\.|Prof\.|Mg\.)\s*/i, '')
                    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  const colorMap = { psicologia:'#E53935', psiquiatria:'#7B1FA2', nutricion:'#2E7D32',
                     trainer:'#E65100', coaching:'#00695C' };
  const color = colorMap[p.svc_id] || '#455A64';

  return `<div class="pending-card" data-id="${p.id}">
    <div class="pending-card__left">
      <div class="pending-card__avatar" style="background:${color}">${initials}</div>
      <div>
        <div class="pending-card__name">${p.name}</div>
        <div class="pending-card__meta">
          ${p.spec || '—'}
          ${p.barrio ? ` · ${p.barrio}` : ''}
          ${p.email ? ` · ${p.email}` : ''}
        </div>
        <div class="pending-card__date">Enviado el ${fmtDateAdmin(p.created_at)}</div>
      </div>
    </div>
    <div class="pending-card__actions">
      <button class="admin-btn admin-btn--success" onclick="updateListingStatus('${p.id}','approved',this)">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        Aprobar
      </button>
      <button class="admin-btn admin-btn--danger" onclick="updateListingStatus('${p.id}','rejected',this)">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        Rechazar
      </button>
    </div>
  </div>`;
}

/* ─── Filter listings table ─── */
function filterListings() {
  const filter = document.getElementById('filter-listing-status')?.value || '';
  const shown  = filter ? _allListings.filter(l => l.status === filter) : _allListings;
  renderListingsTable(shown);
}

function renderListingsTable(listings) {
  const tbody = document.getElementById('all-listings-body');
  if (!listings.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--text-2)">Sin resultados</td></tr>`;
    return;
  }
  tbody.innerHTML = listings.map(p => `
    <tr>
      <td><strong>${p.name}</strong></td>
      <td>${p.spec || '—'}</td>
      <td>${p.barrio || '—'}</td>
      <td class="admin-status-cell">${statusChip(p.status)}</td>
      <td>${fmtDateAdmin(p.created_at)}</td>
      <td class="admin-action-cell">
        ${p.status !== 'approved'
          ? `<button class="admin-btn admin-btn--success" onclick="updateListingStatus('${p.id}','approved',this)">Aprobar</button>`
          : ''}
        ${p.status !== 'rejected'
          ? `<button class="admin-btn admin-btn--danger" onclick="updateListingStatus('${p.id}','rejected',this)" style="margin-left:4px">Rechazar</button>`
          : ''}
      </td>
    </tr>
  `).join('');
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN INIT
   ═══════════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  if (!window.supabase) { location.href = 'login.html'; return; }

  const { data: { session } } = await window.supabase.auth.getSession();
  if (!session)               { location.href = 'login.html'; return; }

  /* Role check */
  const { data: profile } = await window.supabase
    .from('profiles')
    .select('full_name, username, role')
    .eq('id', session.user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    document.getElementById('admin-guard').style.display = 'block';
    return;
  }

  const displayName = profile.full_name || profile.username || 'Admin';
  document.getElementById('admin-nav-name').textContent = displayName;
  document.getElementById('admin-main').style.display   = 'block';

  /* ─── Load all listings ─── */
  const { data: listings, error: listErr } = await window.supabase
    .from('professional_listings')
    .select('id, name, spec, svc_id, barrio, email, status, created_at')
    .order('created_at', { ascending: false });

  if (!listErr && listings) {
    _allListings = listings;

    /* Stats */
    const pending  = listings.filter(l => l.status === 'pending');
    const approved = listings.filter(l => l.status === 'approved');
    document.getElementById('stat-pending-pros').textContent  = pending.length;
    document.getElementById('stat-approved-pros').textContent = approved.length;

    /* Badge */
    const badge = document.getElementById('pending-count-badge');
    if (pending.length > 0) {
      badge.textContent    = pending.length;
      badge.style.display  = 'inline-flex';
    }

    /* Pending cards */
    const pendingEl = document.getElementById('pending-pros-container');
    if (pending.length) {
      pendingEl.innerHTML = pending.map(renderPendingCard).join('');
    } else {
      pendingEl.innerHTML = `<div class="admin-empty">No hay profesionales pendientes de revisión.</div>`;
    }

    /* All listings table */
    renderListingsTable(listings);
  }

  /* ─── Load bookings ─── */
  const { data: bookings, error: bkErr } = await window.supabase
    .from('bookings')
    .select('id, pro_name, slot, scheduled_at, modality, status, fichas_spent, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (!bkErr && bookings) {
    document.getElementById('stat-total-bookings').textContent = bookings.length;
    const bookingsTbody = document.getElementById('bookings-body');
    if (bookings.length) {
      bookingsTbody.innerHTML = bookings.map(b => {
        const dateStr = b.scheduled_at
          ? `${fmtDateAdmin(b.scheduled_at)}`
          : (b.slot || '—');
        return `<tr>
          <td><strong>${b.pro_name || '—'}</strong></td>
          <td>${dateStr}</td>
          <td>${b.modality || '—'}</td>
          <td>${statusChip(b.status)}</td>
          <td>${b.fichas_spent ?? '—'}+</td>
        </tr>`;
      }).join('');
    } else {
      bookingsTbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:28px;color:var(--text-2)">Sin reservas aún</td></tr>`;
    }
  }

  /* ─── Load user count ─── */
  const { count: userCount } = await window.supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true });

  document.getElementById('stat-total-users').textContent = userCount ?? '—';
});

/* ─── Logout ─── */
async function logout() {
  if (window.supabase) await window.supabase.auth.signOut().catch(() => {});
  location.href = 'login.html';
}
