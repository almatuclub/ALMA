/* ─────────────────────────────────────────────────────────────────────────────
   js/effects.js  ·  alma+  v27
   World-class visual effects — cursor glow · 3D tilt · stats counter · noise
   All effects respect prefers-reduced-motion.
   NO functional logic is touched here — purely presentational.
───────────────────────────────────────────────────────────────────────────── */

'use strict';

const _rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ══ 0. NOISE OVERLAY ════════════════════════════════════════════════════════
   Injects a fixed noise texture that makes gradients feel physical/analog.
   Very low opacity — adds "grain" not "dirt".
══════════════════════════════════════════════════════════════════════════════ */
(function () {
  const el = document.createElement('div');
  el.id = 'noise-overlay';
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText = [
    'position:fixed', 'inset:0', 'pointer-events:none',
    'z-index:9990', 'opacity:0.034', 'mix-blend-mode:overlay',
    "background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")"
  ].join(';');
  document.body.appendChild(el);
})();

/* ══ 1. CURSOR GLOW ══════════════════════════════════════════════════════════
   Smooth lerp-following radial glow that reacts to hovered element type.
   Changes size/color when hovering CTAs or service cards.
══════════════════════════════════════════════════════════════════════════════ */
(function () {
  const glow = document.createElement('div');
  glow.id = 'cursor-glow';
  glow.setAttribute('aria-hidden', 'true');
  document.body.appendChild(glow);

  let mx = -999, my = -999;
  let gx = -999, gy = -999;

  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
    if (!glow.classList.contains('active')) glow.classList.add('active');
  }, { passive: true });

  document.addEventListener('mouseleave', () => glow.classList.remove('active'));

  /* Smooth follow with lerp — 0.09 feels buttery without being laggy */
  if (!_rm) {
    (function tick() {
      gx += (mx - gx) * 0.09;
      gy += (my - gy) * 0.09;
      glow.style.left = gx + 'px';
      glow.style.top  = gy + 'px';
      requestAnimationFrame(tick);
    })();
  }

  /* Accent mode on interactive elements */
  const accentTargets = '.btn-primary, .btn-outline, .service-card, .prof-mini, .hm__cta-btn, .hm__slot';
  document.querySelectorAll(accentTargets).forEach(el => {
    el.addEventListener('mouseenter', () => glow.classList.add('on-accent'),  { passive: true });
    el.addEventListener('mouseleave', () => glow.classList.remove('on-accent'), { passive: true });
  });
})();

/* ══ 2. SERVICE CARD 3D TILT ════════════════════════════════════════════════
   Each service card tilts toward the cursor in 3D.
   Uses lerp per-card for smooth motion.
   Preserves existing hover box-shadow from CSS.
══════════════════════════════════════════════════════════════════════════════ */
(function () {
  if (_rm) return;

  document.querySelectorAll('.service-card').forEach(card => {
    let rx = 0, ry = 0, trx = 0, try_ = 0;
    let raf = null;
    let inside = false;

    function lerp(a, b, t) { return a + (b - a) * t; }

    function tick() {
      if (!inside && Math.abs(rx) < 0.05 && Math.abs(ry) < 0.05) {
        card.style.transform = '';
        raf = null;
        return;
      }
      rx  = lerp(rx,  trx,  0.10);
      ry  = lerp(ry,  try_, 0.10);
      card.style.transform =
        `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-5px) scale(1.008)`;
      raf = requestAnimationFrame(tick);
    }

    card.addEventListener('mouseenter', () => {
      inside = true;
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });

    card.addEventListener('mousemove', function (e) {
      const r  = this.getBoundingClientRect();
      const nx = (e.clientX - r.left)  / r.width  - 0.5;
      const ny = (e.clientY - r.top)   / r.height - 0.5;
      try_ =  ny * -7;
      trx  =  nx *  8;
    }, { passive: true });

    card.addEventListener('mouseleave', () => {
      inside = false;
      trx = 0; try_ = 0;
    });
  });
})();

