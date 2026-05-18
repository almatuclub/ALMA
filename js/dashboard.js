/* ═══════════════════════════════════════════════════════════════════════════
   js/dashboard.js  ·  alma+  v25
   Role-split dashboard — patient | professional | admin
   Includes: notifications, profile edit drawer, chat buttons
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── Locale helpers ─── */
const MONTHS_ES  = ['enero','febrero','marzo','abril','mayo','junio',
                    'julio','agosto','septiembre','octubre','noviembre','diciembre'];

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
  return `Hace ${Math.floor(h / 24)} día(s)`;
}

/* ─── Query logger — logs BEFORE + AFTER every Supabase call ─── */
function logQuery(prefix, table, extra) {
  console.log(`[${prefix}] ▶ query: ${table}${extra ? ' · ' + extra : ''}`);
}
function logQueryResult(prefix, table, data, error) {
  if (error) {
    console.error(
      `[${prefix}] ✗ ${table} ERROR`,
      '\n  code:',    error.code,
      '\n  message:', error.message,
      '\n  details:', error.details,
      '\n  hint:',    error.hint
    );
  } else {
    console.log(`[${prefix}] ✓ ${table} — rows:`, Array.isArray(data) ? data.length : (data ? 1 : 0));
  }
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

/* ─── Fatal error (never blank screen) ─── */
function showFatalError(msg, rawErr) {
  if (rawErr) {
    console.error('[dashboard] FATAL:', msg,
      '\n  code:', rawErr.code,
      '\n  message:', rawErr.message,
      '\n  details:', rawErr.details,
      '\n  hint:', rawErr.hint
    );
  }
  document.getElementById('dash-loading')?.style && (document.getElementById('dash-loading').style.display = 'none');

  const existing = document.getElementById('dash-fatal-error');
  if (existing) { existing.style.display = 'flex'; return; }

  const detail = rawErr
    ? `<code style="font-size:0.75rem;background:#1a0000;padding:8px 12px;border-radius:8px;display:block;margin-top:10px;text-align:left;color:#ff8573;white-space:pre-wrap;word-break:break-all">${rawErr.code ? rawErr.code+': ' : ''}${rawErr.message || ''}</code>`
    : '';

  const el = document.createElement('div');
  el.id = 'dash-fatal-error';
  el.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;text-align:center;padding:40px 20px;gap:16px';
  el.innerHTML = `
    <svg width="44" height="44" fill="none" viewBox="0 0 24 24" stroke="#E53935" stroke-width="1.4">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
    <h2 style="font-size:1.1rem;font-weight:700;color:var(--text);margin:0">No pudimos cargar tu panel</h2>
    <p style="color:var(--text-2);font-size:0.88rem;margin:0;max-width:340px">${msg}</p>
    ${detail}
    <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:8px">
      <button onclick="location.reload()" class="btn btn-primary">Reintentar</button>
      <a href="login.html" class="btn btn-outline">Volver al inicio</a>
    </div>`;
  document.body.appendChild(el);
}

/* ─── Inline section error (partial failure) ─── */
function sectionError(containerId, table, err) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<div style="background:#fff0f0;border:1.5px solid #fca5a5;border-radius:12px;padding:16px 20px;font-size:0.82rem;color:#b91c1c">
    <strong>Error al cargar (${table})</strong><br>
    <code style="font-size:0.75rem">${err?.code ? err.code+': ' : ''}${err?.message || 'Error desconocido'}</code><br>
    <span style="color:#6b7280;font-size:0.75rem">Revisá la consola para más detalles</span>
  </div>`;
}

/* ─── Soft onboarding banner ─── */
function showOnboardingBanner() {
  if (document.getElementById('onboarding-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'onboarding-banner';
  banner.style.cssText = 'background:linear-gradient(90deg,#FF8573,#DC3B35);color:white;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:0.85rem;flex-wrap:wrap;position:sticky;top:60px;z-index:90';
  banner.innerHTML = `
    <span style="font-weight:600">✦ Completá tu perfil para una mejor experiencia</span>
    <div style="display:flex;gap:8px;align-items:center;flex-shrink:0">
      <a href="onboarding.html" style="background:rgba(255,255,255,0.22);color:white;padding:5px 14px;border-radius:999px;font-size:0.8rem;font-weight:700;text-decoration:none;border:1.5px solid rgba(255,255,255,0.4)">Completar ahora →</a>
      <button onclick="this.closest('#onboarding-banner').remove()" style="background:none;border:none;color:white;cursor:pointer;font-size:1.1rem;opacity:.7;padding:0 2px" aria-label="Cerrar">✕</button>
    </div>`;
  const nav = document.querySelector('nav.navbar');
  nav ? nav.after(banner) : document.body.prepend(banner);
}

/* ─── Add to Google Calendar ─── */
function addToGoogleCal(proName, isoTime, durationMins, modality, meetingLink) {
  if (!isoTime) return;
  const s = new Date(isoTime);
  const e = new Date(s.getTime() + (durationMins || 60) * 60000);
  const fmt = d => d.toISOString().replace(/[-:.]/g,'').slice(0,15) + 'Z';
  const details = meetingLink ? `Link: ${meetingLink}` : 'Sesión alma+';
  const p = new URLSearchParams({ action:'TEMPLATE', text:`Sesión con ${proName} · alma+`,
    dates:`${fmt(s)}/${fmt(e)}`, details, location: meetingLink || '' });
  window.open(`https://calendar.google.com/calendar/render?${p}`, '_blank');
}

