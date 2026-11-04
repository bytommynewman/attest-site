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
      W = window.innerWidth; H = c.clientHeight || window.innerHeight;
      c.width = W * d; c.height = H * d; x.setTransform(d, 0, 0, d, 0, 0);
      var n = Math.min(56, Math.round(W * H / 26000));
      pts = [];
      for (var i = 0; i < n; i++) pts.push({ x: Math.random() * W, y: Math.random() * H, a: (Math.random() - .5) * .14, b: (Math.random() - .5) * .14, g: i % 7 === 0 });
    };
    var draw = function (t) {
      if (!still && t - last < 32) { raf = requestAnimationFrame(draw); return; }
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
    size();
    var lw = window.innerWidth;
    window.addEventListener('resize', function () { if (window.innerWidth === lw) return; lw = window.innerWidth; size(); if (still) draw(0); }, { passive: true });
    raf = requestAnimationFrame(draw);
    document.addEventListener('visibilitychange', function () {
      cancelAnimationFrame(raf);
      if (!document.hidden && !still) { last = performance.now(); raf = requestAnimationFrame(draw); }
    });
  }

  /* The demo: the product's real state machine, driven by the visitor */
  var doc = document.getElementById('doc');
  var extras = function () {
    var bar = document.getElementById('bar');
    if (bar && !still) {
      var q = false;
      var paint = function () { q = false; var m = document.documentElement.scrollHeight - window.innerHeight; bar.style.transform = 'scaleX(' + (m > 0 ? window.scrollY / m : 0).toFixed(4) + ')'; };
      window.addEventListener('scroll', function () { if (!q) { q = true; requestAnimationFrame(paint); } }, { passive: true });
      paint();
    }
    var tabs = document.querySelectorAll('.tabs button'), shots = document.querySelectorAll('.shots img'), cap = document.querySelector('.caption');
    var pick = function (i) {
      tabs.forEach(function (o, n) {
        o.setAttribute('aria-selected', n === i); o.tabIndex = n === i ? 0 : -1;
        shots[n].classList.toggle('on', n === i); shots[n].setAttribute('aria-hidden', n !== i);
      });
      cap.textContent = tabs[i].getAttribute('data-cap');
    };
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { pick(i); });
      t.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (d) { e.preventDefault(); var n = (i + d + tabs.length) % tabs.length; pick(n); tabs[n].focus(); }
      });
    });
    if (tabs.length) pick(0);
    if (window.matchMedia('(hover: hover)').matches) document.querySelectorAll('.card').forEach(function (c) {
      c.addEventListener('pointermove', function (e) { var r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px'); }, { passive: true });
    });
  };
  extras();
  if (!doc) return;
  var chip = doc.querySelector('.chip'), ver = doc.querySelector('.ver'), lock = doc.querySelector('.lock span'), trail = doc.querySelector('.trail'), sig = doc.querySelector('.sig'), next = doc.querySelector('.next'), verdict = doc.querySelector('.verdict');
  var stamp = function () { return new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC'; };
  var STEPS = [
    { state: 'draft', edited: false, v: 3, chip: 'Draft', lock: 'Normal page permissions apply', log: 'New → Draft', say: 'A draft. Anyone who can view it can submit it for review.', btn: 'Submit for review' },
    { state: 'review', edited: false, v: 3, chip: 'In review', lock: 'Waiting for approvers', log: 'Draft → In review', say: 'Only listed approvers can sign, and the submitter can\'t approve their own document unless the space allows it.', btn: 'Approve it' },
    { state: 'approved', edited: false, v: 3, chip: 'Approved', lock: 'Locked to approvers, owner and named editors', log: 'In review → Approved · quorum met', say: 'Signed and locked. Next, someone with access publishes a change.', btn: 'Publish an edit to this page', hot: true },
    { state: 'draft', edited: true, v: 4, chip: 'Draft', lock: 'Lock released, signatures cleared', log: 'Approved → Draft · republished as v4', say: 'The approval reset to Draft, the signatures cleared, and a page comment told the owner.', btn: 'Start again' }
  ];
  var at = 0, timer = 0, visible = true, touched = false, hold = false;
  var show = function (i) {
    at = i; var s = STEPS[i];
    doc.setAttribute('data-state', s.state); doc.setAttribute('data-edited', s.edited);
    chip.textContent = s.chip; ver.textContent = 'Version ' + s.v; lock.textContent = s.lock; verdict.textContent = s.say; next.textContent = s.btn;
    if (s.hot) next.setAttribute('data-tone', 'hot'); else next.removeAttribute('data-tone');
    if (s.state === 'approved') sig.textContent = 'Signed by Quality Manager · ' + stamp() + ' · v' + s.v;
    if (i === 0) trail.textContent = '';
    var row = document.createElement('div'); row.innerHTML = '<b>' + stamp().slice(11, 16) + '</b> ' + s.log; trail.insertBefore(row, trail.firstChild);
    while (trail.children.length > 2) trail.removeChild(trail.lastChild);
    if (!still) [chip, verdict, lock, next].forEach(function (el) { el.animate([{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.16,1,.3,1)' }); });
  };
  var DWELL = [2600, 2600, 4200, 4600];
  var tick = function () { clearTimeout(timer); if (still || touched || hold || !visible || document.hidden) return; timer = setTimeout(function () { show((at + 1) % STEPS.length); tick(); }, DWELL[at]); };
  ['pointerenter', 'focusin'].forEach(function (n) { doc.addEventListener(n, function () { hold = true; clearTimeout(timer); }); });
  ['pointerleave', 'focusout'].forEach(function (n) { doc.addEventListener(n, function () { hold = false; tick(); }); });
  next.addEventListener('click', function () { touched = true; verdict.setAttribute('aria-live', 'polite'); clearTimeout(timer); show((at + 1) % STEPS.length); });
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; tick(); }).observe(doc);
  document.addEventListener('visibilitychange', tick);
  show(0); tick();

  /* Tilt follows the pointer, mouse only */
  var stage = doc.parentNode;
  if (!still && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var tx = 0, ty = 0, cx = 0, cy = 0, on = 0;
    var loop = function () {
      cx += (tx - cx) * .12; cy += (ty - cy) * .12;
      doc.style.setProperty('--ry', (cx * 9).toFixed(2) + 'deg'); doc.style.setProperty('--rx', (-cy * 7).toFixed(2) + 'deg');
      on = Math.abs(tx - cx) + Math.abs(ty - cy) > .002 ? requestAnimationFrame(loop) : 0;
    };
    var go = function () { if (!on) on = requestAnimationFrame(loop); };
    stage.addEventListener('pointermove', function (e) { var r = stage.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width - .5; ty = (e.clientY - r.top) / r.height - .5; go(); }, { passive: true });
    stage.addEventListener('pointerleave', function () { tx = ty = 0; go(); });
  }
})();
