/* ═══════════════════════════════════════════════════════════════════════════
   professionals.js  ·  alma+  v25
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── Query logger ─── */
function logQ(table, extra) {
  console.log(`[professionals] ▶ query: ${table}${extra ? ' · ' + extra : ''}`);
}
function logQR(table, data, error) {
  if (error) {
    console.error(`[professionals] ✗ ${table} ERROR`,
      '\n  code:', error.code, '\n  message:', error.message,
      '\n  details:', error.details, '\n  hint:', error.hint);
  } else {
    console.log(`[professionals] ✓ ${table} — rows:`, Array.isArray(data) ? data.length : (data ? 1 : 0));
  }
}

/* ─── Availability helpers ─── */
const DAYS_ES_PROS = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];
const DAY_SHORT_PROS = { lunes:'Lun', martes:'Mar', miercoles:'Mié', jueves:'Jue', viernes:'Vie', sabado:'Sáb', domingo:'Dom' };

/**
 * Returns human-readable availability string.
 * e.g.  "Lun, Mié, Vie · 09:00–18:00"
 * If days have different hours, shows a compact range summary.
 */
function formatAvailability(avail) {
  if (!avail || typeof avail !== 'object') return null;
  const enabled = DAYS_ES_PROS.filter(d => avail[d]?.enabled);
  if (!enabled.length) return null;

  const dayLabels = enabled.map(d => DAY_SHORT_PROS[d]);

  // Check if all have the same hours (common case)
  const hours = enabled.map(d => `${avail[d].start}–${avail[d].end}`);
  const sameHours = hours.every(h => h === hours[0]);

  let str = dayLabels.join(', ');
  if (sameHours) {
    str += ` · ${hours[0]}`;
  } else {
    // Show the earliest start → latest end
    const starts = enabled.map(d => avail[d].start).sort();
    const ends   = enabled.map(d => avail[d].end).sort();
    str += ` · ${starts[0]}–${ends[ends.length - 1]}`;
  }
  return str;
}

/**
 * Generates up to maxSlots upcoming time slots from availability JSONB.
 * Returns array of { label: string, iso: string }
 */
function generateSlotsFromAvail(avail, sessionDuration, maxSlots) {
  if (!avail) return [];
  maxSlots        = maxSlots        || 5;
  sessionDuration = sessionDuration || 60;

  const today  = new Date();
  today.setHours(0, 0, 0, 0);
  const slots  = [];
  const DAY_KEYS = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];

  for (let offset = 0; offset < 14 && slots.length < maxSlots; offset++) {
    const d   = new Date(today);
    d.setDate(d.getDate() + offset);
    const key = DAY_KEYS[d.getDay()];
    const dayA = avail[key];
    if (!dayA?.enabled) continue;

    const [sh, sm] = dayA.start.split(':').map(Number);
    const [eh, em] = dayA.end.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins   = eh * 60 + em;

    for (let t = startMins; t + sessionDuration <= endMins && slots.length < maxSlots; t += sessionDuration) {
      const hh    = String(Math.floor(t / 60)).padStart(2, '0');
      const mm    = String(t % 60).padStart(2, '0');
      const label = offset === 0 ? `Hoy ${hh}:${mm}`
                  : offset === 1 ? `Mañ ${hh}:${mm}`
                  : `${d.getDate()}/${d.getMonth() + 1} ${hh}:${mm}`;
      const iso   = `${d.toISOString().split('T')[0]}T${hh}:${mm}:00`;
      slots.push({ label, iso });
    }
  }
  return slots;
}

/**
 * Returns modality badge HTML.
 */
function modalityBadge(modality) {
  if (!modality) return '';
  const map = {
    online:     '<span class="badge badge-online">Online</span>',
    presencial: '<span class="badge badge-presencial">Presencial</span>',
    both:       '<span class="badge badge-online">Online</span><span class="badge badge-presencial">Presencial</span>',
  };
  return map[modality] || '';
}

/* ─── Pro data registry (for booking flow) ─── */
// Maps listing UUID → { name, price, availability, sessionDuration, modality, listingId }
const _proRegistry = {};

