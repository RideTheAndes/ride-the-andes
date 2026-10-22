/* Explorador de ruta (index.html § #route). Mapa SVG propio sobre relieve sombreado + perfil
   de altimetría enlazado. Datos: assets/data/traverse.json, generado por
   tools/route/build-explorer.py (coordenadas ya proyectadas: píxeles Mercator z13).
   Los textos de cada etapa salen de las tarjetas .stage de la misma sección, por eso la
   edición /es/ queda en español sin diccionario propio. */
(function () {
  'use strict';
  var root = document.getElementById('rx');
  if (!root || !window.fetch || !document.createElementNS) return;
  root.classList.add('rx-js');

  var NS = 'http://www.w3.org/2000/svg';
  var svg = document.getElementById('rxMap'), prof = document.getElementById('rxProf');
  var pick = document.getElementById('rxPick'), card = document.getElementById('rxCard');
  var read = document.getElementById('rxRead');
  var es = (document.documentElement.lang || 'en').slice(0, 2) === 'es';
  var LOC = es ? 'es-CO' : 'en-US';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cards = [].slice.call(root.parentNode.querySelectorAll('.stages .stage'));
  var $ = function (id) { return document.getElementById(id); };
  var D, sel = 0, vb = null, anim = 0, els = {}, totalKm = 0;

  function fmt(n, d) { return n.toLocaleString(LOC, { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function pathD(line) {
    var s = '';
    for (var i = 0; i < line.length; i++) s += (i ? 'L' : 'M') + line[i][0] + ' ' + line[i][1];
    return s;
  }
  function meta(n) {
    var c = cards[n - 1], q = function (s) { var e = c && c.querySelector(s); return e ? e.textContent.trim() : ''; };
    var a = c && c.querySelector('.rlink');
    return { day: q('.day'), name: q('h3'), route: q('.route'), link: a ? a.href : '' };
  }

  /* ---------- cámara ---------- */
  function fit(b) {
    var cw = svg.clientWidth || 800, ch = svg.clientHeight || 500;
    var overlay = getComputedStyle(card).position === 'absolute';
    var L = overlay ? card.offsetLeft + card.offsetWidth + 28 : 24, R = 28, T = 28, B = 44;
    var fw = Math.max(cw - L - R, 120), fh = Math.max(ch - T - B, 120);
    var m = Math.max(b[2], b[3]) * 0.06;
    var w = b[2] + 2 * m, h = b[3] + 2 * m;
    var s = Math.max(w / fw, h / fh);
    return [b[0] + b[2] / 2 - (L + fw / 2) * s, b[1] + b[3] / 2 - (T + fh / 2) * s, cw * s, ch * s];
  }
  function setVB(v) {
    vb = v;
    svg.setAttribute('viewBox', v.map(function (x) { return x.toFixed(1); }).join(' '));
    var k = v[2] / (svg.clientWidth || 800);
    svg.style.setProperty('--k', k.toFixed(4));
    svg.classList.toggle('near', v[2] < 4200);
    if (els.cursor) els.cursor.setAttribute('r', 6 * k);
    els.marks && els.marks.forEach(function (m) { m.c.setAttribute('r', 9 * k); });
  }
  function fly(to) {
    cancelAnimationFrame(anim);
    if (reduce || !vb) { setVB(to); return; }
    var from = vb.slice(), t0 = performance.now(), dur = 1250;
    var far = Math.hypot((to[0] + to[2] / 2) - (from[0] + from[2] / 2), (to[1] + to[3] / 2) - (from[1] + from[3] / 2)) / Math.max(from[2], to[2]);
    var lw0 = Math.log(from[2]), lw1 = Math.log(to[2]);
    (function step(now) {
      var t = Math.min((now - t0) / dur, 1), e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      var w = Math.exp(lw0 + (lw1 - lw0) * e) * (1 + Math.min(far, 1.2) * 0.35 * Math.sin(Math.PI * e));
      var cx = from[0] + from[2] / 2 + ((to[0] + to[2] / 2) - (from[0] + from[2] / 2)) * e;
      var cy = from[1] + from[3] / 2 + ((to[1] + to[3] / 2) - (from[1] + from[3] / 2)) * e;
      var h = w * to[3] / to[2];
      setVB([cx - w / 2, cy - h / 2, w, h]);
      if (t < 1) anim = requestAnimationFrame(step); else setVB(to);
    })(t0);
  }
  function allBox() {
    var x0 = D.start[0], y0 = D.start[1], x1 = x0, y1 = y0;
    D.stages.forEach(function (s) {
      x0 = Math.min(x0, s.box[0]); y0 = Math.min(y0, s.box[1]);
      x1 = Math.max(x1, s.box[0] + s.box[2]); y1 = Math.max(y1, s.box[1] + s.box[3]);
    });
    return [x0, y0, x1 - x0, y1 - y0];
  }

  /* ---------- mapa ---------- */
  function build() {
    var defs = el('defs', {}, svg);
    var f = el('filter', { id: 'rxGlow', x: '-20%', y: '-20%', width: '140%', height: '140%' }, defs);
    el('feGaussianBlur', { stdDeviation: '3', result: 'b' }, f);
    var mg = el('feMerge', {}, f); el('feMergeNode', { in: 'b' }, mg); el('feMergeNode', { in: 'SourceGraphic' }, mg);
    var gi = D.images.all;
    el('image', { href: '/' + gi.src, x: gi.b[0], y: gi.b[1], width: gi.b[2], height: gi.b[3], preserveAspectRatio: 'none' }, svg);
    els.imgs = el('g', {}, svg);
    var lakes = el('g', { class: 'rx-lakes' }, svg);
    D.lakes.forEach(function (l) { el('path', { d: l.d, class: 'rx-lake' }, lakes); });
    var tr = el('g', { class: 'rx-tr' }, svg), prev = D.start;
    D.stages.forEach(function (s) {
      var a = s.line[0];
      el('path', { d: 'M' + prev[0] + ' ' + prev[1] + 'L' + a[0] + ' ' + a[1] }, tr);
      prev = s.line[s.line.length - 1];
    });
    var gl = el('g', {}, svg);
    els.lines = D.stages.map(function (s) {
      var g = el('g', { class: 'rx-st', 'data-n': s.n }, gl), d = pathD(s.line);
      el('path', { d: d, class: 'rx-case' }, g);
      var p = el('path', { d: d, class: 'rx-line', pathLength: '1' }, g);
      el('path', { d: d, class: 'rx-hit' }, g);
      g.addEventListener('click', function () { if (sel !== s.n) select(s.n, true); });
      return { g: g, p: p };
    });
    var gt = el('g', { class: 'rx-towns' }, svg);
    D.towns.forEach(function (t) {
      var x = el('text', { x: t.x, y: t.y, class: 'rx-town r' + t.r }, gt); x.textContent = t.t;
    });
    var gm = el('g', { class: 'rx-marks' }, svg);
    els.marks = D.stages.map(function (s) {
      var g = el('g', { class: 'rx-mark', 'data-n': s.n }, gm), a = s.line[0];
      var c = el('circle', { cx: a[0], cy: a[1], r: 9 }, g);
      var t = el('text', { x: a[0], y: a[1] }, g); t.textContent = s.n;
      return { g: g, c: c };
    });
    els.cursor = el('circle', { class: 'rx-cursor', r: 6, cx: -999, cy: -999 }, svg);
    totalKm = D.stages.reduce(function (a, s) { return a + s.len; }, 0);
  }

  function showStageImage(n) {
    [].forEach.call(els.imgs.childNodes, function (im) { im.classList.toggle('on', +im.getAttribute('data-n') === n); });
    if (!n || els.imgs.querySelector('[data-n="' + n + '"]')) return;
    var i = D.images['s' + n];
    var im = el('image', { href: '/' + i.src, x: i.b[0], y: i.b[1], width: i.b[2], height: i.b[3], preserveAspectRatio: 'none', 'data-n': n }, els.imgs);
    var on = function () { if (sel === n) im.classList.add('on'); };
    im.addEventListener('load', on);
    setTimeout(on, 1500);   // por si el navegador no dispara load en <image> cacheada
  }

  function draw(list, stagger) {
    list.forEach(function (o, i) {
      var p = o.p;
      if (reduce) { p.style.strokeDashoffset = 0; return; }
      p.style.transition = 'none'; p.style.strokeDashoffset = 1;
      p.getBoundingClientRect();
      p.style.transition = 'stroke-dashoffset 1.6s cubic-bezier(.45,.05,.2,1) ' + (i * stagger) + 'ms';
      p.style.strokeDashoffset = 0;
    });
  }

  /* ---------- tarjeta ---------- */
  var allText = {};
  ['rxDay', 'rxName', 'rxRoute'].forEach(function (id) { allText[id] = $(id).innerHTML; });
  var allLink = $('rxLink').href;
  function stats(km, gain, top, steep) {
    $('rxKm').innerHTML = fmt(km, km % 1 ? 1 : 0) + '<small> km</small>';
    $('rxGain').innerHTML = '+' + fmt(gain) + '<small> m</small>';
    $('rxTop').innerHTML = fmt(top) + '<small> m</small>';
    $('rxSteep').innerHTML = fmt(steep, 1) + '<small> %</small>';
  }
  function fillCard(n) {
    if (!n) {
      for (var id in allText) $(id).innerHTML = allText[id];
      $('rxLink').href = allLink;
      var km = 0, gain = 0, top = 0, st = 0;
      D.stages.forEach(function (s) { km += s.km; gain += s.gain; top = Math.max(top, s.top); st = Math.max(st, s.steep); });
      stats(Math.round(km), Math.round(gain / 100) * 100, top, st);
      return;
    }
    var s = D.stages[n - 1], m = meta(n);
    $('rxDay').textContent = m.day; $('rxName').textContent = m.name; $('rxRoute').textContent = m.route;
    if (m.link) $('rxLink').href = m.link;
    stats(s.km, s.gain, s.top, s.steep);
  }

  /* ---------- perfil ---------- */
  var P = { segs: [] };
  function drawProfile(n) {
    while (prof.firstChild) prof.removeChild(prof.firstChild);
    var list = n ? [D.stages[n - 1]] : D.stages, tot = 0, lo = 1e9, hi = 0;
    list.forEach(function (s) { tot += s.len; s.prof.forEach(function (e) { lo = Math.min(lo, e); hi = Math.max(hi, e); }); });
    lo = Math.floor((lo - 60) / 100) * 100; hi = Math.ceil((hi + 40) / 100) * 100;
    var W = 1000, H = 150, top = 14, x0 = 0;
    prof.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var defs = el('defs', {}, prof), gr = el('linearGradient', { id: 'rxFill', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: '0', 'stop-color': '#D9762F', 'stop-opacity': '.55' }, gr);
    el('stop', { offset: '1', 'stop-color': '#D9762F', 'stop-opacity': '0' }, gr);
    [hi, (hi + lo) / 2].forEach(function (v) {
      var y = top + (hi - v) / (hi - lo) * (H - top);
      el('line', { x1: 0, x2: W, y1: y, y2: y, class: 'rx-grid' }, prof);
    });
    P = { segs: [], tot: tot, lo: lo, hi: hi, W: W, H: H, top: top };
    list.forEach(function (s, i) {
      var w = s.len / tot * W, pts = [];
      s.prof.forEach(function (e, j) { pts.push((x0 + Math.min(j * 0.1, s.len) / s.len * w).toFixed(1) + ' ' + (top + (hi - e) / (hi - lo) * (H - top)).toFixed(1)); });
      el('path', { d: 'M' + pts[0].split(' ')[0] + ' ' + H + 'L' + pts.join('L') + 'L' + (x0 + w).toFixed(1) + ' ' + H + 'Z', fill: 'url(#rxFill)' }, prof);
      el('path', { d: 'M' + pts.join('L'), class: 'rx-pline' }, prof);
      if (!n && i) el('line', { x1: x0, x2: x0, y1: 0, y2: H, class: 'rx-sep' }, prof);
      P.segs.push({ s: s, x0: x0, w: w });
      x0 += w;
    });
    els.xh = el('line', { x1: -10, x2: -10, y1: 0, y2: H, class: 'rx-xh' }, prof);
    var lab = '<span class="hi">' + fmt(hi) + ' m</span><span class="lo">' + fmt(lo) + ' m</span>';
    if (!n) P.segs.forEach(function (g) { lab += '<span class="sn" style="left:' + (g.x0 / W * 100).toFixed(2) + '%">' + String(g.s.n).padStart(2, '0') + '</span>'; });
    read.innerHTML = lab + '<span class="now" id="rxNow"></span>';
  }
  function atKm(s, km) {
    var L = s.line, i = 1;
    while (i < L.length - 1 && L[i][2] < km) i++;
    var a = L[i - 1], b = L[i], t = Math.max(0, Math.min(1, (km - a[2]) / Math.max(b[2] - a[2], 1e-6)));
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  }
  function onMove(ev) {
    if (!P.segs.length) return;
    var r = prof.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * P.W;
    var g = P.segs[0];
    P.segs.forEach(function (q) { if (x >= q.x0) g = q; });
    var km = Math.max(0, Math.min(g.s.len, (x - g.x0) / g.w * g.s.len));
    var j = Math.min(Math.round(km * 10), g.s.prof.length - 1), e = g.s.prof[j];
    var a = g.s.prof[Math.max(j - 5, 0)], b = g.s.prof[Math.min(j + 5, g.s.prof.length - 1)];
    var grade = (b - a) / ((Math.min(j + 5, g.s.prof.length - 1) - Math.max(j - 5, 0)) * 100) * 100 || 0;
    els.xh.setAttribute('x1', x); els.xh.setAttribute('x2', x);
    var p = atKm(g.s, km);
    els.cursor.setAttribute('cx', p[0]); els.cursor.setAttribute('cy', p[1]);
    var now = $('rxNow');
    now.style.left = (x / P.W * 100).toFixed(2) + '%';
    now.classList.toggle('flip', x > P.W * 0.72);
    now.textContent = (sel ? '' : String(g.s.n).padStart(2, '0') + ' · ') + 'km ' + fmt(km, 1) + ' · ' + fmt(e) + ' m · ' + (grade >= 0 ? '+' : '') + fmt(grade, 1) + ' %';
    now.style.opacity = 1;
  }
  function onLeave() {
    if (els.xh) { els.xh.setAttribute('x1', -10); els.xh.setAttribute('x2', -10); }
    if (els.cursor) { els.cursor.setAttribute('cx', -999); els.cursor.setAttribute('cy', -999); }
    var now = $('rxNow'); if (now) now.style.opacity = 0;
  }

  /* ---------- selección ---------- */
  function select(n, animate) {
    sel = n;
    [].forEach.call(pick.querySelectorAll('button'), function (b) {
      var on = +b.getAttribute('data-stage') === n;
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
      // En móvil el selector se desplaza en horizontal: dejar a la vista el botón elegido.
      if (on && (b.offsetLeft < pick.scrollLeft || b.offsetLeft + b.offsetWidth > pick.scrollLeft + pick.clientWidth))
        pick.scrollTo({ left: b.offsetLeft - 8, behavior: reduce ? 'auto' : 'smooth' });
    });
    els.lines.forEach(function (o, i) { o.g.classList.toggle('dim', !!n && i + 1 !== n); o.g.classList.toggle('sel', i + 1 === n); });
    els.marks.forEach(function (m, i) { m.g.classList.toggle('dim', !!n && i + 1 !== n); });
    svg.classList.toggle('all', !n);
    showStageImage(n);
    fillCard(n);
    drawProfile(n);
    onLeave();
    var to = fit(n ? D.stages[n - 1].box : allBox());
    if (animate) fly(to); else setVB(to);
    if (n && animate) draw([els.lines[n - 1]], 0);
  }

  function buildPicker() {
    var first = pick.querySelector('button');
    first.querySelector('.k').textContent = fmt(Math.round(D.stages.reduce(function (a, s) { return a + s.km; }, 0))) + ' km';
    D.stages.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button'; b.setAttribute('data-stage', s.n); b.setAttribute('aria-pressed', 'false');
      b.innerHTML = '<span class="n"></span><span class="t"></span><span class="k"></span>';
      b.querySelector('.n').textContent = String(s.n).padStart(2, '0');
      b.querySelector('.t').textContent = meta(s.n).name;
      b.querySelector('.k').textContent = fmt(s.km, 1) + ' km · +' + fmt(s.gain) + ' m';
      pick.appendChild(b);
    });
    pick.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var n = +b.getAttribute('data-stage'); if (n !== sel) select(n, true);
    });
    pick.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var bs = [].slice.call(pick.querySelectorAll('button')), i = bs.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      var j = (i + (e.key === 'ArrowRight' ? 1 : -1) + bs.length) % bs.length;
      bs[j].focus(); bs[j].click();
    });
  }

  function start() {
    fetch('/assets/data/traverse.json').then(function (r) { return r.json(); }).then(function (data) {
      D = data;
      build(); buildPicker();
      select(0, false);
      draw(els.lines, 260);
      root.classList.add('rx-ready');
      prof.addEventListener('pointermove', onMove);
      prof.addEventListener('pointerdown', onMove);
      prof.addEventListener('pointerleave', onLeave);
      var rt = 0;
      window.addEventListener('resize', function () {
        clearTimeout(rt);
        rt = setTimeout(function () { setVB(fit(sel ? D.stages[sel - 1].box : allBox())); }, 150);
      });
    }).catch(function () { root.classList.remove('rx-js'); });
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (ents) {
      if (ents.some(function (e) { return e.isIntersecting; })) { io.disconnect(); start(); }
    }, { rootMargin: '700px 0px' });
    io.observe(root);
  } else start();
})();
