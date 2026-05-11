/* ─── Professional seed data ─── */
const PROS = [
  { id:0, name:'Lic. Valentina Suárez', spec:'Psicología',       lat:-34.9128, lng:-56.1506, color:'#E53935', icon:'🧠', price:'8+',  uyu:'$3.200', barrio:'Pocitos' },
  { id:1, name:'Dr. Rodrigo Mena',      spec:'Psiquiatría',      lat:-34.9060, lng:-56.1870, color:'#7B1FA2', icon:'💊', price:'12+', uyu:'$4.800', barrio:'Cordón' },
  { id:2, name:'Lic. Camila Ríos',      spec:'Nutrición',        lat:-34.9220, lng:-56.1550, color:'#2E7D32', icon:'🥗', price:'6+',  uyu:'$2.400', barrio:'Punta Carretas' },
  { id:3, name:'Agustín Ferreyra',      spec:'Personal Trainer', lat:-34.9080, lng:-56.1720, color:'#E65100', icon:'🏋️', price:'5+', uyu:'$2.000', barrio:'Parque Rodó' },
  { id:4, name:'Lucía Montoya',         spec:'Coaching',         lat:-34.9082, lng:-56.2020, color:'#00695C', icon:'🎯', price:'7+',  uyu:'$2.800', barrio:'Ciudad Vieja' },
  { id:5, name:'Lic. Ignacio Pereyra',  spec:'Psicología',       lat:-34.9001, lng:-56.1780, color:'#E53935', icon:'🧠', price:'8+',  uyu:'$3.200', barrio:'Aguada' },
  { id:6, name:'Lic. Sofía Álvarez',    spec:'Nutrición',        lat:-34.9000, lng:-56.1300, color:'#2E7D32', icon:'🥗', price:'6+',  uyu:'$2.400', barrio:'Malvín' },
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
        <div class="popup-info">📍 ${p.barrio}</div>
        <div class="popup-price">Precio: <strong style="color:#E53935">${p.price} fichas</strong> · ${p.uyu} UYU</div>
        <button class="popup-btn" onclick="openBookingPopup('${p.name}', ${parseInt(p.price)})">Ver horarios →</button>
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
async function bookSlot(evt, name, slot, price) {
  evt.stopPropagation();
  const user = JSON.parse(localStorage.getItem('alma_user') || 'null');

  if (!user || (!user.username && !user.email)) {
    showToast('Para reservar necesitás iniciar sesión', '🔒', 'info');
    setTimeout(() => { location.href = 'login.html'; }, 2000);
    return;
  }

  price = parseInt(price);
  if (user.fichas >= price || user.role === 'admin') {
    evt.target.disabled = true;
    evt.target.textContent = '...';

    if (window.supabase) {
      const { data: { session } } = await window.supabase.auth.getSession();
      if (session) {
        const { error } = await window.supabase
          .from('profiles')
          .update({ fichas: user.fichas - price })
          .eq('id', session.user.id);
        if (error) {
          showToast('Error al procesar reserva: ' + error.message, '❌', 'error');
          evt.target.disabled = false;
          evt.target.textContent = slot;
          return;
        }
      }
    }

    user.fichas -= price;
    localStorage.setItem('alma_user', JSON.stringify(user));
    showToast(`¡Reserva confirmada con ${name} para el ${slot}!`, '🎉', 'success');
    evt.target.style.background   = '#4CAF50';
    evt.target.style.borderColor  = '#4CAF50';
    evt.target.style.color        = 'white';
    evt.target.textContent        = 'Reservado ✓';

    const fNum = document.querySelector('.fichas-widget .f-num');
    if (fNum) fNum.innerHTML = `${user.fichas}<span style="font-size:1.4rem">+</span>`;
  } else {
    showToast(`No tenés fichas suficientes. Cuesta ${price}+ y tenés ${user.fichas}+`, '⚠️', 'error');
    setTimeout(() => { location.href = 'payment.html'; }, 2500);
  }
}

function openBookingPopup(name, price) {
  if (event) event.stopPropagation();
  const modal = document.getElementById('booking-modal');
  document.getElementById('booking-info').innerHTML =
    `Con ${name} <br><span style="color:var(--red);font-size:0.9rem">${price} fichas</span>`;
  document.getElementById('booking-slots').innerHTML = `
    <button class="prof-slot" style="font-size:0.9rem;padding:8px 16px"
      onclick="bookSlot(event,'${name}','Hoy 15:00',${price}); setTimeout(()=>document.getElementById('booking-modal').style.display='none',1500)">Hoy 15:00</button>
    <button class="prof-slot" style="font-size:0.9rem;padding:8px 16px"
      onclick="bookSlot(event,'${name}','Mañana 10:00',${price}); setTimeout(()=>document.getElementById('booking-modal').style.display='none',1500)">Mañ 10:00</button>
    <button class="prof-slot" style="font-size:0.9rem;padding:8px 16px"
      onclick="bookSlot(event,'${name}','Jueves 16:30',${price}); setTimeout(()=>document.getElementById('booking-modal').style.display='none',1500)">Jue 16:30</button>
  `;
  modal.style.display = 'flex';
}

/* ─── Admin modal ─── */
function closeAdminModal() {
  document.getElementById('admin-modal').style.display = 'none';
}

function saveCustomPro(e) {
  e.preventDefault();
  const fileInput  = document.getElementById('ap-photo');
  const name       = document.getElementById('ap-name').value;
  const svcEl      = document.getElementById('ap-svc');
  const svcId      = svcEl.value;
  const specLabel  = svcEl.options[svcEl.selectedIndex].text;
  const barrio     = document.getElementById('ap-barrio').value;
  const price      = document.getElementById('ap-price').value;

  const colorMap = { psicologia: '#E53935', psiquiatria: '#7B1FA2', nutricion: '#2E7D32', trainer: '#E65100', coaching: '#00695C' };
  const iconMap  = { psicologia: '🧠', psiquiatria: '💊', nutricion: '🥗', trainer: '🏋️', coaching: '🎯' };

  const proInfo = {
    name, svcId, spec: specLabel, barrio, price,
    lat:   -34.90 + (Math.random() * 0.04 - 0.02),
    lng:   -56.16 + (Math.random() * 0.04 - 0.02),
    color: colorMap[svcId] || '#455A64',
    icon:  iconMap[svcId]  || '➕',
    uyu:   '$' + (price * 400).toLocaleString('es-UY') + ' UYU',
  };

  if (fileInput.files && fileInput.files[0]) {
    const reader = new FileReader();
    reader.onload = evt => { proInfo.photo = evt.target.result; finishSavePro(proInfo); };
    reader.readAsDataURL(fileInput.files[0]);
  } else {
    finishSavePro(proInfo);
  }
}

function finishSavePro(p) {
  const customPros = JSON.parse(localStorage.getItem('alma_custom_pros') || '[]');
  customPros.push(p);
  localStorage.setItem('alma_custom_pros', JSON.stringify(customPros));
  closeAdminModal();
  document.getElementById('admin-form').reset();
  showToast('Profesional agregado con éxito', '✅', 'success');
  location.reload();
}

/* ─── Load professionals from localStorage ─── */
function loadCustomPros() {
  const customPros = JSON.parse(localStorage.getItem('alma_custom_pros') || '[]');
  const list = document.getElementById('prof-list');

  customPros.forEach(p => {
    const newId = PROS.length;
    p.id = newId;
    PROS.push(p);

    const iconContent = p.photo
      ? `<img src="${p.photo}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`
      : p.icon;

    const m = L.marker([p.lat, p.lng], {
      icon: L.divIcon({
        className: '',
        html: `<div style="width:36px;height:36px;background:${p.color};border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 3px 12px rgba(0,0,0,0.25);overflow:hidden">${iconContent}</div>`,
        iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -20],
      }),
    }).addTo(map).bindPopup(`
      <div style="min-width:180px">
        <div style="font-weight:700;font-size:0.9rem;margin-bottom:2px">${p.icon} ${p.name}</div>
        <div class="popup-spec">${p.spec}</div>
        <div class="popup-info">📍 ${p.barrio}</div>
        <div class="popup-price">Precio: <strong style="color:#E53935">${p.price}+ fichas</strong> · ${p.uyu}</div>
        <button class="popup-btn" onclick="openBookingPopup('${p.name}',${p.price})">Ver horarios →</button>
      </div>
    `);
    markers.push(m);

    const card = document.createElement('div');
    card.className = 'prof-card reveal visible';
    card.dataset.svc = p.svcId;
    card.dataset.id  = newId;
    card.onclick = () => highlightMap(newId);
    card.innerHTML = `
      <div class="prof-avatar" style="background:${p.color};overflow:hidden;border-color:${p.color}">${iconContent}</div>
      <div>
        <div class="prof-name">${p.name} <span class="badge badge-red" style="padding:2px 6px;font-size:0.6rem;margin-left:4px">NUEVO</span></div>
        <div class="prof-spec">${p.spec}</div>
        <div class="prof-meta">
          <span>⭐ 5.0 (Nuevo)</span><span>🖥 Online / Presencial</span><span>📍 ${p.barrio}</span>
        </div>
        <div style="font-size:0.73rem;color:var(--text-2);font-weight:500;margin-top:8px">Próximos turnos:</div>
        <div class="prof-slots">
          ${p.schedule && p.schedule.length > 0
            ? p.schedule.slice(0, 4).map(s => `<button class="prof-slot" onclick="bookSlot(event,'${p.name}','${s}',${p.price})">${s}</button>`).join('')
            : `<button class="prof-slot" onclick="bookSlot(event,'${p.name}','Hoy 10:00',${p.price})">Hoy 10:00</button>
               <button class="prof-slot" onclick="bookSlot(event,'${p.name}','Mañ 15:00',${p.price})">Mañ 15:00</button>`
          }
        </div>
      </div>
      <div class="prof-right">
        <div class="prof-price"><span class="ficha"><span class="symbol">+</span>${p.price}</span><small>/ sesión<div class="uyu">${p.uyu}</div></small></div>
        <div class="avail"><span class="dot"></span>Disponible</div>
        <button class="btn btn-primary btn-sm" onclick="openBookingPopup('${p.name}',${p.price});event.stopPropagation()">Reservar</button>
      </div>
    `;
    list.prepend(card);
  });

  applyFilter();
}

/* ─── Init ─── */
document.addEventListener('DOMContentLoaded', () => {
  const user = JSON.parse(localStorage.getItem('alma_user') || '{"fichas":0}');

  // Admin button visibility
  if (user.role === 'admin') {
    const adminBtn = document.getElementById('admin-btn');
    if (adminBtn) adminBtn.style.display = 'flex';
  }

  // Fichas widget
  const fNum = document.querySelector('.fichas-widget .f-num');
  if (fNum) fNum.innerHTML = `${user.fichas || 0}<span style="font-size:1.4rem">+</span>`;

  // Load custom pros from localStorage
  loadCustomPros();

  // Search input — Enter key
  document.getElementById('search-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') doSearch();
  });

  // Pagination buttons
  document.querySelectorAll('.page-btn').forEach(b => {
    b.addEventListener('click', function () {
      document.querySelectorAll('.page-btn').forEach(x => x.classList.remove('active'));
      this.classList.add('active');
    });
  });

  // Pre-fill filter from URL param ?s=specialty
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
