/* Runs before first paint. Decides whether this visit moves. A stored "on" outranks the OS setting. */
(function () {
  var d = document.documentElement, saved = null;
  try { saved = localStorage.getItem('attest-motion'); } catch (e) { /* private window */ }
  var os = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var still = os && saved !== 'on';
  d.classList.add(still ? 'still' : 'moving');
  if (!still && innerHeight >= 560) d.classList.add('pin');
  if (!still && d.getAttribute('data-page') === 'home') d.classList.add('loadseq');
})();
