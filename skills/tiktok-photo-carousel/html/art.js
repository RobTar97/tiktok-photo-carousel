/* ============================================================================
   TikTok Photo Carousel - code-drawn imagery
   Every mark here is drawn by code: no AI images, no network, no pixel reads.

   Two families:
     photo-derived  redraw the slide's own photograph from the luminance and
                    colour grids analyze.py exported - contours of its light,
                    halftone, ASCII, dither, mosaic
     procedural     flow fields, rings, rays, grids, dimension lines, rough
                    pen marks, routes, badges, seals, tape, fibres, leaks

   Everything is seeded, so the studio and the export draw the same picture,
   and a re-render months later draws it again.

   Each generator is   fn(ctx, opt) -> SVG markup (inner content)
   ctx = { w, h, rand, noise, photo, uid }
     w, h   the area in canvas px (whole slide, or the photo layer)
     rand   seeded 0..1 generator
     noise  seeded 2D gradient noise, roughly -1..1
     photo  sampler for the slide's photo, or null - .lum(x,y) 0..1 and
            .rgb(x,y) [r,g,b], both in area coordinates
     uid    a unique id prefix for defs
   ========================================================================= */
(function () {
  "use strict";

  /* === RANDOMNESS ====================================================== */
  function hash(str) {                       // FNV-1a, 32-bit
    var h = 2166136261;
    str = String(str);
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function rng(seed) {                       // mulberry32
    var a = hash(seed);
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* 2D gradient noise. Small, seeded, smooth enough for flow and terrain. */
  function makeNoise(rand) {
    var p = [], i;
    for (i = 0; i < 256; i++) p[i] = i;
    for (i = 255; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1)), t = p[i]; p[i] = p[j]; p[j] = t;
    }
    var perm = p.concat(p);
    var G = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
    function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function dot(g, x, y) { return g[0] * x + g[1] * y; }
    return function (x, y) {
      var X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
      x -= Math.floor(x); y -= Math.floor(y);
      var u = fade(x), v = fade(y);
      var a = perm[X] + Y, b = perm[X + 1] + Y;
      var n00 = dot(G[perm[a] & 7], x, y),     n10 = dot(G[perm[b] & 7], x - 1, y);
      var n01 = dot(G[perm[a + 1] & 7], x, y - 1), n11 = dot(G[perm[b + 1] & 7], x - 1, y - 1);
      var nx0 = n00 + u * (n10 - n00), nx1 = n01 + u * (n11 - n01);
      return (nx0 + v * (nx1 - nx0)) * 1.4;
    };
  }
  function fbm(noise, x, y, oct) {
    var s = 0, a = 1, f = 1, norm = 0;
    for (var i = 0; i < (oct || 4); i++) {
      s += a * noise(x * f, y * f); norm += a; a *= 0.5; f *= 2;
    }
    return s / norm;
  }

  /* === PHOTO SAMPLER ===================================================
     Maps a point in the photo layer onto the grid with the same maths the
     browser uses for object-fit: cover + object-position. The focus point
     is where object-position puts it, so code-drawn marks land on the
     subject rather than on the middle of the frame.                       */
  function decode(g) {
    if (g._bytes) return g._bytes;
    var bin = atob(g.data), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    g._bytes = out;
    return out;
  }
  function sampler(grid, boxW, boxH, focus) {
    if (!grid || !grid.lum) return null;
    var L = grid.lum, C = grid.rgb;
    var lb = decode(L), cb = C ? decode(C) : null;
    var fx = focus ? focus[0] : 0.5, fy = focus ? focus[1] : 0.5;
    function map(g, x, y) {
      var s = Math.max(boxW / g.w, boxH / g.h);
      var ox = (boxW - g.w * s) * fx, oy = (boxH - g.h * s) * fy;
      return [(x - ox) / s, (y - oy) / s];
    }
    return {
      lum: function (x, y) {
        var uv = map(L, x, y);
        var u = Math.max(0, Math.min(L.w - 1.001, uv[0] - 0.5));
        var v = Math.max(0, Math.min(L.h - 1.001, uv[1] - 0.5));
        var x0 = Math.floor(u), y0 = Math.floor(v), tx = u - x0, ty = v - y0;
        var i = y0 * L.w + x0;
        var a = lb[i], b = lb[i + 1], c = lb[i + L.w], d = lb[i + L.w + 1];
        return ((a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty) / 255;
      },
      rgb: function (x, y) {
        if (!cb) return [128, 128, 128];
        var uv = map(C, x, y);
        var u = Math.max(0, Math.min(C.w - 1, Math.floor(uv[0])));
        var v = Math.max(0, Math.min(C.h - 1, Math.floor(uv[1])));
        var i = (v * C.w + u) * 3;
        return [cb[i], cb[i + 1], cb[i + 2]];
      }
    };
  }

  /* === SMALL HELPERS =================================================== */
  function r1(n) { return Math.round(n * 10) / 10; }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  /* Colour tokens resolve to the slide's own custom properties, so a
     preset's art follows its theme and a brand kit recolours it for free. */
  function col(c, fallback) {
    c = c || fallback || "accent";
    var tokens = { accent: "--accent", ink: "--ink", paper: "--paper", bg: "--bg",
                   block: "--block", "on-accent": "--on-accent", muted: "--muted" };
    return tokens[c] ? "var(" + tokens[c] + ")" : c;
  }
  /* Field sampled on a lattice: the photo's light, or seeded terrain.
     norm stretches the photo's own range to 0..1 first: a bright photo
     otherwise screens to tiny dots and riso's halftone all but vanished. */
  function field(ctx, opt, norm) {
    if (ctx.photo && opt.source !== "noise") {
      if (!norm || opt.normalize === false) return function (x, y) { return ctx.photo.lum(x, y); };
      var vals = [];
      for (var sy = 0; sy < 60; sy++) for (var sx = 0; sx < 34; sx++) {
        vals.push(ctx.photo.lum((sx + 0.5) * ctx.w / 34, (sy + 0.5) * ctx.h / 60));
      }
      vals.sort(function (a, b) { return a - b; });
      var lo = vals[Math.floor(vals.length * 0.04)], hi = vals[Math.floor(vals.length * 0.96)];
      var span = Math.max(0.08, hi - lo);
      return function (x, y) { return Math.max(0, Math.min(1, (ctx.photo.lum(x, y) - lo) / span)); };
    }
    var sc = opt.scale || 0.0028;
    return function (x, y) { return fbm(ctx.noise, x * sc, y * sc, 4) * 0.5 + 0.5; };
  }
  /* Catmull-Rom through points -> smooth cubic path. */
  function smooth(pts, closed) {
    if (pts.length < 2) return "";
    var d = "M" + r1(pts[0][0]) + " " + r1(pts[0][1]);
    var n = pts.length;
    for (var i = 0; i < n - (closed ? 0 : 1); i++) {
      var p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      if (!closed) { if (i === 0) p0 = p1; if (i + 2 >= n) p3 = p2; }
      d += " C" + r1(p1[0] + (p2[0] - p0[0]) / 6) + " " + r1(p1[1] + (p2[1] - p0[1]) / 6) +
           " " + r1(p2[0] - (p3[0] - p1[0]) / 6) + " " + r1(p2[1] - (p3[1] - p1[1]) / 6) +
           " " + r1(p2[0]) + " " + r1(p2[1]);
    }
    return d + (closed ? " Z" : "");
  }
  /* A point given as fractions of the area, or as canvas px. */
  function pt(ctx, p, dflt) {
    p = p || dflt || [0.5, 0.5];
    return [p[0] <= 1.5 ? p[0] * ctx.w : p[0], p[1] <= 1.5 ? p[1] * ctx.h : p[1]];
  }

  /* Move a placed element (badge, seal, tape) off the copy: to whichever
     side of the copy block has room, keeping its x. */
  function clear(ctx, c, half) {
    var k = ctx.copy;
    if (!k) return c;
    var pad = 24;
    var hit = c[0] + half > k.x - pad && c[0] - half < k.x + k.w + pad &&
              c[1] + half > k.y - pad && c[1] - half < k.y + k.h + pad;
    if (!hit) return c;
    var above = k.y - pad - half, below = k.y + k.h + pad + half;
    var topRoom = above - ctx.h * 0.09, botRoom = ctx.h * 0.84 - below;
    return [c[0], topRoom >= 0 && (topRoom >= botRoom || botRoom < 0) ? above : below];
  }

  var GEN = {};

  /* =====================================================================
     PHOTO-DERIVED
     ===================================================================== */

  /* contour - the photograph's own light drawn as a topographic map.
     Marching squares on the luminance grid; every fourth line is an index
     contour, drawn heavier, the way survey maps do it.                    */
  GEN.contour = function (ctx, o) {
    var f = field(ctx, o), cell = o.cell || 12;
    var cols = Math.ceil(ctx.w / cell) + 1, rows = Math.ceil(ctx.h / cell) + 1;
    var v = new Float32Array(cols * rows), vals = [];
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
      var z = f(x * cell, y * cell); v[y * cols + x] = z; vals.push(z);
    }
    // Quantile levels: lines spread evenly through the image's own tones
    // instead of bunching in whichever band most of the pixels sit in.
    vals.sort(function (a, b) { return a - b; });
    var n = o.levels || 9, levels = [];
    for (var k = 1; k <= n; k++) levels.push(vals[Math.floor(vals.length * k / (n + 1))]);

    var out = "", width = o.width || 2;
    levels.forEach(function (lv, li) {
      var d = "";
      for (var y = 0; y < rows - 1; y++) for (var x = 0; x < cols - 1; x++) {
        var a = v[y * cols + x], b = v[y * cols + x + 1];
        var c = v[(y + 1) * cols + x + 1], e = v[(y + 1) * cols + x];
        var idx = (a > lv ? 8 : 0) | (b > lv ? 4 : 0) | (c > lv ? 2 : 0) | (e > lv ? 1 : 0);
        if (idx === 0 || idx === 15) continue;
        var X = x * cell, Y = y * cell;
        var top = [X + cell * (lv - a) / (b - a), Y];
        var right = [X + cell, Y + cell * (lv - b) / (c - b)];
        var bottom = [X + cell * (lv - e) / (c - e), Y + cell];
        var left = [X, Y + cell * (lv - a) / (e - a)];
        var seg = {
          1: [left, bottom], 2: [bottom, right], 3: [left, right], 4: [top, right],
          5: [top, left, bottom, right], 6: [top, bottom], 7: [top, left],
          8: [top, left], 9: [top, bottom], 10: [top, right, left, bottom],
          11: [top, right], 12: [left, right], 13: [bottom, right], 14: [left, bottom]
        }[idx];
        for (var s = 0; s < seg.length; s += 2) {
          d += "M" + r1(seg[s][0]) + " " + r1(seg[s][1]) +
               "L" + r1(seg[s + 1][0]) + " " + r1(seg[s + 1][1]);
        }
      }
      var major = (li + 1) % 4 === 0;
      out += '<path d="' + d + '" fill="none" stroke-linecap="round" style="stroke:' +
        col(o.color) + '" stroke-width="' + (major ? width * 2.1 : width) + '" opacity="' +
        (major ? 1 : 0.72) + '"/>';
    });
    return out;
  };

  /* halftone - the photo re-screened as dots, on a rotated screen the way
     print does it. Dark areas take big dots unless invert is set.         */
  GEN.halftone = function (ctx, o) {
    var f = field(ctx, o, true), cell = o.cell || 15;
    var ang = (o.angle != null ? o.angle : 15) * Math.PI / 180;
    var ca = Math.cos(ang), sa = Math.sin(ang), gamma = o.gamma || 1.15;
    var R = Math.hypot(ctx.w, ctx.h), cx = ctx.w / 2, cy = ctx.h / 2;
    var off = o.offset || [0, 0], d = "", max = cell * (o.size || 0.62);
    for (var j = -R / 2; j < R / 2; j += cell) for (var i = -R / 2; i < R / 2; i += cell) {
      var x = cx + i * ca - j * sa, y = cy + i * sa + j * ca;
      if (x < -cell || y < -cell || x > ctx.w + cell || y > ctx.h + cell) continue;
      var t = f(Math.max(0, Math.min(ctx.w, x)), Math.max(0, Math.min(ctx.h, y)));
      if (!o.invert) t = 1 - t;
      var r = Math.pow(t, gamma) * max;
      if (r < 0.6) continue;
      var X = r1(x + off[0]), Y = r1(y + off[1]);
      d += "M" + r1(X - r) + " " + Y + "a" + r1(r) + " " + r1(r) + " 0 1 0 " + r1(2 * r) +
           " 0a" + r1(r) + " " + r1(r) + " 0 1 0 " + r1(-2 * r) + " 0";
    }
    return '<path d="' + d + '" style="fill:' + col(o.color, "ink") + '"/>';
  };

  /* ascii - the photo as characters. textLength pins every row to the
     exact width, so the grid holds whatever monospace face loads.         */
  GEN.ascii = function (ctx, o) {
    var f = field(ctx, o, true), size = o.size || 22, cw = size * 0.6, lh = size * 1.02;
    var ramp = o.ramp || " .`:-=+*cs#%@";
    if (o.invert) ramp = ramp.split("").reverse().join("");
    var cols = Math.floor(ctx.w / cw), rows = Math.floor(ctx.h / lh), out = "";
    for (var y = 0; y < rows; y++) {
      var line = "";
      for (var x = 0; x < cols; x++) {
        var t = f((x + 0.5) * cw, (y + 0.5) * lh);
        line += ramp[Math.min(ramp.length - 1, Math.floor((1 - t) * ramp.length))];
      }
      out += '<text x="0" y="' + r1((y + 0.82) * lh) + '" textLength="' + r1(cols * cw) +
        '" lengthAdjust="spacing" xml:space="preserve">' + esc(line) + "</text>";
    }
    return '<g style="fill:' + col(o.color, "accent") + ';font-family:var(--font-mono),monospace;' +
      'font-size:' + size + 'px;font-weight:' + (o.weight || 500) + '">' + out + "</g>";
  };

  /* dither - ordered (Bayer 8x8) 1-bit, the look of early screens and
     cheap printers. Horizontal runs merge into one rect to keep it light. */
  var BAYER = [0,32,8,40,2,34,10,42,48,16,56,24,50,18,58,26,12,44,4,36,14,46,6,38,
    60,28,52,20,62,30,54,22,3,35,11,43,1,33,9,41,51,19,59,27,49,17,57,25,15,47,7,
    39,13,45,5,37,63,31,55,23,61,29,53,21];
  GEN.dither = function (ctx, o) {
    var f = field(ctx, o, true), px = o.px || 7, d = "";
    var bias = o.bias || 0, cols = Math.ceil(ctx.w / px), rows = Math.ceil(ctx.h / px);
    for (var y = 0; y < rows; y++) {
      var run = -1;
      for (var x = 0; x <= cols; x++) {
        var on = false;
        if (x < cols) {
          var t = f(x * px + px / 2, y * px + px / 2) + bias;
          on = o.invert ? t > (BAYER[(y % 8) * 8 + (x % 8)] + 0.5) / 64
                        : t < (BAYER[(y % 8) * 8 + (x % 8)] + 0.5) / 64;
        }
        if (on && run < 0) run = x;
        if (!on && run >= 0) { d += "M" + run * px + " " + y * px + "h" + (x - run) * px + "v" + px + "h" + -(x - run) * px + "z"; run = -1; }
      }
    }
    return '<path d="' + d + '" style="fill:' + col(o.color, "ink") + '"/>';
  };

  /* mosaic - the photo as colour blocks, with an optional sharp window
     onto the real photograph: the "zoom and enhance" reveal.              */
  GEN.mosaic = function (ctx, o) {
    if (!ctx.photo) return "";
    var cell = o.cell || 54, gap = o.gap != null ? o.gap : 3, rad = o.radius || 0, out = "";
    var win = null;
    if (o.reveal) {
      var c = pt(ctx, o.reveal.at || o.reveal, ctx.focus);
      var ww = (o.reveal.w || 0.46) * ctx.w, wh = (o.reveal.h || 0.26) * ctx.h;
      win = [c[0] - ww / 2, c[1] - wh / 2, ww, wh];
    }
    // Grout: a solid ground under the blocks, with the window cut out, so
    // the gaps read as tile joints rather than slivers of sharp photo.
    var ground = "M0 0H" + r1(ctx.w) + "V" + r1(ctx.h) + "H0Z";
    if (win) ground += "M" + r1(win[0]) + " " + r1(win[1]) + "v" + r1(win[3]) + "h" + r1(win[2]) + "v" + r1(-win[3]) + "Z";
    out += '<path d="' + ground + '" fill-rule="evenodd" style="fill:' + col(o.ground, "bg") + '"/>';
    for (var y = 0; y < ctx.h; y += cell) for (var x = 0; x < ctx.w; x += cell) {
      if (win && x + cell > win[0] && x < win[0] + win[2] && y + cell > win[1] && y < win[1] + win[3]) continue;
      var c3 = ctx.photo.rgb(x + cell / 2, y + cell / 2);
      out += '<rect x="' + (x + gap / 2) + '" y="' + (y + gap / 2) + '" width="' + (cell - gap) +
        '" height="' + (cell - gap) + '" rx="' + rad + '" fill="rgb(' + c3.join(",") + ')"/>';
    }
    if (win) {
      out += '<rect x="' + r1(win[0]) + '" y="' + r1(win[1]) + '" width="' + r1(win[2]) + '" height="' +
        r1(win[3]) + '" rx="' + (o.frameRadius || 0) + '" fill="none" style="stroke:' + col(o.color, "accent") + '" stroke-width="' + (o.frame || 7) + '"/>';
    }
    return out;
  };

  /* =====================================================================
     PROCEDURAL
     ===================================================================== */

  /* flowfield - streamlines through seeded noise. Quiet at low opacity,
     it reads as wind, water or crowd movement behind the copy.            */
  GEN.flowfield = function (ctx, o) {
    var n = o.count || 420, steps = o.steps || 60, step = o.step || 7;
    var sc = o.scale || 0.0021, turn = o.turn || 2.2, d = "";
    for (var i = 0; i < n; i++) {
      var x = ctx.rand() * ctx.w, y = ctx.rand() * ctx.h, p = [[x, y]];
      for (var s = 0; s < steps; s++) {
        var a = fbm(ctx.noise, x * sc, y * sc, 3) * Math.PI * turn;
        x += Math.cos(a) * step; y += Math.sin(a) * step;
        if (x < -20 || y < -20 || x > ctx.w + 20 || y > ctx.h + 20) break;
        if (s % 3 === 0) p.push([x, y]);
      }
      if (p.length > 3) d += smooth(p);
    }
    return '<path d="' + d + '" fill="none" stroke-linecap="round" style="stroke:' +
      col(o.color, "ink") + '" stroke-width="' + (o.width || 1.6) + '"/>';
  };

  /* rings - concentric circles, like ripples or a radar sweep. */
  GEN.rings = function (ctx, o) {
    var c = pt(ctx, o.at, ctx.focus), n = o.count || 14, gap = o.gap || 46, out = "";
    for (var i = 1; i <= n; i++) {
      var r = i * gap + (o.start || 0);
      out += '<circle cx="' + r1(c[0]) + '" cy="' + r1(c[1]) + '" r="' + r1(r) + '" fill="none" style="stroke:' +
        col(o.color, "ink") + '" stroke-width="' + (o.width || 1.5) + '" opacity="' +
        r1(1 - i / (n + 1)) + '"' + (o.dash ? ' stroke-dasharray="' + o.dash + '"' : "") + "/>";
    }
    return out;
  };

  /* rays - a sunburst from a point; alternate wedges carry the colour. */
  GEN.rays = function (ctx, o) {
    var c = pt(ctx, o.at, [0.5, 0.42]), n = o.count || 28, R = Math.hypot(ctx.w, ctx.h), d = "";
    var rot = (o.rotate || 0) * Math.PI / 180;
    for (var i = 0; i < n; i += 2) {
      var a1 = rot + i / n * Math.PI * 2, a2 = rot + (i + 1) / n * Math.PI * 2;
      d += "M" + r1(c[0]) + " " + r1(c[1]) + "L" + r1(c[0] + Math.cos(a1) * R) + " " +
        r1(c[1] + Math.sin(a1) * R) + "L" + r1(c[0] + Math.cos(a2) * R) + " " + r1(c[1] + Math.sin(a2) * R) + "Z";
    }
    return '<path d="' + d + '" style="fill:' + col(o.color, "accent") + '"/>';
  };

  /* grid - an engineering grid: minor and major lines, optional
     registration crosses at major intersections.                          */
  GEN.grid = function (ctx, o) {
    var g = o.cell || 36, maj = o.major || 5, minor = "", major = "", marks = "";
    for (var x = 0, i = 0; x <= ctx.w; x += g, i++) (i % maj ? (minor += "M" + x + " 0V" + ctx.h) : (major += "M" + x + " 0V" + ctx.h));
    for (var y = 0, j = 0; y <= ctx.h; y += g, j++) (j % maj ? (minor += "M0 " + y + "H" + ctx.w) : (major += "M0 " + y + "H" + ctx.w));
    if (o.crosses) {
      for (var X = 0; X <= ctx.w; X += g * maj) for (var Y = 0; Y <= ctx.h; Y += g * maj) {
        marks += "M" + (X - 9) + " " + Y + "h18M" + X + " " + (Y - 9) + "v18";
      }
    }
    var c = col(o.color, "ink");
    return '<path d="' + minor + '" style="stroke:' + c + '" stroke-width="1" opacity="0.38"/>' +
      '<path d="' + major + '" style="stroke:' + c + '" stroke-width="1.6" opacity="0.7"/>' +
      (marks ? '<path d="' + marks + '" style="stroke:' + c + '" stroke-width="2.4"/>' : "");
  };

  /* dimension - an architect's dimension line between two points, with
     slashed ticks and the measurement label set into a gap in the line.  */
  GEN.dimension = function (ctx, o) {
    var a = pt(ctx, o.from, [0.12, 0.6]), b = pt(ctx, o.to, [0.88, 0.6]);
    var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
    var label = o.label || "", size = o.size || 30, gap = label ? label.length * size * 0.36 + 24 : 0;
    var m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], c = col(o.color, "ink"), w = o.width || 2.4;
    var tick = function (p) {
      return "M" + r1(p[0] - 14 * (ux - uy)) + " " + r1(p[1] - 14 * (uy + ux)) + "l" + r1(28 * (ux - uy)) + " " + r1(28 * (uy + ux));
    };
    var ext = function (p) { return "M" + r1(p[0] + uy * 26) + " " + r1(p[1] - ux * 26) + "l" + r1(-uy * 52) + " " + r1(ux * 52); };
    var d = "M" + r1(a[0]) + " " + r1(a[1]) + "L" + r1(m[0] - ux * gap / 2) + " " + r1(m[1] - uy * gap / 2) +
      "M" + r1(m[0] + ux * gap / 2) + " " + r1(m[1] + uy * gap / 2) + "L" + r1(b[0]) + " " + r1(b[1]) +
      tick(a) + tick(b) + ext(a) + ext(b);
    var ang = Math.atan2(dy, dx) * 180 / Math.PI;
    return '<path d="' + d + '" fill="none" style="stroke:' + c + '" stroke-width="' + w + '"/>' +
      (label ? '<text x="' + r1(m[0]) + '" y="' + r1(m[1]) + '" text-anchor="middle" dominant-baseline="central" ' +
        'transform="rotate(' + r1(ang) + " " + r1(m[0]) + " " + r1(m[1]) + ')" style="fill:' + c +
        ';font-family:var(--font-mono),monospace;font-size:' + size + 'px;letter-spacing:0.14em">' + esc(label) + "</text>" : "");
  };

  /* rough - pen marks drawn the way a hand draws them: two passes that do
     not quite agree, an ellipse that overshoots where it should close.    */
  function wobble(ctx, pts, amt) {
    return pts.map(function (p) { return [p[0] + (ctx.rand() - 0.5) * amt, p[1] + (ctx.rand() - 0.5) * amt]; });
  }
  GEN.rough = function (ctx, o) {
    var c = col(o.color, "accent"), w = o.width || 7, amt = o.wobble || 10, d = "";
    var kind = o.kind || "circle", at = pt(ctx, o.at, ctx.focus);
    var rw = (o.w || 0.34) * ctx.w / 2, rh = (o.h || 0.12) * ctx.h / 2;
    for (var pass = 0; pass < (o.passes || 2); pass++) {
      var pts = [], i;
      if (kind === "circle") {
        var start = ctx.rand() * Math.PI * 2, sweep = Math.PI * 2 * (1.08 + ctx.rand() * 0.1);
        for (i = 0; i <= 14; i++) {
          var a = start + sweep * i / 14, k = 1 + (ctx.rand() - 0.5) * 0.06;
          pts.push([at[0] + Math.cos(a) * rw * k, at[1] + Math.sin(a) * rh * k]);
        }
        d += smooth(wobble(ctx, pts, amt * 0.6));
      } else if (kind === "underline") {
        for (i = 0; i <= 6; i++) pts.push([at[0] - rw + 2 * rw * i / 6, at[1] + Math.sin(i * 1.3 + pass) * 4]);
        d += smooth(wobble(ctx, pts, amt * 0.4));
      } else if (kind === "box") {
        pts = [[at[0] - rw, at[1] - rh], [at[0] + rw, at[1] - rh], [at[0] + rw, at[1] + rh],
               [at[0] - rw, at[1] + rh], [at[0] - rw + 8, at[1] - rh - 4]];
        d += "M" + wobble(ctx, pts, amt).map(function (p) { return r1(p[0]) + " " + r1(p[1]); }).join("L");
      } else if (kind === "arrow") {
        var from = pt(ctx, o.from, [at[0] / ctx.w + 0.22, at[1] / ctx.h - 0.16]);
        var mid = [(from[0] + at[0]) / 2 + (at[1] - from[1]) * 0.25, (from[1] + at[1]) / 2 - (at[0] - from[0]) * 0.25];
        d += smooth(wobble(ctx, [from, mid, at], amt * 0.5));
        var ang = Math.atan2(at[1] - mid[1], at[0] - mid[0]), hl = 46;
        if (pass === 0) {
          d += "M" + r1(at[0] - Math.cos(ang - 0.5) * hl) + " " + r1(at[1] - Math.sin(ang - 0.5) * hl) +
               "L" + r1(at[0]) + " " + r1(at[1]) + "L" + r1(at[0] - Math.cos(ang + 0.5) * hl) + " " + r1(at[1] - Math.sin(ang + 0.5) * hl);
        }
      } else if (kind === "cross") {
        d += "M" + r1(at[0] - rw) + " " + r1(at[1] - rh) + "L" + r1(at[0] + rw) + " " + r1(at[1] + rh) +
             "M" + r1(at[0] + rw) + " " + r1(at[1] - rh) + "L" + r1(at[0] - rw) + " " + r1(at[1] + rh);
      }
    }
    return '<path d="' + d + '" fill="none" stroke-linecap="round" stroke-linejoin="round" style="stroke:' +
      c + '" stroke-width="' + w + '"/>';
  };

  /* route - a hand-drawn path through stops, with numbered pins. The
     numbers mean something: the order you would walk it in.              */
  GEN.route = function (ctx, o) {
    var stops = (o.points || [[0.2, 0.7], [0.45, 0.48], [0.72, 0.56], [0.8, 0.3]]).map(function (p) { return pt(ctx, p); });
    var c = col(o.color, "accent"), dense = [], i;
    for (i = 0; i < stops.length - 1; i++) {
      var a = stops[i], b = stops[i + 1];
      for (var k = 0; k < 4; k++) {
        var t = k / 4, bend = Math.sin(t * Math.PI) * 38 * (i % 2 ? 1 : -1);
        dense.push([a[0] + (b[0] - a[0]) * t - (b[1] - a[1]) / Math.hypot(b[0] - a[0], b[1] - a[1]) * bend,
                    a[1] + (b[1] - a[1]) * t + (b[0] - a[0]) / Math.hypot(b[0] - a[0], b[1] - a[1]) * bend]);
      }
    }
    dense.push(stops[stops.length - 1]);
    var out = '<path d="' + smooth(wobble(ctx, dense, 6)) + '" fill="none" stroke-linecap="round" ' +
      'stroke-dasharray="' + (o.dash || "2 16") + '" style="stroke:' + c + '" stroke-width="' + (o.width || 7) + '"/>';
    stops.forEach(function (p, n) {
      out += '<circle cx="' + r1(p[0]) + '" cy="' + r1(p[1]) + '" r="30" style="fill:' + c + '"/>' +
        '<text x="' + r1(p[0]) + '" y="' + r1(p[1]) + '" text-anchor="middle" dominant-baseline="central" ' +
        'style="fill:var(--on-accent);font-family:var(--font-mono),monospace;font-size:30px;font-weight:700">' +
        (o.labels ? esc(o.labels[n]) : n + 1) + "</text>";
    });
    return out;
  };

  /* badge - text running round a circle: the rotating sticker on a poster.
     The words repeat until they fill the ring exactly.                   */
  GEN.badge = function (ctx, o) {
    var r = o.r || 128, c = clear(ctx, pt(ctx, o.at, [0.78, 0.2]), r), id = ctx.uid + "ring";
    var text = (o.text || "SAVE THIS") + "  •  ", size = o.size || 30;
    var circ = 2 * Math.PI * (r - size * 0.9), unit = text.length * size * 0.62;
    var reps = Math.max(1, Math.round(circ / unit)), full = new Array(reps + 1).join(text);
    var fill = col(o.color, "accent"), ink = col(o.ink, "on-accent");
    return '<defs><path id="' + id + '" d="M' + r1(c[0]) + " " + r1(c[1]) + "m" + r1(-(r - size * 0.9)) +
      " 0a" + r1(r - size * 0.9) + " " + r1(r - size * 0.9) + " 0 1 1 " + r1(2 * (r - size * 0.9)) + " 0a" +
      r1(r - size * 0.9) + " " + r1(r - size * 0.9) + ' 0 1 1 ' + r1(-2 * (r - size * 0.9)) + ' 0"/></defs>' +
      '<g transform="rotate(' + (o.rotate || -18) + " " + r1(c[0]) + " " + r1(c[1]) + ')">' +
      '<circle cx="' + r1(c[0]) + '" cy="' + r1(c[1]) + '" r="' + r + '" style="fill:' + fill + '"/>' +
      '<text style="fill:' + ink + ';font-family:var(--font-mono),monospace;font-size:' + size +
      'px;font-weight:700;letter-spacing:0.08em"><textPath href="#' + id + '" textLength="' + r1(circ) +
      '" lengthAdjust="spacing">' + esc(full) + "</textPath></text>" +
      '<circle cx="' + r1(c[0]) + '" cy="' + r1(c[1]) + '" r="' + r1(r - size * 1.9) +
      '" fill="none" style="stroke:' + ink + '" stroke-width="2"/>' +
      (o.center ? '<text x="' + r1(c[0]) + '" y="' + r1(c[1]) + '" text-anchor="middle" dominant-baseline="central" style="fill:' +
        ink + ';font-family:var(--font-display),sans-serif;font-size:' + (o.centerSize || 44) + 'px;font-weight:800">' +
        esc(o.center) + "</text>" : "") + "</g>";
  };

  /* hanko - a Japanese seal: vermilion, roughened edges, slightly crooked,
     the way a stamp actually lands on paper.                              */
  GEN.hanko = function (ctx, o) {
    var s = o.size || 150, c = clear(ctx, pt(ctx, o.at, [0.8, 0.78]), s * 0.6), id = ctx.uid + "ink";
    var chars = String(o.text || "大阪").split("").slice(0, 4), fill = col(o.color, "#c8352a");
    var shape = o.round
      ? '<circle cx="0" cy="0" r="' + s / 2 + '"/>'
      : '<rect x="' + -s / 2 + '" y="' + -s / 2 + '" width="' + s + '" height="' + s + '" rx="' + s * 0.08 + '"/>';
    var glyphs = "", gs = chars.length > 2 ? s * 0.4 : (chars.length === 2 ? s * 0.42 : s * 0.66);
    chars.forEach(function (ch, i) {
      // Seals read right column first, top to bottom.
      var col2 = chars.length > 2 ? (i < 2 ? 1 : -1) : 0, row = chars.length > 1 ? (i % 2 ? 1 : -1) : 0;
      glyphs += '<text x="' + r1(col2 * gs * 0.55) + '" y="' + r1(row * gs * 0.55) + '" text-anchor="middle" ' +
        'dominant-baseline="central" font-size="' + r1(gs) + '">' + esc(ch) + "</text>";
    });
    return '<defs><filter id="' + id + '" x="-20%" y="-20%" width="140%" height="140%">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="' + Math.floor(ctx.rand() * 99) + '"/>' +
      '<feDisplacementMap in="SourceGraphic" scale="5"/></filter></defs>' +
      '<g transform="translate(' + r1(c[0]) + " " + r1(c[1]) + ") rotate(" + (o.rotate != null ? o.rotate : -4) +
      ')" filter="url(#' + id + ')" opacity="' + (o.opacity || 0.92) + '">' +
      '<g style="fill:none;stroke:' + fill + '" stroke-width="' + r1(s * 0.06) + '">' + shape + "</g>" +
      '<g style="fill:' + fill + ';font-family:var(--font-display),serif;font-weight:800">' + glyphs + "</g></g>";
  };

  /* tape - a strip of washi tape: translucent, faintly striped, with
     ends torn rather than cut.                                            */
  GEN.tape = function (ctx, o) {
    var w = o.w || 230, h = o.h || 62, c = clear(ctx, pt(ctx, o.at, [0.24, 0.12]), w / 2), out = "", z = "";
    var n = 7;
    for (var i = 0; i <= n; i++) z += (i % 2 ? -1 : 1) * 4 + "," + r1(-h / 2 + h * i / n) + " ";
    var pts = [];
    for (i = 0; i <= n; i++) pts.push([-w / 2 + (i % 2 ? -5 : 4), -h / 2 + h * i / n]);
    for (i = n; i >= 0; i--) pts.push([w / 2 + (i % 2 ? 5 : -4), -h / 2 + h * i / n]);
    var d = "M" + pts.map(function (p) { return r1(p[0]) + " " + r1(p[1]); }).join("L") + "Z";
    out += '<path d="' + d + '" style="fill:' + col(o.color, "paper") + '" opacity="' + (o.opacity || 0.82) + '"/>';
    if (o.stripes !== false) {
      for (i = -w / 2; i < w / 2; i += 22) out += '<rect x="' + r1(i) + '" y="' + -h / 2 + '" width="8" height="' + h + '" style="fill:' + col(o.stripe, "accent") + '" opacity="0.18"/>';
    }
    return '<g transform="translate(' + r1(c[0]) + " " + r1(c[1]) + ") rotate(" + (o.rotate != null ? o.rotate : -8) + ')">' +
      '<g style="filter:drop-shadow(0 3px 5px rgba(0,0,0,0.22))">' + out + "</g></g>";
  };

  /* sparkles - four-point stars, scattered by the seed and kept out of
     the band where the copy usually sits.                                 */
  GEN.sparkles = function (ctx, o) {
    var n = o.count || 7, out = "", protectedBoxes = [ctx.copy].concat(ctx.annotations || []).filter(Boolean), placed = 0, tries = 0;
    while (placed < n && tries++ < n * 30) {
      var x = ctx.rand() * ctx.w * 0.86 + ctx.w * 0.07, y = ctx.rand() * ctx.h * 0.7 + ctx.h * 0.08;
      // Keep out of the copy, with a margin - a sparkle behind a letter is
      // a sparkle that costs contrast.
      if (protectedBoxes.some(function (c) {
        return x > c.x - 60 && x < c.x + c.w + 60 && y > c.y - 60 && y < c.y + c.h + 60;
      })) continue;
      placed++;
      var s = (o.size || 54) * (0.45 + ctx.rand() * 0.75);
      out += '<path transform="translate(' + r1(x) + " " + r1(y) + ") scale(" + r1(s / 100) + ')" ' +
        'd="M0 -50C4 -14 14 -4 50 0C14 4 4 14 0 50C-4 14 -14 4 -50 0C-14 -4 -4 -14 0 -50Z" style="fill:' +
        col(o.color, "#ffffff") + '" opacity="' + r1(0.55 + ctx.rand() * 0.45) + '"/>';
    }
    return out;
  };

  /* lightleak - warm film burns from the edge of the frame. */
  GEN.lightleak = function (ctx, o) {
    var id = ctx.uid + "leak", out = "<defs>", spots = o.count || 3, body = "";
    var hues = o.colors || ["#ff6a2b", "#ffb347", "#ff3d6e"];
    for (var i = 0; i < spots; i++) {
      var edgeX = ctx.rand() < 0.5 ? -0.08 : 1.08, y = ctx.rand();
      // Keep the burn's centre off the copy's rows.
      if (ctx.copy) {
        var cy0 = ctx.copy.y / ctx.h, cy1 = (ctx.copy.y + ctx.copy.h) / ctx.h;
        if (y > cy0 - 0.08 && y < cy1 + 0.08) y = ctx.rand() < 0.5 ? Math.max(0.02, cy0 - 0.2) : Math.min(0.98, cy1 + 0.2);
      }
      out += '<radialGradient id="' + id + i + '"><stop offset="0" stop-color="' + hues[i % hues.length] +
        '" stop-opacity="0.85"/><stop offset="1" stop-color="' + hues[i % hues.length] + '" stop-opacity="0"/></radialGradient>';
      body += '<ellipse cx="' + r1(edgeX * ctx.w) + '" cy="' + r1(y * ctx.h) + '" rx="' + r1(ctx.w * (0.24 + ctx.rand() * 0.18)) +
        '" ry="' + r1(ctx.h * (0.14 + ctx.rand() * 0.12)) + '" fill="url(#' + id + i + ')"/>';
    }
    return out + "</defs>" + body;
  };

  /* blobs - soft fields of colour taken from the photo's palette, for
     slides with no photograph. Never the default purple glow.             */
  GEN.blobs = function (ctx, o) {
    var id = ctx.uid + "blur", cs = o.colors || ["accent", "block", "paper"], out = "";
    for (var i = 0; i < (o.count || 3); i++) {
      out += '<ellipse cx="' + r1(ctx.rand() * ctx.w) + '" cy="' + r1(ctx.rand() * ctx.h) + '" rx="' +
        r1(ctx.w * (0.3 + ctx.rand() * 0.3)) + '" ry="' + r1(ctx.h * (0.15 + ctx.rand() * 0.2)) +
        '" style="fill:' + col(cs[i % cs.length]) + '" opacity="0.7"/>';
    }
    return '<defs><filter id="' + id + '" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="' +
      (o.blur || 110) + '"/></filter></defs><g filter="url(#' + id + ')">' + out + "</g>";
  };

  /* fibres - the long fibres in washi and handmade paper. */
  GEN.fibres = function (ctx, o) {
    var d = "";
    for (var i = 0; i < (o.count || 260); i++) {
      var x = ctx.rand() * ctx.w, y = ctx.rand() * ctx.h, a = ctx.rand() * Math.PI, l = 20 + ctx.rand() * 90;
      var mx = x + Math.cos(a) * l / 2 + (ctx.rand() - 0.5) * 20, my = y + Math.sin(a) * l / 2 + (ctx.rand() - 0.5) * 20;
      d += "M" + r1(x) + " " + r1(y) + "Q" + r1(mx) + " " + r1(my) + " " + r1(x + Math.cos(a) * l) + " " + r1(y + Math.sin(a) * l);
    }
    return '<path d="' + d + '" fill="none" style="stroke:' + col(o.color, "ink") + '" stroke-width="' +
      (o.width || 1.1) + '" opacity="' + (o.opacity || 0.16) + '"/>';
  };

  /* === TORN EDGE ======================================================
     Not an overlay: torn-reveal asks for a fresh edge per slide, so no two
     tears in a deck are the same. Returns a CSS path() for clip-path.     */
  function tornPath(rand, w, h, y0) {
    var pts = [], x = 0, phase = rand() * 6.28, sway = 10 + rand() * 14;
    while (x < w) {
      var big = Math.sin(x * 0.0055 + phase) * sway + Math.sin(x * 0.019 + phase * 2) * 5;
      pts.push([x, y0 + big + (rand() - 0.5) * 13]);
      x += 5 + rand() * 16;
    }
    pts.push([w, y0 + (rand() - 0.5) * 13]);
    var line = pts.map(function (p) { return r1(p[0]) + " " + r1(p[1]); }).join(" L");
    return {
      clip: "path('M0 " + h + " L" + line + " L" + w + " " + h + " Z')",
      edge: "M" + line
    };
  }

  /* === RENDER ==========================================================
     Called by the engine once per slide after layout. Photo-derived art
     defaults into the photo layer (it follows the photo's crop, mask and
     arch, and sits under the scrim); "over": true lifts it above the
     scrim, positioned on the photo's box.                                */
  var PHOTO_GEN = { contour: 1, halftone: 1, ascii: 1, dither: 1, mosaic: 1 };

  function render(slide, specs, opts) {
    var W = opts.W, H = opts.H, seedBase = opts.seed;
    var photoLayer = slide.querySelector(".layer-photo");
    var genLayer = slide.querySelector(".layer-gen");
    var sr = slide.getBoundingClientRect(), scale = sr.width / W || 1;
    var pr = photoLayer ? photoLayer.getBoundingClientRect() : null;
    var pBox = pr && pr.width ? {
      x: (pr.left - sr.left) / scale, y: (pr.top - sr.top) / scale,
      w: pr.width / scale, h: pr.height / scale
    } : { x: 0, y: 0, w: W, h: H };

    specs.forEach(function (spec, k) {
      var fn = GEN[spec.type];
      if (!fn) { console.warn("unknown art type: " + spec.type); return; }
      var onPhoto = spec.on ? spec.on === "photo" : !!PHOTO_GEN[spec.type];
      var box = onPhoto ? pBox : { x: 0, y: 0, w: W, h: H };
      var rand = rng(seedBase + ":" + k + ":" + spec.type);
      var ctx = {
        w: box.w, h: box.h, rand: rand, noise: makeNoise(rng(seedBase + ":noise:" + k)),
        photo: onPhoto ? sampler(opts.grid, box.w, box.h, opts.focus) : null,
        focus: onPhoto ? opts.focus : [opts.focus[0], opts.focus[1]],
        // Where the copy sits, so decoration can keep out of its way.
        copy: opts.copy ? { x: opts.copy.x - box.x, y: opts.copy.y - box.y, w: opts.copy.w, h: opts.copy.h } : null,
        annotations: Array.from(slide.querySelectorAll('.annotation:not([hidden])'), function (n) {
          var r = n.getBoundingClientRect();
          return { x: (r.left - sr.left) / scale - box.x, y: (r.top - sr.top) / scale - box.y,
            w: r.width / scale, h: r.height / scale };
        }),
        uid: "g" + hash(seedBase + k).toString(36)
      };
      if (PHOTO_GEN[spec.type] && !ctx.photo && spec.source !== "noise" && spec.type !== "contour" &&
          spec.type !== "halftone" && spec.type !== "dither") return;   // ascii/mosaic need a real photo

      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "gen gen-" + spec.type);
      svg.setAttribute("viewBox", "0 0 " + r1(box.w) + " " + r1(box.h));
      svg.setAttribute("preserveAspectRatio", "none");
      svg.style.opacity = spec.opacity != null ? spec.opacity : 1;
      if (spec.blend) svg.style.mixBlendMode = spec.blend;

      var body = fn(ctx, spec);
      if (spec.replace) {                     // the art IS the image now
        body = '<rect width="100%" height="100%" style="fill:' + col(spec.ground, "paper") + '"/>' + body;
        if (photoLayer) photoLayer.classList.add("replaced");
      }
      svg.innerHTML = body;

      if (onPhoto && !spec.over && photoLayer) {
        photoLayer.appendChild(svg);
      } else {
        svg.style.left = r1(box.x) + "px"; svg.style.top = r1(box.y) + "px";
        svg.style.width = r1(box.w) + "px"; svg.style.height = r1(box.h) + "px";
        (genLayer || slide).appendChild(svg);
      }
    });
  }

  window.CAROUSEL_ART = {
    render: render, generators: GEN, tornPath: tornPath, rng: rng, hash: hash,
    types: Object.keys(GEN)
  };
})();