/* ─── Hardcoded seed professionals (always shown on map) ─── */
const PROS = [
  { id:0, name:'Lic. Valentina Suárez', spec:'Psicología',       lat:-34.9128, lng:-56.1506, color:'#E53935', icon:'🧠', price:8,  uyu:'$3.200', barrio:'Pocitos',        svcId:'psicologia',  modality:'online' },
  { id:1, name:'Dr. Rodrigo Mena',      spec:'Psiquiatría',      lat:-34.9060, lng:-56.1870, color:'#7B1FA2', icon:'💊', price:12, uyu:'$4.800', barrio:'Cordón',          svcId:'psiquiatria', modality:'presencial' },
  { id:2, name:'Lic. Camila Ríos',      spec:'Nutrición',        lat:-34.9220, lng:-56.1550, color:'#2E7D32', icon:'🥗', price:6,  uyu:'$2.400', barrio:'Punta Carretas',  svcId:'nutricion',   modality:'both' },
  { id:3, name:'Agustín Ferreyra',      spec:'Personal Trainer', lat:-34.9080, lng:-56.1720, color:'#E65100', icon:'🏋️', price:5, uyu:'$2.000', barrio:'Parque Rodó',     svcId:'trainer',     modality:'presencial' },
  { id:4, name:'Lucía Montoya',         spec:'Coaching',         lat:-34.9082, lng:-56.2020, color:'#00695C', icon:'🎯', price:7,  uyu:'$2.800', barrio:'Ciudad Vieja',    svcId:'coaching',    modality:'online' },
  { id:5, name:'Lic. Ignacio Pereyra',  spec:'Psicología',       lat:-34.9001, lng:-56.1780, color:'#E53935', icon:'🧠', price:8,  uyu:'$3.200', barrio:'Aguada',          svcId:'psicologia',  modality:'both' },
  { id:6, name:'Lic. Sofía Álvarez',    spec:'Nutrición',        lat:-34.9000, lng:-56.1300, color:'#2E7D32', icon:'🥗', price:6,  uyu:'$2.400', barrio:'Malvín',          svcId:'nutricion',   modality:'online' },
];

/* ─── Map ─── */
const map = L.map('map', { center: [-34.9082, -56.1720], zoom: 13, zoomControl: true });
let currentLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© <a href="https://openstreetmap.org">OSM</a>', maxZoom: 19,
}).addTo(map);

function makeIcon(color, emoji) {
  return L.divIcon({
    className: '',
    html: `<div style="width:36px;height:36px;background:${color};border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 3px 12px rgba(0,0,0,0.25);cursor:pointer;">${emoji}</div>`,
    iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -20],
  });
}

const markers = [];
PROS.forEach(p => {
  const m = L.marker([p.lat, p.lng], { icon: makeIcon(p.color, p.icon) })
    .addTo(map)
    .bindPopup(`
      <div style="min-width:180px">
        <div style="font-weight:700;font-size:0.9rem;margin-bottom:2px">${p.icon} ${p.name}</div>
        <div class="popup-spec">${p.spec}</div>
        <div class="popup-info" style="display:flex;align-items:center;gap:4px">
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          ${p.barrio}
        </div>
        <div class="popup-price">Precio: <strong style="color:#E53935">${p.price}+ fichas</strong> · ${p.uyu} UYU</div>
        <button class="popup-btn" onclick="openBookingPopup('${p.name}', ${p.price})">Ver horarios →</button>
      </div>
    `);
  markers.push(m);
});

function setMapView(type) {
  document.querySelectorAll('.map-toggle-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  map.removeLayer(currentLayer);
  if (type === 'satellite') {
    currentLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }).addTo(map);
  } else {
    currentLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
  }
}

function highlightMap(id) {
  document.querySelectorAll('.prof-card').forEach(c => c.classList.remove('highlighted'));
  event?.currentTarget?.classList.add('highlighted');
  if (markers[id]) {
    markers[id].openPopup();
    map.setView([PROS[id].lat, PROS[id].lng], 15, { animate: true });
  }
}

/* ─── Filters ─── */
function applyFilter() {
  const svc = document.getElementById('filter-svc').value;
  let count = 0;
  document.querySelectorAll('.prof-card').forEach(c => {
    const show = !svc || c.dataset.svc === svc;
    c.style.display = show ? '' : 'none';
    if (show) count++;
    const id = parseInt(c.dataset.id);
    if (markers[id]) markers[id].setOpacity(show ? 1 : 0.2);
  });
  document.getElementById('result-count').textContent = count;
}

