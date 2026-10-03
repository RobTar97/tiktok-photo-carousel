/* ============================================================================
   TikTok Photo Carousel - rendering engine
   Builds slides from a DECK object, auto-fits the type, verifies the safe
   zones, and drives the review studio. No dependencies, no build step.

   Public surface (used by scripts/export.js):
     window.CAROUSEL.ready     Promise - fonts + images loaded, autofit done
     window.CAROUSEL.verify()  -> [{index, element, reason, overlap}]
     window.CAROUSEL.slides    -> [HTMLElement]
     window.CAROUSEL.deck      -> the live deck object (edits included)
   ========================================================================= */
(function () {
  "use strict";

  var W = 1080, H = 1920;

  /* === TEXT MARKUP =====================================================
     "*word*" highlights, " // " forces a break. Everything else is escaped
     so a stray < in someone's copy can never become markup.               */
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function markup(s) {
    if (!s) return "";
    return esc(s)
      .split(" // ").join("\u0000")
      .replace(/\*([^*]+)\*/g, "<mark>$1</mark>")
      .split("\u0000").join("<br>");
  }
  function plain(s) {
    return String(s || "").split(" // ").join(" ").replace(/\*/g, "");
  }

  /* === SMALL HELPERS =================================================== */
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  /* Photo filenames routinely contain spaces and non-ASCII characters
     (Japanese camera exports, for one). Encode each segment so the file://
     src resolves on every platform. */
  function src(deck, p) {
    return deck.photoBase + String(p).split("/").map(encodeURIComponent).join("/");
  }

  /* === TEMPLATE ART ====================================================
     Each template gets the extra DOM it needs. Templates that do not
     appear here need nothing beyond photo + type.                         */
  var ART = {
    "duotone-poster": function (slide, s) {
      slide.querySelector(".layer-art").appendChild(el("div", "halftone"));
    },

    "torn-reveal": function (slide, s) {
      slide.insertBefore(el("div", "paper-top"), slide.querySelector(".layer-type"));
    },

    "film-strip": function (slide, s, deck) {
      var photos = s.photos || [s.photo];
      var strip = el("div", "strip");
      // minmax(0,1fr): a plain 1fr row has min-height auto, so the images
      // keep their intrinsic height and burst out of the strip.
      strip.style.gridTemplateRows = "repeat(" + photos.length + ", minmax(0, 1fr))";
      photos.forEach(function (p) {
        var img = el("img");
        img.src = src(deck, p);
        strip.appendChild(img);
      });
      strip.appendChild(el("div", "sprockets left"));
      strip.appendChild(el("div", "sprockets right"));
      slide.querySelector(".layer-art").appendChild(strip);
    },

    "polaroid-stack": function (slide, s, deck) {
      var art = slide.querySelector(".layer-art");
      if (s.photos && s.photos[1]) {
        var behind = el("div", "polaroid behind");
        var bimg = el("img"); bimg.src = src(deck, s.photos[1]);
        behind.appendChild(bimg);
        art.appendChild(behind);
      }
      var card = el("div", "polaroid");
      var img = el("img"); img.src = src(deck, s.photo);
      card.appendChild(img);
      art.appendChild(card);
      card.style.setProperty("--tilt", (s.tilt != null ? s.tilt : -3) + "deg");

      var tape = el("div", "tape");
      tape.style.left = "6%"; tape.style.top = (0.09 * H) + "px";
      tape.style.transform = "rotate(-24deg)";
      art.appendChild(tape);
    },

    "sticker-chaos": function (slide, s) {
      var art = slide.querySelector(".layer-art");
      // Hand-drawn marks. Coordinates are in canvas space (1080x1920).
      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      svg.innerHTML =
        '<g fill="none" stroke="var(--accent,#f2b705)" stroke-width="14" ' +
        'stroke-linecap="round" stroke-linejoin="round">' +
        (s.circle !== false
          ? '<path d="M 300 980 C 170 980 150 1150 330 1180 C 560 1210 700 1120 650 1000 ' +
            'C 610 900 390 890 300 960" opacity="0.9"/>'
          : "") +
        (s.arrow !== false
          ? '<path d="M 760 820 C 700 900 640 940 560 960"/>' +
            '<path d="M 560 960 L 620 930 M 560 960 L 600 1010"/>'
          : "") +
        "</g>";
      art.appendChild(svg);

      (s.stickers || []).forEach(function (st) {
        var n = el("div", "sticker", esc(st.text));
        n.style.left = (st.x != null ? st.x : 0.1) * 100 + "%";
        n.style.top = (st.y != null ? st.y : 0.6) * 100 + "%";
        n.style.setProperty("--rot", (st.rot != null ? st.rot : -6) + "deg");
        art.appendChild(n);
      });
    },

    "dreamcore-glow": function (slide, s) {
      var art = slide.querySelector(".layer-art");
      var seeds = [[0.18, 0.26, 54], [0.78, 0.18, 38], [0.66, 0.52, 46], [0.3, 0.62, 30]];
      seeds.forEach(function (p) {
        var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("class", "sparkle");
        svg.setAttribute("viewBox", "0 0 100 100");
        svg.setAttribute("width", p[2]); svg.setAttribute("height", p[2]);
        svg.style.left = p[0] * 100 + "%";
        svg.style.top = p[1] * 100 + "%";
        svg.innerHTML =
          '<path d="M50 0 C54 36 64 46 100 50 C64 54 54 64 50 100 ' +
          'C46 64 36 54 0 50 C36 46 46 36 50 0 Z" fill="rgba(255,255,255,0.9)"/>';
        art.appendChild(svg);
      });
    }
  };

  /* Templates whose copy sits inside a card element. */
  var CARDED = { "frosted-card": 1, "notes-card": 1 };

  /* Pick black or white for whatever sits on top of a colour. */
  function onColor(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ""));
    if (!m) return "#0e0e10";
    var n = parseInt(m[1], 16);
    var lum = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
    return lum > 0.58 ? "#0e0e10" : "#ffffff";
  }

  /* === BUILD ONE SLIDE ================================================= */
  function buildSlide(s, i, deck) {
    var t = deck.theme || {};
    var slide = el("section", "slide");
    slide.dataset.template = s.template || "full-bleed-hook";
    slide.dataset.role = s.role || "build";
    slide.dataset.index = i;
    slide.dataset.pos = s.pos || "upper";
    slide.dataset.align = s.align || t.align || "left";
    slide.dataset.hl = s.highlight || t.highlight || "plain";
    slide.dataset.fit = s.fit || t.fit || "cover";
    slide.dataset.rail = s.rail === false ? "0" : "1";
    if (s.shadow !== false && s.photo) slide.dataset.shadow = "1";
    if (s.stroke) slide.dataset.stroke = "1";
    if (s.vertical) slide.dataset.vertical = "1";
    if (s.aberration || t.aberration) slide.dataset.aberration = "1";
    if (s.scanlines || t.scanlines) slide.dataset.scanlines = "1";

    // Per-slide colour overrides on top of the deck theme.
    if (s.accent) {
      slide.style.setProperty("--accent", s.accent);
      slide.style.setProperty("--on-accent", onColor(s.accent));
    }
    if (s.block) slide.style.setProperty("--block", s.block);
    if (s.bg) {
      slide.style.setProperty("--slide-bg", s.bg);
      slide.style.setProperty("--on-slide-bg", onColor(s.bg));
    }
    if (s.duotone) {
      slide.style.setProperty("--duo-dark", s.duotone[0]);
      slide.style.setProperty("--duo-light", s.duotone[1]);
    }

    /* Per-slide type. Needed by the concept gate, where three directions
       have to differ by typeface inside one page. */
    if (s.fonts) {
      var F = s.fonts;
      if (F.display) slide.style.setProperty("--font-display", F.display);
      if (F.text) slide.style.setProperty("--font-text", F.text);
      if (F.hand) slide.style.setProperty("--font-hand", F.hand);
      if (F.mono) slide.style.setProperty("--font-mono", F.mono);
      if (F.weight) slide.style.setProperty("--display-weight", F.weight);
      if (F.tracking) slide.style.setProperty("--tracking", F.tracking);
      if (F.leading) slide.style.setProperty("--leading", F.leading);
    }

    /* --- photo layer --- */
    var photo = el("div", "layer-photo");
    if (s.photo) {
      if (slide.dataset.fit === "blur") {
        var pad = el("img", "photo-pad");
        pad.src = src(deck, s.photo);
        photo.appendChild(pad);
      }
      var img = el("img", "photo");
      img.src = src(deck, s.photo);
      img.alt = plain(s.text);
      photo.appendChild(img);
      var f = s.focus || [0.5, 0.5];
      slide.style.setProperty("--focus", (f[0] * 100) + "% " + (f[1] * 100) + "%");
    }
    slide.appendChild(photo);

    /* --- scrim: strength comes from analyze.py, direction from position --- */
    var scrim = el("div", "layer-scrim");
    scrim.dataset.dir = s.scrimDir || (s.pos === "lower" ? "bottom" : "top");
    slide.appendChild(scrim);
    if (s.scrim != null) slide.style.setProperty("--scrim", s.scrim);

    /* --- texture --- */
    slide.appendChild(el("div", "layer-texture"));
    if (s.grain != null) slide.style.setProperty("--grain", s.grain);
    if (s.vignette != null) slide.style.setProperty("--vignette", s.vignette);

    /* --- template art --- */
    slide.appendChild(el("div", "layer-art"));
    if (ART[slide.dataset.template]) ART[slide.dataset.template](slide, s, deck);

    /* --- type --- */
    var type = el("div", "layer-type");
    var box = el("div", "type-box");
    var inner = CARDED[slide.dataset.template] ? el("div", "card") : box;

    if (slide.dataset.template === "notes-card") {
      inner.appendChild(el("div", "note-bar", esc(s.noteLabel || "notes")));
    }
    if (s.kicker) inner.appendChild(el("div", "kicker", esc(s.kicker)));
    if (s.text) inner.appendChild(el("h2", "headline", markup(s.text)));
    if (s.sub) inner.appendChild(el("p", "sub", markup(s.sub)));
    if (s.cta) inner.appendChild(el("div", "cta", esc(s.cta)));
    if (inner !== box) box.appendChild(inner);

    type.appendChild(box);
    slide.appendChild(type);

    /* --- overlays (studio only, stripped on export) --- */
    var safe = el("div", "layer-safe");
    safe.appendChild(el("div", "rail"));
    slide.appendChild(safe);

    var chrome = el("div", "layer-chrome");
    chrome.innerHTML =
      '<div class="tt-tabs">For You</div>' +
      '<div class="tt-rail">' +
      '<div class="tt-icon"></div><div class="tt-icon"></div>' +
      '<div class="tt-icon"></div><div class="tt-icon"></div></div>' +
      '<div class="tt-caption"><b>@' + esc(deck.handle || "yourhandle") + "</b>" +
      esc((deck.caption || "your caption sits here and covers this much of the frame").slice(0, 90)) +
      "</div>" +
      '<div class="tt-progress"><i></i></div>';
    chrome.querySelector(".tt-progress i").style.setProperty(
      "--prog", Math.round(((i + 1) / deck.slides.length) * 100) + "%");
    slide.appendChild(chrome);

    return slide;
  }

  /* === AUTOFIT =========================================================
     Binary search the display size until the copy fits the padding box of
     .layer-type. Measuring the real rendered box beats estimating, which
     is why the HTML engine can run type far larger than the Pillow one.   */
  function autofit(slide, s, deck) {
    var t = deck.theme || {};
    var type = slide.querySelector(".layer-type");
    var box = slide.querySelector(".type-box");
    if (!box || !box.firstChild) return;

    var vertical = slide.dataset.vertical === "1";
    var cs = getComputedStyle(type);
    var availH = type.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    var availW = type.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);

    var min = s.sizeMin || t.sizeMin || 48;
    var max = s.size || t.sizeMax || 132;

    function fits(px) {
      slide.style.setProperty("--fs", px + "px");
      // Force layout before measuring.
      var r = box.getBoundingClientRect();
      var scale = slide.getBoundingClientRect().width / W || 1;
      var h = r.height / scale, w = r.width / scale;

      // A single long word ("Checkerboard") overflows the box without making
      // the block's rect any wider, so the rect alone says it fits. Compare
      // scroll extent too, or the word runs off the edge of the slide.
      if (vertical) {
        if (box.scrollHeight > box.clientHeight + 1) return false;
        return w <= availW + 1 && h <= availH + 1;
      }
      if (box.scrollWidth > box.clientWidth + 1) return false;
      return h <= availH && w <= availW + 1;
    }

    if (fits(max)) { slide.style.setProperty("--fs", max + "px"); return; }
    var lo = min, hi = max;
    for (var i = 0; i < 9 && hi - lo > 1; i++) {
      var mid = (lo + hi) / 2;
      if (fits(mid)) lo = mid; else hi = mid;
    }
    slide.style.setProperty("--fs", Math.floor(lo) + "px");
    if (lo <= min + 1) slide.dataset.tooLong = "1";   // copy is too long; shorten it
  }

  /* Point the scrim ramp at wherever the copy actually ended up. A fixed
     ramp leaves the last line of a tall headline sitting on bare photo. */
  function fitScrim(slide) {
    var box = slide.querySelector(".type-box");
    var scrim = slide.querySelector(".layer-scrim");
    if (!box || !scrim) return;
    var sr = slide.getBoundingClientRect();
    var br = box.getBoundingClientRect();
    var scale = sr.width / W || 1;
    var top = (br.top - sr.top) / scale / H;
    var bottom = (br.bottom - sr.top) / scale / H;
    if (scrim.dataset.dir === "bottom") {
      slide.style.setProperty("--scrim-mid", ((1 - top) * 100).toFixed(1) + "%");
      slide.style.setProperty("--scrim-end", (Math.min(1, 1 - top + 0.16) * 100).toFixed(1) + "%");
    } else {
      slide.style.setProperty("--scrim-mid", (bottom * 100).toFixed(1) + "%");
      slide.style.setProperty("--scrim-end", (Math.min(1, bottom + 0.16) * 100).toFixed(1) + "%");
    }
  }

  /* === SAFE-ZONE VERIFY ================================================
     Measures every copy element against the three zones TikTok covers and
     reports real overlaps in canvas pixels. This replaces eyeballing a
     contact sheet after the fact.                                         */
  function verify(deck) {
    var out = [];
    var zones = deck.safe || { top: 0.12, bottom: 0.25, side: 0.08, rail: 0.16, railTop: 0.42 };
    window.CAROUSEL.slides.forEach(function (slide, i) {
      var sr = slide.getBoundingClientRect();
      var scale = sr.width / W || 1;
      var bands = [
        { name: "top bar", x1: 0, y1: 0, x2: W, y2: zones.top * H },
        { name: "caption area", x1: 0, y1: (1 - zones.bottom) * H, x2: W, y2: H },
        { name: "side margin", x1: 0, y1: 0, x2: zones.side * W, y2: H },
        { name: "side margin", x1: (1 - zones.side) * W, y1: 0, x2: W, y2: H }
      ];
      if (slide.dataset.rail === "1") {
        // The like/comment/share column is a block in the lower right, not
        // the whole right edge - checking the whole edge flags type that is
        // actually fine.
        bands.push({
          name: "icon rail", x1: (1 - zones.rail) * W, y1: (zones.railTop || 0.42) * H,
          x2: W, y2: (1 - zones.bottom) * H
        });
      }
      slide.querySelectorAll(".headline, .sub, .kicker, .cta, .card").forEach(function (node) {
        if (node.classList.contains("card")) return;      // the card's children are checked
        var r = node.getBoundingClientRect();
        var b = {
          x1: (r.left - sr.left) / scale, y1: (r.top - sr.top) / scale,
          x2: (r.right - sr.left) / scale, y2: (r.bottom - sr.top) / scale
        };
        bands.forEach(function (z) {
          var ow = Math.min(b.x2, z.x2) - Math.max(b.x1, z.x1);
          var oh = Math.min(b.y2, z.y2) - Math.max(b.y1, z.y1);
          if (ow > 2 && oh > 2) {
            node.classList.add("overflow-flag");
            out.push({
              index: i, slide: i + 1, el: node.className.split(" ")[0],
              reason: "overlaps the " + z.name,
              overlap: Math.round(ow) + "x" + Math.round(oh) + "px",
              text: plain(node.textContent).slice(0, 48)
            });
          }
        });
      });
      if (slide.dataset.tooLong === "1") {
        out.push({
          index: i, slide: i + 1, el: "headline",
          reason: "copy hit the minimum size and may still be cramped",
          overlap: "-", text: plain(slide.querySelector(".headline") ?
            slide.querySelector(".headline").textContent : "").slice(0, 48)
        });
      }
    });
    return out;
  }

  /* === THEME =========================================================== */
  function applyTheme(root, deck) {
    var t = deck.theme || {};
    var p = t.palette || [];
    var set = function (k, v) { if (v != null) root.style.setProperty(k, v); };
    set("--W", W + "px"); set("--H", H + "px");
    // p is sorted dark-to-light, so the page background is p[0]. Taking a
    // middle swatch here once produced grey type on the end card.
    set("--bg", t.bg || p[0] || "#0e0e10");
    set("--ink", t.ink || "#ffffff");
    var accent = t.accent || p[2] || "#f2b705";
    set("--accent", accent);
    set("--on-accent", t.onAccent || onColor(accent));
    set("--block", t.block || p[1] || "#141414");
    set("--paper", t.paper || "#efe9dd");
    set("--muted", t.muted || "rgba(255,255,255,0.93)");
    set("--duo-dark", (t.duotone && t.duotone[0]) || p[1] || "#101b3a");
    set("--duo-light", (t.duotone && t.duotone[1]) || p[0] || "#c8102e");
    set("--font-display", t.display || "system-ui, sans-serif");
    set("--font-text", t.text || t.display || "system-ui, sans-serif");
    set("--font-hand", t.hand || "cursive");
    set("--font-mono", t.mono || "ui-monospace, monospace");
    set("--display-weight", t.displayWeight);
    set("--grain", t.grain);
    set("--vignette", t.vignette);
    set("--sub-ratio", t.subRatio);
  }

  /* === RENDER ========================================================== */
  function render(deck, mount) {
    mount.innerHTML = "";
    applyTheme(document.documentElement, deck);
    var slides = deck.slides.map(function (s, i) {
      var node = buildSlide(s, i, deck);
      mount.appendChild(wrap(node, i, deck));
      return node;
    });
    window.CAROUSEL.slides = slides;
    return slides;
  }

  /* Studio wrapper: scales the 1080x1920 canvas down to something you can
     actually look at, and labels it. Export mode skips the wrapper. */
  function wrap(slide, i, deck) {
    if (window.CAROUSEL.exportMode) return slide;
    var frame = el("div", "frame");
    frame.appendChild(slide);
    var cap = el("div", "frame-cap",
      "<b>" + (i + 1) + "</b> " + esc(deck.slides[i].template || "") +
      " <i>" + esc(deck.slides[i].role || "") + "</i>");
    var cell = el("div", "cell");
    cell.appendChild(frame);
    cell.appendChild(cap);
    return cell;
  }

  /* === READY: fonts + images, then fit ================================= */
  function ready(deck) {
    var imgs = Array.prototype.slice.call(document.images);
    var loads = imgs.map(function (im) {
      return im.complete ? Promise.resolve() : new Promise(function (res) {
        im.addEventListener("load", res, { once: true });
        im.addEventListener("error", res, { once: true });
      });
    });
    return Promise.all(loads.concat([document.fonts ? document.fonts.ready : null]))
      .then(function () {
        window.CAROUSEL.slides.forEach(function (slide, i) {
          autofit(slide, deck.slides[i], deck);
        });
        // Second pass: fitting changed gap sizes, so re-measure once.
        window.CAROUSEL.slides.forEach(function (slide, i) {
          autofit(slide, deck.slides[i], deck);
          fitScrim(slide);
        });
        document.body.dataset.ready = "1";
      });
  }

  /* === STUDIO CONTROLS =================================================
     X toggles the safe-zone x-ray, C the fake TikTok chrome, E edit mode,
     Ctrl+S downloads the edits. Everything here is stripped on export.    */
  function studio(deck) {
    var state = { xray: false, chrome: false, edit: false };

    function apply() {
      window.CAROUSEL.slides.forEach(function (s) {
        s.dataset.xray = state.xray ? "1" : "0";
        s.dataset.chrome = state.chrome ? "1" : "0";
      });
      document.body.dataset.edit = state.edit ? "1" : "0";
      document.querySelectorAll(".headline, .sub, .kicker, .cta").forEach(function (n) {
        n.contentEditable = state.edit ? "true" : "false";
      });
      var bar = document.getElementById("hud");
      if (bar) {
        bar.querySelector("[data-k=xray]").classList.toggle("on", state.xray);
        bar.querySelector("[data-k=chrome]").classList.toggle("on", state.chrome);
        bar.querySelector("[data-k=edit]").classList.toggle("on", state.edit);
      }
    }

    /* Pull the edited copy back out of the DOM into deck shape, so the
       agent can merge it into deck.json and re-render. */
    function collectEdits() {
      var out = { slides: [] };
      window.CAROUSEL.slides.forEach(function (slide, i) {
        var h = slide.querySelector(".headline");
        var sub = slide.querySelector(".sub");
        var k = slide.querySelector(".kicker");
        var c = slide.querySelector(".cta");
        var rec = { index: i };
        // innerHTML back to source markup: <mark> -> *x*, <br> -> " // "
        var toSrc = function (node) {
          if (!node) return undefined;
          return node.innerHTML
            .replace(/<mark[^>]*>/g, "*").replace(/<\/mark>/g, "*")
            .replace(/<br\s*\/?>/g, " // ")
            .replace(/<[^>]+>/g, "")
            .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
            .trim();
        };
        if (h) rec.text = toSrc(h);
        if (sub) rec.sub = toSrc(sub);
        if (k) rec.kicker = toSrc(k);
        if (c) rec.cta = toSrc(c);
        out.slides.push(rec);
      });
      var notes = document.getElementById("notes");
      if (notes && notes.value.trim()) out.notes = notes.value.trim();
      return out;
    }

    function download() {
      var data = JSON.stringify(collectEdits(), null, 2);
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([data], { type: "application/json" }));
      a.download = "edits.json";
      a.click();
      toast("edits.json downloaded - tell the agent to apply it");
    }

    function toast(msg) {
      var t = document.getElementById("toast");
      if (!t) return;
      t.textContent = msg; t.classList.add("show");
      setTimeout(function () { t.classList.remove("show"); }, 2600);
    }

    document.addEventListener("keydown", function (e) {
      if (e.ctrlKey && e.key.toLowerCase() === "s") { e.preventDefault(); download(); return; }
      if (e.target.isContentEditable) return;
      var k = e.key.toLowerCase();
      if (k === "x") { state.xray = !state.xray; apply(); }
      if (k === "c") { state.chrome = !state.chrome; apply(); }
      if (k === "e") { state.edit = !state.edit; apply(); toast(state.edit ? "edit mode on - click any text" : "edit mode off"); }
      if (k === "v") { showReport(verify(deck)); }
    });

    window.CAROUSEL.toggle = function (key) {
      if (key === "save") return download();
      if (key === "verify") return showReport(verify(deck));
      state[key] = !state[key]; apply();
    };
    window.CAROUSEL.collectEdits = collectEdits;

    function showReport(rows) {
      var box = document.getElementById("report");
      if (!box) return;
      if (!rows.length) {
        box.innerHTML = '<p class="ok">All slides clear of the TikTok interface.</p>';
      } else {
        box.innerHTML = "<p class='bad'>" + rows.length + " issue(s):</p><ul>" +
          rows.map(function (r) {
            return "<li><b>slide " + r.slide + "</b> " + esc(r.el) + " " + esc(r.reason) +
              " <code>" + esc(r.overlap) + "</code><br><span>" + esc(r.text) + "</span></li>";
          }).join("") + "</ul>";
      }
      box.classList.add("show");
    }

    apply();
  }

  /* === BOOT ============================================================ */
  window.CAROUSEL = {
    exportMode: /[?&]export=1/.test(location.search),
    slides: [],
    verify: function () { return verify(window.CAROUSEL.deck); },
    render: render
  };

  document.addEventListener("DOMContentLoaded", function () {
    var deck = window.DECK;
    if (!deck) { console.error("No DECK found"); return; }
    deck.photoBase = deck.photoBase || "";
    window.CAROUSEL.deck = deck;

    var mount = document.getElementById("deck");
    if (window.CAROUSEL.exportMode) document.body.classList.add("export");
    render(deck, mount);
    window.CAROUSEL.ready = ready(deck);
    if (!window.CAROUSEL.exportMode) {
      window.CAROUSEL.ready.then(function () { studio(deck); });
    }
  });
})();
