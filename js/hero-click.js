/* ─────────────────────────────────────────────────────────────────────────────
   hero-click.js  ·  alma+
   Orchestrates the animated "clic" word sequence on the hero title:
     cursor glides in → clicks → word bounces + ripple + glow
     → ring expands → cards & pill react → cursor drifts away.
   Repeats every 6.5 s (first trigger at 3.2 s after load).
   Fully respects prefers-reduced-motion.
───────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  /* Bail immediately on reduced-motion preference */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* Also bail on touch-primary devices — animation is cursor-centric */
  if (window.matchMedia('(hover: none)').matches) return;

  let busy = false;

  function init() {
    const hero   = document.querySelector('.hero');
    const clicEl = document.getElementById('clic-word');
    const cursor = document.getElementById('hero-cursor');
    const ring   = document.getElementById('hero-ring');
    const cards  = document.querySelectorAll('.hcard');
    const pill   = document.querySelector('.hero__pill');

    if (!hero || !clicEl || !cursor || !ring) return;

    /* ── Utilities ── */

    /** Coordinates of clic-word center relative to .hero top-left */
    function getTarget() {
      const heroRect = hero.getBoundingClientRect();
      const clicRect = clicEl.getBoundingClientRect();
      return {
        x: clicRect.left - heroRect.left + clicRect.width  / 2,
        y: clicRect.top  - heroRect.top  + clicRect.height / 2,
      };
    }

    /**
     * Remove class, force reflow so CSS animation restarts, re-add class,
     * then remove again after `duration` ms.
     */
    function pulse(el, cls, duration) {
      el.classList.remove(cls);
      void el.offsetWidth; /* trigger reflow */
      el.classList.add(cls);
      setTimeout(() => el.classList.remove(cls), duration);
    }

    /** Position the ring element at a given hero-relative coordinate */
    function placeRing(x, y) {
      ring.style.left = x + 'px';
      ring.style.top  = y + 'px';
    }

    /* ── Main animation sequence ── */

    function play() {
      if (busy) return;
      busy = true;

      const t = getTarget();

      /* ─ t = 0 ms: teleport cursor to start position (off-screen bottom-right of word), hidden ─ */
      cursor.style.transition = 'none';
      cursor.style.transform  = 'translate(' + (t.x + 74) + 'px, ' + (t.y + 38) + 'px) scale(1)';
      cursor.style.opacity    = '0';

      /* ─ t ≈ 16 ms (next two rAF frames): begin glide + fade in ─ */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          cursor.style.transition = 'transform 840ms cubic-bezier(0.4,0,0.2,1), opacity 240ms ease';
          cursor.style.transform  = 'translate(' + (t.x - 4) + 'px, ' + (t.y - 3) + 'px) scale(1)';
          cursor.style.opacity    = '1';
        });
      });

      /* ─ t = 920 ms: press (compress cursor) ─ */
      setTimeout(function () {
        cursor.style.transition = 'transform 80ms cubic-bezier(0.4,0,1,1)';
        cursor.style.transform  = 'translate(' + (t.x - 4) + 'px, ' + (t.y - 3) + 'px) scale(0.78)';
      }, 920);

      /* ─ t = 1040 ms: release + fire all effects ─ */
      setTimeout(function () {

        /* Cursor spring-back */
        cursor.style.transition = 'transform 220ms cubic-bezier(0.34,1.56,0.64,1)';
        cursor.style.transform  = 'translate(' + (t.x - 4) + 'px, ' + (t.y - 3) + 'px) scale(1)';

        /* Word effects */
        pulse(clicEl, 'clic-ripple-active', 900);
        pulse(clicEl, 'clic-bounce',        660);
        pulse(clicEl, 'clic-glow',          820);

        /* Background ring */
        placeRing(t.x, t.y);
        pulse(ring, 'hero-ring-active', 1250);

        /* Floating cards — staggered 55 ms apart */
        cards.forEach(function (card, i) {
          setTimeout(function () {
            pulse(card, 'hcard--react', 720);
          }, i * 55);
        });

        /* Pill — slight delay */
        if (pill) {
          setTimeout(function () {
            pulse(pill, 'pill-react', 720);
          }, 95);
        }

      }, 1040);

      /* ─ t = 1940 ms: cursor drifts up-right and fades out ─ */
      setTimeout(function () {
        cursor.style.transition = 'transform 520ms cubic-bezier(0.4,0,0.2,1), opacity 420ms ease';
        cursor.style.transform  = 'translate(' + (t.x + 22) + 'px, ' + (t.y - 18) + 'px) scale(0.92)';
        cursor.style.opacity    = '0';
      }, 1940);

      /* ─ t = 2520 ms: release lock ─ */
      setTimeout(function () {
        busy = false;
      }, 2520);
    }

    /* ── Scheduling ── */
    setTimeout(play, 3200);           /* first run ~3 s after load */
    setInterval(play, 6500);          /* repeat every 6.5 s        */
  }

  /* Boot when DOM is ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
