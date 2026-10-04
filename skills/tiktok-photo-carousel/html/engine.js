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
      // The pen marks are drawn by the art library (see TEMPLATE_ART), aimed
      // at the photo's focus point - they used to circle a fixed pixel
      // whatever the photograph showed.
      var art = slide.querySelector(".layer-art");
      (s.stickers || []).forEach(function (st) {
        var n = el("div", "sticker", esc(st.text));
        n.style.left = (st.x != null ? st.x : 0.1) * 100 + "%";
        n.style.top = (st.y != null ? st.y : 0.6) * 100 + "%";
        n.style.setProperty("--rot", (st.rot != null ? st.rot : -6) + "deg");
        art.appendChild(n);
      });
    },

    "bento": function (slide, s, deck) {
      // A photo dump: 3-5 frames in an asymmetric grid. The first photo
      // takes the big cell, so put the strongest one first.
      var photos = (s.photos || [s.photo]).slice(0, 5);
      var grid = el("div", "bento bento-" + photos.length);
      photos.forEach(function (p, i) {
        var cell = el("figure", "b" + (i + 1));
        var img = el("img");
        img.src = src(deck, p);
        cell.appendChild(img);
        if (s.labels && s.labels[i]) cell.appendChild(el("figcaption", null, esc(s.labels[i])));
        grid.appendChild(cell);
      });
      slide.querySelector(".layer-art").appendChild(grid);
    }
  };

  /* Art a template draws for itself unless the slide or preset says
     otherwise. Positions are fractions of the slide; a missing "at" means
     the photo's focus point, which is where object-position puts it.     */
  var TEMPLATE_ART = {
    "sticker-chaos": function (s) {
      var f = s.focus || [0.5, 0.5], out = [];
      if (s.circle !== false) out.push({ type: "rough", kind: "circle", on: "slide", at: f, w: 0.42, h: 0.13, width: 11 });
      if (s.arrow !== false) out.push({
        type: "rough", kind: "arrow", on: "slide", width: 10,
        at: [f[0] + 0.12, f[1] - 0.075],
        from: [Math.min(0.86, f[0] + 0.3), Math.max(0.2, f[1] - 0.2)]
      });
      return out;
    },
    "dreamcore-glow": function () { return [{ type: "sparkles", on: "slide", count: 6 }]; }
  };

  /* --- templates 13-18 -------------------------------------------------
     Declared after the literal so each one stays a readable unit.        */

  ART["cover"] = function (slide, s) {
    // Only the feed ever sees this band; the profile grid crops it away.
    var sw = el("div", "swipe");
    sw.innerHTML = esc(s.swipe || "swipe") + "<i></i>";
    slide.querySelector(".layer-art").appendChild(sw);
  };

  ART["cover-word"] = ART["cover-split"] = ART["cover-frame"] = ART["cover"];

  ART["index-card"] = function (slide, s) {
    var art = slide.querySelector(".layer-art");
    art.appendChild(el("div", "edge-rule"));
    if (s.edgeLabel) art.appendChild(el("div", "edge-label", esc(s.edgeLabel)));
  };

  ART["quote-pull"] = function (slide, s) {
    slide.querySelector(".layer-art")
      .appendChild(el("div", "quote-mark", s.quoteMark || "“"));
  };

  ART["diagonal-split"] = function (slide) {
    slide.querySelector(".layer-art").appendChild(el("div", "cut"));
  };

  ART["caption-bar"] = function (slide, s, deck) {
    var art = slide.querySelector(".layer-art");
    art.appendChild(el("div", "bar"));
    if (s.counter !== false) {
      var pad = function (n) { return (n < 10 ? "0" : "") + n; };
      art.appendChild(el("div", "counter",
        pad(deck.slides.indexOf(s) + 1) + " / " + pad(deck.slides.length)));
    }
  };

  ART["compare"] = function (slide, s, deck) {
    var photos = s.photos || [s.photo];
    var labels = s.labels || [];
    var pair = el("div", "pair");
    photos.slice(0, 2).forEach(function (p, i) {
      var fig = el("figure");
      var img = el("img");
      img.src = src(deck, p);
      fig.appendChild(img);
      if (labels[i]) fig.appendChild(el("figcaption", null, esc(labels[i])));
      pair.appendChild(fig);
    });
    slide.querySelector(".layer-art").appendChild(pair);
  };

  /* Templates whose copy sits inside a card element. */
  var CARDED = { "frosted-card": 1, "notes-card": 1 };

  /* WCAG relative luminance of a hex colour, or -1 if it is not one. */
  function relLum(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ""));
    if (!m) return -1;
    var n = parseInt(m[1], 16);
    var ch = function (c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
  }

  /* Black or white, whichever actually reads better on this colour. A
     luminance threshold got orange wrong: white on #F25C2A is 3.0:1,
     near-black is 7:1. */
  function onColor(hex) {
    var L = relLum(hex);
    if (L < 0) return "#0e0e10";
    var onDark = 1.05 / (L + 0.05), onLight = (L + 0.05) / 0.0555;
    return onLight >= onDark ? "#0e0e10" : "#ffffff";
  }

  /* Lift a colour toward white until it holds against a dark, scrimmed
     photo (relative luminance >= 0.5 clears 4.5:1 on anything below 0.06).
     The hue survives: brass becomes champagne brass, not white. */
  function lift(hex) {
    var L = relLum(hex);
    if (L < 0 || L >= 0.5) return hex;
    var n = parseInt(hex.replace("#", ""), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    for (var k = 0.06; k <= 1; k += 0.06) {
      var h = "#" + c.map(function (v) { return ("0" + Math.round(v + (255 - v) * k).toString(16)).slice(-2); }).join("");
      if (relLum(h) >= 0.5) return h;
    }
    return "#ffffff";
  }

  /* Pull a colour down until white text holds ~11:1 and a mid-tone accent
     on it still clears 4.5:1. Grounds and
     blocks taken from a photo's palette can land mid-grey, which no text
     colour reads well on. */
  function deepen(hex) {
    var L = relLum(hex);
    if (L < 0 || L <= 0.045) return hex;
    var n = parseInt(hex.replace("#", ""), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    for (var k = 0.92; k > 0.05; k -= 0.04) {
      var h = "#" + [r, g, b].map(function (c) { return ("0" + Math.round(c * k).toString(16)).slice(-2); }).join("");
      if (relLum(h) <= 0.045) return h;
    }
    return "#111111";
  }

  /* === BUILD ONE SLIDE ================================================= */
  function buildSlide(s, i, deck) {
    var t = deck.theme || {};
    var slide = el("section", "slide");

    // A slide that names its own preset carries that preset's theme on
    // itself, under any explicit per-slide override that follows.
    var sp = s.preset && deck.presets ? deck.presets[s.preset] : null;
    if (sp) {
      var pv = themeVars(sp.theme, true);
      Object.keys(pv).forEach(function (k) { slide.style.setProperty(k, pv[k]); });
      t = Object.assign({}, t, sp.theme);
    }
    var preset = presetFor(s, deck);
    if (preset) slide.dataset.preset = preset.name;

    // The accent on a block (editorial-split, caption-bar) only where it
    // reads: indigo block + vermilion kicker measured 1.5:1. Otherwise the
    // kicker takes the ink colour and the accent stays in the rule.
    var tp = t.palette || [];
    var acc = s.accent || t.accent || tp[2] || "#f2b705";
    var blk = s.block || t.block || (tp[1] ? deepen(tp[1]) : "#141414");
    var la = relLum(acc), lb = relLum(blk);
    if (la >= 0 && lb >= 0) {
      var ratio = (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
      slide.style.setProperty("--accent-on-block", ratio >= 4.5 ? acc : (lb < 0.3 ? "#ffffff" : "#0e0e10"));
    }
    // Coloured-text highlights over a photo: the same gamble as a kicker.
    if (la >= 0) slide.style.setProperty("--accent-on-photo", lift(acc));
    // Same check against the paper, for templates that set copy on it:
    // atlas's brass highlight on cream measured 1.8:1.
    var pap = s.paper || t.paper || "#efe9dd", lp = relLum(pap);
    if (la >= 0 && lp >= 0) {
      var r2 = (Math.max(la, lp) + 0.05) / (Math.min(la, lp) + 0.05);
      slide.style.setProperty("--accent-on-paper", r2 >= 4.5 ? acc : (t.inkDark || "#16181d"));
    }
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
    if (s.aberration !== undefined ? s.aberration : t.aberration) slide.dataset.aberration = "1";
    if (s.scanlines !== undefined ? s.scanlines : t.scanlines) slide.dataset.scanlines = "1";

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
    // The ramp has to start on the side the copy is on: index-card and
    // film-strip set their copy at the foot of the frame whatever pos says.
    var footCopy = { "index-card": 1, "film-strip": 1 };
    scrim.dataset.dir = s.scrimDir || (s.template === "cover-word" ? "full" :
      (s.pos === "lower" || footCopy[s.template] ? "bottom" : "top"));
    slide.appendChild(scrim);
    if (s.scrim != null) slide.style.setProperty("--scrim", s.scrim);

    /* --- texture --- */
    slide.appendChild(el("div", "layer-texture"));
    if (s.grain != null) slide.style.setProperty("--grain", s.grain);
    if (s.vignette != null) slide.style.setProperty("--vignette", s.vignette);

    /* --- template art, then the generated art layer above it --- */
    slide.appendChild(el("div", "layer-art"));
    if (ART[slide.dataset.template]) ART[slide.dataset.template](slide, s, deck);
    slide.appendChild(el("div", "layer-gen"));

    /* --- type --- */
    var type = el("div", "layer-type");
    var box = el("div", "type-box");
    var inner = CARDED[slide.dataset.template] ? el("div", "card") : box;

    if (slide.dataset.template === "notes-card") {
      inner.appendChild(el("div", "note-bar", esc(s.noteLabel || "notes")));
    }
    if (s.kicker) inner.appendChild(el("div", "kicker", esc(s.kicker)));
    if (s.text && slide.dataset.template === "cover-word") {
      inner.appendChild(el("h2", "headline", posterLines(s.text).map(function (l) {
        return '<span class="ln">' + markup(l) + "</span>";
      }).join("")));
    } else if (s.text) {
      inner.appendChild(el("h2", "headline", markup(s.text)));
    }
    if (s.sub) inner.appendChild(el("p", "sub", markup(s.sub)));
    if (s.cta) inner.appendChild(el("div", "cta", esc(s.cta)));
    if (inner !== box) box.appendChild(inner);

    type.appendChild(box);
    slide.appendChild(type);

    /* --- overlays (studio only, stripped on export) --- */
    var safe = el("div", "layer-safe");
    safe.appendChild(el("div", "rail"));
    safe.appendChild(el("div", "gridcrop"));
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
  /* Lines for cover-word: the author's own " // " breaks, otherwise one or
     two words a line - the poster stack only works with short lines. */
  function posterLines(text) {
    if (text.indexOf(" // ") >= 0) return text.split(" // ");
    var w = text.split(/\s+/).filter(Boolean), out = [];
    if (w.length <= 3) return w;
    for (var i = 0; i < w.length; i += 2) out.push(w.slice(i, i + 2).join(" "));
    return out;
  }

  /* cover-word: every line set to the full width of the copy area, then the
     stack scaled down together if it is taller than the 1:1 band allows. */
  function fitPoster(slide) {
    var type = slide.querySelector(".layer-type"), box = slide.querySelector(".type-box");
    var lines = slide.querySelectorAll(".headline .ln");
    if (!lines.length) return;
    var cs = getComputedStyle(type), bs = getComputedStyle(box);
    // Width of the box's content, so the icon-rail clearance on the box is
    // respected - the giant words must not run under the like button.
    var availW = box.clientWidth - parseFloat(bs.paddingLeft) - parseFloat(bs.paddingRight);
    var availH = type.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    var sizes = [];
    lines.forEach(function (ln) {
      ln.style.fontSize = "100px";
      sizes.push(Math.min(440, Math.floor(100 * availW / Math.max(1, ln.scrollWidth))));
    });
    lines.forEach(function (ln, i) { ln.style.fontSize = sizes[i] + "px"; });
    slide.style.setProperty("--fs", Math.min.apply(null, sizes) + "px");
    var over = box.scrollHeight / availH;
    if (over > 1) {
      lines.forEach(function (ln, i) { ln.style.fontSize = Math.floor(sizes[i] / over / 1.02) + "px"; });
      slide.style.setProperty("--fs", Math.floor(Math.min.apply(null, sizes) / over / 1.02) + "px");
    }
  }

  /* How many lines a headline should take: a short hook on three lines reads
     as "This / isn't a / render". Prefer a slightly smaller size that keeps
     the words together. */
  function targetLines(text) {
    var n = plain(text).split(/\s+/).filter(Boolean).length;
    return n <= 2 ? 1 : n <= 6 ? 2 : n <= 10 ? 3 : 4;
  }
  function lineCount(slide) {
    var h = slide.querySelector(".headline");
    if (!h) return 0;
    var lh = parseFloat(getComputedStyle(h).lineHeight) || 1;
    return Math.round(h.offsetHeight / lh);
  }

  function autofit(slide, s, deck) {
    if (s.template === "cover-word") return fitPoster(slide);
    fitBox(slide, s, deck);
    // Fewer, fuller lines: only for Latin copy the author did not break by
    // hand, and never below 72% of the fitted size or the floor.
    if (slide.dataset.vertical === "1" || !s.text || /\/\//.test(s.text) ||
        /[\u3000-\u9fff]/.test(s.text)) return;
    var want = targetLines(s.text);
    if (lineCount(slide) <= want) return;
    var fs = parseFloat(slide.style.getPropertyValue("--fs")) || 0;
    var floor = Math.max(s.sizeMin || (deck.theme || {}).sizeMin || 48, fs * 0.72);
    for (var px = fs * 0.96; px >= floor; px *= 0.96) {
      slide.style.setProperty("--fs", Math.floor(px) + "px");
      if (lineCount(slide) <= want) return;
    }
    slide.style.setProperty("--fs", Math.floor(fs) + "px");    // no gain: keep the big size
  }

  function fitBox(slide, s, deck) {
    var t = deck.theme || {};
    var type = slide.querySelector(".layer-type");
    var box = slide.querySelector(".type-box");
    if (!box || !box.firstChild) return;

    var vertical = slide.dataset.vertical === "1";
    var cs = getComputedStyle(type);
    var availH = type.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    var availW = type.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);

    var min = s.sizeMin || t.sizeMin || 48;   // TikTok headline floor
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
    // Defaults follow TikTok's published media specs on a 1080x1920 canvas:
    // ~150px username row, ~250-270px caption and buttons, icon column right.
    var zones = Object.assign(
      { top: 0.085, bottom: 0.15, side: 0.07, rail: 0.16, railTop: 0.42 },
      deck.safe || {}
    );
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

  /* === MEASURE =========================================================
     Hands scripts/audit.py the one thing it cannot work out from a PNG:
     where each piece of copy is, what colour it was asked to be, and how
     big it actually rendered. The audit then samples the exported pixels
     underneath and computes real contrast.                                */
  function scrimOf(slide) {
    var sc = slide.querySelector(".layer-scrim");
    if (!sc) return null;
    var cs = getComputedStyle(sc);
    if (cs.display === "none" || sc.dataset.dir === "none") return null;
    return Math.round(parseFloat(cs.opacity) * 100) / 100;
  }

  function measure() {
    var out = [];
    window.CAROUSEL.slides.forEach(function (slide, i) {
      var sr = slide.getBoundingClientRect();
      var scale = sr.width / W || 1;
      var box = function (r) {
        return [
          Math.round((r.left - sr.left) / scale),
          Math.round((r.top - sr.top) / scale),
          Math.round((r.right - sr.left) / scale),
          Math.round((r.bottom - sr.top) / scale)
        ];
      };
      slide.querySelectorAll(
        ".headline, .headline mark, .sub, .kicker, .cta, .counter, .edge-label, figcaption"
      ).forEach(function (node) {
          var r = node.getBoundingClientRect();
          if (!r.width || !r.height) return;
          var cs = getComputedStyle(node);
          // A highlighted word has its own colour and its own band, so it is
          // measured in its own right and cut out of its parent's sample -
          // otherwise the parent's white is compared against the band.
          var holes = [];
          if (node.tagName !== "MARK") {
            node.querySelectorAll("mark").forEach(function (m) {
              var mr = m.getBoundingClientRect();
              if (mr.width && mr.height) holes.push(box(mr));
            });
          }
          out.push({
            holes: holes,
            slide: i + 1,
            el: node.tagName === "MARK"
              ? "highlight"
              : (node.className.split(" ")[0] || node.tagName.toLowerCase()),
            role: slide.dataset.role,
            template: slide.dataset.template,
            // canvas pixels, so the audit can index straight into the PNG
            box: box(r),
            color: cs.color,
            // Whether the element paints its own ground (a label chip, a
            // CTA pill). The audit samples inside those instead of around.
            ownBg: cs.backgroundColor,
            // a marker band is a gradient, not a background-color
            ownBgImage: cs.backgroundImage && cs.backgroundImage !== "none",
            fontSize: Math.round(parseFloat(cs.fontSize) / scale),
            // What audit.py --fix raises when a line over a photo is too faint.
            // The opacity actually rendered, not the deck value: a template
            // floor (max(scrim, 0.52) on covers) can make the two differ, and
            // raising a value that sits under the floor changes nothing.
            scrim: scrimOf(slide),
            hasPhoto: !!slide.querySelector(".layer-photo .photo"),
            weight: cs.fontWeight,
            text: plain(node.textContent).slice(0, 60)
          });
        });
    });
    return out;
  }

  /* === THEME =========================================================== */
  /* A theme as custom properties. Used for the deck on :root, and again on
     a single slide when that slide names its own preset (concept boards
     show three presets side by side in one page). With partial=true only
     what the theme actually sets is written, so the slide inherits the rest. */
  function themeVars(t, partial) {
    t = t || {};
    var p = t.palette || [], v = {};
    var put = function (k, val, dflt) {
      if (val != null) v[k] = val; else if (!partial && dflt != null) v[k] = dflt;
    };
    // p is sorted dark-to-light, so the page background is p[0]. Taking a
    // middle swatch here once produced grey type on the end card.
    put("--bg", t.bg || (p[0] ? deepen(p[0]) : null), "#0e0e10");
    put("--ink", t.ink, "#ffffff");
    put("--ink-dark", t.inkDark, "#16181d");
    var accent = t.accent || p[2];
    put("--accent", accent, "#f2b705");
    put("--on-accent", t.onAccent || (accent ? onColor(accent) : null), onColor("#f2b705"));
    put("--block", t.block || (p[1] ? deepen(p[1]) : null), "#141414");
    put("--paper", t.paper, "#efe9dd");
    put("--muted", t.muted, "rgba(255,255,255,0.93)");
    put("--duo-dark", (t.duotone && t.duotone[0]) || p[1], "#101b3a");
    put("--duo-light", (t.duotone && t.duotone[1]) || p[0], "#c8102e");
    put("--font-display", t.display, "system-ui, sans-serif");
    put("--font-text", t.text || t.display, "system-ui, sans-serif");
    put("--font-hand", t.hand, "cursive");
    put("--font-mono", t.mono, "ui-monospace, monospace");
    put("--display-weight", t.displayWeight);
    put("--grain", t.grain);
    put("--vignette", t.vignette);
    put("--sub-ratio", t.subRatio);
    return v;
  }

  function applyTheme(root, deck) {
    var set = function (k, v) { if (v != null) root.style.setProperty(k, v); };
    set("--W", W + "px"); set("--H", H + "px");

    // deck.safe drives both the CSS clearances and the verifier, so the
    // layout and the check can never disagree about where the zones are.
    var z = deck.safe || {};
    set("--f-top", z.top); set("--f-bottom", z.bottom); set("--f-side", z.side);
    set("--f-rail", z.rail); set("--f-railtop", z.railTop);
    var vars = themeVars(deck.theme, false);
    Object.keys(vars).forEach(function (k) { set(k, vars[k]); });
  }

  /* The preset a slide uses: its own, or the deck's. */
  function presetFor(s, deck) {
    var name = s.preset || (deck.preset && deck.preset.name);
    return name && deck.presets ? deck.presets[name] : null;
  }

  /* === RENDER ========================================================== */
  function render(deck, mount) {
    mount.innerHTML = "";
    applyTheme(document.documentElement, deck);
    var lastGroup = null;
    var slides = deck.slides.map(function (s, i) {
      // Concept boards group slides by direction; give each group a heading.
      if (!window.CAROUSEL.exportMode && s.group && s.group !== lastGroup) {
        mount.appendChild(el("h3", "group-head", esc(s.group)));
        lastGroup = s.group;
      }
      var node = buildSlide(s, i, deck);
      mount.appendChild(wrap(node, i, deck));
      return node;
    });
    window.CAROUSEL.slides = slides;
    return slides;
  }

  /* Studio wrapper: scales the 1080x1920 canvas down to something you can
     actually look at, labels it, and gives it its own review controls.
     Export mode skips the wrapper. */
  function wrap(slide, i, deck) {
    if (window.CAROUSEL.exportMode) return slide;
    var s = deck.slides[i];
    var frame = el("div", "frame");
    frame.appendChild(slide);
    var cap = el("div", "frame-cap",
      "<b>" + (i + 1) + "</b> " + esc(s.template || "") +
      " <i>" + esc(s.role || "") + "</i>");
    var review = el("div", "review");
    review.innerHTML =
      '<div class="verdict">' +
      '<button type="button" data-v="keep">Keep</button>' +
      '<button type="button" data-v="change">Change</button></div>' +
      '<textarea rows="2" placeholder="What should change on slide ' + (i + 1) + '?"></textarea>';
    review.dataset.index = i;
    var cell = el("div", "cell");
    cell.appendChild(frame);
    cell.appendChild(cap);
    cell.appendChild(review);
    return cell;
  }

  /* === GENERATED ART ===================================================
     Which art a slide gets, most specific first:
       slide.art            explicit list ([] or false turns art off)
       preset.art[template] the preset's choice for this layout
       preset.art[role]     ... for this job in the deck (cover, build, ...)
       preset.art["*"]      ... for every slide
     plus whatever the template draws for itself (TEMPLATE_ART).          */
  function artFor(s, deck) {
    if (s.art === false) return [];
    var tpl = TEMPLATE_ART[s.template] ? TEMPLATE_ART[s.template](s) : [];
    if (Array.isArray(s.art)) return tpl.concat(s.art);
    var preset = presetFor(s, deck);
    var p = (preset && preset.art) || {};
    var picked = p[s.template] || p[s.role] || p["*"] || [];
    var theme = Object.assign({}, deck.theme || {}, (s.preset && preset && preset.theme) || {});
    return tpl.concat(picked.map(function (a) { return resolveSpec(a, s, theme); }).filter(Boolean));
  }

  /* Preset art can borrow words from the deck: "@seal" reads theme.seal,
     "@badge|SAVE THIS" falls back to the text after the bar. Art that asks
     for a word nobody supplied is dropped rather than drawn with a made-up
     one - a seal or badge has to say something true.                     */
  function resolveSpec(a, s, theme) {
    // A photo-derived treatment needs a photo; drop it on slides without one.
    var needsPhoto = ["contour", "halftone", "ascii", "dither", "mosaic"].indexOf(a.type) >= 0;
    if (needsPhoto && !s.photo && a.source !== "noise") return null;
    var out = {}, ok = true;
    Object.keys(a).forEach(function (k) {
      var v = a[k];
      if (typeof v === "string" && v.charAt(0) === "@") {
        var parts = v.slice(1).split("|"), got = theme[parts[0]];
        if (got == null || got === "") got = parts.length > 1 ? parts[1] : null;
        if (got == null) ok = false; else v = got;
      }
      out[k] = v;
    });
    return ok ? out : null;
  }

  function drawArt(slide, s, i, deck) {
    var lib = window.CAROUSEL_ART;
    if (!lib) return;
    var seed = (deck.seed || deck.title || "deck") + ":" + i;

    // torn-reveal gets a fresh tear per slide instead of one fixed shape.
    if (s.template === "torn-reveal") {
      var tear = lib.tornPath(lib.rng(seed + ":tear"), W, H, H * (s.tear || 0.47));
      var pl = slide.querySelector(".layer-photo");
      if (pl) pl.style.clipPath = tear.clip;
      var edge = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      edge.setAttribute("class", "gen tear-edge");
      edge.setAttribute("viewBox", "0 0 " + W + " " + H);
      edge.innerHTML =
        '<path d="' + tear.edge + '" fill="none" stroke="rgba(0,0,0,0.28)" stroke-width="9" transform="translate(0 5)" style="filter:blur(4px)"/>' +
        '<path d="' + tear.edge + '" fill="none" style="stroke:var(--paper)" stroke-width="7"/>';
      slide.querySelector(".layer-gen").appendChild(edge);
    }

    var specs = artFor(s, deck).map(function (a) { return aim(slide, a); }).filter(Boolean);
    if (!specs.length) return;
    lib.render(slide, specs, {
      W: W, H: H, seed: seed, copy: rectOf(slide, ".type-box"),
      grid: deck.grids ? deck.grids[s.photo] : null,
      focus: s.focus || [0.5, 0.5]
    });
  }

  /* Art can aim at the copy: target "mark" circles the highlighted word,
     "headline" underlines the headline, "sub" / "kicker" likewise, and
     "mark|headline" takes the first that exists. fromTarget starts an
     arrow at a piece of copy. Positions are read from the laid-out slide,
     so the mark lands on the word wherever autofit put it.               */
  var TARGETS = { mark: ".headline mark", headline: ".headline", sub: ".sub", kicker: ".kicker" };
  function rectOf(slide, names) {
    var sr = slide.getBoundingClientRect(), k = sr.width / W || 1;
    var list = String(names).split("|");
    for (var i = 0; i < list.length; i++) {
      var n = slide.querySelector(TARGETS[list[i]] || list[i]);
      if (!n) continue;
      var rs = n.getClientRects(), r = n.getBoundingClientRect();
      // A highlight that wraps has several boxes; aim at the widest.
      for (var j = 0; j < rs.length; j++) if (rs[j].width > (r.__w || 0) && list[i] === "mark") { r = rs[j]; r.__w = rs[j].width; }
      if (!r.width) continue;
      return { x: (r.left - sr.left) / k, y: (r.top - sr.top) / k, w: r.width / k, h: r.height / k };
    }
    return null;
  }
  function aim(slide, a) {
    if (!a.target && !a.fromTarget) return a;
    var o = Object.assign({}, a, { on: "slide" });
    if (a.target) {
      var r = rectOf(slide, a.target);
      if (!r) return null;                       // nothing to annotate
      var pad = a.pad || 1.22;
      if (o.kind === "underline") {
        o.at = [(r.x + r.w / 2) / W, (r.y + r.h * 0.98) / H];
        o.w = r.w / W;
      } else {
        o.at = [(r.x + r.w / 2) / W, (r.y + r.h / 2) / H];
        o.w = r.w * pad / W; o.h = r.h * (pad + 0.25) / H;
      }
    }
    if (a.fromTarget) {
      var f = rectOf(slide, a.fromTarget);
      if (f) o.from = [(f.x + f.w * 0.82) / W, (f.y + f.h + 30) / H];
    }
    return o;
  }

  /* === READY: fonts + images, fit, then art ============================ */
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
        // Art last: it never moves the type, and drawing after the fit lets
        // a pen mark aim at the word it annotates rather than at a guess.
        window.CAROUSEL.slides.forEach(function (slide, i) {
          try { drawArt(slide, deck.slides[i], i, deck); }
          catch (err) { console.error("art on slide " + (i + 1) + ": " + err); }
        });
        document.body.dataset.ready = "1";
      });
  }

  /* === STUDIO CONTROLS =================================================
     X safe zones, C TikTok chrome, E edit text, V check, P play,
     Ctrl+S export edits. Each slide also carries Keep / Change and a note.
     Everything here is stripped on export.                                */
  function studio(deck) {
    var state = { xray: false, chrome: false, edit: false };
    var verdicts = {};                       // index -> "keep" | "change"

    function apply() {
      window.CAROUSEL.slides.forEach(function (s) {
        s.dataset.xray = state.xray ? "1" : "0";
        s.dataset.chrome = state.chrome ? "1" : "0";
      });
      document.body.dataset.edit = state.edit ? "1" : "0";
      document.querySelectorAll("#deck .headline, #deck .sub, #deck .kicker, #deck .cta").forEach(function (n) {
        n.contentEditable = state.edit ? "true" : "false";
      });
      var bar = document.getElementById("hud");
      if (bar) {
        ["xray", "chrome", "edit"].forEach(function (k) {
          var b = bar.querySelector("[data-k=" + k + "]");
          if (b) b.classList.toggle("on", state[k]);
        });
      }
      updateTally();
    }

    /* --- per-slide verdicts ------------------------------------------- */
    document.querySelectorAll(".review").forEach(function (r) {
      var i = +r.dataset.index;
      r.querySelectorAll("[data-v]").forEach(function (b) {
        b.addEventListener("click", function () {
          verdicts[i] = verdicts[i] === b.dataset.v ? undefined : b.dataset.v;
          r.dataset.v = verdicts[i] || "";
          if (verdicts[i] === "change") r.querySelector("textarea").focus();
          updateTally();
        });
      });
      r.querySelector("textarea").addEventListener("input", function (e) {
        if (e.target.value.trim() && !verdicts[i]) { verdicts[i] = "change"; r.dataset.v = "change"; }
        updateTally();
      });
    });

    function updateTally() {
      var t = document.getElementById("tally");
      if (!t) return;
      var n = window.CAROUSEL.slides.length, keep = 0, change = 0;
      for (var i = 0; i < n; i++) { if (verdicts[i] === "keep") keep++; if (verdicts[i] === "change") change++; }
      t.textContent = keep + " keep · " + change + " change · " + (n - keep - change) + " unreviewed";
    }

    /* Pull the edited copy and the verdicts back out into deck shape, so
       scripts/apply-edits.js can merge them into deck.json. */
    function collectEdits(approved) {
      var out = { approved: !!approved, slides: [] };
      window.CAROUSEL.slides.forEach(function (slide, i) {
        var rec = { index: i };
        var toSrc = function (node) {
          if (!node) return undefined;
          return node.innerHTML
            .replace(/<mark[^>]*>/g, "*").replace(/<\/mark>/g, "*")
            .replace(/<br\s*\/?>/g, " // ")
            .replace(/<[^>]+>/g, "")
            .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
            .replace(/&nbsp;/g, " ")
            .trim();
        };
        var h = slide.querySelector(".headline"), sub = slide.querySelector(".sub");
        var k = slide.querySelector(".kicker"), c = slide.querySelector(".cta");
        if (h) rec.text = toSrc(h);
        if (sub) rec.sub = toSrc(sub);
        if (k) rec.kicker = toSrc(k);
        if (c) rec.cta = toSrc(c);
        rec.status = approved ? (verdicts[i] === "change" ? "change" : "keep") : (verdicts[i] || "unreviewed");
        var r = document.querySelector('.review[data-index="' + i + '"] textarea');
        if (r && r.value.trim()) rec.note = r.value.trim();
        out.slides.push(rec);
      });
      var notes = document.getElementById("notes");
      if (notes && notes.value.trim()) out.notes = notes.value.trim();
      return out;
    }

    function download(approved) {
      var data = JSON.stringify(collectEdits(approved), null, 2);
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([data], { type: "application/json" }));
      a.download = "edits.json";
      a.click();
      toast(approved ? "Approved - edits.json downloaded. Hand it back to the agent."
                     : "edits.json downloaded - hand it back to the agent");
    }

    function toast(msg) {
      var t = document.getElementById("toast");
      if (!t) return;
      t.textContent = msg; t.classList.add("show");
      setTimeout(function () { t.classList.remove("show"); }, 2800);
    }

    /* --- play mode ------------------------------------------------------
       The deck the way a viewer meets it: one slide at a time in a phone
       frame, TikTok's interface on top, auto-advancing like photo mode.
       Judge pacing here - a slide you cannot read before it moves on is
       a slide with too many words.                                       */
    var player = null;
    function play(start) {
      if (player) return;
      var n = window.CAROUSEL.slides.length, idx = start || 0, paused = false, timer = null;
      var dwell = (deck.play && deck.play.seconds ? deck.play.seconds : 3.5) * 1000;
      var stage = el("div", "play");
      stage.innerHTML =
        '<div class="play-phone"><div class="play-bars"></div><div class="play-slot"></div></div>' +
        '<div class="play-help">← → move · space pause · esc close</div>';
      document.body.appendChild(stage);
      var bars = stage.querySelector(".play-bars"), slot = stage.querySelector(".play-slot");
      for (var b = 0; b < n; b++) bars.appendChild(el("i"));
      var k = Math.min((window.innerHeight * 0.9) / H, (window.innerWidth * 0.9) / W);
      stage.style.setProperty("--pk", k);

      function show(i) {
        idx = (i + n) % n;
        slot.innerHTML = "";
        var c = window.CAROUSEL.slides[idx].cloneNode(true);
        c.dataset.chrome = "1"; c.dataset.xray = "0";
        c.querySelectorAll("[contenteditable]").forEach(function (x) { x.removeAttribute("contenteditable"); });
        slot.appendChild(c);
        Array.prototype.forEach.call(bars.children, function (bar, j) {
          bar.className = j < idx ? "done" : (j === idx ? "now" : "");
        });
        bars.style.setProperty("--dwell", dwell + "ms");
        restart();
      }
      function restart() {
        clearTimeout(timer);
        bars.classList.toggle("paused", paused);
        if (!paused) timer = setTimeout(function () { show(idx + 1); }, dwell);
      }
      function key(e) {
        if (e.key === "Escape") return close();
        if (e.key === "ArrowRight") { e.preventDefault(); show(idx + 1); }
        if (e.key === "ArrowLeft") { e.preventDefault(); show(idx - 1); }
        if (e.key === " ") { e.preventDefault(); paused = !paused; restart(); }
      }
      function close() {
        clearTimeout(timer);
        document.removeEventListener("keydown", key, true);
        stage.remove(); player = null;
      }
      stage.addEventListener("click", function (e) {
        if (!e.target.closest(".play-phone")) return close();
        var r = slot.getBoundingClientRect();
        show(e.clientX < r.left + r.width / 3 ? idx - 1 : idx + 1);
      });
      document.addEventListener("keydown", key, true);
      player = { close: close };
      show(idx);
    }

    document.addEventListener("keydown", function (e) {
      if (player) return;
      if (e.ctrlKey && e.key.toLowerCase() === "s") { e.preventDefault(); download(false); return; }
      if (e.target.isContentEditable || /TEXTAREA|INPUT/.test(e.target.tagName)) return;
      var k = e.key.toLowerCase();
      if (k === "x") { state.xray = !state.xray; apply(); }
      if (k === "c") { state.chrome = !state.chrome; apply(); }
      if (k === "e") { state.edit = !state.edit; apply(); toast(state.edit ? "Edit mode on - click any text" : "Edit mode off"); }
      if (k === "v") { showReport(verify(deck)); }
      if (k === "p") { play(0); }
    });

    window.CAROUSEL.toggle = function (key) {
      if (key === "save") return download(false);
      if (key === "approve") return download(true);
      if (key === "verify") return showReport(verify(deck));
      if (key === "play") return play(0);
      state[key] = !state[key]; apply();
    };
    window.CAROUSEL.collectEdits = collectEdits;
    window.CAROUSEL.play = play;
    /* --- live reload (build.js --watch) ---------------------------------
       Served over http by --watch, the page reloads itself on every rebuild
       and keeps where you were: scroll position, verdicts and notes. */
    var memKey = "carousel-review:" + (deck.title || "deck");
    try {
      var mem = JSON.parse(sessionStorage.getItem(memKey) || "null");
      if (mem) {
        Object.keys(mem.verdicts || {}).forEach(function (i) {
          verdicts[i] = mem.verdicts[i];
          var r = document.querySelector('.review[data-index="' + i + '"]');
          if (r) r.dataset.v = verdicts[i];
        });
        Object.keys(mem.notes || {}).forEach(function (i) {
          var t = document.querySelector('.review[data-index="' + i + '"] textarea');
          if (t) t.value = mem.notes[i];
        });
        var g = document.getElementById("notes");
        if (g && mem.deckNotes) g.value = mem.deckNotes;
        if (mem.scroll) window.scrollTo(0, mem.scroll);
        sessionStorage.removeItem(memKey);
      }
    } catch (err) { /* storage blocked: start clean */ }
    if (/^https?:/.test(location.protocol) && window.EventSource) {
      new EventSource("/__live").onmessage = function () {
        try {
          var notes = {};
          document.querySelectorAll(".review").forEach(function (r) {
            var v = r.querySelector("textarea").value;
            if (v) notes[r.dataset.index] = v;
          });
          var g2 = document.getElementById("notes");
          sessionStorage.setItem(memKey, JSON.stringify({
            verdicts: verdicts, notes: notes, scroll: window.scrollY,
            deckNotes: g2 ? g2.value : ""
          }));
        } catch (err) { /* reload anyway */ }
        location.reload();
      };
    }


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
    measure: measure,
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
