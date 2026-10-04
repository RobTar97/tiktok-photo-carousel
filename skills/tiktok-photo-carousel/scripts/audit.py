#!/usr/bin/env python3
"""Readability audit of exported slides.

The safe-zone verifier answers "is the copy where TikTok will cover it".
This answers the other two questions:

  readable   does each line have enough contrast against the pixels actually
             behind it, and is it big enough to read on a phone
  fitting    do the colours in the deck hold together, and does the cover
             survive the profile grid's 1:1 crop

It reads the PNGs that export.js produced plus the measurements the browser
recorded in _report.json, so it checks the shipped pixels rather than the
intent. Writes _cover_grid.png - the cover as the profile grid will show it.

Usage:
    python scripts/audit.py --out ./out
    python scripts/audit.py --out ./out --fix work/deck.json

--fix raises the scrim on every slide whose copy over a photograph falls
short, writes the deck back (keeping deck.json.bak), and lists what moved.
Rebuild and export, then audit again. It never touches copy, colour or
layout - those are design decisions, and the report says which to make.
"""
import argparse
import json
import os
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required: pip install -r requirements.txt")

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# TikTok's own floors on a 1080x1920 canvas.
MIN_HEADLINE = 48
MIN_BODY = 32

# WCAG contrast ratios. Large text is allowed 3.0, but burned-in type is
# recompressed by the app and viewed in sunlight, so 4.5 is the bar here
# and 3.0 is the hard floor below which it is simply not readable.
GOOD = 4.5
FLOOR = 3.0


def srgb_lum(rgb):
    def ch(c):
        c /= 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (ch(x) for x in rgb[:3])
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    la, lb = srgb_lum(a), srgb_lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def parse_css_color(s):
    s = str(s).strip()
    if s.startswith("#"):
        s = s[1:]
        if len(s) == 3:
            s = "".join(c * 2 for c in s)
        return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))
    if s.startswith("rgb"):
        nums = s[s.index("(") + 1:s.index(")")].replace("/", ",").split(",")
        vals = [float(n.strip().rstrip("%")) for n in nums[:3]]
        return tuple(int(v) for v in vals)
    return (255, 255, 255)


def is_opaque(css):
    """True when an element paints its own solid ground."""
    c = str(css or "").strip()
    if not c or c in ("transparent", "none"):
        return False
    if c.startswith("rgba"):
        try:
            return float(c[c.index("(") + 1:c.index(")")].split(",")[3]) > 0.92
        except (ValueError, IndexError):
            return False
    return c.startswith("rgb") or c.startswith("#")


