/* ═══════════════════════════════════════════════════════════════════════════
   js/dashboard.js  ·  alma+  v15
   Role-split dashboard — patient | professional | admin
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── Locale helpers ─── */
const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio',
                   'julio','agosto','septiembre','octubre','noviembre','diciembre'];
const WEEKDAYS_ES = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];

function pad(n) { return String(n).padStart(2, '0'); }

function fmtDateFull(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return `${WEEKDAYS_ES[d.getDay()]} ${d.getDate()} de ${MONTHS_ES[d.getMonth()]} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtDateSmart(iso, slot) {
  if (!iso) return slot || 'Fecha a confirmar';
  const d   = new Date(iso);
  const now = new Date();
  const diffH = (d - now) / 3600000;
  if (diffH > 0 && diffH < 24)   return `Hoy · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (diffH >= 24 && diffH < 48) return `Mañana · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()].slice(0,3)} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ─── Status helpers ─── */
const STATUS_LABEL = { pending:'Pendiente', confirmed:'Confirmada', completed:'Completada', cancelled:'Cancelada' };
const STATUS_CLASS = { pending:'bk-status--pending', confirmed:'bk-status--confirmed',
                       completed:'bk-status--completed', cancelled:'bk-status--cancelled' };

function statusChip(status) {
  const cls = STATUS_CLASS[status] || STATUS_CLASS.confirmed;
  return `<span class="bk-status ${cls}">${STATUS_LABEL[status] || status}</span>`;
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
const ICON_STAR     = `<svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.3"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;

/* ─── "Add to Google Calendar" ─── */
function addToGoogleCal(proName, isoTime, durationMins, modality, meetingLink) {
  if (!isoTime) return;
  const s = new Date(isoTime);
  const e = new Date(s.getTime() + (durationMins || 60) * 60000);
  const fmt = d => d.toISOString().replace(/[-:.]/g,'').slice(0,15) + 'Z';
  const details = meetingLink ? `Link de sesión: ${meetingLink}` : (modality === 'presencial' ? 'Sesión presencial' : 'Sesión alma+');
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text:   `Sesión con ${proName} · alma+`,
    dates:  `${fmt(s)}/${fmt(e)}`,
    details,
    location: meetingLink || '',
  });
  window.open(`https://calendar.google.com/calendar/render?${p}`, '_blank');
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
        Agregar al calendario
      </button>`
    : '';

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
    </div>
  </div>`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   PRO: render patient appointment row
   ═══════════════════════════════════════════════════════════════════════════ */
