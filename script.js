/* ============================================
   alma+ — Shared JavaScript  v24
   ============================================ */

// ─── Navbar scroll effect ───
const navbar = document.querySelector('.navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  });
}

// ─── Hamburger / Mobile Nav ───
const hamburger = document.querySelector('.hamburger');
const mobileNav  = document.querySelector('.mobile-nav');
if (hamburger && mobileNav) {
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    mobileNav.classList.toggle('open');
  });
  mobileNav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mobileNav.classList.remove('open');
    });
  });
}

// ─── Active nav link ───
const currentPage = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.navbar__nav a, .mobile-nav a').forEach(a => {
  const href = a.getAttribute('href');
  if (href === currentPage || (currentPage === '' && href === 'index.html')) {
    a.classList.add('active');
  }
});

// ─── Scroll reveal ───
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ─── Stagger children ───
document.querySelectorAll('.stagger-children > *').forEach((el, i) => {
  el.style.transitionDelay = `${i * 80}ms`;
  el.classList.add('reveal');
  revealObserver.observe(el);
});

// ─── Toast notification ───
function showToast(message, icon = '✓', type = 'success') {
  let toast = document.getElementById('alma-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'alma-toast';
    toast.className = 'toast';
    toast.innerHTML = `
      <div class="toast__icon" id="toast-icon"></div>
      <div>
        <div id="toast-msg" style="font-weight:600;font-size:0.9rem;"></div>
        <div id="toast-sub" style="font-size:0.8rem;color:var(--text-secondary);margin-top:2px;"></div>
      </div>`;
    document.body.appendChild(toast);
  }
  document.getElementById('toast-icon').textContent = icon;
  document.getElementById('toast-msg').textContent = message;

  const colors = { success: '#34d399', error: '#f87171', info: '#60a5fa' };
  document.getElementById('toast-icon').style.color = colors[type] || colors.success;
  document.getElementById('toast-icon').style.background =
    type === 'success' ? 'rgba(52,211,153,0.15)' :
    type === 'error'   ? 'rgba(248,113,113,0.15)' : 'rgba(96,165,250,0.15)';

  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ─── Filter chips ───
document.querySelectorAll('.filter-chip').forEach(chip => {
  chip.addEventListener('click', function () {
    const group = this.closest('.chip-group');
    if (group) group.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    this.classList.add('active');
  });
});

// ─── Search bar live feedback ───
const searchInput = document.getElementById('hero-search');
const searchBtn   = document.getElementById('hero-search-btn');
if (searchInput && searchBtn) {
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') searchBtn.click();
  });
  searchBtn.addEventListener('click', () => {
    const q = searchInput.value.trim();
    if (q) {
      window.location.href = `professionals.html?q=${encodeURIComponent(q)}`;
    } else {
      searchInput.classList.add('shake');
      setTimeout(() => searchInput.classList.remove('shake'), 500);
    }
  });
}

// ─── Professionals filter ───
function initProfessionalsFilter() {
  const cards        = document.querySelectorAll('.prof-card');
  const filterSpec   = document.getElementById('filter-specialty');
  const filterCity   = document.getElementById('filter-city');
  const filterAvail  = document.getElementById('filter-avail');
  const countEl      = document.getElementById('result-count');

  function applyFilters() {
    let visible = 0;
    cards.forEach(card => {
      const spec  = card.dataset.specialty  || '';
      const city  = card.dataset.city       || '';
      const avail = card.dataset.avail      || '';

      const specOk  = !filterSpec?.value  || spec  === filterSpec.value;
      const cityOk  = !filterCity?.value  || city  === filterCity.value;
      const availOk = !filterAvail?.value || avail === filterAvail.value;

      const show = specOk && cityOk && availOk;
      card.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    if (countEl) countEl.textContent = visible;
  }

  [filterSpec, filterCity, filterAvail].forEach(el => {
    el?.addEventListener('change', applyFilters);
  });

  // Pre-fill from URL
  const params = new URLSearchParams(location.search);
  const q = params.get('q');
  if (q && filterSpec) {
    const opt = [...filterSpec.options].find(o => o.text.toLowerCase().includes(q.toLowerCase()));
    if (opt) { filterSpec.value = opt.value; applyFilters(); }
  }
}

// ─── Jobs filter ───
function initJobsFilter() {
  const cards       = document.querySelectorAll('.job-card');
  const filterArea  = document.getElementById('filter-area');
  const filterType  = document.getElementById('filter-type');
  const filterLoc   = document.getElementById('filter-loc');
  const countEl     = document.getElementById('job-count');

  function applyFilters() {
    let visible = 0;
    cards.forEach(card => {
      const area = card.dataset.area || '';
      const type = card.dataset.type || '';
      const loc  = card.dataset.loc  || '';

      const areaOk = !filterArea?.value || area === filterArea.value;
      const typeOk = !filterType?.value || type === filterType.value;
      const locOk  = !filterLoc?.value  || loc  === filterLoc.value;

      const show = areaOk && typeOk && locOk;
      card.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    if (countEl) countEl.textContent = visible;
  }

  [filterArea, filterType, filterLoc].forEach(el => {
    el?.addEventListener('change', applyFilters);
  });
}

// ─── Apply form ───
// No-op: form submit is fully handled by js/apply.js (auth check + Supabase insert)
function initApplyForm() {}

// ─── Counter animation ───
function animateCounters() {
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count);
    const duration = 1800;
    const start = performance.now();
    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(eased * target).toLocaleString();
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = target.toLocaleString();
    }
    requestAnimationFrame(tick);
  });
}