def background_under(bg_img, box, text_rgb, own_bg=False, holes=(), body=False):
    """Mean and worst-case background behind a line of type.

    Reads the background plate export.js rendered with the copy hidden, so
    the sample is the real ground. Measuring inside the finished PNG does
    not work: antialiased glyph edges form a continuum between the text
    colour and the background, and every headline then reports about 1.1:1.

    Worst case is the 2nd percentile of contrast rather than the single
    worst pixel, so one stray highlight cannot condemn an otherwise
    readable line.
    """
    x1, y1, x2, y2 = box
    # Type is read against whatever touches it, so sample a little beyond the
    # box - unless the element paints its own chip, where going outside would
    # measure the photo next to the label instead of the label.
    if body and not own_bg:
        # A highlight's band is decoration under or behind the word; what
        # has to read is the glyph body, the middle of the line box.
        hgt = y2 - y1
        y1, y2 = y1 + int(hgt * 0.24), y2 - int(hgt * 0.26)
    if own_bg:
        # Sample inside the chip or band. A marker band is inset from the top
        # and bottom of the line box, and those slivers hold no glyph - they
        # would otherwise report the ground as the word's background.
        iy = max(3, int((y2 - y1) * 0.18))
        x1, y1, x2, y2 = x1 + 3, y1 + iy, x2 - 3, y2 - iy
    else:
        x1, y1 = max(0, x1 - 2), max(0, y1 - 2)
        x2, y2 = min(bg_img.width, x2 + 2), min(bg_img.height, y2 + 2)
    if x2 - x1 < 2 or y2 - y1 < 2:
        return None, None
    acc = bg_img.load()
    px = []
    for y in range(y1, y2, 3):            # one sample per ~3px is plenty
        for x in range(x1, x2, 3):
            skip = False
            for hx1, hy1, hx2, hy2 in holes:
                if hx1 <= x < hx2 and hy1 <= y < hy2:
                    skip = True
                    break
            if not skip:
                px.append(acc[x, y][:3])
    if not px:
        return None, None

    mean = tuple(sum(p[i] for p in px) // len(px) for i in range(3))
    ranked = sorted(px, key=lambda p: contrast(text_rgb, p))
    worst = ranked[max(0, int(len(ranked) * 0.02))]
    return mean, worst


def audit_cover(out_dir, rep):
    """Write the 1:1 crop the profile grid applies, and say what it loses."""
    name = rep.get("cover")
    if not name or not os.path.exists(os.path.join(out_dir, name)):
        return []
    im = Image.open(os.path.join(out_dir, name)).convert("RGB")
    side = im.width
    top = (im.height - side) // 2
    im.crop((0, top, side, top + side)).save(os.path.join(out_dir, "_cover_grid.png"))

    notes = []
    for b in rep.get("boxes", []):
        if b["slide"] != rep.get("coverSlide"):
            continue
        if b["el"] == "swipe":
            continue
        y1, y2 = b["box"][1], b["box"][3]
        if y1 < top or y2 > top + side:
            notes.append("cover %s leaves the 1:1 grid crop (y %d-%d, crop is %d-%d)"
                         % (b["el"], y1, y2, top, top + side))
    return notes


def fix_deck(deck_path, weak, out_dir):
    """Raise the scrim where copy over a photo falls short.

    Remembers the last round in out/_fix.json. A slide whose ratio barely
    moved after its scrim went up is not a scrim problem - something above
    the scrim is in the way (a highlight band, generated art) - so it is
    reported instead of darkened again."""
    import shutil
    hist_path = os.path.join(out_dir, "_fix.json")
    hist = json.load(open(hist_path, encoding="utf-8")) if os.path.exists(hist_path) else {}
    deck = json.load(open(deck_path, encoding="utf-8"))
    slides = deck.get("slides", [])
    changed, manual = [], []
    for n in sorted(weak):
        ratio, scrim, has_photo = weak[n]
        if n - 1 >= len(slides):
            continue
        s = slides[n - 1]
        if not has_photo:
            manual.append("slide %d (%.1f:1) has no photo behind the copy - change the colours" % (n, ratio))
            continue
        cur = s.get("scrim", scrim if scrim is not None else 0.45)
        prev = hist.get(str(n))
        if prev and prev["scrim"] < cur and ratio - prev["ratio"] < 0.4:
            manual.append("slide %d stayed at %.1f:1 after its scrim went %.2f -> %.2f - the scrim is not "
                          "the problem; something above it (a highlight band, generated art) sits behind the "
                          "copy. Check it in the studio with X." % (n, ratio, prev["scrim"], cur))
            continue
        hist[str(n)] = {"ratio": round(ratio, 2), "scrim": cur}
        # Bigger steps for worse ratios; past ~0.85 the photo is gone.
        step = 0.2 if ratio < FLOOR else 0.12
        new = round(min(0.86, cur + step), 2)
        if new <= cur:
            manual.append("slide %d (%.1f:1) is already at scrim %.2f - move the copy with pos, "
                          "or use frosted-card / caption-bar" % (n, ratio, cur))
            continue
        s["scrim"] = new
        changed.append("slide %d: scrim %.2f -> %.2f  (worst was %.1f:1)" % (n, cur, new, ratio))
    with open(hist_path, "w", encoding="utf-8") as fh:
        json.dump(hist, fh)
    if changed:
        shutil.copyfile(deck_path, deck_path + ".bak")
        with open(deck_path, "w", encoding="utf-8") as fh:
            json.dump(deck, fh, indent=2, ensure_ascii=False)
    print("\nfix -> %s" % deck_path)
    for c in changed:
        print("  + " + c)
    for m in manual:
        print("  ? " + m)
    if changed:
        print("  rebuild, export and audit again.")


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default="./out", help="folder export.js wrote")
    ap.add_argument("--strict", action="store_true", help="exit non-zero on any fail")
    ap.add_argument("--fix", metavar="DECK", help="raise the scrim on failing photo slides in this deck.json")
    a = ap.parse_args()

    rpath = os.path.join(a.out, "_report.json")
    if not os.path.exists(rpath):
        sys.exit("No _report.json in %s - run scripts/export.js first." % a.out)
    rep = json.load(open(rpath, encoding="utf-8"))
    boxes = rep.get("boxes")
    if not boxes:
        sys.exit("This report has no measurements. Re-run export.js with the "
                 "current engine.")

    bg_dir = os.path.join(a.out, "_bg")
    if not os.path.isdir(bg_dir):
        sys.exit("No _bg/ plates in %s - re-run export.js with the current "
                 "version, which renders them." % a.out)

    imgs, fails, warns = {}, [], []
    weak = {}                     # slide -> (worst ratio, effective scrim, has photo)
    print("%-3s %-11s %-7s %5s  %-7s %s" %
          ("#", "element", "size", "ratio", "worst", "text"))
    print("-" * 78)

    for b in boxes:
        plate = os.path.join(bg_dir, "%02d.png" % b["slide"])
        if plate not in imgs:
            imgs[plate] = Image.open(plate).convert("RGB")

        text_rgb = parse_css_color(b["color"])
        own = is_opaque(b.get("ownBg")) or bool(b.get("ownBgImage"))
        mean_bg, worst_bg = background_under(
            imgs[plate], b["box"], text_rgb, own, b.get("holes") or (),
            body=b["el"] == "highlight")
        if mean_bg is None:
            continue
        c_mean = contrast(text_rgb, mean_bg)
        c_worst = contrast(text_rgb, worst_bg)

        floor = MIN_HEADLINE if b["el"] in ("headline", "highlight") else MIN_BODY
        small = b["fontSize"] < floor

        if c_worst < GOOD and b["el"] in ("headline", "sub", "highlight", "edge-label"):
            prev = weak.get(b["slide"])
            if prev is None or c_worst < prev[0]:
                weak[b["slide"]] = (c_worst, b.get("scrim"), b.get("hasPhoto"))

        mark = " "
        if c_worst < FLOOR or small:
            mark = "X"
            if small:
                fails.append("slide %d %s is %dpx, below the %dpx floor"
                             % (b["slide"], b["el"], b["fontSize"], floor))
            if c_worst < FLOOR:
                fails.append("slide %d %s drops to %.1f:1 against its background"
                             % (b["slide"], b["el"], c_worst))
        elif c_worst < GOOD:
            mark = "!"
            warns.append("slide %d %s is %.1f:1 at its worst point (want %.1f)"
                         % (b["slide"], b["el"], c_worst, GOOD))

        print("%s%-2d %-11s %4dpx %5.1f  %5.1f   %s" %
              (mark, b["slide"], b["el"], b["fontSize"], c_mean, c_worst,
               b["text"][:30]))

    cover_notes = audit_cover(a.out, rep)

    print()
    if cover_notes:
        print("cover:")
        for n in cover_notes:
            print("  ! " + n)
        warns += cover_notes
    elif rep.get("cover"):
        print("cover: %s survives the 1:1 profile crop  -> _cover_grid.png"
              % rep["cover"])

    if fails:
        print("\nFAIL (%d):" % len(fails))
        for f in fails:
            print("  X " + f)
    if warns:
        print("\nWARN (%d):" % len(warns))
        for w in warns:
            print("  ! " + w)
    if not fails and not warns:
        print("\nAll copy clears %.1f:1 and the size floors." % GOOD)

    print("\nratio = mean background, worst = the single worst spot behind the line.")
    if a.fix and weak:
        fix_deck(a.fix, weak, a.out)
    elif a.fix:
        print("\nfix: nothing to raise - every line over a photo clears %.1f:1" % GOOD)

    if fails and a.strict:
        sys.exit(2)


if __name__ == "__main__":
    main()