function renderProRow(b, isPending) {
  const dateStr     = fmtDateSmart(b.scheduled_at, b.slot);
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
        ${dateStr}
        ${b.modality ? ` · ${b.modality}` : ''}
        ${b.fichas_spent ? ` · ${b.fichas_spent}+ fichas` : ''}
      </div>
    </div>
    <div class="bk-row__right">
      ${statusChip(b.status || 'confirmed')}
      ${pendingActions}
    </div>
  </div>`;
}

/* ─── Update booking status ─── */
async function updateBookingStatus(bookingId, newStatus, btn) {
  if (!window.supabase) return;
  btn.disabled    = true;
  btn.textContent = '...';

  const { error } = await window.supabase
    .from('bookings')
    .update({ status: newStatus })
    .eq('id', bookingId);

  if (error) {
    showToast('Error: ' + error.message, '❌', 'error');
    btn.disabled    = false;
    btn.textContent = newStatus === 'confirmed' ? 'Confirmar' : 'Rechazar';
    return;
  }

  showToast(newStatus === 'confirmed' ? 'Reserva confirmada' : 'Reserva rechazada', '✓', 'success');
  btn.closest('.bk-row')?.remove();

  // Move to upcoming section if confirmed
  if (newStatus === 'confirmed') {
    const upcomingEl = document.getElementById('pro-upcoming-list');
    if (upcomingEl) {
      const notice = upcomingEl.querySelector('.empty-state');
      if (notice) upcomingEl.innerHTML = '';
      // Re-fetch would be ideal; for now just show a message
      const div = document.createElement('div');
      div.className = 'bk-row';
      div.innerHTML = `<div class="bk-row__main"><div class="bk-row__name">Sesión confirmada</div></div>
        <div class="bk-row__right"><span class="bk-status bk-status--confirmed">Confirmada</span></div>`;
      upcomingEl.prepend(div);
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN INIT
   ═══════════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  if (!window.supabase) { location.href = 'login.html'; return; }

  const { data: { session } } = await window.supabase.auth.getSession();
  if (!session)               { location.href = 'login.html'; return; }

  /* ─── Load profile ─── */
  const { data: profile, error: profileErr } = await window.supabase
    .from('profiles')
    .select('username, full_name, role, fichas')
    .eq('id', session.user.id)
    .single();

  if (profileErr || !profile) { location.href = 'login.html'; return; }

  const displayName = profile.full_name || profile.username || session.user.email.split('@')[0];
  document.getElementById('nav-username').textContent = displayName;

  /* Hide skeleton */
  document.getElementById('dash-loading').style.display = 'none';

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
  document.getElementById('p-avatar').textContent   = initials;
  document.getElementById('p-name').textContent     = `Hola, ${displayName.split(' ')[0]}`;
  document.getElementById('p-fichas').textContent   = profile.fichas ?? 0;

  /* Load bookings */
  const { data: bookings, error } = await window.supabase
    .from('bookings')
    .select('id, pro_name, slot, scheduled_at, modality, meeting_link, status, fichas_spent')
    .eq('patient_id', session.user.id)
    .order('scheduled_at', { ascending: true, nullsFirst: false });

  if (error) console.warn('[dash] bookings error:', error.message);

  const all      = bookings || [];
  const now      = new Date();

  /* Upcoming: status != cancelled AND (no scheduled_at → show if confirmed/pending, else future date) */
  const upcoming = all.filter(b => {
    if (b.status === 'cancelled') return false;
    if (!b.scheduled_at)         return ['confirmed','pending'].includes(b.status);
    return new Date(b.scheduled_at) >= now;
  });

  /* Past: cancelled OR scheduled_at in past OR completed */
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
  document.getElementById('pro-avatar').textContent = initials;
  document.getElementById('pro-name').textContent   = displayName;

  /* Load their listing */
  const { data: listings } = await window.supabase
    .from('professional_listings')
    .select('id, spec, status, modality')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(1);

  const listing = listings?.[0] ?? null;

  if (listing) {
    document.getElementById('pro-spec').textContent = listing.spec || 'Profesional de salud';
    const badge    = document.getElementById('pro-listing-badge');
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
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);

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

  /* Month fichas */
  const nowM = new Date();
  const fichasMonth = bookings
    .filter(b => {
      if (!b.created_at || b.status === 'cancelled') return false;
      const d = new Date(b.created_at);
      return d.getMonth() === nowM.getMonth() && d.getFullYear() === nowM.getFullYear();
    })
    .reduce((s, b) => s + (b.fichas_spent || 0), 0);

  /* Stats */
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
    const isPending = listing?.status === 'pending';
    upEl.innerHTML = emptyState(
      ICON_CALENDAR,
      'Sin pacientes próximos',
      isPending
        ? 'Tu perfil está en revisión. Una vez aprobado aparecerás en el directorio y podrás recibir reservas.'
        : 'Cuando un paciente reserve una sesión aparecerá aquí.',
      isPending
        ? ''
        : `<a href="professionals.html" class="btn btn-outline btn-sm" style="margin-top:16px">Ver mi perfil en el directorio</a>`
    );
  }
}

/* ─── Logout ─── */
async function logout() {
  if (window.supabase) await window.supabase.auth.signOut().catch(() => {});
  location.href = 'login.html';
}