/* ═══════════════════════════════════════════════════════════════════════════
   NOTIFICATIONS — graceful if table missing
   ═══════════════════════════════════════════════════════════════════════════ */
let _notifPolling = null;
let _notifOpen    = false;
let _notifDisabled = false; // true if notifications table doesn't exist

function escDash(str) {
  return String(str || '').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

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

async function loadNotifications() {
  if (!window.supabase || _notifDisabled) return;

  logQuery('dashboard', 'notifications', 'order:created_at desc limit:30');
  const { data: notifs, error } = await window.supabase
    .from('notifications')
    .select('id, type, title, body, link, read, created_at')
    .order('created_at', { ascending: false })
    .limit(30);
  logQueryResult('dashboard', 'notifications', notifs, error);

  if (error) {
    /* 42P01 = table doesn't exist, PGRST200 = relation not found */
    if (error.code === '42P01' || error.code === 'PGRST200' || (error.message||'').includes('does not exist')) {
      console.warn('[dashboard] notifications table missing — disabling polling. Run supabase_rls_clean_v22.sql to fix.');
      _notifDisabled = true;
      if (_notifPolling) clearInterval(_notifPolling);
    }
    return;
  }
  if (!notifs) return;

  const unread = notifs.filter(n => !n.read).length;
  const badge  = document.getElementById('notif-badge');
  if (badge) {
    badge.textContent   = unread > 9 ? '9+' : unread;
    badge.style.display = unread > 0 ? 'flex' : 'none';
  }
  const list = document.getElementById('notif-list');
  if (list) {
    list.innerHTML = notifs.length
      ? notifs.map(renderNotifItem).join('')
      : `<div class="notif-empty">Sin notificaciones nuevas</div>`;
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
  if (!window.supabase || _notifDisabled) return;
  await window.supabase.from('notifications').update({ read: true }).eq('read', false);
  loadNotifications();
}

async function handleNotifClick(id, link) {
  if (window.supabase && !_notifDisabled) {
    await window.supabase.from('notifications').update({ read: true }).eq('id', id);
  }
  if (link && link !== 'undefined') location.href = link;
  else closeNotifDropdown();
}

document.addEventListener('click', (e) => {
  const wrap = document.getElementById('notif-bell-wrap');
  if (wrap && !wrap.contains(e.target)) closeNotifDropdown();
});

/* ═══════════════════════════════════════════════════════════════════════════
   PROFILE EDIT DRAWER
   ═══════════════════════════════════════════════════════════════════════════ */
let _editSession = null;
let _editProfile = null;
let _editListing = null;
let _editRole    = 'patient';

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

  title.textContent = _editRole === 'pro' ? 'Editar perfil profesional' : 'Editar perfil';
  body.innerHTML    = _editRole === 'pro' ? buildProEditForm() : buildPatientEditForm();

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
    sw.classList.toggle('active', sw.getAttribute('onclick')?.includes(color));
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
      <textarea id="ef-bio" rows="4" placeholder="Describí tu enfoque...">${escVal(l.bio || d.bio || '')}</textarea>
    </div>
    <div class="edit-drawer__section-label">Modalidad y link</div>
    <div class="edit-field">
      <label>Modalidad</label>
      <select id="ef-modality">
        <option value="online"     ${l.modality==='online'    ?'selected':''}>Solo online</option>
        <option value="presencial" ${l.modality==='presencial'?'selected':''}>Solo presencial</option>
        <option value="both"       ${l.modality==='both'      ?'selected':''}>Online y presencial</option>
      </select>
    </div>
    <div class="edit-field">
      <label>Link de videollamada</label>
      <input type="url" id="ef-meeting-link" value="${escVal(l.meeting_link || '')}" placeholder="https://meet.google.com/..."/>
    </div>
    <div class="edit-field">
      <label>Precio (fichas)</label>
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

    const profileUpdate = { avatar_color: _editColor };
    if (fullName) profileUpdate.full_name = fullName;
    profileUpdate.bio = bio;

    if (_editRole === 'patient') {
      const modality = document.getElementById('ef-modality')?.value;
      const timePref = document.getElementById('ef-time-pref')?.value;
      const existing = _editProfile.onboarding_data || {};
      profileUpdate.onboarding_data = { ...existing, modality, timePref };
    }

    logQuery('dashboard', 'profiles UPDATE', 'avatar_color, full_name, bio');
    const { error: pErr } = await window.supabase
      .from('profiles').update(profileUpdate).eq('id', _editSession.user.id);
    logQueryResult('dashboard', 'profiles UPDATE', null, pErr);
    if (pErr) throw pErr;

    if (_editRole === 'pro' && _editListing?.id) {
      const modality    = document.getElementById('ef-modality')?.value;
      const meetingLink = document.getElementById('ef-meeting-link')?.value?.trim();
      const price       = parseInt(document.getElementById('ef-price')?.value) || 6;

      logQuery('dashboard', 'professional_listings UPDATE', _editListing.id);
      const { error: lErr } = await window.supabase
        .from('professional_listings')
        .update({ bio, modality, meeting_link: meetingLink || null, price })
        .eq('id', _editListing.id);
      logQueryResult('dashboard', 'professional_listings UPDATE', null, lErr);
      if (lErr) throw lErr;

      _editListing = { ..._editListing, bio, modality, meeting_link: meetingLink, price };
    }

    if (fullName) _editProfile.full_name = fullName;
    _editProfile.bio          = bio;
    _editProfile.avatar_color = _editColor;

    document.querySelectorAll('.dash-avatar-lg').forEach(el => {
      if (_editColor) el.style.background = _editColor;
    });
    if (fullName) {
      const nameEl = document.getElementById(_editRole === 'pro' ? 'pro-name' : 'p-name');
      if (nameEl) nameEl.textContent = _editRole === 'pro' ? fullName : `Hola, ${fullName.split(' ')[0]}`;
      const navU = document.getElementById('nav-username');
      if (navU) navU.textContent = fullName;
    }

    showToast('Perfil actualizado correctamente', '✓', 'success');
    closeEditDrawer();

  } catch (err) {
    console.error('[dashboard] saveProfileEdit error:', err.message);
    showToast('Error: ' + (err.message || 'No se pudo guardar'), '✗', 'error');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Guardar cambios';
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   CARD / ROW RENDERERS
   ═══════════════════════════════════════════════════════════════════════════ */
function renderUpcomingCard(b) {
  // Real schema: professional_name (not pro_name), session_datetime (not slot)
  const proName  = b.professional_name || b.pro_name || 'Profesional';
  const dateStr  = fmtDateSmart(b.scheduled_at, b.session_datetime || b.slot);
  const hasLink  = b.meeting_link && (b.modality === 'online' || b.modality === 'both');
  const initials = proName.replace(/^(Lic\.|Dr\.|Prof\.|Mg\.)\s*/i,'')
                    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2) || '?';

  return `<div class="bk-card">
    <div class="bk-card__top">
      <div class="bk-card__avatar">${initials}</div>
      <div class="bk-card__header">
        <div class="bk-card__name">${proName}</div>
        ${statusChip(b.status || 'confirmed')}
      </div>
    </div>
    <div class="bk-card__date">
      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
      ${dateStr}
    </div>
    ${b.modality ? `<div class="bk-card__modality">${modalityIcon(b.modality)}</div>` : ''}
    ${b.fichas_spent ? `<div class="bk-card__fichas">${b.fichas_spent}+ fichas</div>` : ''}
    <div class="bk-card__actions">
      ${hasLink ? `<a href="${b.meeting_link}" target="_blank" rel="noopener" class="bk-card__join btn btn-primary btn-sm">Unirse →</a>` : ''}
      ${b.scheduled_at ? `<button class="bk-card__cal" onclick="addToGoogleCal('${proName.replace(/'/g,"\\'")}','${b.scheduled_at}',60,'${b.modality||''}','${b.meeting_link||''}')">
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>Calendario</button>` : ''}
      <a href="chat.html?booking=${b.id}" class="bk-card__chat">
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>Chat
      </a>
    </div>
  </div>`;
}

