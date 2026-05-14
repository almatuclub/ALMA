/**
 * alma+ intro loader
 * Shows a branded loading screen on first visit.
 * Skipped on return visits (same browser session via sessionStorage).
 */
(function () {
  'use strict';

  var el = document.getElementById('alma-intro');
  if (!el) return;

  /* Skip on return visits within the same session */
  try {
    if (sessionStorage.getItem('alma-intro-v1')) {
      el.remove();
      return;
    }
    sessionStorage.setItem('alma-intro-v1', '1');
  } catch (e) { /* private browsing / storage blocked — show normally */ }

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hold    = reduced ? 80  : 2600; /* ms before auto-dismiss */
  var fade    = reduced ? 80  : 660;  /* matches CSS transition duration */

  /* Prevent background scroll while intro is visible */
  document.body.style.overflow = 'hidden';

  function dismiss() {
    el.classList.add('is-exit');
    document.body.style.overflow = '';
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
      document.documentElement.classList.add('alma-ready');
    }, fade);
    unbind();
  }

  var timer = setTimeout(dismiss, hold);

  /* Tap / click / key dismisses early */
  function onInteract() {
    clearTimeout(timer);
    dismiss();
  }

  function unbind() {
    document.removeEventListener('keydown', onInteract);
    el.removeEventListener('click', onInteract);
    el.removeEventListener('touchend', onInteract);
  }

  document.addEventListener('keydown', onInteract, { once: true });
  el.addEventListener('click', onInteract);
  el.addEventListener('touchend', onInteract, { passive: true });
}());
