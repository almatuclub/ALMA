/* ─────────────────────────────────────────────────────────────────────────────
   hero-click.js  ·  alma+  v10
   Periodic micro-animation on the "clic" word in the hero h1.
   No cursor. The word is ALWAYS visible (gradient re-declared in CSS).
   Sequence every 5.5 s (first run at 2.5 s):
     → press + ripple ring on the word
     → subtle coral glow
     → background ring expands from word center
     → floating cards & pill react via box-shadow (float animation preserved)
   Respects prefers-reduced-motion.
───────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  /* Hard bail on reduced-motion */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let busy = false;

  function init() {
    const clicEl = document.getElementById('clic-word');
    const hero   = document.querySelector('.hero');
    const ring   = document.getElementById('hero-ring');
    const cards  = document.querySelectorAll('.hcard');
    const pill   = document.querySelector('.hero__pill');

    /* clic-word is the only required element */
    if (!clicEl) return;

    /* ── Utility: remove class → force reflow → add class → remove after ms ── */
    function pulse(el, cls, durationMs) {
      el.classList.remove(cls);
      void el.offsetWidth; /* restart CSS animation */
      el.classList.add(cls);
      setTimeout(function () { el.classList.remove(cls); }, durationMs);
    }

    /* ── Main sequence ── */
    function play() {
      if (busy) return;
      busy = true;

      /* 1. Press + ripple ring on the word itself */
      pulse(clicEl, 'clic-active', 820);

      /* 2. Glow fires ~80 ms into the press (peak compression moment) */
      setTimeout(function () {
        pulse(clicEl, 'clic-glow', 700);
      }, 80);

      /* 3. Background ring — position at word center relative to .hero */
      if (ring && hero) {
        var heroRect = hero.getBoundingClientRect();
        var clicRect = clicEl.getBoundingClientRect();
        ring.style.left = (clicRect.left - heroRect.left + clicRect.width  / 2) + 'px';
        ring.style.top  = (clicRect.top  - heroRect.top  + clicRect.height / 2) + 'px';
        /* slight delay so ring launches on the "release" beat */
        setTimeout(function () {
          pulse(ring, 'hero-ring-active', 1400);
        }, 120);
      }

      /* 4. Floating cards — staggered 60 ms apart, start at 100 ms */
      cards.forEach(function (card, i) {
        setTimeout(function () {
          pulse(card, 'hcard--react', 720);
        }, 100 + i * 60);
      });

      /* 5. Rating pill */
      if (pill) {
        setTimeout(function () {
          pulse(pill, 'pill-react', 720);
        }, 140);
      }

      /* Release lock after longest effect has settled */
      setTimeout(function () { busy = false; }, 1700);
    }

    /* ── Schedule ── */
    setTimeout(play, 2500);          /* first trigger ~2.5 s after load */
    setInterval(play, 5500);         /* repeat every 5.5 s               */
  }

  /* Boot */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