function renderPastRow(b) {
  // Real schema: professional_name (not pro_name), session_datetime (not slot)
  const proName = b.professional_name || b.pro_name || 'Profesional';
  const dateStr = fmtDateSmart(b.scheduled_at, b.session_datetime || b.slot);
  return `<div class="bk-row">
    <div class="bk-row__main">
      <div class="bk-row__name">${proName}</div>
      <div class="bk-row__meta">${dateStr}${b.modality ? ` · ${b.modality}` : ''}</div>
    </div>
    <div class="bk-row__right">
      ${statusChip(b.status || 'completed')}
      ${b.fichas_spent ? `<span class="bk-row__fichas">${b.fichas_spent}+</span>` : ''}
      <a href="chat.html?booking=${b.id}" class="bk-row__chat">
        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>Chat
      </a>
    </div>
  </div>`;
}

function renderProRow(b, isPending) {
  // Real schema: session_datetime (not slot)
  const dateStr      = fmtDateSmart(b.scheduled_at, b.session_datetime || b.slot);
  const patientLabel = `Paciente ···${(b.patient_id || '??????').slice(-4)}`;
  const pendingActions = isPending ? `
    <button class="btn btn-sm btn-primary" style="padding:4px 12px;font-size:0.75rem;margin-left:8px"
      onclick="updateBookingStatus('${b.id}','confirmed',this)">Confirmar</button>
    <button class="btn btn-sm btn-outline" style="padding:4px 10px;font-size:0.75rem;margin-left:4px;color:var(--text-2)"
      onclick="updateBookingStatus('${b.id}','cancelled',this)">Rechazar</button>` : '';

  return `<div class="bk-row ${isPending ? 'bk-row--pending' : ''}">
    <div class="bk-row__main">
      <div class="bk-row__name">${patientLabel}</div>
      <div class="bk-row__meta">${dateStr}${b.modality ? ` · ${b.modality}` : ''}${b.fichas_spent ? ` · ${b.fichas_spent}+ fichas` : ''}</div>
    </div>
    <div class="bk-row__right">
      ${statusChip(b.status || 'confirmed')}
      ${pendingActions}
      <a href="chat.html?booking=${b.id}" class="bk-row__chat">
        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>Chat
      </a>
    </div>
  </div>`;
}