function filterChip(el, svc) {
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('filter-svc').value = svc;
  applyFilter();
}

function clearFilters() {
  document.getElementById('filter-svc').value = '';
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  document.querySelector('.chip').classList.add('active');
  applyFilter();
}

function doSearch() {
  const q = document.getElementById('search-input').value.toLowerCase();
  let count = 0;
  document.querySelectorAll('.prof-card').forEach(c => {
    const show = !q || c.textContent.toLowerCase().includes(q);
    c.style.display = show ? '' : 'none';
    if (show) count++;
    const id = parseInt(c.dataset.id);
    if (markers[id]) markers[id].setOpacity(show ? 1 : 0.2);
  });
  document.getElementById('result-count').textContent = count;
}

/* ─── Booking ─── */
/**
 * Book a slot with a professional.
 * @param {Event}  evt        - Click event (to update button state)
 * @param {string} name       - Professional's display name
 * @param {string} slotLabel  - Human label shown to user ("Hoy 09:00")
 * @param {number} price      - Cost in fichas
 * @param {string} isoTime    - ISO datetime string ("2026-05-15T09:00:00") or null
 * @param {string} listingId  - Supabase listing UUID or null (hardcoded pros)
 */
async function bookSlot(evt, name, slotLabel, price, isoTime, listingId) {
  evt.stopPropagation();
  price = parseInt(price);

  if (!window.supabase) {
    showToast('Error de conexión con el servidor', '❌', 'error');
    return;
  }

  const { data: { session } } = await window.supabase.auth.getSession();
  if (!session) {
    console.log('[professionals] bookSlot: no session → prompting login');
    showToast('Para reservar necesitás iniciar sesión', '🔒', 'info');
    setTimeout(() => { location.href = 'login.html?return=professionals.html'; }, 2000);
    return;
  }

  /* Load user balance */
  logQ('profiles', `select(fichas,role) for booking user=${session.user.id}`);
  const { data: profile, error: profileErr } = await window.supabase
    .from('profiles')
    .select('fichas, role')
    .eq('id', session.user.id)
    .single();
  logQR('profiles (booking)', profile, profileErr);

  if (profileErr || !profile) {
    showToast('Error al verificar tu cuenta', '❌', 'error');
    return;
  }

  const isAdmin   = profile.role === 'admin';
  const hasFichas = profile.fichas >= price;

  if (!hasFichas && !isAdmin) {
    showToast(`No tenés fichas suficientes. Cuesta ${price}+ y tenés ${profile.fichas}+`, '⚠️', 'error');
    setTimeout(() => { location.href = 'payment.html'; }, 2500);
    return;
  }

  evt.target.disabled    = true;
  evt.target.textContent = '...';

  /* Fetch meeting_link from listing (only at booking time — never shown publicly) */
  let meetingLink    = null;
  let bookingModality = null;
  if (listingId) {
    const { data: listingRow } = await window.supabase
      .from('professional_listings')
      .select('meeting_link, modality')
      .eq('id', listingId)
      .single();
    meetingLink     = listingRow?.meeting_link  || null;
    bookingModality = listingRow?.modality      || null;
  }

  /* Deduct fichas */
  const newFichas = isAdmin ? profile.fichas : profile.fichas - price;
  logQ('profiles UPDATE', `fichas=${newFichas} user=${session.user.id}`);
  const { error: updateErr } = await window.supabase
    .from('profiles')
    .update({ fichas: newFichas })
    .eq('id', session.user.id);
  logQR('profiles UPDATE (fichas)', null, updateErr);

  if (updateErr) {
    showToast('Error al procesar reserva: ' + updateErr.message, '❌', 'error');
    evt.target.disabled    = false;
    evt.target.textContent = slotLabel;
    return;
  }

  /* Create booking row — uses real schema column names (v23 fix) */
  logQ('bookings INSERT', `pro=${name} slot=${slotLabel}`);
  const { error: bkInsertErr } = await window.supabase.from('bookings').insert({
    patient_id:          session.user.id,
    listing_id:          listingId   || null,
    professional_name:   name,          // real column (was: pro_name)
    session_datetime:    slotLabel,     // real column (was: slot)
    fichas_spent:        isAdmin ? 0 : price,
    scheduled_at:        isoTime     ? new Date(isoTime).toISOString() : null,
    modality:            bookingModality,
    meeting_link:        meetingLink,
  });
  logQR('bookings INSERT', null, bkInsertErr);

  /* Update fichas widget */
  const fNum = document.querySelector('.fichas-widget .f-num');
  if (fNum) fNum.innerHTML = `${newFichas}<span style="font-size:1.4rem">+</span>`;

  /* Mark button as booked */
  evt.target.style.background  = '#4CAF50';
  evt.target.style.borderColor = '#4CAF50';
  evt.target.style.color       = 'white';
  evt.target.textContent       = 'Reservado ✓';

  /* Close booking modal and open confirmation */
  document.getElementById('booking-modal').style.display = 'none';
  showBookingConfirm({
    proName:     name,
    slotLabel,
    isoTime,
    modality:    bookingModality,
    meetingLink,
  });
}

