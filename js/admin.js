/* ═══════════════════════════════════════════════════════════════════════════
   js/admin.js  ·  alma+  v19
   Admin panel — approve/reject professionals, view bookings, view stats
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── Query logger ─── */
function logQ(table, extra) {
  console.log(`[admin] ▶ query: ${table}${extra ? ' · ' + extra : ''}`);
}
function logQR(table, data, error) {
  if (error) {
    console.error(`[admin] ✗ ${table} ERROR`,
      '\n  code:', error.code, '\n  message:', error.message,
      '\n  details:', error.details, '\n  hint:', error.hint);
  } else {
    console.log(`[admin] ✓ ${table} — rows:`, Array.isArray(data) ? data.length : (data ? 1 : 0));
  }
}

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

  logQ('professional_listings UPDATE', `id=${id} status=${newStatus}`);
  const { error } = await window.supabase
    .from('professional_listings')
    .update({ status: newStatus })
    .eq('id', id);
  logQR('professional_listings UPDATE', null, error);

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

/* ═══════════════════════════════════════════════════════════════════════════
   v16 — WEEKLY CHART
   ═══════════════════════════════════════════════════════════════════════════ */
function renderWeeklyChart(bookings) {
  const chartEl = document.getElementById('admin-weekly-chart');
  if (!chartEl) return;

  const DAYS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const counts = Array(7).fill(0);
  const today = new Date();

  bookings.forEach(b => {
    if (!b.created_at || b.status === 'cancelled') return;
    const d    = new Date(b.created_at);
    const diff = Math.floor((today - d) / 86400000);
    if (diff >= 0 && diff < 7) counts[6 - diff]++;
  });

  const maxVal = Math.max(...counts, 1);

  // Build labels for last 7 days (oldest → newest)
  const labels = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    labels.push(DAYS[d.getDay()]);
  }

  chartEl.innerHTML = counts.map((c, i) => {
    const pct    = Math.round((c / maxVal) * 100);
    const height = Math.max(pct, 5);
    return `<div class="admin-bar-wrap">
      <div class="admin-bar-val">${c > 0 ? c : ''}</div>
      <div class="admin-bar ${c === 0 ? 'admin-bar--empty' : ''}" style="height:${height}%"></div>
      <div class="admin-bar-lbl">${labels[i]}</div>
    </div>`;
  }).join('');

  document.getElementById('admin-chart-section').style.display = 'grid';
}

/* ═══════════════════════════════════════════════════════════════════════════
   v16 — ACTIVITY FEED
   ═══════════════════════════════════════════════════════════════════════════ */
function fmtTimeAgoAdmin(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Ahora mismo';
  if (m < 60) return `Hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h}h`;
  return `Hace ${Math.floor(h/24)} días`;
}

function renderActivityFeed(bookings, listings) {
  const feedEl = document.getElementById('admin-activity-feed');
  if (!feedEl) return;

  // Combine events: last 5 bookings + last 5 listing status changes
  const events = [];

  bookings.slice(0, 6).forEach(b => {
    events.push({
      ts:    b.created_at,
      icon:  '📅',
      cls:   'activity-icon--booking',
      title: `Nueva reserva con ${b.pro_name || '—'}`,
    });
  });

  listings.filter(l => l.status !== 'pending').slice(0, 4).forEach(l => {
    const isApproved = l.status === 'approved';
    events.push({
      ts:    l.created_at,
      icon:  isApproved ? '✅' : '❌',
      cls:   isApproved ? 'activity-icon--approved' : 'activity-icon--cancel',
      title: `${l.name} — perfil ${isApproved ? 'aprobado' : 'rechazado'}`,
    });
  });

  // Sort by timestamp desc
  events.sort((a, b) => new Date(b.ts) - new Date(a.ts));
  const top = events.slice(0, 8);

  if (!top.length) {
    feedEl.innerHTML = `<div style="font-size:0.82rem;color:var(--text-2);padding:12px 0">Sin actividad reciente</div>`;
    return;
  }

  feedEl.innerHTML = top.map(ev => `
    <div class="activity-item">
      <div class="activity-icon ${ev.cls}">${ev.icon}</div>
      <div class="activity-content">
        <div class="activity-title">${ev.title}</div>
        <div class="activity-time">${fmtTimeAgoAdmin(ev.ts)}</div>
      </div>
    </div>`).join('');
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

  /* ─── Auth guard ─── */
  const session = await requireAuth('login.html');
  if (!session) return;

  /* Role check */
  logQ('profiles', `select(*) id=${session.user.id}`);
  const { data: profile, error: profileErr } = await window.supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();
  logQR('profiles', profile, profileErr);

  if (!profile || profile.role !== 'admin') {
    document.getElementById('admin-guard').style.display = 'block';
    return;
  }

  const displayName = profile.full_name || profile.username || 'Admin';
  document.getElementById('admin-nav-name').textContent = displayName;
  document.getElementById('admin-main').style.display   = 'block';

  /* ─── Load all data in parallel ─── */
  console.log('[admin] loading data in parallel: professional_listings, bookings, profiles count');
  logQ('professional_listings', 'select(*) all');
  logQ('bookings', 'select(*) limit:50 order:created_at desc');
  logQ('profiles', 'count only');

  const [
    { data: listings,   error: listErr },
    { data: bookings,   error: bkErr   },
    { count: userCount, error: countErr },
  ] = await Promise.all([
    window.supabase
      .from('professional_listings')
      .select('*')
      .order('created_at', { ascending: false }),
    window.supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50),
    window.supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true }),
  ]);

  logQR('professional_listings', listings, listErr);
  logQR('bookings', bookings, bkErr);
  if (countErr) console.error('[admin] profiles count error:', countErr.code, countErr.message);
  else console.log('[admin] profiles count:', userCount);

  /* ─── Render listings ─── */
  if (!listErr && listings) {
    _allListings = listings;

    const pending  = listings.filter(l => l.status === 'pending');
    const approved = listings.filter(l => l.status === 'approved');
    document.getElementById('stat-pending-pros').textContent  = pending.length;
    document.getElementById('stat-approved-pros').textContent = approved.length;

    const badge = document.getElementById('pending-count-badge');
    if (pending.length > 0) {
      badge.textContent   = pending.length;
      badge.style.display = 'inline-flex';
    }

    const pendingEl = document.getElementById('pending-pros-container');
    if (pending.length) {
      pendingEl.innerHTML = pending.map(renderPendingCard).join('');
    } else {
      pendingEl.innerHTML = `<div class="admin-empty">No hay profesionales pendientes de revisión.</div>`;
    }

    renderListingsTable(listings);
  }

  /* ─── Render bookings ─── */
  if (!bkErr && bookings) {
    document.getElementById('stat-total-bookings').textContent = bookings.length;
    const bookingsTbody = document.getElementById('bookings-body');
    if (bookings.length) {
      bookingsTbody.innerHTML = bookings.map(b => {
        const dateStr = b.scheduled_at ? fmtDateAdmin(b.scheduled_at) : (b.slot || '—');
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

  /* ─── Charts + activity feed (needs both datasets) ─── */
  if (bookings) renderWeeklyChart(bookings);
  if (bookings && listings) renderActivityFeed(bookings, listings);

  /* ─── User count ─── */
  document.getElementById('stat-total-users').textContent = userCount ?? '—';
});

/* ─── Logout ─── */
async function logout() {
  if (window.supabase) await window.supabase.auth.signOut().catch(() => {});
  location.href = 'login.html';
}
