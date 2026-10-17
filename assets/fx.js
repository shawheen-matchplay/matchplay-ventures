/* Shared effects for every page (styles in assets/fx.css), ported from the
   MatchPlay Group site (js/glass.js and the pointer cards in js/main.js).

   1. The glass nav: in Chromium browsers the pill bends what is behind it
      (an SVG displacement map drawn to its size, used as its
      backdrop-filter); a lens slides between the links; the tint deepens
      over light sections; a sheen drifts as the page scrolls.
   2. Pointer boxes ([data-tilt], [data-glow]): the accent rule and glows,
      the tilt toward a mouse or pen, and the scroll-driven look on touch. */
(function () {
  "use strict";
  var body = document.body;
  var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---- The wobble (from the Group site's glass-motion reference) -------
     Wide, then tall, a faint echo, back to its own size: even steps, eased
     as a whole. Values are for a 2% peak and scaled to the one asked for. */
  var WOBBLE_MS = 450;
  var WOBBLE = [[0, 0], [0.02, -0.015], [-0.015, 0.02], [0.005, -0.004], [0, 0]];
  var easeInOut = function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
  var wobbleAt = function (ms, peak) {          // [scaleX, scaleY] at ms into the wobble
    var p = easeInOut(Math.min(1, Math.max(0, ms / WOBBLE_MS))) * (WOBBLE.length - 1);
    var i = Math.min(WOBBLE.length - 2, Math.floor(p)), f = p - i, k = peak / 0.02;
    return [1 + k * (WOBBLE[i][0] + (WOBBLE[i + 1][0] - WOBBLE[i][0]) * f),
            1 + k * (WOBBLE[i][1] + (WOBBLE[i + 1][1] - WOBBLE[i][1]) * f)];
  };
  var wobbleFrames = function (peak) {          // the same wobble as Web Animations keyframes
    var out = [];
    for (var i = 0; i <= 90; i++) {
      var s = wobbleAt(WOBBLE_MS * i / 90, peak);
      out.push({ transform: "scale(" + s[0].toFixed(4) + "," + s[1].toFixed(4) + ")" });
    }
    return out;
  };

  /* ---- 1. Glass nav --------------------------------------------------- */
  var nav = document.querySelector(".nav");
  if (nav) {
    var ua = navigator.userAgentData;
    var BEND = !!(ua && ua.brands && ua.brands.some(function (b) { return /Chromium/i.test(b.brand); }));
    var NS = "http://www.w3.org/2000/svg";

    // A displacement map for a w x h box with corner radius r. Red is the
    // sideways pull, green the vertical, 128 none. Within `rim` px of the
    // edge the backdrop is sampled from further in (up to `pull` px).
    var bendMap = function (w, h, r, rim, pull, mag) {
      var c = document.createElement("canvas");
      c.width = w; c.height = h;
      var g = c.getContext("2d"), img = g.createImageData(w, h), px = img.data;
      var hx = w / 2 - r, hy = h / 2 - r;
      var scale = 2 * (pull + mag * Math.max(w, h) / 2) || 1;
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
        var ux = x + 0.5 - w / 2, uy = y + 0.5 - h / 2;
        var qx = Math.abs(ux) - hx, qy = Math.abs(uy) - hy;
        var ox = Math.max(qx, 0), oy = Math.max(qy, 0), ol = Math.hypot(ox, oy);
        var depth = -(ol + Math.min(Math.max(qx, qy), 0) - r);
        var nx, ny;
        if (ol > 0) { nx = ox / ol * Math.sign(ux); ny = oy / ol * Math.sign(uy); }
        else if (qx > qy) { nx = Math.sign(ux); ny = 0; }
        else { nx = 0; ny = Math.sign(uy); }
        var t = depth < rim ? 1 - Math.max(0, depth) / rim : 0, k = t * t;
        var dx = -nx * k * pull - ux * mag, dy = -ny * k * pull - uy * mag;
        var i = (y * w + x) * 4;
        px[i] = Math.max(0, Math.min(255, 128 + dx / scale * 255));
        px[i + 1] = Math.max(0, Math.min(255, 128 + dy / scale * 255));
        px[i + 2] = 128;
        px[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      return { url: c.toDataURL(), scale: scale };
    };
    if (BEND) {
      var holder = document.createElementNS(NS, "svg"), defs = document.createElementNS(NS, "defs");
      holder.setAttribute("aria-hidden", "true");
      holder.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
      holder.appendChild(defs);
      body.appendChild(holder);
      var made = {};
      var el = function (name, attrs, parent) {
        var n = document.createElementNS(NS, name);
        for (var k in attrs) n.setAttribute(k, attrs[k]);
        parent.appendChild(n);
        return n;
      };
      var fit = function () {
        var w = Math.round(nav.offsetWidth), h = Math.round(nav.offsetHeight);
        if (w < 2 || h < 2) return;
        var r = Math.min(parseFloat(getComputedStyle(nav).borderTopLeftRadius) || 0, w / 2, h / 2);
        var id = "lg-" + w + "-" + h;
        if (!made[id]) {
          var m = bendMap(w, h, r, 28, 24, 0.04);
          var f = el("filter", { id: id, x: 0, y: 0, width: w, height: h, filterUnits: "userSpaceOnUse",
            "color-interpolation-filters": "sRGB" }, defs);
          el("feImage", { href: m.url, x: 0, y: 0, width: w, height: h, preserveAspectRatio: "none", result: "map" }, f);
          el("feGaussianBlur", { in: "SourceGraphic", stdDeviation: 0.6, result: "soft" }, f);
          el("feDisplacementMap", { in: "soft", in2: "map", scale: m.scale.toFixed(1),
            xChannelSelector: "R", yChannelSelector: "G" }, f);
          made[id] = true;
        }
        nav.style.setProperty("--lg-filter", "url(#" + id + ") saturate(1.7) brightness(1.05)");
      };
      fit();
      if (window.ResizeObserver) new ResizeObserver(fit).observe(nav);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    }

    // The lens: appears where you first point, then slides to each link on
    // a spring, stretching with speed and settling; fades when you leave.
    if (fine) {
      var lens = document.createElement("span");
      lens.className = "nav__lens";
      lens.setAttribute("aria-hidden", "true");
      nav.insertBefore(lens, nav.firstChild);
      nav.classList.add("has-lens");
      var x = 0, w = 0, vx = 0, vw = 0, tx = 0, tw = 0, ty = 0, th = 0, on = false, raf = 0, last = 0;
      var onCta = false, popAt = -1;             // popAt: when the 103% wobble-in started
      var draw = function (sx, sy) {
        var dx = x, dw = w;
        // Arriving on Apply / Join, the spring's overshoot never carries the
        // drop past the button's border.
        // (It comes in from the left, so only its right edge needs holding.)
        if (onCta && x + w > tx) {
          dw = Math.min(w, tw);
          dx = Math.min(x, tx + tw - dw);
          sx = sy = 1;
        }
        lens.style.width = dw.toFixed(2) + "px";
        lens.style.height = th.toFixed(2) + "px";
        lens.style.transform = "translate(" + dx.toFixed(2) + "px," + ty.toFixed(2) + "px) scale(" + sx.toFixed(3) + "," + sy.toFixed(3) + ")";
      };
      var tick = function (now) {
        var dt = Math.min(1 / 30, Math.max(0, now - last) / 1000);
        last = now;
        var ax = 420 * (tx - x) - 30 * vx, aw = 420 * (tw - w) - 30 * vw;
        vx += ax * dt; vw += aw * dt; x += vx * dt; w += vw * dt;
        var s = Math.min(0.14, Math.abs(vx) / 3500);
        var popping = popAt >= 0 && now - popAt < WOBBLE_MS;
        var wb = popping ? wobbleAt(now - popAt, 0.03) : [1, 1];
        draw((1 + s) * wb[0], (1 - s * 0.8) * wb[1]);
        if (popping || Math.abs(tx - x) > 0.3 || Math.abs(vx) > 2 || Math.abs(tw - w) > 0.3 || Math.abs(vw) > 2) raf = requestAnimationFrame(tick);
        else { x = tx; w = tw; vx = vw = 0; popAt = -1; draw(1, 1); raf = 0; }
      };
      var target = function (link) {
        var a = link.getBoundingClientRect(), b = nav.getBoundingClientRect();
        // On Apply / Join the drop is exactly the button's box, so its edge
        // runs under the orange border (drawn on top) with no gap.
        var cta = link.classList.contains("nav-cta");
        // (offsets from inside the nav's own border, where the drop is placed)
        tx = a.left - b.left - nav.clientLeft; tw = a.width;
        ty = a.top - b.top - nav.clientTop; th = a.height;
        onCta = cta;
        lens.classList.toggle("is-on-cta", cta);
        if (!on || still) { x = tx; w = tw; vx = vw = 0; draw(1, 1); }
        // The first link of a visit: the drop wobbles in (103%). Never on
        // Apply / Join, which stay as they are.
        if (cta) popAt = -1;
        else if (!on && !still) popAt = performance.now();
        on = true;
        lens.classList.add("is-on");
        if (!still && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
      };
      var off = function () { on = false; lens.classList.remove("is-on"); };
      // Apply / Join too: its fill drains on hover, so the lens shows through.
      Array.prototype.forEach.call(nav.querySelectorAll(".nav-link, .nav-cta"), function (link) {
        link.addEventListener("pointerenter", function () { target(link); });
        link.addEventListener("focus", function () { target(link); });
      });
      nav.addEventListener("pointerleave", off);
      nav.addEventListener("focusout", function (e) { if (!nav.contains(e.relatedTarget)) off(); });
    }

    // Deeper tint over light sections (pages marked data-light-page are
    // light all the way down); the sheen slides as the page scrolls.
    var lights = document.querySelectorAll(".section-light");
    var allLight = body.hasAttribute("data-light-page");
    var pending = 0;
    var onScroll = function () {
      pending = 0;
      var r = nav.getBoundingClientRect(), mid = (r.top + r.bottom) / 2;
      var light = allLight || Array.prototype.some.call(lights, function (s) {
        var q = s.getBoundingClientRect();
        return q.top < mid && q.bottom > mid;
      });
      body.classList.toggle("glass-on-light", light);
      nav.style.setProperty("--sheen", (50 + Math.sin(window.scrollY / 420) * 45).toFixed(1) + "%");
    };
    window.addEventListener("scroll", function () { if (!pending) pending = requestAnimationFrame(onScroll); }, { passive: true });
    onScroll();
  }

  /* ---- Main calls to action wobble -------------------------------------
     One soft wobble on hover (101%), half that when the pointer leaves. */
  if (fine && !still) {
    var ENTER = wobbleFrames(0.01), LEAVE = wobbleFrames(0.005);
    Array.prototype.forEach.call(document.querySelectorAll(".btn-primary"), function (btn) {
      if (!btn.animate) return;
      var run = null;
      var play = function (frames, ms) { if (run) run.cancel(); run = btn.animate(frames, { duration: ms, composite: "add" }); };
      btn.addEventListener("pointerenter", function () { play(ENTER, WOBBLE_MS); });
      btn.addEventListener("pointerleave", function () { play(LEAVE, WOBBLE_MS * 0.85); });
    });
  }

  /* ---- Page transitions ---------------------------------------------- */
  // Keep the nav still while pages cross-fade (assets/fx.css): it carries a
  // view-transition-name only for the length of the transition.
  var wrap = document.querySelector(".nav-wrap");
  if (wrap) {
    window.addEventListener("pageswap", function (e) { if (e.viewTransition) wrap.classList.add("fx-vt-nav"); });
    window.addEventListener("pagereveal", function (e) {
      if (!e.viewTransition) return;
      wrap.classList.add("fx-vt-nav");
      e.viewTransition.finished.finally(function () { wrap.classList.remove("fx-vt-nav"); });
    });
    // Back/forward cache: a page restored after its swap would keep the name.
    window.addEventListener("pageshow", function (e) { if (e.persisted) wrap.classList.remove("fx-vt-nav"); });
  }

  /* ---- 2. Pointer boxes ------------------------------------------------ */
  var boxes = document.querySelectorAll("[data-tilt], [data-glow]");
  if (!boxes.length) return;
  Array.prototype.forEach.call(boxes, function (box) {
    if (box.querySelector(":scope > .fx")) return;
    var fx = document.createElement("span");
    fx.className = "fx";
    fx.setAttribute("aria-hidden", "true");
    fx.innerHTML = '<span class="fx__orb fx__orb--rest"></span><span class="fx__orb fx__orb--pointer"></span>';
    box.insertBefore(fx, box.firstChild);
  });
  var tilts = function (box) { return box.hasAttribute("data-tilt") && !still; };
  var EASE_IN = "transform 0.15s ease-out, background-color 0.4s, border-color 0.4s, box-shadow 0.4s";
  var EASE_OUT = "transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1), background-color 0.4s, border-color 0.4s, box-shadow 0.4s";

  if (fine) {
    // Measured once as the pointer comes in (again only after a scroll), and
    // moves gathered into one update per frame, so tilting never forces the
    // page to lay out again mid-frame.
    var DRIFT = 4, LIFT = 4, scrolled = 0;
    window.addEventListener("scroll", function () { scrolled++; }, { passive: true });
    Array.prototype.forEach.call(boxes, function (box) {
      var settle, rect = null, rectAt = -1, lastE = null, frame = 0;
      var TILT = 2 * (parseFloat(box.getAttribute("data-tilt")) || 1);   // data-tilt="2": 2 degrees either way
      var measure = function () {
        var r = box.getBoundingClientRect();
        rect = { left: r.left, top: r.top, w: box.offsetWidth, h: box.offsetHeight };
        rectAt = scrolled;
      };
      var place = function (e) {
        if (!rect || rectAt !== scrolled) measure();
        var px = Math.min(Math.max((e.clientX - rect.left) / rect.w, 0), 1);
        var py = Math.min(Math.max((e.clientY - rect.top) / rect.h, 0), 1);
        box.style.setProperty("--gx", (px * rect.w).toFixed(1) + "px");
        box.style.setProperty("--gy", (py * rect.h).toFixed(1) + "px");
        return [px, py];
      };
      var update = function () {
        frame = 0;
        if (!lastE) return;
        var p = place(lastE);
        if (!tilts(box)) return;
        // the edge under the pointer comes toward the viewer
        box.style.transform = "perspective(900px)" +
          " rotateX(" + ((p[1] - 0.5) * TILT).toFixed(2) + "deg)" +
          " rotateY(" + ((0.5 - p[0]) * TILT).toFixed(2) + "deg)" +
          " translate3d(" + ((p[0] - 0.5) * DRIFT).toFixed(1) + "px," + (-LIFT + (p[1] - 0.5) * DRIFT).toFixed(1) + "px,0)";
      };
      box.addEventListener("pointerenter", function (e) {
        if (e.pointerType === "touch") return;
        clearTimeout(settle);
        measure();
        place(e);                       // the glow appears under the pointer, not where it last was
        box.getBoundingClientRect();
        box.classList.add("is-tracking");
        if (tilts(box)) box.style.transition = EASE_IN;
      });
      box.addEventListener("pointermove", function (e) {
        if (e.pointerType === "touch") return;
        lastE = { clientX: e.clientX, clientY: e.clientY };
        if (!frame) frame = requestAnimationFrame(update);
      });
      box.addEventListener("pointerleave", function () {
        cancelAnimationFrame(frame); frame = 0; lastE = null; rect = null;
        box.classList.remove("is-tracking");
        if (!tilts(box)) return;
        box.style.transition = EASE_OUT;
        box.style.transform = "";
        settle = setTimeout(function () { box.style.transition = ""; }, 650);
      });
    });
  } else if (window.matchMedia("(hover: none)").matches && "IntersectionObserver" in window) {
    // Touch: the box crossing a line at 45% of the screen height takes the
    // hover look, the glow travelling down it and the box rocking a degree.
    var FOCUS = 0.45, onScreen = new Set(), boxRaf = 0;
    var setActive = function (box, on) {
      if (on === box.classList.contains("is-active")) return;
      box.classList.toggle("is-active", on);
      box.classList.toggle("is-tracking", on);
      if (box.hasAttribute("data-tilt")) box.style.transition = on ? "transform 0.3s ease-out, background-color 0.4s, border-color 0.4s, box-shadow 0.4s" : EASE_OUT;
      if (!on) { box.style.transform = ""; box._q = null; }
    };
    var updateBoxes = function () {
      boxRaf = 0;
      var line = window.innerHeight * FOCUS;
      onScreen.forEach(function (box) {
        var r = box.getBoundingClientRect();
        var q = (line - r.top) / r.height;   // 0: top edge on the line .. 1: bottom edge on it
        var on = q >= 0 && q <= 1;
        setActive(box, on);
        if (!on || (box._q != null && Math.abs(q - box._q) < 0.002)) return;
        box._q = q;
        box.style.setProperty("--gx", (r.width * (0.3 + 0.4 * q)).toFixed(1) + "px");
        box.style.setProperty("--gy", (r.height * q).toFixed(1) + "px");
        if (tilts(box)) {
          var TILT = 2 * (parseFloat(box.getAttribute("data-tilt")) || 1);
          box.style.transform = "perspective(900px) rotateX(" + ((0.5 - q) * TILT).toFixed(2) + "deg) translate3d(0,-4px,0)";
        }
      });
      if (onScreen.size) boxRaf = requestAnimationFrame(updateBoxes);
    };
    var watch = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) onScreen.add(e.target);
        else { onScreen.delete(e.target); setActive(e.target, false); }
      });
      if (onScreen.size && !boxRaf) boxRaf = requestAnimationFrame(updateBoxes);
    });
    Array.prototype.forEach.call(boxes, function (box) { watch.observe(box); });
  }
})();
