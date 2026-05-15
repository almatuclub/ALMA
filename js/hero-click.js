/* ─────────────────────────────────────────────────────────────────────────────
   hero-click.js  ·  alma+  v11
   Micro-animation on the "clic" word:
     cursor appears near word → short glide → click →
     press+ripple+glow → cards react → cursor fades
   Respects prefers-reduced-motion. Desktop only (hover:hover).
───────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(hover: hover)').matches) return;

  var busy = false;

  function init() {
    var clicEl = document.getElementById('clic-word');
    var hero   = document.querySelector('.hero');
    var cursor = document.getElementById('hero-cursor');
    var ring   = document.getElementById('hero-ring');
    var cards  = document.querySelectorAll('.hcard');
    var pill   = document.querySelector('.hero__pill');

    if (!clicEl || !hero || !cursor) return;

    function getTarget() {
      var heroRect = hero.getBoundingClientRect();
      var clicRect = clicEl.getBoundingClientRect();
      return {
        x: clicRect.left - heroRect.left + clicRect.width  / 2,
        y: clicRect.top  - heroRect.top  + clicRect.height / 2,
      };
    }

    function pulse(el, cls, ms) {
      el.classList.remove(cls);
      void el.offsetWidth;
      el.classList.add(cls);
      setTimeout(function () { el.classList.remove(cls); }, ms);
    }

    function play() {
      if (busy) return;
      busy = true;

      var t = getTarget();

      /* Start position: just below-right of word (very close) */
      var sx = t.x + 20;
      var sy = t.y + 14;

      /* t=0 — place cursor at start, invisible */
      cursor.style.transition = 'none';
      cursor.style.transform  = 'translate(' + sx + 'px, ' + sy + 'px) scale(0.9)';
      cursor.style.opacity    = '0';

      /* t=80ms — fade in at start position */
      setTimeout(function () {
        cursor.style.transition = 'opacity 180ms ease';
        cursor.style.opacity    = '0.88';
      }, 80);

      /* t=340ms — short glide to word center */
      setTimeout(function () {
        cursor.style.transition = 'transform 300ms cubic-bezier(0.4,0,0.2,1), opacity 180ms ease';
        cursor.style.transform  = 'translate(' + (t.x - 3) + 'px, ' + (t.y - 2) + 'px) scale(1)';
      }, 340);

      /* t=660ms — press down */
      setTimeout(function () {
        cursor.style.transition = 'transform 75ms ease-in';
        cursor.style.transform  = 'translate(' + (t.x - 3) + 'px, ' + (t.y - 2) + 'px) scale(0.78)';
      }, 660);

      /* t=750ms — release + fire all effects */
      setTimeout(function () {
        cursor.style.transition = 'transform 190ms cubic-bezier(0.34,1.56,0.64,1)';
        cursor.style.transform  = 'translate(' + (t.x - 3) + 'px, ' + (t.y - 2) + 'px) scale(1)';

        pulse(clicEl, 'clic-active', 800);

        setTimeout(function () { pulse(clicEl, 'clic-glow', 680); }, 70);

        if (ring) {
          ring.style.left = t.x + 'px';
          ring.style.top  = t.y + 'px';
          setTimeout(function () { pulse(ring, 'hero-ring-active', 1300); }, 100);
        }

        cards.forEach(function (c, i) {
          setTimeout(function () { pulse(c, 'hcard--react', 700); }, 90 + i * 55);
        });

        if (pill) setTimeout(function () { pulse(pill, 'pill-react', 700); }, 120);

      }, 750);

      /* t=1150ms — cursor drifts slightly and fades out */
      setTimeout(function () {
        cursor.style.transition = 'opacity 220ms ease, transform 220ms ease';
        cursor.style.opacity    = '0';
        cursor.style.transform  = 'translate(' + (t.x + 6) + 'px, ' + (t.y - 8) + 'px) scale(0.88)';
      }, 1150);

      /* t=1500ms — release lock */
      setTimeout(function () { busy = false; }, 1500);
    }

    setTimeout(play, 2800);
    setInterval(play, 5800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