/**
 * Opens the booking modal for a professional.
 * For Supabase-loaded pros, pass the listingId to look up registry data.
 * For hardcoded pros, only name + price are available.
 */
function openBookingPopup(name, price, listingId) {
  if (event) event.stopPropagation();

  const modal = document.getElementById('booking-modal');
  document.getElementById('booking-info').innerHTML =
    `Con <strong>${name}</strong><br><span style="color:var(--red);font-size:0.9rem">${price} fichas / sesión</span>`;

  const slotsEl = document.getElementById('booking-slots');
  const reg     = listingId ? _proRegistry[listingId] : null;

  let slotsHtml = '';

  if (reg && reg.availability) {
    /* Dynamic slots from availability JSONB */
    const slots = generateSlotsFromAvail(reg.availability, reg.sessionDuration, 6);
    if (slots.length) {
      slotsHtml = slots.map(s =>
        `<button class="prof-slot"
           onclick="bookSlot(event,'${esc(name)}','${s.label}',${price},'${s.iso}','${listingId}')"
         >${s.label}</button>`
      ).join('');
    } else {
      slotsHtml = `<p style="font-size:0.82rem;color:var(--text-2);grid-column:1/-1">Sin turnos disponibles en los próximos 14 días.</p>`;
    }
  } else {
    /* Fallback static slots for hardcoded pros */
    const today   = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const fallback = [
      { label: 'Hoy 10:00',                  iso: null },
      { label: 'Hoy 15:00',                  iso: null },
      { label: `${tomorrow.getDate()}/${tomorrow.getMonth()+1} 10:00`, iso: null },
    ];
    slotsHtml = fallback.map(s =>
      `<button class="prof-slot"
         onclick="bookSlot(event,'${esc(name)}','${s.label}',${price},null,null)"
       >${s.label}</button>`
    ).join('');
  }

  slotsEl.innerHTML = slotsHtml;
  modal.style.display = 'flex';
}

