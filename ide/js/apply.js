/* ─── Calendar ─── */
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const TIMES  = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'];

// Use current month instead of a hardcoded date
const today = new Date(); today.setHours(0, 0, 0, 0);
let currentDate = new Date(today.getFullYear(), today.getMonth(), 1);
let selectedDays  = new Set();
let selectedTimes = new Set();

function renderCalendar() {
  const y = currentDate.getFullYear();
  const m = currentDate.getMonth();
  document.getElementById('cal-month-label').textContent = MONTHS[m] + ' ' + y;

  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const grid = document.getElementById('cal-days');
  grid.innerHTML = '';

  for (let i = 0; i < firstDay; i++) {
    const el = document.createElement('div');
    el.className = 'cal-day cal-empty';
    grid.appendChild(el);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const el = document.createElement('div');
    const thisDate = new Date(y, m, d);
    thisDate.setHours(0, 0, 0, 0);
    const key = `${y}-${m + 1}-${d}`;

    el.className = 'cal-day';
    if (thisDate < today)                            el.classList.add('cal-past');
    if (thisDate.getTime() === today.getTime())      el.classList.add('today');
    if (selectedDays.has(key)) {
      el.classList.add('available');
      el.innerHTML = `${d}<div class='dot-avail'></div>`;
    } else {
      el.textContent = d;
    }

    if (!el.classList.contains('cal-past')) {
      el.addEventListener('click', () => toggleDay(key, el, d));
    }
    grid.appendChild(el);
  }
  updateSummary();
}

function toggleDay(key, el, d) {
  if (selectedDays.has(key)) {
    selectedDays.delete(key);
    el.classList.remove('available');
    el.textContent = d;
  } else {
    selectedDays.add(key);
    el.classList.add('available');
    el.innerHTML = `${d}<div class='dot-avail'></div>`;
  }
  updateSummary();
}

function changeMonth(dir) {
  currentDate.setMonth(currentDate.getMonth() + dir);
  renderCalendar();
}

function renderTimes() {
  const grid = document.getElementById('time-grid');
  grid.innerHTML = '';
  TIMES.forEach(t => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'time-btn';
    btn.textContent = t;
    if (selectedTimes.has(t)) btn.classList.add('active');
    btn.addEventListener('click', () => {
      if (selectedTimes.has(t)) { selectedTimes.delete(t); btn.classList.remove('active'); }
      else                       { selectedTimes.add(t);    btn.classList.add('active'); }
      updateSummary();
    });
    grid.appendChild(btn);
  });
}

function updateSummary() {
  const sumEl = document.getElementById('avail-summary');
  const days  = selectedDays.size;
  const times = selectedTimes.size;
  if (!days && !times) {
    sumEl.innerHTML = 'Seleccioná días en el calendario y luego los horarios disponibles.';
  } else {
    const daysStr  = days  ? `<strong style='color:var(--red-dark)'>${days} día${days > 1 ? 's' : ''}</strong> seleccionado${days > 1 ? 's' : ''}` : '0 días';
    const timesStr = times ? `<strong style='color:var(--red-dark)'>${[...selectedTimes].sort().join(', ')}</strong>` : 'ningún horario';
    sumEl.innerHTML = `${daysStr} habilitados con los horarios: ${timesStr}`;
  }
  updateProgress();
}

/* ─── Service info ─── */
function updateServiceInfo() {
  const sel = document.getElementById('svc-select');
  const opt = sel.options[sel.selectedIndex];
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

/* ─── Profile preview ─── */
const EMOJIS = ['👩‍⚕️','👨‍⚕️','🩺','💊','🏋️','🧠','🥗','🎯'];

function previewUpdate() {
  const fn = document.getElementById('fn').value;
  const ln = document.getElementById('ln').value;
  const sp = document.getElementById('svc-select').selectedOptions[0]?.textContent || 'Especialidad';
  document.getElementById('pv-name').textContent = [fn, ln].filter(Boolean).join(' ') || 'Tu nombre';
  document.getElementById('pv-spec').textContent = sp === 'Seleccioná' ? 'Especialidad' : sp;
  document.getElementById('pv-avatar').textContent = fn ? EMOJIS[fn.length % EMOJIS.length] : '🩺';
  updateProgress();
}

function updateProgress() {
  const req    = document.querySelectorAll('#apply-form input[required], #apply-form select[required]');
  const filled = [...req].filter(f => f.value.trim()).length;
  const calBonus = selectedDays.size > 0 ? 1 : 0;
  const pct = Math.min(100, Math.round(((filled + calBonus) / (req.length + 1)) * 100));
  document.getElementById('pv-progress').style.width = pct + '%';
  document.getElementById('pv-pct').textContent = pct + '%';
}

/* ─── Form submit ─── */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('apply-form').addEventListener('submit', function (e) {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    setTimeout(() => {
      const success = document.getElementById('apply-success');
      success.style.display = 'flex';
      this.querySelectorAll('.form-card:not(#apply-success)').forEach(c => c.style.display = 'none');
      showToast('¡Perfil enviado! Te contactamos en 24–48hs.', '✓', 'success');
      window.scrollTo({ top: 0, behavior: 'smooth' });

      const fn    = document.getElementById('fn').value;
      const ln    = document.getElementById('ln').value;
      const svcEl = document.getElementById('svc-select');
      const svcId = svcEl.value;
      const spec  = svcEl.options[svcEl.selectedIndex]?.text || '';
      const price = svcEl.options[svcEl.selectedIndex]?.dataset.fichas || 6;

      const colorMap = { psicologia: '#E53935', psiquiatria: '#7B1FA2', nutricion: '#2E7D32', trainer: '#E65100', coaching: '#00695C', otro: '#455A64' };
      const iconMap  = { psicologia: '🧠', psiquiatria: '💊', nutricion: '🥗', trainer: '🏋️', coaching: '🎯', otro: '➕' };

      const scheduleArray = [];
      selectedDays.forEach(dateStr => {
        const [y, mo, d] = dateStr.split('-');
        const dateObj = new Date(+y, +mo - 1, +d);
        dateObj.setHours(0, 0, 0, 0);
        const isToday = dateObj.getTime() === today.getTime();
        const dayPrefix = isToday ? 'Hoy' : `${dateObj.getDate()}/${dateObj.getMonth() + 1}`;
        selectedTimes.forEach(t => scheduleArray.push(`${dayPrefix} ${t}`));
      });

      const proInfo = {
        name: `${fn} ${ln}`, svcId, spec, barrio: 'Montevideo', price,
        lat:   -34.90 + (Math.random() * 0.04 - 0.02),
        lng:   -56.16 + (Math.random() * 0.04 - 0.02),
        color: colorMap[svcId] || colorMap.otro,
        icon:  iconMap[svcId]  || iconMap.otro,
        uyu:   '$' + (price * 400).toLocaleString('es-UY') + ' UYU',
        schedule: scheduleArray,
      };

      const customPros = JSON.parse(localStorage.getItem('alma_custom_pros') || '[]');
      customPros.push(proInfo);
      localStorage.setItem('alma_custom_pros', JSON.stringify(customPros));
      localStorage.setItem('alma_user', JSON.stringify({ username: fn, email: 'pro@alma.com', role: 'pro', fichas: 0 }));
    }, 1600);
  });

  renderCalendar();
  renderTimes();
});
