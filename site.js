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
      t.setAttribute('aria-controls', 'shots');
      t.addEventListener('click', function () { pick(i); });
      t.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        var n = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : d ? (i + d + tabs.length) % tabs.length : -1;
        if (n >= 0) { e.preventDefault(); pick(n); tabs[n].focus(); }
      });
    });
    if (tabs.length) pick(0);
    if (window.matchMedia('(hover: hover)').matches) document.querySelectorAll('.card').forEach(function (c) {
      c.addEventListener('pointermove', function (e) { var r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px'); }, { passive: true });
    });
  };
  extras();

  /* Pricing calculator: the planned price list */
  var num = document.getElementById('users'), rng = document.getElementById('users-range');
  if (num && rng) {
    var money = function (n, exact) { return '$' + (exact && n % 1 ? n.toLocaleString('en-US', { minimumFractionDigits: 2 }) : Math.round(n).toLocaleString('en-US')); };
    var cost = function (n) { return n <= 10 ? 0 : Math.min(n, 100) * 2 + Math.max(0, Math.min(n, 250) - 100) * 1.5 + Math.max(0, Math.min(n, 1000) - 250); };
    var toUsers = function (p) { var n = Math.max(1, Math.round(Math.pow(1000, p / 1000))); return n > 100 ? Math.round(n / 5) * 5 : n; };
    var toPos = function (n) { return Math.round(Math.log(Math.max(1, Math.min(n, 1000))) / Math.log(1000) * 1000); };
    var sr = document.getElementById('p-sr'), amt = document.getElementById('p-amount'), per = document.getElementById('p-per'), math = document.getElementById('p-math');
    var b1 = document.getElementById('b1'), b2 = document.getElementById('b2'), b3 = document.getElementById('b3');
    var presets = document.querySelectorAll('.presets button');
    var shown = 50, anim = 0;
    var tween = function (to) {
      cancelAnimationFrame(anim);
      if (still) { shown = to; amt.textContent = money(to, true); return; }
      var from = shown, t0 = performance.now();
      var step = function (t) {
        var k = Math.min(1, (t - t0) / 380); k = 1 - Math.pow(1 - k, 3);
        shown = from + (to - from) * k; amt.textContent = money(k < 1 ? shown : to, k >= 1);
        if (k < 1) anim = requestAnimationFrame(step); else shown = to;
      };
      anim = requestAnimationFrame(step);
    };
    var render = function (n, from) {
      n = Math.floor(Number(n)); var valid = n >= 1;
      if (!valid) { cancelAnimationFrame(anim); shown = 0; amt.textContent = '–'; per.textContent = ''; math.textContent = 'Enter the number of users on your site.'; sr.textContent = ''; b1.style.flexBasis = b2.style.flexBasis = b3.style.flexBasis = '0%'; presets.forEach(function (b) { b.setAttribute('aria-pressed', false); }); return; }
      if (from !== 'num') num.value = n;
      if (from !== 'rng') rng.value = toPos(n);
      rng.setAttribute('aria-valuetext', n.toLocaleString('en-US') + ' users');
      presets.forEach(function (b) { b.setAttribute('aria-pressed', Number(b.getAttribute('data-n')) === n); });
      if (n > 1000) {
        cancelAnimationFrame(anim); amt.textContent = 'Email us'; per.textContent = ''; math.innerHTML = 'Over 1,000 users, we agree a price together. <a href="mailto:tommy_newman@icloud.com?subject=Attest%20pricing%20over%201%2C000%20users">Get in touch</a>.';
        sr.textContent = 'More than 1,000 users: email us for a price.'; b1.style.flexBasis = '10%'; b2.style.flexBasis = '15%'; b3.style.flexBasis = '75%'; return;
      }
      var c = cost(n);
      sr.textContent = n <= 10 ? 'Free for ' + n + ' users.' : money(c, true) + ' a month for ' + n.toLocaleString('en-US') + ' users.';
      if (n <= 10) { cancelAnimationFrame(anim); shown = 0; amt.textContent = 'Free'; per.textContent = 'with every feature'; math.textContent = n + (n === 1 ? ' user' : ' users') + ', and 10 is the limit for free.'; }
      else {
        tween(c); per.textContent = 'a month';
        var parts = [Math.min(n, 100) + ' × $2.00']; if (n > 100) parts.push((Math.min(n, 250) - 100) + ' × $1.50'); if (n > 250) parts.push((n - 250) + ' × $1.00');
        math.textContent = parts.join(' + ') + (n > 100 ? ' · about $' + (c / n).toFixed(2) + ' per user' : '');
      }
      var a = Math.min(n, 100), d = Math.max(0, Math.min(n, 250) - 100), e = Math.max(0, n - 250), scale = n <= 10 ? 0 : 100 / Math.max(n, 100);
      b1.style.flexBasis = a * scale + '%'; b2.style.flexBasis = d * scale + '%'; b3.style.flexBasis = e * scale + '%';
    };
    rng.addEventListener('input', function () { render(toUsers(Number(rng.value)), 'rng'); });
    num.addEventListener('input', function () { render(num.value, 'num'); });
    num.addEventListener('change', function () { var n = Math.floor(Number(num.value)); if (n >= 1) num.value = n; });
    presets.forEach(function (b) { b.addEventListener('click', function () { render(b.getAttribute('data-n')); }); });
    shown = 50; render(25);
  }

  /* Example documents and the tamper test */
  var panel = document.getElementById('ex-panel'), DATA = window.ATTEST_SAMPLES;
  if (panel && DATA) {
    var LABEL = { draft: 'Draft', in_review: 'In review', approved: 'Approved', expired: 'Expired' };
    var EX = {
      sop: { co: 'Northwind Devices', title: 'SOP-014: Handling Customer Complaints', state: 'approved', v: 6, who: 'Quality Manager, Head of Regulatory', need: '2', period: '12 months', due: '2027-03-03', file: 'sop-014-audit.csv',
        story: 'Two signatures are required. Marta submits it. The first signature is recorded and the document stays In review. The second meets the requirement, and the page locks.',
        sigs: [['Priya Natarajan', 'Quality Manager', '2026-03-02 15:40 UTC'], ['Daniel Okafor', 'Head of Regulatory', '2026-03-03 08:02 UTC']], from: 'Head of Regulatory', to: 'Quality Manager' },
      sec: { co: 'Larkfield Software', title: 'SEC-002: Access Control Policy', state: 'approved', v: 5, who: 'Security Lead, IT Director', need: '1', period: '12 months', due: '2027-06-22', file: 'sec-002-audit.csv',
        story: 'Approved at version 3. Five weeks later, Noor publishes version 4. The approval resets on its own, the signature clears and the lock comes off. Noor corrects it in version 5. Lena submits that and so can\'t approve it, which leaves it to Sam.',
        sigs: [['Sam Whitfield', 'IT Director', '2026-06-22 14:33 UTC']], from: '1 signature(s)', to: '0 signature(s)' },
      fs: { co: 'Brightwater Foods', title: 'FS-021: Allergen Control Plan', state: 'expired', v: 9, who: 'Food Safety Manager', need: '1', period: '12 months', due: '2026-09-14', file: 'fs-021-audit.csv',
        story: 'Approved in September 2025 with a 12-month review. The owner got a page comment 14 days before the date. Nobody reviewed it, so the first daily check after the date marked it Expired and took the lock off.',
        sigs: [['Joel Mensah', 'Food Safety Manager', '2025-09-14 11:02 UTC']], from: 'Review date 2026-09-14', to: 'Review date 2027-09-14' }
    };
    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var shortNote = function (s) { return s.replace(/sha256:([0-9a-f]{12})[0-9a-f]+/, 'sha256:$1…'); };
    var when = function (ts) { return ts.slice(0, 16).replace('T', ' ') + ' UTC'; };
    var fpOf = function (rows) { for (var i = rows.length - 1; i >= 0; i--) { var m = /sha256:([0-9a-f]{64})/.exec(rows[i][10]); if (m) return m[1]; } return ''; };
    var tabsEx = document.querySelectorAll('.ex-tabs button'), current = 'sop';
    var tamper = document.getElementById('tamper'), tRows = document.getElementById('t-rows'), tStatus = document.getElementById('t-status'), tBreak = document.getElementById('t-break'), tReset = document.getElementById('t-reset');
    var hashOf = function (r, note) {
      var body = JSON.stringify([r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], note]);
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(body)).then(function (b) { return Array.prototype.map.call(new Uint8Array(b), function (x) { return x.toString(16).padStart(2, '0'); }).join(''); });
    };
    var runId = 0;
    var check = function () {
      var rows = DATA[current], areas = tRows.querySelectorAll('textarea'), id = ++runId;
      return Promise.all(rows.map(function (r, i) { return hashOf(r, areas[i].value); })).then(function (hashes) {
        if (id !== runId) return;
        var broken = -1, dirty = false;
        rows.forEach(function (r, i) {
          if (areas[i].value !== r[10]) dirty = true;
          if (broken < 0 && hashes[i] !== r[11]) broken = i;
        });
        tRows.querySelectorAll('li').forEach(function (li, i) {
          li.classList.toggle('bad', i === broken);
          li.classList.toggle('after', broken >= 0 && i > broken);
          li.querySelector('.t-h').textContent = i === broken ? hashes[i].slice(0, 8) + '… ≠ ' + rows[i][11].slice(0, 8) + '…' : broken >= 0 && i > broken ? 'not trusted' : rows[i][11].slice(0, 8) + '…';
        });
        if (broken >= 0) { tStatus.className = 'verdict-line bad'; tStatus.textContent = 'Chain broken: entry ' + rows[broken][0] + ' has been altered.'; }
        else { tStatus.className = 'verdict-line'; tStatus.textContent = 'Chain intact: ' + rows.length + ' entries verified. Latest hash ' + rows[rows.length - 1][11].slice(0, 12) + '…'; }
        tReset.hidden = !dirty; tBreak.hidden = dirty;
      });
    };
    var buildTamper = function () {
      var rows = DATA[current];
      tRows.innerHTML = rows.map(function (r, i) {
        return '<li><span class="t-n">' + r[0] + '</span><div><div class="t-who">' + esc(r[6]) + ' · ' + (r[7] === r[8] ? esc(LABEL[r[8]]) : esc(LABEL[r[7]]) + ' → ' + esc(LABEL[r[8]])) + ' · v' + r[9] + '</div><textarea rows="2" spellcheck="false" aria-label="Note for entry ' + r[0] + '">' + esc(r[10]) + '</textarea></div><span class="t-h"></span></li>';
      }).join('');
      var fit = function (a) { if (window.CSS && CSS.supports('field-sizing', 'content')) return; a.style.height = 'auto'; a.style.height = a.scrollHeight + 2 + 'px'; };
      tRows.querySelectorAll('textarea').forEach(function (a) { fit(a); a.addEventListener('input', function () { fit(a); check(); }); });
      check();
    };
    var showEx = function (key, focus) {
      current = key; var m = EX[key], rows = DATA[key], fp = fpOf(rows);
      tabsEx.forEach(function (t) { var on = t.getAttribute('data-ex') === key; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; if (on) { panel.setAttribute('aria-labelledby', t.id); if (focus) t.focus(); } });
      var lapsed = m.state === 'expired' ? '<p class="gone"><strong>Approval has lapsed.</strong> This document is not currently approved. The approval lapsed on ' + m.due + '. The record below is historical.</p><p class="said"><strong>Lapsed signatures (historical, no longer valid)</strong></p>' : '';
      var sig = '<h4>Approval record</h4>' + lapsed + '<table><tr><th scope="col">Approver</th><th scope="col">Role</th><th scope="col">Signed (UTC)</th><th scope="col">Version</th></tr>' + m.sigs.map(function (s) { return '<tr><td>' + esc(s[0]) + '</td><td>' + esc(s[1]) + '</td><td>' + esc(s[2].replace(' UTC', '')) + '</td><td>' + m.v + '</td></tr>'; }).join('') + '</table>' + (m.state === 'expired' ? '<p class="said">Originally approved ' + m.sigs[0][2] + '</p>' : '<p class="fp"><strong>Content fingerprint</strong> <code>' + fp.slice(0, 12) + '…</code></p><p class="said">"I have reviewed version ' + m.v + ' of this page and approve it."</p>');
      panel.innerHTML = '<div class="ex-doc ex-in"><small>' + esc(m.co) + ' · fictional example</small><h3>' + esc(m.title) + '</h3><span class="ex-state ' + m.state + '">' + LABEL[m.state] + '</span><dl><dt>Approvers</dt><dd>' + esc(m.who) + '</dd><dt>Signatures needed</dt><dd>' + m.need + '</dd><dt>Review period</dt><dd>' + m.period + '</dd><dt>' + (m.state === 'expired' ? 'Review date was' : 'Review due') + '</dt><dd>' + m.due + '</dd></dl>' + sig + '</div>' +
        '<div class="ex-side ex-in"><p class="ex-story">' + esc(m.story) + '</p><ol class="ex-log">' + rows.map(function (r) { return '<li><b>' + (r[7] === r[8] ? esc(LABEL[r[8]]) + ' · ' + (r[10].indexOf('Signed') === 0 ? 'signature recorded' : r[10].indexOf('Edit lock') === 0 ? 'edit lock applied' : 'reminder posted') : esc(LABEL[r[7]]) + ' → ' + esc(LABEL[r[8]])) + '</b><time>' + when(r[4]) + '</time> · ' + esc(r[6]) + ' · v' + r[9] + '<code>' + r[11].slice(0, 16) + '…</code></li>'; }).join('') + '</ol><a class="btn small" href="media/samples/' + m.file + '" download>Download this audit file (CSV)</a></div>';
      if (window.crypto && crypto.subtle && window.TextEncoder) { tamper.hidden = false; buildTamper(); }
    };
    tabsEx.forEach(function (t, i) {
      t.addEventListener('click', function () { showEx(t.getAttribute('data-ex')); });
      t.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        var n = e.key === 'Home' ? 0 : e.key === 'End' ? tabsEx.length - 1 : d ? (i + d + tabsEx.length) % tabsEx.length : -1;
        if (n >= 0) { e.preventDefault(); showEx(tabsEx[n].getAttribute('data-ex'), true); }
      });
    });
    tBreak.addEventListener('click', function () {
      var m = EX[current];
      tRows.querySelectorAll('textarea').forEach(function (a) { if (a.value.indexOf(m.from) >= 0 && a.value === a.defaultValue) a.value = a.value.replace(m.from, m.to); });
      check().then(function () { tReset.focus(); });
    });
    tReset.addEventListener('click', function () {
      var rows = DATA[current]; tRows.querySelectorAll('textarea').forEach(function (a, i) { a.value = rows[i][10]; }); check().then(function () { tBreak.focus(); });
    });
    showEx('sop');
  }

  if (!doc) return;
  var chip = doc.querySelector('.chip'), ver = doc.querySelector('.ver'), lock = doc.querySelector('.lock span'), trail = doc.querySelector('.trail'), sig = doc.querySelector('.sig'), next = doc.querySelector('.next'), verdict = doc.querySelector('.verdict');
  var stamp = function () { return new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC'; };
  var STEPS = [
    { state: 'draft', edited: false, v: 3, chip: 'Draft', lock: 'Normal page permissions apply', log: 'New → Draft', say: 'A draft. Anyone who can view it can submit it for review.', btn: 'Submit for review' },
    { state: 'review', edited: false, v: 3, chip: 'In review', lock: 'Waiting for approvers', log: 'Draft → In review', say: 'Only listed approvers can sign. They tick a statement naming this version, and whoever submitted or last edited it can\'t approve unless the space allows it.', btn: 'Approve it' },
    { state: 'approved', edited: false, v: 3, chip: 'Approved', lock: 'Locked to approvers, owner and named editors', log: 'In review → Approved · quorum met', say: 'Signed and locked. Next, someone with access publishes a change.', btn: 'Publish an edit to this page', hot: true },
    { state: 'draft', edited: true, v: 4, chip: 'Draft', lock: 'Lock released, signatures cleared', log: 'Approved → Draft · republished as v4', say: 'The approval reset to Draft, the signatures cleared, and a page comment told the owner.', btn: 'Start again' }
  ];
  var at = 0, timer = 0, visible = true, touched = false, hold = false;
  var show = function (i) {
    at = i; var s = STEPS[i];
    doc.setAttribute('data-state', s.state); doc.setAttribute('data-edited', s.edited);
    chip.textContent = s.chip; ver.textContent = 'Version ' + s.v; lock.textContent = s.lock; verdict.textContent = s.say; next.textContent = s.btn;
    if (s.hot) next.setAttribute('data-tone', 'hot'); else next.removeAttribute('data-tone');
    if (s.state === 'approved') sig.textContent = 'Signed by Quality Manager · ' + stamp() + ' · v' + s.v + ' · sha256:fdc864bc…';
    if (i === 0) trail.textContent = '';
    var row = document.createElement('div'); row.innerHTML = '<b>' + stamp().slice(11, 16) + '</b> ' + s.log; trail.insertBefore(row, trail.firstChild);
    while (trail.children.length > 2) trail.removeChild(trail.lastChild);
    if (!still) [chip, verdict, lock, next].forEach(function (el) { el.animate([{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.16,1,.3,1)' }); });
  };
  var DWELL = [2600, 2600, 4200, 4600];
  var tick = function () { clearTimeout(timer); if (still || touched || hold || !visible || document.hidden) return; timer = setTimeout(function () { show((at + 1) % STEPS.length); tick(); }, DWELL[at]); };
  ['pointerenter', 'focusin'].forEach(function (n) { doc.addEventListener(n, function () { hold = true; clearTimeout(timer); }); });
  ['pointerleave', 'focusout'].forEach(function (n) { doc.addEventListener(n, function () { hold = false; tick(); }); });
  var pauseBtn = document.getElementById('demo-pause');
  var stopAuto = function () { touched = true; clearTimeout(timer); if (pauseBtn) pauseBtn.hidden = true; };
  if (pauseBtn) { if (still) pauseBtn.hidden = true; pauseBtn.addEventListener('click', stopAuto); }
  next.addEventListener('click', function () { stopAuto(); verdict.setAttribute('aria-live', 'polite'); show((at + 1) % STEPS.length); });
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
