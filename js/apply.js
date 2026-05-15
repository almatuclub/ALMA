/* ─────────────────────────────────────────────────────────────────────────────
   js/apply.js  ·  alma+  v14
   Professional application form — availability configurator + Supabase submit
───────────────────────────────────────────────────────────────────────────── */

/* ══ Availability state ══════════════════════════════════════════════════════ */
const DAYS_ES    = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];
const DAYS_SHORT = { lunes:'Lun', martes:'Mar', miercoles:'Mié', jueves:'Jue', viernes:'Vie', sabado:'Sáb', domingo:'Dom' };
const DAYS_FULL  = { lunes:'Lunes', martes:'Martes', miercoles:'Miércoles', jueves:'Jueves', viernes:'Viernes', sabado:'Sábado', domingo:'Domingo' };

let enabledDays     = new Set();
let currentModality = 'online';

/* ── Day toggle ──────────────────────────────────────────────────────────── */
function toggleDayBtn(btn) {
  const day = btn.dataset.day;
  if (enabledDays.has(day)) {
    enabledDays.delete(day);
    btn.classList.remove('active');
    document.getElementById(`time-row-${day}`)?.remove();
  } else {
    enabledDays.add(day);
    btn.classList.add('active');
    insertTimeRow(day);
  }
  const hint = document.getElementById('avail-empty-hint');
  if (hint) hint.style.display = enabledDays.size ? 'none' : '';
  renderAvailPreview();
  updateProgress();
}

function insertTimeRow(day) {
  const container = document.getElementById('day-time-rows');
  if (!container || document.getElementById(`time-row-${day}`)) return;

  const row = document.createElement('div');
  row.id = `time-row-${day}`;
  row.className = 'day-time-row';
  row.innerHTML = `
    <div class="dtr-label">${DAYS_FULL[day]}</div>
    <div class="dtr-times">
      <label class="dtr-field">
        <span>Desde</span>
        <input type="time" id="start-${day}" value="09:00" class="dtr-input" onchange="renderAvailPreview()"/>
      </label>
      <span class="dtr-arrow">→</span>
      <label class="dtr-field">
        <span>Hasta</span>
        <input type="time" id="end-${day}" value="18:00" class="dtr-input" onchange="renderAvailPreview()"/>
      </label>
    </div>
    <button type="button" class="dtr-remove" onclick="removeDayRow('${day}')" aria-label="Quitar ${DAYS_FULL[day]}">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
    </button>
  `;

  // Insert in calendar order
  const order    = DAYS_ES.indexOf(day);
  const existing = [...container.querySelectorAll('.day-time-row')];
  const after    = existing.find(r => DAYS_ES.indexOf(r.id.replace('time-row-', '')) > order);
  if (after) container.insertBefore(row, after);
  else        container.appendChild(row);
}

function removeDayRow(day) {
  enabledDays.delete(day);
  document.getElementById(`time-row-${day}`)?.remove();
  document.querySelector(`.day-btn[data-day="${day}"]`)?.classList.remove('active');
  const hint = document.getElementById('avail-empty-hint');
  if (hint) hint.style.display = enabledDays.size ? 'none' : '';
  renderAvailPreview();
  updateProgress();
}

function getAvailabilityJson() {
  const result = {};
  DAYS_ES.forEach(day => {
    result[day] = enabledDays.has(day)
      ? { enabled: true,
          start: document.getElementById(`start-${day}`)?.value || '09:00',
          end:   document.getElementById(`end-${day}`)?.value   || '18:00' }
      : { enabled: false };
  });
  return result;
}

/* ── Preview ──────────────────────────────────────────────────────────────── */
function renderAvailPreview() {
  const el = document.getElementById('avail-preview');
  if (!el) return;

  if (!enabledDays.size) {
    el.innerHTML = '<span class="avail-preview-empty">Seleccioná días y horarios para ver el resumen aquí.</span>';
    return;
  }

  const duration = document.getElementById('session-duration')?.value || 60;
  const MODALITY_LABEL = { online: 'Online', presencial: 'Presencial', both: 'Online y Presencial' };

  const parts = DAYS_ES
    .filter(d => enabledDays.has(d))
    .map(d => {
      const start = document.getElementById(`start-${d}`)?.value || '09:00';
      const end   = document.getElementById(`end-${d}`)?.value   || '18:00';
      return `<span class="prev-day">${DAYS_SHORT[d]}</span><span class="prev-time">${start}–${end}</span>`;
    });

  el.innerHTML = `
    <div class="avail-preview-row">
      <span class="prev-section">${parts.join('<span class="prev-dot">·</span>')}</span>
      <span class="prev-dot">·</span>
      <span class="prev-section">${duration} min</span>
      <span class="prev-dot">·</span>
      <span class="prev-section">${MODALITY_LABEL[currentModality]}</span>
    </div>
  `;
}