/** Escape single quotes in names for use inside onclick strings */
function esc(str) { return String(str).replace(/'/g, "\\'"); }

/* ─── Booking confirmation overlay ─── */
function showBookingConfirm({ proName, slotLabel, isoTime, modality, meetingLink }) {
  const MODALITY_LABELS = { online:'Online (videollamada)', presencial:'Presencial', both:'Online / Presencial' };
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="confirm-card">
      <div class="confirm-check">
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <h2 class="confirm-title">¡Reserva confirmada!</h2>
      <div class="confirm-details">
        <div class="confirm-row"><span>Profesional</span><strong>${proName}</strong></div>
        <div class="confirm-row"><span>Fecha y hora</span><strong>${slotLabel}</strong></div>
        ${modality ? `<div class="confirm-row"><span>Modalidad</span><strong>${MODALITY_LABELS[modality]||modality}</strong></div>` : ''}
        ${meetingLink ? `<div class="confirm-row"><span>Link de sesión</span>
          <a href="${meetingLink}" target="_blank" rel="noopener" class="confirm-link">Abrir videollamada →</a></div>` : ''}
      </div>
      <div class="confirm-actions">
        ${isoTime ? `<button class="btn btn-outline btn-sm" onclick="addToGCalPros('${esc(proName)}','${isoTime}','${meetingLink||''}')">
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          Agregar al calendario
        </button>` : ''}
        <a href="dashboard.html" class="btn btn-primary btn-sm">Ver mis sesiones →</a>
      </div>
      <button class="confirm-dismiss" onclick="this.closest('.confirm-overlay').remove()">Cerrar</button>
    </div>
  `;
  document.body.appendChild(overlay);
  setTimeout(() => overlay.querySelector('.confirm-card')?.classList.add('confirm-card--visible'), 10);
}

function addToGCalPros(proName, isoTime, meetingLink) {
  if (!isoTime) return;
  const s = new Date(isoTime);
  const e = new Date(s.getTime() + 60 * 60000);
  const fmt = d => d.toISOString().replace(/[-:.]/g,'').slice(0,15) + 'Z';
  const p = new URLSearchParams({ action:'TEMPLATE', text:`Sesión con ${proName} · alma+`,
    dates:`${fmt(s)}/${fmt(e)}`, details:meetingLink||'', location:meetingLink||'' });
  window.open(`https://calendar.google.com/calendar/render?${p}`, '_blank');
}

/* ─── Admin modal ─── */
function closeAdminModal() {
  document.getElementById('admin-modal').style.display = 'none';
}

function saveCustomPro(e) {
  e.preventDefault();
  const name      = document.getElementById('ap-name').value;
  const svcEl     = document.getElementById('ap-svc');
  const svcId     = svcEl.value;
  const specLabel = svcEl.options[svcEl.selectedIndex].text;
  const barrio    = document.getElementById('ap-barrio').value;
  const price     = document.getElementById('ap-price').value;

  const colorMap = { psicologia: '#E53935', psiquiatria: '#7B1FA2', nutricion: '#2E7D32', trainer: '#E65100', coaching: '#00695C' };
  const iconMap  = { psicologia: '🧠', psiquiatria: '💊', nutricion: '🥗', trainer: '🏋️', coaching: '🎯' };

  const proInfo = {
    name, svcId, spec: specLabel, barrio, price: parseInt(price),
    lat:   -34.90 + (Math.random() * 0.04 - 0.02),
    lng:   -56.16 + (Math.random() * 0.04 - 0.02),
    color: colorMap[svcId] || '#455A64',
    icon:  iconMap[svcId]  || '➕',
    uyu:   '$' + (price * 400).toLocaleString('es-UY') + ' UYU',
  };

  finishSavePro(proInfo);
}

async function finishSavePro(p) {
  if (!window.supabase) {
    showToast('Error de conexión', '❌', 'error');
    return;
  }

  const { data: { session } } = await window.supabase.auth.getSession();

  const { error } = await window.supabase
    .from('professional_listings')
    .insert({
      user_id:  session?.user?.id || null,
      name:     p.name,
      spec:     p.spec,
      svc_id:   p.svcId,
      barrio:   p.barrio,
      price:    p.price,
      lat:      p.lat,
      lng:      p.lng,
      color:    p.color,
      icon:     p.icon,
      uyu:      p.uyu,
      schedule: p.schedule || [],
      status:   'approved',
    });

  if (error) {
    showToast('Error al guardar profesional: ' + error.message, '❌', 'error');
    return;
  }

  closeAdminModal();
  document.getElementById('admin-form').reset();
  showToast('Profesional agregado con éxito', '✓', 'success');
  location.reload();
}

/* ─── Load additional professionals from Supabase ─── */
async function loadCustomPros() {
  if (!window.supabase) {
    console.warn('[professionals] loadCustomPros: supabase not ready, skipping');
    return;
  }

  /* Use select('*') — safe even if some columns don't exist yet.
     meeting_link is excluded from display elsewhere (privacy). */
  logQ('professional_listings', "select(*) status=approved order:created_at desc");
  const { data: listings, error } = await window.supabase
    .from('professional_listings')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });
  logQR('professional_listings', listings, error);

  if (error) {
    console.error('[professionals] loadCustomPros FAILED — likely missing table or column.');
    console.error('[professionals] Fix: run supabase_migration_v19.sql in your Supabase SQL editor.');
    /* Show a non-blocking notice in the listing area */
    const list = document.getElementById('prof-list');
    if (list) {
      const notice = document.createElement('div');
      notice.style.cssText = 'background:#fff8f0;border:1.5px solid #fed7aa;border-radius:12px;padding:14px 18px;font-size:0.82rem;color:#92400e;margin-bottom:16px';
      notice.innerHTML = `<strong>Aviso:</strong> No se pudieron cargar profesionales de Supabase (${error.code}: ${error.message}). Los profesionales de ejemplo siguen disponibles.`;
      list.prepend(notice);
    }
    return;
  }
  console.log('[professionals] loadCustomPros: loaded', listings?.length ?? 0, 'approved listings');
  if (!listings || !listings.length) return;

  const list = document.getElementById('prof-list');

  listings.forEach(p => {
    const newId = PROS.length;

    const proData = {
      id:              newId,
      listingId:       p.id,
      name:            p.name,
      spec:            p.spec,
      svcId:           p.svc_id,
      barrio:          p.barrio || 'Montevideo',
      price:           p.price,
      lat:             p.lat   || (-34.90 + Math.random() * 0.04 - 0.02),
      lng:             p.lng   || (-56.16 + Math.random() * 0.04 - 0.02),
      color:           p.color || '#455A64',
      icon:            p.icon  || '➕',
      uyu:             p.uyu   || ('$' + (p.price * 400).toLocaleString('es-UY') + ' UYU'),
      schedule:        p.schedule || [],
      availability:    p.availability || null,
      sessionDuration: p.session_duration_minutes || 60,
      modality:        p.modality || 'online',
      locationAddress: p.location_address || null,
    };
    PROS.push(proData);

    /* Register in registry for booking modal */
    _proRegistry[p.id] = proData;

    /* ── Map marker ── */
    const m = L.marker([proData.lat, proData.lng], {
      icon: L.divIcon({
        className: '',
        html: `<div style="width:36px;height:36px;background:${proData.color};border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 3px 12px rgba(0,0,0,0.25)">${proData.icon}</div>`,
        iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -20],
      }),
    }).addTo(map).bindPopup(`
      <div style="min-width:180px">
        <div style="font-weight:700;font-size:0.9rem;margin-bottom:2px">${proData.icon} ${proData.name}</div>
        <div class="popup-spec">${proData.spec}</div>
        <div class="popup-info" style="display:flex;align-items:center;gap:4px">
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          ${proData.barrio}
        </div>
        <div class="popup-price">Precio: <strong style="color:#E53935">${proData.price}+ fichas</strong> · ${proData.uyu}</div>
        <a href="profile.html?id=${p.id}" class="popup-btn" style="display:block;text-align:center;text-decoration:none;margin-bottom:6px">Ver perfil completo →</a>
        <button class="popup-btn" onclick="openBookingPopup('${esc(proData.name)}',${proData.price},'${p.id}')">Reservar ahora</button>
      </div>
    `);
    markers.push(m);

    /* ── Availability display ── */
    const availStr   = formatAvailability(proData.availability);
    const availHtml  = availStr
      ? `<div class="prof-avail-block">${availStr}</div>`
      : '';

    /* ── Slot buttons ── */
    let slotBtns = '';
    if (proData.availability) {
      const slots = generateSlotsFromAvail(proData.availability, proData.sessionDuration, 4);
      slotBtns = slots.length
        ? slots.map(s =>
            `<button class="prof-slot" onclick="bookSlot(event,'${esc(proData.name)}','${s.label}',${proData.price},'${s.iso}','${p.id}')">${s.label}</button>`
          ).join('')
        : `<span style="font-size:0.8rem;color:var(--text-2)">Sin turnos próximos</span>`;
    } else if (proData.schedule && proData.schedule.length) {
      slotBtns = proData.schedule.slice(0, 4).map(s =>
        `<button class="prof-slot" onclick="bookSlot(event,'${esc(proData.name)}','${s}',${proData.price},null,'${p.id}')">${s}</button>`
      ).join('');
    } else {
      slotBtns = `<button class="prof-slot" onclick="bookSlot(event,'${esc(proData.name)}','Hoy 10:00',${proData.price},null,'${p.id}')">Hoy 10:00</button>
                  <button class="prof-slot" onclick="bookSlot(event,'${esc(proData.name)}','Mañ 15:00',${proData.price},null,'${p.id}')">Mañ 15:00</button>`;
    }

    /* ── Card initials avatar ── */
    const parts    = proData.name.replace(/^(Lic\.|Dr\.|Prof\.|Mg\.)\s*/i, '').split(' ');
    const initials = ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';

    /* ── Modality meta ── */
    const modalityMeta = {
      online:     'Online',
      presencial: `Presencial · ${proData.locationAddress || proData.barrio}`,
      both:       `Online y Presencial · ${proData.locationAddress || proData.barrio}`,
    }[proData.modality] || proData.modality;

    /* ── Prof card ── */
    const card = document.createElement('div');
    card.className      = 'prof-card reveal visible';
    card.dataset.svc    = proData.svcId;
    card.dataset.id     = newId;
    card.onclick        = () => highlightMap(newId);
    card.innerHTML = `
      <div class="prof-avatar" style="background:${proData.color};border-color:${proData.color}">${initials}</div>
      <div>
        <div class="prof-name">
          ${proData.name}
          <span class="badge badge-red" style="padding:2px 6px;font-size:0.6rem;margin-left:4px">NUEVO</span>
        </div>
        <div class="prof-spec">${proData.spec}</div>
        <div class="prof-meta">
          <span>
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            5.0 (Nuevo)
          </span>
          <span>${modalityBadge(proData.modality)}</span>
          <span>
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            ${proData.barrio}
          </span>
        </div>
        ${availHtml}
        <div style="font-size:0.73rem;color:var(--text-2);font-weight:500;margin-top:8px">Próximos turnos:</div>
        <div class="prof-slots">${slotBtns}</div>
      </div>
      <div class="prof-right">
        <div class="prof-price">
          <span class="ficha"><span class="symbol">+</span>${proData.price}</span>
          <small>/ sesión<div class="uyu">${proData.uyu}</div></small>
        </div>
        <div class="avail"><span class="dot"></span>Disponible</div>
        <button class="btn btn-primary btn-sm" onclick="openBookingPopup('${esc(proData.name)}',${proData.price},'${p.id}');event.stopPropagation()">Reservar</button>
      </div>
    `;
    list.prepend(card);
  });

  applyFilter();
}

