(function () {
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Scroll reveals */
  var rv = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window && !still) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    rv.forEach(function (el) { io.observe(el); });
  } else { rv.forEach(function (el) { el.classList.add('in'); }); }

  /* Background field: few points, capped pixel ratio, stops when the tab is hidden */
  var c = document.getElementById('field');
  if (c && c.getContext) {
    var x = c.getContext('2d'), W = 0, H = 0, pts = [], raf = 0, last = 0;
    var size = function () {
      var d = Math.min(window.devicePixelRatio || 1, 1.5);
      W = window.innerWidth; H = window.innerHeight;
      c.width = W * d; c.height = H * d; x.setTransform(d, 0, 0, d, 0, 0);
      var n = Math.min(56, Math.round(W * H / 26000));
      pts = [];
      for (var i = 0; i < n; i++) pts.push({ x: Math.random() * W, y: Math.random() * H, a: (Math.random() - .5) * .14, b: (Math.random() - .5) * .14, g: i % 7 === 0 });
    };
    var draw = function (t) {
      var dt = Math.min(t - last, 50) / 16.7; last = t;
      x.clearRect(0, 0, W, H);
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        if (!still) { p.x += p.a * dt; p.y += p.b * dt; if (p.x < 0) p.x += W; if (p.x > W) p.x -= W; if (p.y < 0) p.y += H; if (p.y > H) p.y -= H; }
        for (var j = i + 1; j < pts.length; j++) {
          var q = pts[j], dx = p.x - q.x, dy = p.y - q.y, s = dx * dx + dy * dy;
          if (s < 19000) { x.strokeStyle = 'rgba(143,184,255,' + (.11 * (1 - s / 19000)).toFixed(3) + ')'; x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(q.x, q.y); x.stroke(); }
        }
        x.fillStyle = p.g ? 'rgba(239,176,79,.75)' : 'rgba(190,212,255,.45)';
        x.beginPath(); x.arc(p.x, p.y, p.g ? 1.7 : 1.1, 0, 6.283); x.fill();
      }
      if (!still) raf = requestAnimationFrame(draw);
    };
    size(); window.addEventListener('resize', size, { passive: true });
    raf = requestAnimationFrame(draw);
    document.addEventListener('visibilitychange', function () {
      cancelAnimationFrame(raf);
      if (!document.hidden && !still) { last = performance.now(); raf = requestAnimationFrame(draw); }
    });
  }

  /* The demo: the product's real state machine, illustrated */
  var doc = document.getElementById('doc');
  if (!doc) return;
  var chip = doc.querySelector('.chip'), ver = doc.querySelector('.ver'), lock = doc.querySelector('.lock span'), trail = doc.querySelector('.trail'), sig = doc.querySelector('.sig'), btns = doc.querySelectorAll('.steps button');
  var stamp = function () { return new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC'; };
  var STEPS = [
    { state: 'draft', edited: false, v: 3, chip: 'Draft', lock: 'Anyone in the space can edit', log: 'New → Draft' },
    { state: 'review', edited: false, v: 3, chip: 'In review', lock: 'Waiting for approvers', log: 'Draft → In review' },
    { state: 'approved', edited: false, v: 3, chip: 'Approved', lock: 'Locked to approvers and owner', log: 'In review → Approved · quorum met' },
    { state: 'draft', edited: true, v: 4, chip: 'Draft', lock: 'Lock released, signatures cleared', log: 'Approved → Draft · republished as v4' }
  ];
  var at = -1, timer = 0, visible = true, lastLog = '';
  var show = function (i) {
    at = i; var s = STEPS[i];
    doc.setAttribute('data-state', s.state); doc.setAttribute('data-edited', s.edited);
    chip.textContent = s.chip; ver.textContent = 'Version ' + s.v; lock.textContent = s.lock;
    if (s.state === 'approved') sig.textContent = 'Signed by Quality Manager · ' + stamp() + ' · v' + s.v;
    var same = lastLog === s.log; lastLog = s.log;
    if (same) { btns.forEach(function (b, n) { b.setAttribute('aria-pressed', n === i); }); return; }
    var row = document.createElement('div'); row.innerHTML = '<b>' + stamp().slice(11, 16) + '</b> ' + s.log; trail.insertBefore(row, trail.firstChild);
    while (trail.children.length > 3) trail.removeChild(trail.lastChild);
    btns.forEach(function (b, n) { b.setAttribute('aria-pressed', n === i); });
  };
  var DWELL = [2200, 2200, 4200, 4000];
  var tick = function () { clearTimeout(timer); if (still || !visible || document.hidden) return; timer = setTimeout(function () { show((at + 1) % STEPS.length); tick(); }, DWELL[at]); };
  btns.forEach(function (b, n) { b.addEventListener('click', function () { show(n); tick(); }); });
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; tick(); }).observe(doc);
  document.addEventListener('visibilitychange', tick);
  show(still ? 2 : 0); tick();

  /* Tilt follows the pointer, mouse only */
  var stage = doc.parentNode;
  if (!still && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var pending = false, px = 0, py = 0;
    stage.addEventListener('pointermove', function (e) {
      var r = stage.getBoundingClientRect(); px = (e.clientX - r.left) / r.width - .5; py = (e.clientY - r.top) / r.height - .5;
      if (pending) return; pending = true;
      requestAnimationFrame(function () { pending = false; doc.style.setProperty('--ry', (px * 9).toFixed(2) + 'deg'); doc.style.setProperty('--rx', (-py * 7).toFixed(2) + 'deg'); });
    }, { passive: true });
    stage.addEventListener('pointerleave', function () { doc.style.setProperty('--ry', '0deg'); doc.style.setProperty('--rx', '0deg'); });
  }
})();
