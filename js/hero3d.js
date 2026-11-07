/*
  hero3d.js: the one WebGL scene on the site (the home page hero). Plain WebGL, no libraries, about 4 KB.

  It is an enhancement only. The hero is complete without it: the headline, buttons and a CSS/SVG geometric
  backdrop are already on screen. This script runs after the page has loaded and is idle, and it does nothing when
    - WebGL is unavailable, or the visitor has asked to save data
    - the hero is off screen (the loop pauses)
  Reduced motion: one still frame is drawn, nothing moves. Phones: fewer particles, 1x pixel ratio, 30 fps.
*/
(function () {
  "use strict";
  var hero = document.querySelector("[data-hero]");
  var canvas = hero && hero.querySelector("[data-hero-canvas]");
  if (!canvas) { return; }
  var conn = navigator.connection;
  if (conn && conn.saveData) { return; }

  function start() {
    var small = window.matchMedia("(max-width: 699px)").matches;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var rtl = document.documentElement.dir === "rtl";
    var gl = null;
    try { gl = canvas.getContext("webgl", { antialias: !small, alpha: true, powerPreference: "low-power" }); } catch (e) { gl = null; }
    if (!gl) { return; }

    var vs = "attribute vec3 p;uniform mat4 m;uniform float s;varying float d;" +
      "void main(){vec4 c=m*vec4(p,1.);gl_Position=c;d=clamp(1.15-(c.w-4.)/7.,.12,1.);gl_PointSize=s*d;}";
    var fs = "precision mediump float;uniform vec3 col;uniform float a;uniform float pt;varying float d;" +
      "void main(){float k=a*d;if(pt>.5){k*=smoothstep(1.,0.,length(gl_PointCoord-.5)*2.);}gl_FragColor=vec4(col*k,k);}";
    function shader(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; }
    var v = shader(gl.VERTEX_SHADER, vs), f = shader(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) { return; }
    var prog = gl.createProgram();
    gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { return; }
    gl.useProgram(prog);
    var loc = { p: gl.getAttribLocation(prog, "p"), m: gl.getUniformLocation(prog, "m"), s: gl.getUniformLocation(prog, "s"), col: gl.getUniformLocation(prog, "col"), a: gl.getUniformLocation(prog, "a"), pt: gl.getUniformLocation(prog, "pt") };
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);

    /* ---- geometry (line segments as flat xyz pairs) ---- */
    function edges(verts, len) {
      var out = [];
      for (var i = 0; i < verts.length; i++) for (var j = i + 1; j < verts.length; j++) {
        var dx = verts[i][0] - verts[j][0], dy = verts[i][1] - verts[j][1], dz = verts[i][2] - verts[j][2];
        if (Math.abs(Math.sqrt(dx * dx + dy * dy + dz * dz) - len) < 0.01) { out.push(verts[i][0], verts[i][1], verts[i][2], verts[j][0], verts[j][1], verts[j][2]); }
      }
      return out;
    }
    var P = (1 + Math.sqrt(5)) / 2, ico = [];
    [[0, 1, P], [0, -1, P], [0, 1, -P], [0, -1, -P], [1, P, 0], [-1, P, 0], [1, -P, 0], [-1, -P, 0], [P, 0, 1], [-P, 0, 1], [P, 0, -1], [-P, 0, -1]].forEach(function (q) { ico.push(q); });
    var octa = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    function ring(r, n) { var o = []; for (var i = 0; i < n; i++) { var a = i / n * 6.2832, b = (i + 1) / n * 6.2832; o.push(Math.cos(a) * r, 0, Math.sin(a) * r, Math.cos(b) * r, 0, Math.sin(b) * r); } return o; }
    function dust(n) { var o = []; for (var i = 0; i < n; i++) { var r = 3 + Math.random() * 4.5, t = Math.random() * 6.2832, u = Math.random() * 2 - 1, k = Math.sqrt(1 - u * u); o.push(r * k * Math.cos(t), r * u * 0.8, r * k * Math.sin(t)); } return o; }
    function buf(arr) { var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW); return { b: b, n: arr.length / 3 }; }
    var icoE = buf(edges(ico, 2)), icoV = buf([].concat.apply([], ico));
    var octaE = buf(edges(octa, Math.SQRT2));
    var ring1 = buf(ring(2.9, 96)), ring2 = buf(ring(3.7, 120));
    var cloud = buf(dust(small ? 45 : 130));
    var cloud2 = buf(dust(small ? 25 : 70));
    function floorGrid(n, half) { var o = []; for (var i = -n; i <= n; i++) { var k = i / n * half; o.push(k, 0, -half, k, 0, half, -half, 0, k, half, 0, k); } return o; }
    var floor = buf(floorGrid(small ? 8 : 12, 9));

    /* ---- tiny matrix helpers (column-major) ---- */
    function mul(a, b) { var o = new Array(16); for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) { var s = 0; for (var k = 0; k < 4; k++) { s += a[k * 4 + r] * b[c * 4 + k]; } o[c * 4 + r] = s; } return o; }
    function persp(fov, asp, n, fr) { var t = 1 / Math.tan(fov / 2); return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (fr + n) / (n - fr), -1, 0, 0, 2 * fr * n / (n - fr), 0]; }
    function rx(a) { var c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; }
    function ry(a) { var c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; }
    function rz(a) { var c = Math.cos(a), s = Math.sin(a); return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; }
    function tr(x, y, z) { return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]; }
    function sc(k) { return [k, 0, 0, 0, 0, k, 0, 0, 0, 0, k, 0, 0, 0, 0, 1]; }

    var dpr = Math.min(window.devicePixelRatio || 1, small ? 1 : 1.75), W = 0, H = 0;
    function resize() {
      var r = hero.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width * dpr)); H = Math.max(1, Math.round(r.height * dpr));
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
      gl.viewport(0, 0, W, H);
    }

    var mx = 0, my = 0, px = 0, py = 0;
    function draw(t) {
      var asp = W / H;
      px += (mx - px) * 0.05; py += (my - py) * 0.05;
      var shift = asp > 1.1 ? 0.42 * (rtl ? -1 : 1) : 0;              // keep the artwork on the side away from the text
      var proj = mul(tr(shift, small ? 0.22 : 0.02, 0), persp(0.9, asp, 0.1, 40));
      var view = mul(tr(0, 0, -8.2), mul(rx(0.28 + py * 0.25), ry(px * 0.4)));
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enableVertexAttribArray(loc.p);
      function drawBuf(b, model, mode, col, alpha, size) {
        gl.bindBuffer(gl.ARRAY_BUFFER, b.b);
        gl.vertexAttribPointer(loc.p, 3, gl.FLOAT, false, 0, 0);
        gl.uniformMatrix4fv(loc.m, false, mul(proj, mul(view, model)));
        gl.uniform3fv(loc.col, col); gl.uniform1f(loc.a, alpha);
        gl.uniform1f(loc.pt, mode === gl.POINTS ? 1 : 0); gl.uniform1f(loc.s, size || 1);
        gl.drawArrays(mode, 0, b.n);
      }
      var lilac = [0.72, 0.61, 1], violet = [0.53, 0.36, 1], pink = [0.84, 0.42, 1];
      var s = t * 0.001;
      drawBuf(icoE, mul(ry(s * 0.22), mul(rx(s * 0.15), sc(1.55))), gl.LINES, lilac, 0.95);
      drawBuf(icoV, mul(ry(s * 0.22), mul(rx(s * 0.15), sc(1.55))), gl.POINTS, pink, 1, 9 * dpr);
      drawBuf(icoE, mul(ry(-s * 0.1), mul(rz(s * 0.07), sc(2.35))), gl.LINES, violet, 0.38);
      drawBuf(octaE, mul(tr(Math.cos(s * 0.4) * 3.3, Math.sin(s * 0.55) * 0.9, Math.sin(s * 0.4) * 3.3), mul(ry(s * 0.6), sc(0.55))), gl.LINES, pink, 0.9);
      drawBuf(ring1, mul(rz(0.5), ry(s * 0.12)), gl.LINES, violet, 0.55);
      drawBuf(ring2, mul(rz(-0.35), mul(rx(0.4), ry(-s * 0.08))), gl.LINES, lilac, 0.28);
      drawBuf(cloud, ry(s * 0.03), gl.POINTS, lilac, 0.7, 3.2 * dpr);
      drawBuf(cloud2, mul(ry(-s * 0.045), rz(0.3)), gl.POINTS, pink, 0.55, 2.2 * dpr);       // a second, slower layer for parallax depth
      drawBuf(floor, mul(tr(0, -3.1, 0), ry(s * 0.015)), gl.LINES, violet, 0.22);            // faint floor so the shapes sit in a space
    }

    var running = false, visible = true, last = 0, raf = 0;
    function frame(t) {
      raf = 0;
      if (!running) { return; }
      if (!small || t - last > 32) { last = t; draw(t); }
      raf = window.requestAnimationFrame(frame);
    }
    function setRunning(on) {
      running = on && visible && !document.hidden && !reduce;
      if (running && !raf) { raf = window.requestAnimationFrame(frame); }
    }

    resize();
    draw(reduce ? 6000 : 0);
    hero.classList.add("is-3d");

    if ("ResizeObserver" in window) { new ResizeObserver(function () { resize(); draw(performance.now()); }).observe(hero); }
    else { window.addEventListener("resize", function () { resize(); draw(performance.now()); }); }
    if ("IntersectionObserver" in window) { new IntersectionObserver(function (e) { visible = e[0].isIntersecting; setRunning(true); }).observe(hero); }
    document.addEventListener("visibilitychange", function () { setRunning(true); });
    if (!reduce && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      hero.addEventListener("pointermove", function (e) {
        var r = hero.getBoundingClientRect();
        mx = (e.clientX - r.left) / r.width - 0.5; my = (e.clientY - r.top) / r.height - 0.5;
      });
    }
    canvas.addEventListener("webglcontextlost", function (e) { e.preventDefault(); running = false; hero.classList.remove("is-3d"); });
    setRunning(true);
  }

  function whenIdle() { if ("requestIdleCallback" in window) { window.requestIdleCallback(start, { timeout: 1500 }); } else { window.setTimeout(start, 300); } }
  if (document.readyState === "complete") { whenIdle(); } else { window.addEventListener("load", whenIdle); }
})();