/* ─── Init ─── */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[professionals] ══ DOMContentLoaded ══ v20 — public page, no auth required');
  console.log('[professionals] pathname:', location.pathname, '· href:', location.href);
  // Load logged-in user's fichas and role from Supabase (optional, never blocks)
  if (window.supabase) {
    const { data: { session } } = await window.supabase.auth.getSession();
    console.log('[professionals] session:', session ? session.user.email : 'none (not logged in)');
    if (session) {
      logQ('profiles', `select(fichas,role) id=${session.user.id}`);
      const { data: profile, error: pErr } = await window.supabase
        .from('profiles')
        .select('fichas, role')
        .eq('id', session.user.id)
        .single();
      logQR('profiles', profile, pErr);

      if (!pErr && profile) {
        const fNum = document.querySelector('.fichas-widget .f-num');
        if (fNum) fNum.innerHTML = `${profile.fichas}<span style="font-size:1.4rem">+</span>`;

        if (profile.role === 'admin') {
          const adminBtn = document.getElementById('admin-btn');
          if (adminBtn) adminBtn.style.display = 'flex';
        }
      }
    }
  }

  await loadCustomPros();

  document.getElementById('search-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') doSearch();
  });

  document.querySelectorAll('.page-btn').forEach(b => {
    b.addEventListener('click', function () {
      document.querySelectorAll('.page-btn').forEach(x => x.classList.remove('active'));
      this.classList.add('active');
    });
  });

  const sp = new URLSearchParams(location.search).get('s');
  if (sp) {
    const svcEl = document.getElementById('filter-svc');
    if (svcEl) svcEl.value = sp;
    document.querySelectorAll('.chip').forEach(c => {
      const onclick = c.getAttribute('onclick') || '';
      c.classList.toggle('active', onclick.includes(`'${sp}'`));
    });
    applyFilter();
  }
});
