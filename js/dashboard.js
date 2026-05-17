/* ═══════════════════════════════════════════════════════════════════════════
   js/dashboard.js  ·  alma+  v16
   Role-split dashboard — patient | professional | admin
   Includes: notifications, profile edit drawer, chat buttons
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── Locale helpers ─── */
const MONTHS_ES  = ['enero','febrero','marzo','abril','mayo','junio',
                    'julio','agosto','septiembre','octubre','noviembre','diciembre'];
const WEEKDAYS_ES = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];

function pad(n) { return String(n).padStart(2, '0'); }

function fmtDateSmart(iso, slot) {
  if (!iso) return slot || 'Fecha a confirmar';
  const d   = new Date(iso);
  const now = new Date();
  const diffH = (d - now) / 3600000;
  if (diffH > 0 && diffH < 24)   return `Hoy · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (diffH >= 24 && diffH < 48) return `Mañana · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()].slice(0,3)} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtTimeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Ahora mismo';
  if (m < 60) return `Hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h}h`;
  const days = Math.floor(h / 24);
  return `Hace ${days} día${days > 1 ? 's' : ''}`;
}

/* ─── Status helpers ─── */
const STATUS_LABEL = { pending:'Pendiente', confirmed:'Confirmada', completed:'Completada', cancelled:'Cancelada' };
const STATUS_CLASS = { pending:'bk-status--pending', confirmed:'bk-status--confirmed',
                       completed:'bk-status--completed', cancelled:'bk-status--cancelled' };

function statusChip(status) {
  return `<span class="bk-status ${STATUS_CLASS[status] || STATUS_CLASS.confirmed}">${STATUS_LABEL[status] || status}</span>`;
}

function modalityIcon(m) {
  if (m === 'online')     return `<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg> Online`;
  if (m === 'presencial') return `<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg> Presencial`;
  if (m === 'both')       return `Online / Presencial`;
  return m || '';
}

/* ─── Empty state ─── */
function emptyState(svgIcon, title, desc, cta = '') {
  return `<div class="empty-state">
    <div class="empty-state__icon">${svgIcon}</div>
    <h3 class="empty-state__title">${title}</h3>
    <p class="empty-state__desc">${desc}</p>
    ${cta}
  </div>`;
}

const ICON_CALENDAR = `<svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.3"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`;

/* ─── "Add to Google Calendar" ─── */
function addToGoogleCal(proName, isoTime, durationMins, modality, meetingLink) {
  if (!isoTime) return;
  const s = new Date(isoTime);
  const e = new Date(s.getTime() + (durationMins || 60) * 60000);
  const fmt = d => d.toISOString().replace(/[-:.]/g,'').slice(0,15) + 'Z';
  const details = meetingLink ? `Link de sesión: ${meetingLink}` : (modality === 'presencial' ? 'Sesión presencial' : 'Sesión alma+');
  const p = new URLSearchParams({ action:'TEMPLATE', text:`Sesión con ${proName} · alma+`,
    dates:`${fmt(s)}/${fmt(e)}`, details, location: meetingLink || '' });
  window.open(`https://calendar.google.com/calendar/render?${p}`, '_blank');
}

/* ═══════════════════════════════════════════════════════════════════════════
   NOTIFICATIONS
   ═══════════════════════════════════════════════════════════════════════════ */
let _notifPolling = null;
let _notifOpen    = false;

function renderNotifItem(n) {
  const isUnread = !n.read;
  return `<div class="notif-item ${isUnread ? 'notif-item--unread' : ''}"
    onclick="handleNotifClick('${n.id}','${n.link || ''}')">
    <div class="notif-dot ${isUnread ? '' : 'notif-dot--read'}"></div>
    <div class="notif-content">
      <div class="notif-title">${escDash(n.title)}</div>
      ${n.body ? `<div class="notif-body">${escDash(n.body)}</div>` : ''}
      <div class="notif-time">${fmtTimeAgo(n.created_at)}</div>
    </div>
  </div>`;
}

