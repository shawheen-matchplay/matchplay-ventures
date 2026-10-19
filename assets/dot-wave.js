/* Moving dot grids: every dot sways a few pixels in a shifting breeze, and
   every few seconds a warm orange gust drifts through with it ("Wind +
   orange gusts", picked from six drafts in Oct 2026). Used by the homepage
   hero, the homepage's "Ready to apply?" and Capital Partners' closing
   "Invest alongside" section.

   Any element with data-dot-wave gets one: a canvas drawing the same grid as
   its CSS dots (data-gap: px between dots, default 32; data-alpha: their
   white opacity, default 0.10), so the element's own mask still fades it out
   at the edges. It hides the CSS dots (.is-live) only once it is drawing.
   Each grid only animates while it is on screen and the tab is visible.
   With reduced motion nothing starts and the still CSS dots stay. */
(function () {
  "use strict";
  var hosts = document.querySelectorAll("[data-dot-wave]");
  if (!hosts.length || !window.requestAnimationFrame) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var ORANGE = [249, 125, 74];          // --ventures
  // Tuning (Oct 2026: livelier than the first cut: 4px/2px sway, 1x speed,
  // gusts every 11s at +0.2 opacity)
  var SWAY_X = 5.5;                     // px the breeze moves a dot sideways, at most
  var SWAY_Y = 3;                       // px up and down
  var SPEED = 1.5;                      // how fast the breeze moves (1 = the first cut)
  var GUST_EVERY = 8;                   // seconds between orange gusts
  var GUST_WIDTH = 170;                 // px: how broad the orange band is
  var GUST_GLOW = 0.34;                 // extra opacity at the heart of a gust
  var GUST_GROW = 1.0;                  // extra px of dot radius there

  var start = performance.now(), raf = 0, grids = [];

  // One dot at (x, y), t seconds in, in a grid w px wide: its position, size,
  // opacity (on top of the grid's own) and how orange it is (0..1).
  function dot(x, y, t, w) {
    var s = t * SPEED;
    // the breeze: smooth, shifting sways
    var dx = SWAY_X * Math.sin(y / 170 + s * 0.55 + Math.sin(x / 260 + s * 0.25) * 1.4);
    var dy = SWAY_Y * Math.sin(x / 210 - s * 0.42 + Math.cos(y / 300) * 0.8);
    // the gust: a soft band crossing left to right, its front bent by the breeze
    var front = ((t % GUST_EVERY) / GUST_EVERY) * (w + 1000) - 500;
    var d = x + Math.sin(y / 140 + s * 0.5) * 60 - front;
    var k = Math.max(0, Math.exp(-(d * d) / (2 * GUST_WIDTH * GUST_WIDTH)) * (0.75 + 0.25 * Math.sin(y / 230 + s * 0.3)));
    return { x: x + dx * (1 + k), y: y + dy, r: 1.2 + k * GUST_GROW, a: k * GUST_GLOW, o: Math.min(1, k * 1.15) };
  }

  function size(grid) {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    grid.w = grid.host.clientWidth; grid.h = grid.host.clientHeight;
    grid.canvas.width = Math.round(grid.w * dpr); grid.canvas.height = Math.round(grid.h * dpr);
    grid.g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function paint(grid, t) {
    var g = grid.g, gap = grid.gap, w = grid.w, h = grid.h;
    g.clearRect(0, 0, w, h);
    for (var y = gap / 2; y < h + gap; y += gap) {
      for (var x = gap / 2; x < w + gap; x += gap) {
        var p = dot(x, y, t, w);
        g.fillStyle = "rgba(" +
          Math.round(255 + (ORANGE[0] - 255) * p.o) + "," +
          Math.round(255 + (ORANGE[1] - 255) * p.o) + "," +
          Math.round(255 + (ORANGE[2] - 255) * p.o) + "," + (grid.alpha + p.a).toFixed(3) + ")";
        g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.2832); g.fill();
      }
    }
    if (!grid.live) { grid.live = true; grid.host.classList.add("is-live"); }   // the CSS dots step aside
  }

  function frame(now) {
    raf = 0;
    var t = (now - start) / 1000, any = false;
    grids.forEach(function (grid) { if (grid.visible) { paint(grid, t); any = true; } });
    if (any && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function play() { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); }

  Array.prototype.forEach.call(hosts, function (host) {
    var canvas = document.createElement("canvas"), g = canvas.getContext("2d");
    if (!g) return;
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
    host.appendChild(canvas);
    var grid = { host: host, canvas: canvas, g: g, w: 0, h: 0, live: false,
      visible: !("IntersectionObserver" in window),
      gap: parseFloat(host.getAttribute("data-gap")) || 32,
      alpha: parseFloat(host.getAttribute("data-alpha")) || 0.10 };
    size(grid);
    grids.push(grid);
  });

  window.addEventListener("resize", function () { grids.forEach(size); });
  if ("IntersectionObserver" in window) {
    var watch = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        grids.forEach(function (grid) { if (grid.host === e.target) grid.visible = e.isIntersecting; });
      });
      play();
    });
    grids.forEach(function (grid) { watch.observe(grid.host); });
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden) play(); });
  play();
})();