const statsObserver = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) {
    animateCounters();
    statsObserver.disconnect();
  }
}, { threshold: 0.3 });
const statsSection = document.getElementById('stats');
if (statsSection) statsObserver.observe(statsSection);

// ─── User Session Management ───

/* Global logout — works on any page.
   signOut() clears the Supabase session (including our alma_sb_v1 key). */
window.logout = async function () {
  console.log('[auth] logout() called');
  try {
    if (window.supabase) await window.supabase.auth.signOut();
  } catch (e) {
    console.warn('[auth] signOut error:', e.message);
  }
  localStorage.removeItem('alma_user');
  location.href = 'login.html';
};

/* initUserSession — personalises the navbar on PUBLIC pages only.
   On private pages (dashboard, admin, chat, etc.) the page JS handles auth
   and navbar — skipping this query avoids a redundant Supabase round-trip.
   Uses optionalAuth() (never redirects) so public pages stay accessible. */
async function initUserSession() {
  /* Skip on private pages — they have their own auth + profile loading */
  const _page = location.pathname.split('/').pop() || 'index.html';
  const _PRIVATE = ['dashboard.html','admin.html','onboarding.html','chat.html','apply.html'];
  if (_PRIVATE.includes(_page)) {
    console.log('[script] initUserSession: private page, skipping (page JS handles auth)');
    return;
  }

  /* optionalAuth is defined in db.js which loads before script.js */
  const session = typeof optionalAuth === 'function' ? await optionalAuth() : null;
  let user = null;

  if (session) {
    /* Check window cache first (set by dashboard.js on same-tab navigation) */
    if (window._almaProfile) {
      user = window._almaProfile;
    } else {
      try {
        /* Use select('*') — safe even if some columns are missing */
        const { data: profile, error: pErr } = await window.supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (pErr) {
          console.warn('[script] initUserSession profile query error:', pErr.code, pErr.message);
          /* Try minimal fallback */
          const { data: fallback } = await window.supabase
            .from('profiles')
            .select('id, username, full_name, role, fichas')
            .eq('id', session.user.id)
            .single();
          if (fallback) {
            user = fallback;
            localStorage.setItem('alma_user', JSON.stringify(fallback));
          }
        } else if (profile) {
          user = profile;
          localStorage.setItem('alma_user', JSON.stringify(profile));
        }
      } catch (e) { console.warn('[script] initUserSession exception (non-critical):', e.message); }
    }
  }

  /* Fallback to cached profile for UI (does NOT grant auth) */
  if (!user) {
    try { user = JSON.parse(localStorage.getItem('alma_user') || 'null'); } catch { user = null; }
  }

  if (!user) return; // Not logged in — leave navbar as-is (shows Login button)

  const displayName = user.full_name || user.username || '';
  const fichas      = user.fichas ?? 0;

  /* Update navbar__actions on pages that have the default login/register buttons
     (dashboard.html has its own navbar — skip those) */
  document.querySelectorAll('.navbar__actions').forEach(container => {
    /* Only replace if the container still has the default login buttons */
    if (!container.querySelector('[data-session-ui]') &&
        (container.querySelector('a[href="login.html"]') || container.children.length === 0)) {
      container.innerHTML = '';
      const div = document.createElement('div');
      div.setAttribute('data-session-ui', '1');
      div.style.cssText = 'display:flex;align-items:center;gap:12px';
      div.innerHTML = (user.role === 'pro' || user.role === 'admin')
        ? `<a href="dashboard.html" class="btn btn-primary btn-sm">Mi Panel</a>
           <button onclick="logout()" class="btn btn-outline btn-sm">Salir</button>`
        : `<span style="font-size:0.85rem;font-weight:600;color:var(--text)">${displayName}</span>
           <span style="font-size:0.82rem;color:var(--red);font-weight:700">${fichas}+</span>
           <a href="dashboard.html" class="btn btn-outline btn-sm">Mi Panel</a>`;
      container.appendChild(div);
    }
  });
}

// ─── Init per page ───
document.addEventListener('DOMContentLoaded', () => {
  initProfessionalsFilter();
  initJobsFilter();
  initApplyForm();
  initUserSession();
});

// ─── CSS spin keyframe (injected) ───
const style = document.createElement('style');
style.textContent = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    20%,60%  { transform: translateX(-6px); }
    40%,80%  { transform: translateX(6px); }
  }
  .shake { animation: shake 0.4s ease; }
  .filter-chip {
    padding: 6px 16px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-secondary);
    font-family: var(--font);
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: var(--transition);
  }
  .filter-chip:hover { border-color: var(--primary); color: var(--primary-light); }
  .filter-chip.active {
    background: rgba(198,40,40,0.15);
    border-color: var(--primary);
    color: var(--primary-light);
  }
`;
document.head.appendChild(style);