async function updateBookingStatus(bookingId, newStatus, btn) {
  if (!window.supabase) return;
  btn.disabled    = true;
  btn.textContent = '...';

  logQuery('dashboard', 'bookings UPDATE', `id=${bookingId} status=${newStatus}`);
  const { error } = await window.supabase
    .from('bookings').update({ status: newStatus }).eq('id', bookingId);
  logQueryResult('dashboard', 'bookings UPDATE', null, error);

  if (error) {
    showToast('Error: ' + error.message, '❌', 'error');
    btn.disabled    = false;
    btn.textContent = newStatus === 'confirmed' ? 'Confirmar' : 'Rechazar';
    return;
  }

  showToast(newStatus === 'confirmed' ? 'Reserva confirmada' : 'Reserva rechazada', '✓', 'success');
  btn.closest('.bk-row')?.remove();
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOAD PROFILE — resilient to missing columns / missing row
   ═══════════════════════════════════════════════════════════════════════════ */
async function loadProfile(userId) {
  /* Try 1: select * (gets all columns that exist) */
  logQuery('dashboard', 'profiles', `select(*) id=${userId}`);
  const { data: p1, error: e1 } = await window.supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  logQueryResult('dashboard', 'profiles select(*)', p1, e1);

  if (!e1 && p1) return p1;

  /* Try 2: minimal columns only (always-existing) */
  if (e1 && e1.code !== 'PGRST116') { /* PGRST116 = no rows */
    console.warn('[dashboard] select(*) failed — trying minimal columns');
    logQuery('dashboard', 'profiles', 'select(id,username,full_name,role,fichas) fallback');
    const { data: p2, error: e2 } = await window.supabase
      .from('profiles')
      .select('id, username, full_name, role, fichas')
      .eq('id', userId)
      .single();
    logQueryResult('dashboard', 'profiles minimal', p2, e2);

    if (!e2 && p2) {
      return { ...p2, bio: null, avatar_color: null, onboarding_complete: null, onboarding_data: null };
    }
    console.error('[dashboard] minimal profile query also failed:', e2?.code, e2?.message);
  }

  /* Try 3: profile row doesn't exist → create it */
  console.warn('[dashboard] profile row missing — creating default');
  logQuery('dashboard', 'profiles INSERT', `user=${userId}`);
  const { data: p3, error: e3 } = await window.supabase
    .from('profiles')
    .insert({ id: userId, role: 'patient', fichas: 0 })
    .select('id, username, full_name, role, fichas')
    .single();
  logQueryResult('dashboard', 'profiles INSERT', p3, e3);

  if (!e3 && p3) {
    return { ...p3, bio: null, avatar_color: null, onboarding_complete: null, onboarding_data: null };
  }

  console.error('[dashboard] could not create profile:', e3?.code, e3?.message);
  return null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN INIT
   ═══════════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  /* ── Body hidden until auth resolves — prevents white flash ── */
  document.body.style.opacity    = '0';
  document.body.style.transition = 'opacity 0.25s ease';

  /* ── Very first log — confirms this script is running on the right page ── */
  console.log('[dashboard] ══ DOMContentLoaded ══ v22');
  console.log('[dashboard] pathname:', location.pathname);
  console.log('[dashboard] href:', location.href);
  console.log('[dashboard] localStorage keys (auth-related):',
    Object.keys(localStorage).filter(k => k.startsWith('sb-') || k.includes('supabase') || k.includes('alma')));

  try {
    /* Auth */
    const session = await requireAuth('login.html');
    if (!session) { console.log('[dashboard] no session → redirected'); return; }
    console.log('[dashboard] session OK · user:', session.user.id, '·', session.user.email);

    /* Profile */
    const profile = await loadProfile(session.user.id);
    if (!profile) {
      document.body.style.opacity = '1'; /* reveal even on error */
      showFatalError('No pudimos cargar tu perfil. Intentá cerrar sesión y volver a ingresar.');
      return;
    }
    console.log('[dashboard] profile OK · role:', profile.role, '· fichas:', profile.fichas);

    /* Cache profile globally — script.js initUserSession will skip its own query */
    window._almaProfile = profile;

    /* Soft onboarding nudge */
    if (!profile.onboarding_complete) {
      console.log('[dashboard] onboarding_complete=false/null → showing soft banner');
      showOnboardingBanner();
    }

    _editSession = session;
    _editProfile = profile;
    _editColor   = profile.avatar_color || '#E53935';

    const displayName = profile.full_name || profile.username || session.user.email?.split('@')[0] || 'Usuario';
    const navU = document.getElementById('nav-username');
    if (navU) navU.textContent = displayName;

    document.getElementById('dash-loading').style.display = 'none';

    /* Reveal page — smooth fade-in once content is ready */
    document.body.style.opacity = '1';

    /* Notifications (best-effort — won't crash if table missing) */
    loadNotifications();
    _notifPolling = setInterval(loadNotifications, 30000);

    /* Route */
    const role = profile.role || 'patient';
    console.log('[dashboard] routing → role:', role);

    if (role === 'admin') {
      document.getElementById('dash-admin').style.display = 'block';
      return;
    }
    if (role === 'pro') {
      await initProDashboard(session, profile, displayName);
    } else {
      await initPatientDashboard(session, profile, displayName);
    }

  } catch (err) {
    console.error('[dashboard] CRITICAL unhandled error:', err.message, err);
    document.body.style.opacity = '1'; /* always reveal — never stay invisible */
    showFatalError('Error inesperado al cargar el panel: ' + err.message);
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   PATIENT DASHBOARD
   ═══════════════════════════════════════════════════════════════════════════ */
async function initPatientDashboard(session, profile, displayName) {
  console.log('[dashboard] ── initPatientDashboard ──');
  try {
    const view = document.getElementById('dash-patient');
    if (!view) { console.error('[dashboard] #dash-patient not found'); return; }
    view.style.display = 'block';

    const initials = displayName.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0,2) || '?';
    const avatarEl = document.getElementById('p-avatar');
    if (avatarEl) { avatarEl.textContent = initials; avatarEl.style.background = profile.avatar_color || 'var(--red)'; }

    const nameEl = document.getElementById('p-name');
    if (nameEl) nameEl.textContent = `Hola, ${displayName.split(' ')[0]}`;

    const fichasEl = document.getElementById('p-fichas');
    if (fichasEl) fichasEl.textContent = profile.fichas ?? 0;

    /* Bookings */
    logQuery('dashboard', 'bookings', `patient_id=${session.user.id}`);
    const { data: bookings, error: bkErr } = await window.supabase
      .from('bookings')
      .select('id, professional_name, session_datetime, scheduled_at, modality, meeting_link, status, fichas_spent')
      .eq('patient_id', session.user.id)
      .order('scheduled_at', { ascending: true, nullsFirst: false });
    logQueryResult('dashboard', 'bookings', bookings, bkErr);

    if (bkErr) {
      sectionError('p-upcoming-list', 'bookings', bkErr);
      return;
    }

    const all = bookings || [];
    console.log('[dashboard] patient bookings loaded:', all.length);
    const now = new Date();

    const upcoming = all.filter(b => {
      if (b.status === 'cancelled') return false;
      if (!b.scheduled_at) return ['confirmed','pending'].includes(b.status);
      return new Date(b.scheduled_at) >= now;
    });

    const past = all.filter(b => {
      if (b.status === 'cancelled') return true;
      if (b.status === 'completed') return true;
      if (b.scheduled_at && new Date(b.scheduled_at) < now) return true;
      return false;
    }).reverse().slice(0, 12);

    const upcomingEl = document.getElementById('p-upcoming-list');
    if (upcomingEl) {
      upcomingEl.innerHTML = upcoming.length
        ? upcoming.map(renderUpcomingCard).join('')
        : emptyState(ICON_CALENDAR, 'Sin sesiones próximas',
            'Aún no tenés turnos reservados.',
            `<a href="professionals.html" class="btn btn-primary" style="margin-top:16px">Encontrar profesional →</a>`);
    }

    const pastSection = document.getElementById('p-past-section');
    const pastEl      = document.getElementById('p-past-list');
    if (past.length && pastEl) {
      pastEl.innerHTML = past.map(renderPastRow).join('');
    } else if (pastSection) {
      pastSection.style.display = 'none';
    }

  } catch (err) {
    console.error('[dashboard] initPatientDashboard error:', err.message, err);
    sectionError('p-upcoming-list', 'bookings (exception)', { message: err.message });
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROFESSIONAL DASHBOARD
   ═══════════════════════════════════════════════════════════════════════════ */
async function initProDashboard(session, profile, displayName) {
  console.log('[dashboard] ── initProDashboard ──');
  try {
    const view = document.getElementById('dash-pro');
    if (!view) { console.error('[dashboard] #dash-pro not found'); return; }
    view.style.display = 'block';

    const initials = displayName.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0,2) || '?';
    const avatarEl = document.getElementById('pro-avatar');
    if (avatarEl) { avatarEl.textContent = initials; avatarEl.style.background = profile.avatar_color || 'rgba(255,255,255,0.25)'; }

    const proNameEl = document.getElementById('pro-name');
    if (proNameEl) proNameEl.textContent = displayName;

    /* Listing */
    logQuery('dashboard', 'professional_listings', `user_id=${session.user.id} select(*)`);
    const { data: listings, error: listErr } = await window.supabase
      .from('professional_listings')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(1);
    logQueryResult('dashboard', 'professional_listings', listings, listErr);

    if (listErr) {
      console.error('[dashboard] listing error:', listErr.code, listErr.message);
      sectionError('pro-upcoming-list', 'professional_listings', listErr);
      return;
    }

    const listing = listings?.[0] ?? null;
    _editListing  = listing;
    console.log('[dashboard] listing:', listing?.id || 'none', '· status:', listing?.status || 'n/a');

    const specEl  = document.getElementById('pro-spec');
    const badgeEl = document.getElementById('pro-listing-badge');

    if (listing) {
      if (specEl)  specEl.textContent = listing.spec || 'Profesional de salud';
      if (badgeEl) {
        const STATUS_MAP = {
          approved: `<span class="listing-badge listing-badge--approved">Perfil verificado</span>`,
          pending:  `<span class="listing-badge listing-badge--pending">En revisión</span>`,
          rejected: `<span class="listing-badge listing-badge--rejected">Perfil rechazado · <a href="apply.html" style="color:inherit;text-decoration:underline">Volver a enviar</a></span>`,
        };
        badgeEl.innerHTML = STATUS_MAP[listing.status] || '';
      }
    } else {
      if (specEl)  specEl.textContent = 'Profesional de salud';
      if (badgeEl) badgeEl.innerHTML  = `<a href="apply.html" class="listing-badge listing-badge--missing">Completar perfil →</a>`;
    }

    /* Bookings */
    let bookings = [];
    if (listing) {
      logQuery('dashboard', 'bookings', `listing_id=${listing.id}`);
      const { data: bkData, error: bkErr } = await window.supabase
        .from('bookings')
        .select('id, patient_id, session_datetime, scheduled_at, modality, status, fichas_spent, created_at')
        .eq('listing_id', listing.id)
        .order('scheduled_at', { ascending: true, nullsFirst: false });
      logQueryResult('dashboard', 'bookings (pro)', bkData, bkErr);

      if (bkErr) {
        console.error('[dashboard] pro bookings error:', bkErr.code, bkErr.message);
      } else {
        bookings = bkData || [];
        console.log('[dashboard] pro bookings:', bookings.length);
      }
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
      b.scheduled_at && new Date(b.scheduled_at) >= todayStart &&
      new Date(b.scheduled_at) <= todayEnd && b.status !== 'cancelled'
    );
    const nowM = new Date();
    const fichasMonth = bookings
      .filter(b => {
        if (!b.created_at || b.status === 'cancelled') return false;
        const d = new Date(b.created_at);
        return d.getMonth() === nowM.getMonth() && d.getFullYear() === nowM.getFullYear();
      })
      .reduce((s, b) => s + (b.fichas_spent || 0), 0);

    const el = id => document.getElementById(id);
    if (el('stat-today')) el('stat-today').textContent = todaySessions.length;
    if (el('stat-month')) el('stat-month').textContent = fichasMonth + '+';
    if (el('stat-total')) el('stat-total').textContent = bookings.filter(b => b.status !== 'cancelled').length;

    if (pending.length) {
      const ps = el('pro-pending-section');
      if (ps) ps.style.display = 'block';
      const pb = el('pro-pending-badge');
      if (pb) pb.textContent = pending.length;
      const pl = el('pro-pending-list');
      if (pl) pl.innerHTML = pending.map(b => renderProRow(b, true)).join('');
    }

    const upEl = el('pro-upcoming-list');
    if (upEl) {
      upEl.innerHTML = upcoming.length
        ? upcoming.map(b => renderProRow(b, false)).join('')
        : emptyState(ICON_CALENDAR, 'Sin pacientes próximos',
            listing?.status === 'pending'
              ? 'Tu perfil está en revisión. Una vez aprobado aparecerás en el directorio.'
              : 'Cuando un paciente reserve una sesión aparecerá aquí.',
            listing?.status !== 'pending'
              ? `<a href="professionals.html" class="btn btn-outline btn-sm" style="margin-top:16px">Ver directorio</a>`
              : '');
    }

  } catch (err) {
    console.error('[dashboard] initProDashboard error:', err.message, err);
    sectionError('pro-upcoming-list', 'pro dashboard (exception)', { message: err.message });
  }
}

/* ─── Logout ─── */
async function logout() {
  if (_notifPolling) clearInterval(_notifPolling);
  if (window.supabase) await window.supabase.auth.signOut().catch(() => {});
  location.href = 'login.html';
}