/* ── Modality ─────────────────────────────────────────────────────────────── */
function setModality(btn, mode) {
  currentModality = mode;
  document.querySelectorAll('.modality-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const meetingSection  = document.getElementById('meeting-section');
  const locationSection = document.getElementById('location-section');

  if (meetingSection)  meetingSection.style.display  = (mode === 'online'  || mode === 'both') ? 'block' : 'none';
  if (locationSection) locationSection.style.display = (mode === 'presencial' || mode === 'both') ? 'block' : 'none';

  renderAvailPreview();
}

/* ── Meeting provider ─────────────────────────────────────────────────────── */
function setMeetingProvider(btn, provider) {
  document.querySelectorAll('.provider-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const input = document.getElementById('meeting-provider-input');
  if (input) input.value = provider;

  const placeholders = {
    google_meet: 'https://meet.google.com/xxx-xxxx-xxx',
    zoom:        'https://zoom.us/j/123456789?pwd=...',
    other:       'https://tu-plataforma.com/sala/...',
  };
  const linkInput = document.getElementById('meeting-link');
  if (linkInput) linkInput.placeholder = placeholders[provider] || '';
}

/* ── Service info display ─────────────────────────────────────────────────── */
function updateServiceInfo() {
  const sel    = document.getElementById('svc-select');
  const opt    = sel.options[sel.selectedIndex];
  const fichas = opt.dataset.fichas;
  const dur    = opt.dataset.dur;
  const disp   = document.getElementById('ficha-display');
  if (fichas) {
    document.getElementById('ficha-val').textContent = fichas;
    document.getElementById('dur-val').textContent   = dur;
    disp.style.display = 'flex';
  } else {
    disp.style.display = 'none';
  }
  previewUpdate();
}

/* ── Profile preview ──────────────────────────────────────────────────────── */
function previewUpdate() {
  const fn   = document.getElementById('fn')?.value  || '';
  const ln   = document.getElementById('ln')?.value  || '';
  const sp   = document.getElementById('svc-select')?.selectedOptions[0]?.textContent || 'Especialidad';
  const initials = ((fn[0] || '') + (ln[0] || '')).toUpperCase() || '?';

  const nameEl   = document.getElementById('pv-name');
  const specEl   = document.getElementById('pv-spec');
  const avatarEl = document.getElementById('pv-avatar');
  if (nameEl)   nameEl.textContent   = [fn, ln].filter(Boolean).join(' ') || 'Tu nombre';
  if (specEl)   specEl.textContent   = sp === 'Seleccioná' ? 'Especialidad' : sp;
  if (avatarEl) avatarEl.textContent = initials;
  updateProgress();
}

function updateProgress() {
  const req    = document.querySelectorAll('#apply-form input[required], #apply-form select[required]');
  const filled = [...req].filter(f => f.value.trim()).length;
  const bonus  = enabledDays.size > 0 ? 1 : 0;
  const pct    = Math.min(100, Math.round(((filled + bonus) / (req.length + 1)) * 100));
  const bar    = document.getElementById('pv-progress');
  const pctEl  = document.getElementById('pv-pct');
  if (bar)   bar.style.width    = pct + '%';
  if (pctEl) pctEl.textContent  = pct + '%';
}

/* ── Auth banner ──────────────────────────────────────────────────────────── */
async function checkAuthBanner() {
  if (!window.supabase) return;
  const { data: { session } } = await window.supabase.auth.getSession();
  const banner = document.getElementById('auth-banner');
  if (!session && banner) banner.style.display = 'block';
}

/* ── URL validation ───────────────────────────────────────────────────────── */
function isValidUrl(str) {
  if (!str) return true; // optional field
  try { return Boolean(new URL(str)); } catch { return false; }
}

/* ══ DOMContentLoaded ════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  checkAuthBanner();
  previewUpdate();
  renderAvailPreview();

  /* ── Form submit ── */
  document.getElementById('apply-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');

    if (!window.supabase) {
      showToast('Error: cliente Supabase no disponible.', '❌', 'error');
      return;
    }

    /* Auth guard */
    const { data: { session } } = await window.supabase.auth.getSession();
    if (!session) {
      sessionStorage.setItem('alma-return', 'apply.html');
      showToast('Necesitás ingresar antes de enviar tu perfil.', '🔒', 'error');
      setTimeout(() => { window.location.href = 'login.html'; }, 1400);
      return;
    }

    /* Validate meeting link URL */
    const meetingLink = document.getElementById('meeting-link')?.value?.trim() || '';
    if (meetingLink && !isValidUrl(meetingLink)) {
      showToast('El link de videollamada no es una URL válida.', '❌', 'error');
      document.getElementById('meeting-link')?.focus();
      return;
    }

    btn.disabled    = true;
    btn.textContent = 'Enviando...';

    /* Collect form values */
    const fn    = document.getElementById('fn').value.trim();
    const ln    = document.getElementById('ln').value.trim();
    const email = document.getElementById('email')?.value?.trim()  || session.user.email || '';
    const phone = document.getElementById('phone')?.value?.trim()  || '';
    const svcEl = document.getElementById('svc-select');
    const svcId = svcEl.value;
    const spec  = svcEl.options[svcEl.selectedIndex]?.text || '';
    const price = parseInt(svcEl.options[svcEl.selectedIndex]?.dataset.fichas || 6);

    const sessionDuration = parseInt(document.getElementById('session-duration')?.value || 60);
    const modality        = currentModality;
    const meetingProvider = document.getElementById('meeting-provider-input')?.value || null;
    const locationAddress = document.getElementById('location-address')?.value?.trim() || '';

    const colorMap = { psicologia:'#E53935', psiquiatria:'#7B1FA2', nutricion:'#2E7D32', trainer:'#E65100', coaching:'#00695C', otro:'#455A64' };
    const iconMap  = { psicologia:'🧠', psiquiatria:'💊', nutricion:'🥗', trainer:'🏋️', coaching:'🎯', otro:'➕' };

    /* Build structured availability JSON */
    const availability = getAvailabilityJson();

    /* Build legacy schedule array (backward compat with old display code) */
    const scheduleArray = DAYS_ES
      .filter(d => enabledDays.has(d))
      .map(d => {
        const start = document.getElementById(`start-${d}`)?.value || '09:00';
        const end   = document.getElementById(`end-${d}`)?.value   || '18:00';
        return `${DAYS_FULL[d]} ${start}–${end}`;
      });

    const payload = {
      user_id:                session.user.id,
      name:                   `${fn} ${ln}`,
      email,
      phone,
      spec,
      svc_id:                 svcId,
      barrio:                 locationAddress || document.getElementById('ciudad')?.value || 'Montevideo',
      price,
      lat:                    -34.90 + (Math.random() * 0.04 - 0.02),
      lng:                    -56.16 + (Math.random() * 0.04 - 0.02),
      color:                  colorMap[svcId]  || colorMap.otro,
      icon:                   iconMap[svcId]   || iconMap.otro,
      uyu:                    '$' + (price * 400).toLocaleString('es-UY') + ' UYU',
      schedule:               scheduleArray,          // legacy text[]
      availability,                                   // new JSONB
      session_duration_minutes: sessionDuration,
      modality,
      meeting_provider:       meetingLink ? meetingProvider : null,
      meeting_link:           meetingLink || null,
      location_address:       locationAddress || null,
      status:                 'pending',
    };

    console.log('[apply] Attempting insert. User:', session.user.id, '| Modality:', modality);
    console.log('[apply] Availability:', JSON.stringify(availability));
    console.log('[apply] Meeting link:', meetingLink ? '(set)' : '(not set)');

    const { data: insertData, error: insertErr } = await window.supabase
      .from('professional_listings')
      .insert(payload)
      .select('id, status');

    if (insertErr) {
      console.error('[apply] Insert error code:', insertErr.code);
      console.error('[apply] Insert error message:', insertErr.message);
      console.error('[apply] Insert error details:', insertErr.details);
      // 42501 = RLS violation → schema not re-run in Supabase
      const hint = insertErr.code === '42501'
        ? ' (RLS: re-run supabase_schema.sql en Supabase SQL Editor)'
        : '';
      showToast('Error al enviar: ' + insertErr.message + hint, '❌', 'error');
      btn.disabled    = false;
      btn.textContent = 'Enviar perfil →';
      return;
    }

    console.log('[apply] Insert OK — id:', insertData?.[0]?.id, '| status: pending');

    /* Update profile role to 'pro' */
    const { error: roleErr } = await window.supabase
      .from('profiles')
      .update({ role: 'pro' })
      .eq('id', session.user.id);
    if (roleErr) console.warn('[apply] Role update warning:', roleErr.message);

    /* Success state */
    const success = document.getElementById('apply-success');
    if (success) {
      success.style.display = 'flex';
      this.querySelectorAll('.form-card:not(#apply-success)').forEach(c => c.style.display = 'none');
    }
    showToast('¡Perfil enviado! Te contactamos en 24–48hs.', '✓', 'success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});