function escDash(str) {
  return String(str || '').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

async function loadNotifications() {
  if (!window.supabase) return;
  const { data: notifs } = await window.supabase
    .from('notifications')
    .select('id, type, title, body, link, read, created_at')
    .order('created_at', { ascending: false })
    .limit(30);

  if (!notifs) return;

  const unread = notifs.filter(n => !n.read).length;
  const badge  = document.getElementById('notif-badge');
  if (badge) {
    badge.textContent   = unread > 9 ? '9+' : unread;
    badge.style.display = unread > 0 ? 'flex' : 'none';
  }

  const list = document.getElementById('notif-list');
  if (!list) return;
  if (!notifs.length) {
    list.innerHTML = `<div class="notif-empty">Sin notificaciones nuevas</div>`;
  } else {
    list.innerHTML = notifs.map(renderNotifItem).join('');
  }
}

function toggleNotifDropdown() {
  _notifOpen = !_notifOpen;
  const dd = document.getElementById('notif-dropdown');
  if (dd) dd.style.display = _notifOpen ? 'block' : 'none';
  if (_notifOpen) loadNotifications();
}

function closeNotifDropdown() {
  _notifOpen = false;
  const dd = document.getElementById('notif-dropdown');
  if (dd) dd.style.display = 'none';
}

async function markAllNotifRead() {
  if (!window.supabase) return;
  await window.supabase.from('notifications').update({ read: true }).eq('read', false);
  loadNotifications();
}

async function handleNotifClick(id, link) {
  if (window.supabase) {
    await window.supabase.from('notifications').update({ read: true }).eq('id', id);
  }
  if (link && link !== 'undefined') location.href = link;
  else closeNotifDropdown();
}

/* Close dropdown when clicking outside */
document.addEventListener('click', (e) => {
  const wrap = document.getElementById('notif-bell-wrap');
  if (wrap && !wrap.contains(e.target)) closeNotifDropdown();
});

/* ═══════════════════════════════════════════════════════════════════════════
   PROFILE EDIT DRAWER
   ═══════════════════════════════════════════════════════════════════════════ */
let _editSession  = null;
let _editProfile  = null;
let _editListing  = null;
let _editRole     = 'patient';

const AVATAR_COLORS = [
  '#E53935','#D81B60','#8E24AA','#3949AB','#1E88E5',
  '#00897B','#43A047','#F4511E','#6D4C41','#455A64'
];
let _editColor = '#E53935';

function openEditDrawer() {
  if (!_editProfile) return;
  _editRole  = _editProfile.role || 'patient';
  _editColor = _editProfile.avatar_color || '#E53935';

  const title = document.getElementById('edit-drawer-title');
  const body  = document.getElementById('edit-drawer-body');
  if (!title || !body) return;

  if (_editRole === 'pro') {
    title.textContent = 'Editar perfil profesional';
    body.innerHTML = buildProEditForm();
  } else {
    title.textContent = 'Editar perfil';
    body.innerHTML = buildPatientEditForm();
  }

  document.getElementById('edit-drawer-overlay').style.display = 'block';
  document.getElementById('edit-drawer').style.display         = 'flex';
}

function closeEditDrawer() {
  document.getElementById('edit-drawer-overlay').style.display = 'none';
  document.getElementById('edit-drawer').style.display         = 'none';
}

function buildAvatarSection(initials) {
  const swatches = AVATAR_COLORS.map(c =>
    `<span class="color-swatch ${c === _editColor ? 'active' : ''}"
      style="background:${c}" onclick="selectAvatarColor('${c}')" title="${c}"></span>`
  ).join('');

  return `<div class="edit-avatar-row">
    <div class="edit-avatar-preview" id="edit-avatar-preview" style="background:${_editColor}">${initials}</div>
    <div>
      <div style="font-size:0.75rem;font-weight:600;color:var(--text-2);margin-bottom:6px">Color del avatar</div>
      <div class="color-swatch-row">${swatches}</div>
    </div>
  </div>`;
}

function selectAvatarColor(color) {
  _editColor = color;
  const prev = document.getElementById('edit-avatar-preview');
  if (prev) prev.style.background = color;
  document.querySelectorAll('.color-swatch').forEach(sw => {
    sw.classList.toggle('active', sw.style.background === color ||
      sw.getAttribute('onclick')?.includes(color));
  });
}

function buildPatientEditForm() {
  const d  = _editProfile;
  const od = d.onboarding_data || {};
  const initials = (d.full_name || d.username || '?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);

  return `
    ${buildAvatarSection(initials)}
    <div class="edit-drawer__section-label">Información personal</div>
    <div class="edit-field">
      <label>Nombre completo</label>
      <input type="text" id="ef-fullname" value="${escVal(d.full_name || '')}" placeholder="Tu nombre completo"/>
    </div>
    <div class="edit-field">
      <label>Bio / Sobre mí</label>
      <textarea id="ef-bio" placeholder="Contá algo sobre vos...">${escVal(d.bio || '')}</textarea>
    </div>
    <div class="edit-drawer__section-label">Preferencias de sesión</div>
    <div class="edit-field">
      <label>Modalidad preferida</label>
      <select id="ef-modality">
        <option value="online"     ${od.modality==='online'    ?'selected':''}>Online</option>
        <option value="presencial" ${od.modality==='presencial'?'selected':''}>Presencial</option>
        <option value="both"       ${od.modality==='both'      ?'selected':''}>Indiferente</option>
      </select>
    </div>
    <div class="edit-field">
      <label>Horarios preferidos</label>
      <select id="ef-time-pref">
        <option value="morning"   ${od.timePref==='morning'  ?'selected':''}>Mañana (8–12h)</option>
        <option value="afternoon" ${od.timePref==='afternoon'?'selected':''}>Tarde (12–18h)</option>
        <option value="evening"   ${od.timePref==='evening'  ?'selected':''}>Noche (18–22h)</option>
        <option value="flexible"  ${od.timePref==='flexible' ?'selected':''}>Flexible</option>
      </select>
    </div>`;
}

function buildProEditForm() {
  const d = _editProfile;
  const l = _editListing || {};
  const initials = (d.full_name || d.username || '?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);

  return `
    ${buildAvatarSection(initials)}
    <div class="edit-drawer__section-label">Información profesional</div>
    <div class="edit-field">
      <label>Nombre completo</label>
      <input type="text" id="ef-fullname" value="${escVal(d.full_name || '')}" placeholder="Tu nombre completo"/>
    </div>
    <div class="edit-field">
      <label>Bio profesional</label>
      <textarea id="ef-bio" rows="4" placeholder="Describí tu enfoque, especialidad y experiencia...">${escVal(l.bio || d.bio || '')}</textarea>
    </div>
    <div class="edit-drawer__section-label">Modalidad y link</div>
    <div class="edit-field">
      <label>Modalidad de atención</label>
      <select id="ef-modality">
        <option value="online"     ${l.modality==='online'    ?'selected':''}>Solo online</option>
        <option value="presencial" ${l.modality==='presencial'?'selected':''}>Solo presencial</option>
        <option value="both"       ${l.modality==='both'      ?'selected':''}>Online y presencial</option>
      </select>
    </div>
    <div class="edit-field">
      <label>Link de videollamada (Meet / Zoom)</label>
      <input type="url" id="ef-meeting-link" value="${escVal(l.meeting_link || '')}" placeholder="https://meet.google.com/..."/>
    </div>
    <div class="edit-field">
      <label>Precio por sesión (fichas)</label>
      <input type="number" id="ef-price" value="${l.price || 6}" min="1" max="30"/>
    </div>`;
}

function escVal(str) {
  return String(str || '').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

async function saveProfileEdit() {
  const btn = document.getElementById('edit-btn-save');
  if (!btn || !_editSession || !window.supabase) return;
  btn.disabled    = true;
  btn.textContent = 'Guardando...';

  try {
    const fullName = document.getElementById('ef-fullname')?.value?.trim() || '';
    const bio      = document.getElementById('ef-bio')?.value?.trim()      || '';

    /* Update profile */
    const profileUpdate = { avatar_color: _editColor };
    if (fullName) profileUpdate.full_name = fullName;
    if (bio || _editRole === 'patient') profileUpdate.bio = bio;

    if (_editRole === 'patient') {
      const modality = document.getElementById('ef-modality')?.value;
      const timePref = document.getElementById('ef-time-pref')?.value;
      const existing = _editProfile.onboarding_data || {};
      profileUpdate.onboarding_data = { ...existing, modality, timePref };
    }

    const { error: pErr } = await window.supabase
      .from('profiles').update(profileUpdate).eq('id', _editSession.user.id);
    if (pErr) throw pErr;

    /* Update listing for pros */
    if (_editRole === 'pro' && _editListing?.id) {
      const modality    = document.getElementById('ef-modality')?.value;
      const meetingLink = document.getElementById('ef-meeting-link')?.value?.trim();
      const price       = parseInt(document.getElementById('ef-price')?.value) || 6;

      const { error: lErr } = await window.supabase
        .from('professional_listings')
        .update({ bio, modality, meeting_link: meetingLink || null, price })
        .eq('id', _editListing.id);
      if (lErr) throw lErr;

      /* Update local state */
      _editListing = { ..._editListing, bio, modality, meeting_link: meetingLink, price };
    }

    /* Update local state + UI */
    if (fullName) _editProfile.full_name = fullName;
    _editProfile.bio          = bio;
    _editProfile.avatar_color = _editColor;

    /* Update visible avatar color */
    const avatarEls = document.querySelectorAll('.dash-avatar-lg');
    avatarEls.forEach(el => {
      if (_editColor) el.style.background = _editColor;
    });
    if (fullName) {
      const nameEl = document.getElementById(_editRole === 'pro' ? 'pro-name' : 'p-name');
      if (nameEl) nameEl.textContent = _editRole === 'pro' ? fullName : `Hola, ${fullName.split(' ')[0]}`;
      document.getElementById('nav-username').textContent = fullName;
    }

    showToast('Perfil actualizado correctamente', '✓', 'success');
    closeEditDrawer();

  } catch (err) {
    showToast('Error: ' + (err.message || 'No se pudo guardar'), '✗', 'error');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Guardar cambios';
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   PATIENT: render upcoming booking card
   ═══════════════════════════════════════════════════════════════════════════ */
function renderUpcomingCard(b) {
  const dateStr  = fmtDateSmart(b.scheduled_at, b.slot);
  const hasLink  = b.meeting_link && (b.modality === 'online' || b.modality === 'both');
  const initials = (b.pro_name || '?').replace(/^(Lic\.|Dr\.|Prof\.|Mg\.)\s*/i,'')
                    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2) || '?';

  const joinBtn = hasLink
    ? `<a href="${b.meeting_link}" target="_blank" rel="noopener" class="bk-card__join btn btn-primary btn-sm">Unirse a sesión →</a>`
    : '';

  const calBtn = b.scheduled_at
    ? `<button class="bk-card__cal" onclick="addToGoogleCal('${(b.pro_name||'').replace(/'/g,"\\'")}','${b.scheduled_at}',60,'${b.modality||''}','${b.meeting_link||''}')">
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
        Calendario
      </button>`
    : '';

  const chatBtn = `<a href="chat.html?booking=${b.id}" class="bk-card__chat">
    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    Chat
  </a>`;

  return `<div class="bk-card">
    <div class="bk-card__top">
      <div class="bk-card__avatar">${initials}</div>
      <div class="bk-card__header">
        <div class="bk-card__name">${b.pro_name || 'Profesional'}</div>
        ${statusChip(b.status || 'confirmed')}
      </div>
    </div>
    <div class="bk-card__date">
      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
      ${dateStr}
    </div>
    ${b.modality ? `<div class="bk-card__modality">${modalityIcon(b.modality)}</div>` : ''}
    ${b.fichas_spent ? `<div class="bk-card__fichas">${b.fichas_spent}+ fichas</div>` : ''}
    <div class="bk-card__actions">
      ${joinBtn}
      ${calBtn}
      ${chatBtn}
    </div>
  </div>`;
}

/* ─── Patient: render past session row ─── */
function renderPastRow(b) {
  const dateStr = fmtDateSmart(b.scheduled_at, b.slot);
  return `<div class="bk-row">
    <div class="bk-row__main">
      <div class="bk-row__name">${b.pro_name || 'Profesional'}</div>
      <div class="bk-row__meta">${dateStr}${b.modality ? ` · ${b.modality}` : ''}</div>
    </div>
    <div class="bk-row__right">
      ${statusChip(b.status || 'completed')}
      ${b.fichas_spent ? `<span class="bk-row__fichas">${b.fichas_spent}+</span>` : ''}
      <a href="chat.html?booking=${b.id}" class="bk-row__chat">
        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        Chat
      </a>
    </div>
  </div>`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   PRO: render patient appointment row
   ═══════════════════════════════════════════════════════════════════════════ */
function renderProRow(b, isPending) {
  const dateStr      = fmtDateSmart(b.scheduled_at, b.slot);
  const patientLabel = `Paciente ···${(b.patient_id || '??????').slice(-4)}`;

  const pendingActions = isPending ? `
    <button class="btn btn-sm btn-primary" style="padding:4px 12px;font-size:0.75rem;margin-left:8px"
      onclick="updateBookingStatus('${b.id}','confirmed',this)">Confirmar</button>
    <button class="btn btn-sm btn-outline" style="padding:4px 10px;font-size:0.75rem;margin-left:4px;color:var(--text-2)"
      onclick="updateBookingStatus('${b.id}','cancelled',this)">Rechazar</button>` : '';

  return `<div class="bk-row ${isPending ? 'bk-row--pending' : ''}">
    <div class="bk-row__main">
      <div class="bk-row__name">${patientLabel}</div>
      <div class="bk-row__meta">
        ${dateStr}${b.modality ? ` · ${b.modality}` : ''}${b.fichas_spent ? ` · ${b.fichas_spent}+ fichas` : ''}
      </div>
    </div>
    <div class="bk-row__right">
      ${statusChip(b.status || 'confirmed')}
      ${pendingActions}
      <a href="chat.html?booking=${b.id}" class="bk-row__chat">
        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        Chat
      </a>
    </div>
  </div>`;
}

/* ─── Update booking status ─── */
async function updateBookingStatus(bookingId, newStatus, btn) {
  if (!window.supabase) return;
  btn.disabled    = true;
  btn.textContent = '...';

  const { error } = await window.supabase
    .from('bookings').update({ status: newStatus }).eq('id', bookingId);

  if (error) {
    showToast('Error: ' + error.message, '❌', 'error');
    btn.disabled    = false;
    btn.textContent = newStatus === 'confirmed' ? 'Confirmar' : 'Rechazar';
    return;
  }

  showToast(newStatus === 'confirmed' ? 'Reserva confirmada' : 'Reserva rechazada', '✓', 'success');
  btn.closest('.bk-row')?.remove();

  if (newStatus === 'confirmed') {
    const upEl = document.getElementById('pro-upcoming-list');
    if (upEl) {
      const notice = upEl.querySelector('.empty-state');
      if (notice) upEl.innerHTML = '';
      const div = document.createElement('div');
      div.className = 'bk-row';
      div.innerHTML = `<div class="bk-row__main"><div class="bk-row__name">Sesión confirmada</div></div>
        <div class="bk-row__right"><span class="bk-status bk-status--confirmed">Confirmada</span></div>`;
      upEl.prepend(div);
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN INIT
   ═══════════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {

  /* ─── Auth guard: wait for session (handles refresh/timing) ─── */
  const session = await requireAuth('login.html');
  if (!session) return; // requireAuth redirected

  /* ─── Load profile ─── */
  const { data: profile, error: profileErr } = await window.supabase
    .from('profiles')
    .select('username, full_name, role, fichas, bio, avatar_color, onboarding_complete, onboarding_data')
    .eq('id', session.user.id)
    .single();

  if (profileErr || !profile) {
    console.error('[dash] Profile load failed:', profileErr?.message);
    location.href = 'login.html';
    return;
  }

  /* ─── Redirect to onboarding if not completed ─── */
  if (!profile.onboarding_complete) {
    console.log('[dash] Onboarding not complete → onboarding.html');
    location.href = 'onboarding.html';
    return;
  }

  /* Store for edit drawer */
  _editSession = session;
  _editProfile = profile;
  _editColor   = profile.avatar_color || '#E53935';

  const displayName = profile.full_name || profile.username || session.user.email.split('@')[0];
  document.getElementById('nav-username').textContent = displayName;

  /* Hide skeleton */
  document.getElementById('dash-loading').style.display = 'none';

  /* ─── Start notification polling ─── */
  loadNotifications();
  _notifPolling = setInterval(loadNotifications, 30000);

  /* ─── Route by role ─── */
  const role = profile.role || 'patient';

  if (role === 'admin') {
    document.getElementById('dash-admin').style.display = 'block';
    return;
  }

  if (role === 'pro') {
    await initProDashboard(session, profile, displayName);
  } else {
    await initPatientDashboard(session, profile, displayName);
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   PATIENT DASHBOARD
   ═══════════════════════════════════════════════════════════════════════════ */
async function initPatientDashboard(session, profile, displayName) {
  const view = document.getElementById('dash-patient');
  view.style.display = 'block';

  /* Header */
  const initials = displayName.split(' ').filter(Boolean).map(w => w[0])
                   .join('').toUpperCase().slice(0, 2) || '?';
  const avatarEl = document.getElementById('p-avatar');
  avatarEl.textContent         = initials;
  avatarEl.style.background    = profile.avatar_color || 'var(--red)';
  document.getElementById('p-name').textContent   = `Hola, ${displayName.split(' ')[0]}`;
  document.getElementById('p-fichas').textContent = profile.fichas ?? 0;

  /* Load bookings */
  const { data: bookings, error } = await window.supabase
    .from('bookings')
    .select('id, pro_name, slot, scheduled_at, modality, meeting_link, status, fichas_spent')
    .eq('patient_id', session.user.id)
    .order('scheduled_at', { ascending: true, nullsFirst: false });

  if (error) console.warn('[dash] bookings error:', error.message);

  const all = bookings || [];
  const now = new Date();

  const upcoming = all.filter(b => {
    if (b.status === 'cancelled') return false;
    if (!b.scheduled_at)         return ['confirmed','pending'].includes(b.status);
    return new Date(b.scheduled_at) >= now;
  });

  const past = all.filter(b => {
    if (b.status === 'cancelled') return true;
    if (b.status === 'completed') return true;
    if (b.scheduled_at && new Date(b.scheduled_at) < now) return true;
    return false;
  }).reverse().slice(0, 12);

  /* Render upcoming */
  const upcomingEl = document.getElementById('p-upcoming-list');
  if (upcoming.length) {
    upcomingEl.innerHTML = upcoming.map(renderUpcomingCard).join('');
  } else {
    upcomingEl.innerHTML = emptyState(
      ICON_CALENDAR,
      'Sin sesiones próximas',
      'Aún no tenés turnos reservados. Encontrá un profesional y agendá tu primera sesión.',
      `<a href="professionals.html" class="btn btn-primary" style="margin-top:16px">Encontrar profesional →</a>`
    );
  }

  /* Render past */
  const pastSection = document.getElementById('p-past-section');
  const pastEl      = document.getElementById('p-past-list');
  if (past.length) {
    pastEl.innerHTML = past.map(renderPastRow).join('');
  } else {
    pastSection.style.display = 'none';
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROFESSIONAL DASHBOARD
   ═══════════════════════════════════════════════════════════════════════════ */
async function initProDashboard(session, profile, displayName) {
  const view = document.getElementById('dash-pro');
  view.style.display = 'block';

  /* Header */
  const initials = displayName.split(' ').filter(Boolean).map(w => w[0])
                   .join('').toUpperCase().slice(0, 2) || '?';
  const avatarEl = document.getElementById('pro-avatar');
  avatarEl.textContent      = initials;
  avatarEl.style.background = profile.avatar_color || 'rgba(255,255,255,0.25)';
  document.getElementById('pro-name').textContent = displayName;

  /* Load their listing */
  const { data: listings } = await window.supabase
    .from('professional_listings')
    .select('id, spec, status, modality, bio, meeting_link, price')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(1);

  const listing = listings?.[0] ?? null;
  _editListing  = listing;

  if (listing) {
    document.getElementById('pro-spec').textContent = listing.spec || 'Profesional de salud';
    const badge = document.getElementById('pro-listing-badge');
    const STATUS_MAP = {
      approved: `<span class="listing-badge listing-badge--approved">Perfil verificado</span>`,
      pending:  `<span class="listing-badge listing-badge--pending">En revisión</span>`,
      rejected: `<span class="listing-badge listing-badge--rejected">Perfil rechazado · <a href="apply.html" style="color:inherit;text-decoration:underline">Volver a enviar</a></span>`,
    };
    badge.innerHTML = STATUS_MAP[listing.status] || '';
  } else {
    document.getElementById('pro-spec').textContent = 'Profesional de salud';
    document.getElementById('pro-listing-badge').innerHTML =
      `<a href="apply.html" class="listing-badge listing-badge--missing">Completar perfil →</a>`;
  }

  /* Load bookings for this listing */
  let bookings = [];
  if (listing) {
    const { data, error } = await window.supabase
      .from('bookings')
      .select('id, patient_id, slot, scheduled_at, modality, status, fichas_spent, created_at')
      .eq('listing_id', listing.id)
      .order('scheduled_at', { ascending: true, nullsFirst: false });

    if (!error && data) bookings = data;
    else if (error) console.warn('[dash-pro] bookings error:', error.message);
  }

  const now        = new Date();
  const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
  const todayEnd   = new Date(now); todayEnd.setHours(23,59,59,999);

  const pending  = bookings.filter(b => b.status === 'pending');
  const upcoming = bookings.filter(b =>
    b.status !== 'cancelled' && b.status !== 'pending' &&
    b.scheduled_at && new Date(b.scheduled_at) >= now
  );
  const todaySessions = bookings.filter(b =>
    b.scheduled_at &&
    new Date(b.scheduled_at) >= todayStart &&
    new Date(b.scheduled_at) <= todayEnd &&
    b.status !== 'cancelled'
  );

  const nowM = new Date();
  const fichasMonth = bookings
    .filter(b => {
      if (!b.created_at || b.status === 'cancelled') return false;
      const d = new Date(b.created_at);
      return d.getMonth() === nowM.getMonth() && d.getFullYear() === nowM.getFullYear();
    })
    .reduce((s, b) => s + (b.fichas_spent || 0), 0);

  document.getElementById('stat-today').textContent = todaySessions.length;
  document.getElementById('stat-month').textContent = fichasMonth + '+';
  document.getElementById('stat-total').textContent = bookings.filter(b => b.status !== 'cancelled').length;

  /* Pending requests */
  if (pending.length) {
    document.getElementById('pro-pending-section').style.display = 'block';
    document.getElementById('pro-pending-badge').textContent     = pending.length;
    document.getElementById('pro-pending-list').innerHTML        = pending.map(b => renderProRow(b, true)).join('');
  }

  /* Upcoming patients */
  const upEl = document.getElementById('pro-upcoming-list');
  if (upcoming.length) {
    upEl.innerHTML = upcoming.map(b => renderProRow(b, false)).join('');
  } else {
    upEl.innerHTML = emptyState(
      ICON_CALENDAR,
      'Sin pacientes próximos',
      listing?.status === 'pending'
        ? 'Tu perfil está en revisión. Una vez aprobado aparecerás en el directorio.'
        : 'Cuando un paciente reserve una sesión aparecerá aquí.',
      listing?.status === 'pending'
        ? ''
        : `<a href="professionals.html" class="btn btn-outline btn-sm" style="margin-top:16px">Ver mi perfil en el directorio</a>`
    );
  }
}

/* ─── Logout ─── */
async function logout() {
  if (_notifPolling) clearInterval(_notifPolling);
  if (window.supabase) await window.supabase.auth.signOut().catch(() => {});
  location.href = 'login.html';
}