/* ══ 3. PROF-MINI CARD TILT ══════════════════════════════════════════════════
   Same treatment as service cards but gentler (these are smaller).
══════════════════════════════════════════════════════════════════════════════ */
(function () {
  if (_rm) return;

  document.querySelectorAll('.prof-mini').forEach(card => {
    card.addEventListener('mousemove', function (e) {
      const r  = this.getBoundingClientRect();
      const nx = (e.clientX - r.left)  / r.width  - 0.5;
      const ny = (e.clientY - r.top)   / r.height - 0.5;
      this.style.transform =
        `perspective(700px) rotateX(${-ny * 5}deg) rotateY(${nx * 6}deg) translateY(-7px)`;
    }, { passive: true });

    card.addEventListener('mouseleave', function () {
      this.style.transform = '';
    });
  });
})();

/* ══ 4. STATS COUNTER ANIMATION ═════════════════════════════════════════════
   Numbers count up from 0 when the stats strip scrolls into view.
   Handles integer (480) and float (4.9) values, preserves <em> suffixes.
══════════════════════════════════════════════════════════════════════════════ */
(function () {
  const strip = document.querySelector('.stats-strip');
  if (!strip) return;

  function countUp(el, duration) {
    const em       = el.querySelector('em');
    const suffix   = em ? em.textContent : '';
    const rawText  = el.textContent;          /* e.g. "480+"  "4.9★" */
    const num      = parseFloat(rawText);
    if (isNaN(num)) return;

    const isFloat  = String(num).includes('.');
    const decimals = isFloat ? (String(num).split('.')[1] || '').length : 0;
    const t0       = performance.now();

    (function step(now) {
      const p    = Math.min((now - t0) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);           /* ease-out cubic */
      const val  = ease * num;
      const disp = isFloat ? val.toFixed(decimals) : Math.round(val);
      el.innerHTML = disp + (em ? `<em>${suffix}</em>` : suffix);
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  let fired = false;
  const obs = new IntersectionObserver(entries => {
    if (fired) return;
    if (!entries[0].isIntersecting) return;
    fired = true;
    strip.querySelectorAll('.stats-strip__val').forEach((el, i) => {
      setTimeout(() => countUp(el, 1500), i * 130);
    });
    obs.disconnect();
  }, { threshold: 0.4 });

  obs.observe(strip);
})();

/* ══ 5. FICHAS PRICE STAGGER ═════════════════════════════════════════════════
   Each price inside the dark fichas section reveals with a staggered
   translateY + opacity animation when scrolled into view.
══════════════════════════════════════════════════════════════════════════════ */
(function () {
  const grid = document.querySelector('.fichas-grid');
  if (!grid) return;

  const items = grid.querySelectorAll('.ficha-item');
  items.forEach(el => {
    el.style.opacity   = '0';
    el.style.transform = 'translateY(18px)';
  });

  const obs = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return;
    items.forEach((el, i) => {
      setTimeout(() => {
        el.style.transition = 'opacity 0.52s cubic-bezier(0.22,1,0.36,1), transform 0.52s cubic-bezier(0.22,1,0.36,1)';
        el.style.opacity    = '1';
        el.style.transform  = 'translateY(0)';
      }, 60 + i * 75);
    });
    obs.disconnect();
  }, { threshold: 0.25 });

  obs.observe(grid);
})();

/* ══ 6. SECTION ENTRANCE: SCALE STAGGER ════════════════════════════════════
   Enhances the existing .reveal observer — also adds scale to stagger items
   in .stagger-children blocks (services grid, profs preview, founders).
══════════════════════════════════════════════════════════════════════════════ */
(function () {
  if (_rm) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const parent = entry.target;
      Array.from(parent.children).forEach((child, i) => {
        const delay = i === 0 ? 0 : Math.round(30 + i * 55 + i * i * 1.2);
        child.style.opacity   = '0';
        child.style.transform = 'translateY(24px) scale(0.96)';
        setTimeout(() => {
          child.style.transition =
            `opacity 0.60s cubic-bezier(0.22,1,0.36,1) ${delay}ms,
             transform 0.60s cubic-bezier(0.22,1,0.36,1) ${delay}ms`;
          child.style.opacity   = '1';
          child.style.transform = 'translateY(0) scale(1)';
        }, 50);
      });
      obs.unobserve(parent);
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.stagger-children').forEach(el => obs.observe(el));
})();
