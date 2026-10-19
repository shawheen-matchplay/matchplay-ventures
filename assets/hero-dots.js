/* The homepage hero's dot grid, moving: every dot sways a few pixels in a
   shifting breeze, and every few seconds a warm orange gust drifts
   through with it ("Wind + orange gusts", picked from six drafts in Oct 2026).

   It draws the same grid as the CSS dots (one 1.2px dot every 32px, white at
   10%) on a canvas inside .hero-dots, so the hero's mask still fades it out
   at the edges, and hides the CSS dots only once it is running. It pauses
   while the hero is off screen or the tab is hidden. With reduced motion it
   never starts and the still CSS dots stay. */
(function () {
  "use strict";
  var host = document.querySelector(".hero-dots");
  if (!host || !window.requestAnimationFrame) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var GAP = 32;                         // px between dots, as in the CSS grid
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

  var canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
  var g = canvas.getContext("2d");
  if (!g) return;
  host.appendChild(canvas);

  var w = 0, h = 0;
  function size() {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    w = host.clientWidth; h = host.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // One dot at (x, y), t seconds in: its offset, size, opacity and how
  // orange it is (0..1).
  function dot(x, y, t) {
    // the breeze: smooth, shifting sways
    var s = t * SPEED;
    var dx = SWAY_X * Math.sin(y / 170 + s * 0.55 + Math.sin(x / 260 + s * 0.25) * 1.4);
    var dy = SWAY_Y * Math.sin(x / 210 - s * 0.42 + Math.cos(y / 300) * 0.8);
    // the gust: a soft band crossing left to right, its front bent by the breeze
    var front = ((t % GUST_EVERY) / GUST_EVERY) * (w + 1000) - 500;
    var d = x + Math.sin(y / 140 + s * 0.5) * 60 - front;
    var k = Math.max(0, Math.exp(-(d * d) / (2 * GUST_WIDTH * GUST_WIDTH)) * (0.75 + 0.25 * Math.sin(y / 230 + s * 0.3)));
    return { x: x + dx * (1 + k), y: y + dy, r: 1.2 + k * GUST_GROW, a: 0.10 + k * GUST_GLOW, o: Math.min(1, k * 1.15) };
  }

  var raf = 0, start = performance.now(), visible = true, live = false;
  function draw(now) {
    var t = (now - start) / 1000;
    g.clearRect(0, 0, w, h);
    for (var y = GAP / 2; y < h + GAP; y += GAP) {
      for (var x = GAP / 2; x < w + GAP; x += GAP) {
        var p = dot(x, y, t);
        g.fillStyle = "rgba(" +
          Math.round(255 + (ORANGE[0] - 255) * p.o) + "," +
          Math.round(255 + (ORANGE[1] - 255) * p.o) + "," +
          Math.round(255 + (ORANGE[2] - 255) * p.o) + "," + p.a.toFixed(3) + ")";
        g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.2832); g.fill();
      }
    }
    if (!live) { live = true; host.classList.add("is-live"); }   // the CSS dots step aside
    raf = requestAnimationFrame(draw);
  }
  function play() { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(draw); }
  function pause() { cancelAnimationFrame(raf); raf = 0; }

  size();
  window.addEventListener("resize", size);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) play(); else pause(); }).observe(host);
  }
  document.addEventListener("visibilitychange", function () { if (document.hidden) pause(); else play(); });
  play();
})();
