#!/usr/bin/env python3
"""Read a folder of photos and write the facts the HTML engine cannot measure.

For every photo this produces:
  palette   5 dominant colours, dark-to-light, as hex
  focus     [x, y] 0..1 - the centre of the most detailed region, so the
            cover-crop keeps the subject instead of the middle of the frame
  bands     per text position: mean luminance, busyness, and the scrim
            opacity needed for white type to stay readable over it
  orient    portrait / landscape / square
  grid      a small luminance grid and a smaller colour grid (base64), so the
            engine can redraw the photo in code - contours, halftone, ASCII,
            dither, mosaic - without the browser ever reading pixels, which
            file:// pages are not allowed to do

It can also write web-sized copies in the same pass. Do that: a 16 MP
original in the page makes the studio crawl, and the slide is only 1080px
wide anyway.

Usage:
    python scripts/analyze.py --photos ./photos --out ./work/analysis.json
    python scripts/analyze.py --photos ./photos --out ./work/analysis.json --resize ./work/photos
"""
import argparse
import base64
import json
import os
import sys

try:
    from PIL import Image, ImageFilter, ImageOps, ImageStat
except ImportError:
    sys.exit("Pillow is required: pip install -r requirements.txt")

# Windows consoles default to cp932/cp1252 and blow up on Japanese file
# names. The skill is used with Japanese photo sets constantly, so force
# UTF-8 on stdout instead of letting a print() kill the run.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

EXT = (".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff")

# Where each text position actually sits on a 1920-tall canvas, as fractions.
# These mirror the padding in html/templates.css.
BANDS = {
    "top":    (0.12, 0.46),
    "upper":  (0.20, 0.56),
    "middle": (0.32, 0.68),
    "lower":  (0.44, 0.75),
}


def dominant_palette(img, n=5):
    """Quantise to a handful of colours and return them dark-to-light."""
    small = img.convert("RGB").resize((160, 160))
    q = small.quantize(colors=n * 2, method=Image.Quantize.FASTOCTREE)
    pal = q.getpalette()
    counts = sorted(q.getcolors(), key=lambda c: -c[0])

    out = []
    for _, idx in counts:
        rgb = tuple(pal[idx * 3: idx * 3 + 3])
        # Skip a colour that is almost the same as one already kept.
        if any(sum(abs(a - b) for a, b in zip(rgb, k)) < 48 for k in out):
            continue
        out.append(rgb)
        if len(out) == n:
            break
    out.sort(key=lambda c: 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2])
    return ["#%02x%02x%02x" % c for c in out]


def duotone_pair(palette):
    """A dark and a mid-light version of the photo's most saturated colour.

    Picking the darkest and lightest swatches instead gives a washed-out
    poster, because the lightest swatch in a photo is nearly always a
    desaturated near-white.
    """
    best = None
    for hx in palette:
        r, g, b = (int(hx[i:i + 2], 16) for i in (1, 3, 5))
        mx, mn = max(r, g, b), min(r, g, b)
        sat = 0.0 if mx == 0 else (mx - mn) / mx
        if best is None or sat > best[0]:
            best = (sat, (r, g, b))
    r, g, b = best[1]

    def at(target):
        lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 or 0.001
        k = target / lum
        return "#%02x%02x%02x" % tuple(min(255, max(0, int(c * k))) for c in (r, g, b))

    return [at(0.14), at(0.62)]


def focus_point(img, grid=16):
    """Centroid of the busiest cells - a cheap stand-in for a saliency map."""
    g = img.convert("L").resize((grid * 8, grid * 8))
    edges = g.filter(ImageFilter.FIND_EDGES).resize((grid, grid))
    px = list(edges.tobytes())          # getdata() is deprecated in Pillow 12
    if not px:
        return [0.5, 0.5]
    thresh = sorted(px)[int(len(px) * 0.80)]
    hot = [(i % grid, i // grid, v) for i, v in enumerate(px) if v >= thresh and v > 8]
    if not hot:
        return [0.5, 0.5]
    tw = sum(h[2] for h in hot)
    x = sum((h[0] + 0.5) * h[2] for h in hot) / tw / grid
    y = sum((h[1] + 0.5) * h[2] for h in hot) / tw / grid
    # Keep the crop sane: never push the focus right to an edge.
    clamp = lambda v: max(0.22, min(0.78, v))
    return [round(clamp(x), 3), round(clamp(y), 3)]


def band_stats(img, y1, y2):
    """Luminance and busyness of the strip the type will sit on."""
    w, h = img.size
    box = img.crop((0, int(h * y1), w, int(h * y2))).convert("L")
    st = ImageStat.Stat(box)
    mean, std = st.mean[0], st.stddev[0]

    # Bright or busy backgrounds need a stronger scrim for white type.
    by_light = (mean - 70) / 150.0          # 0 at near-black, 1 at bright
    by_noise = (std - 32) / 80.0            # busy photos need help too
    scrim = 0.22 + 0.52 * max(0.0, min(1.0, by_light)) \
                 + 0.16 * max(0.0, min(1.0, by_noise))
    return {
        "luma": round(mean, 1),
        "busy": round(std, 1),
        "scrim": round(max(0.22, min(0.88, scrim)), 2),
        # On a dark, calm photo white type can stand alone; say so.
        "needsShadow": bool(mean > 118 or std > 58),
    }


def upright(im):
    """Apply EXIF orientation. Phones store a portrait shot as landscape pixels
    plus a rotate tag; browsers honour the tag, Pillow does not. Skipping this
    measured the wrong axis, and --resize wrote sideways copies."""
    return ImageOps.exif_transpose(im)


def grids(img, lum_long=120, rgb_long=40):
    """Luminance and colour grids with the photo's own aspect ratio.

    The engine maps canvas points onto these using the same object-fit:cover
    and focus maths the browser uses, so code-drawn art lines up with the
    photo exactly. Values are raw bytes, base64 encoded."""
    w, h = img.size
    def size(long_side):
        if w >= h:
            return long_side, max(2, round(long_side * h / w))
        return max(2, round(long_side * w / h)), long_side
    lw, lh = size(lum_long)
    cw, ch = size(rgb_long)
    lum = img.convert("L").resize((lw, lh), Image.LANCZOS)
    rgb = img.convert("RGB").resize((cw, ch), Image.LANCZOS)
    return {
        "lum": {"w": lw, "h": lh, "data": base64.b64encode(lum.tobytes()).decode()},
        "rgb": {"w": cw, "h": ch, "data": base64.b64encode(rgb.tobytes()).decode()},
    }


def analyze(path):
    with Image.open(path) as raw:
        raw.load()
        im = upright(raw)
        w, h = im.size
        thumb = im.copy()
        thumb.thumbnail((560, 560))
        pal = dominant_palette(thumb)
        return {
            "w": w, "h": h,
            "orient": "portrait" if h > w * 1.05 else ("landscape" if w > h * 1.05 else "square"),
            "palette": pal,
            "duotone": duotone_pair(pal),
            "focus": focus_point(thumb),
            "bands": {k: band_stats(thumb, a, b) for k, (a, b) in BANDS.items()},
            "grid": grids(thumb),
        }


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--photos", required=True, help="folder with the source photos")
    ap.add_argument("--out", default="analysis.json", help="where to write the JSON")
    ap.add_argument("--resize", help="also write web-sized JPEG copies into this folder")
    ap.add_argument("--max", type=int, default=2160, help="long edge for --resize")
    a = ap.parse_args()

    if not os.path.isdir(a.photos):
        sys.exit("No such folder: " + a.photos)

    files = sorted(f for f in os.listdir(a.photos) if f.lower().endswith(EXT))
    if not files:
        sys.exit("No images in " + a.photos)

    if a.resize:
        os.makedirs(a.resize, exist_ok=True)

    out = {}
    for f in files:
        try:
            src = os.path.join(a.photos, f)
            out[f] = analyze(src)
            if a.resize:
                with Image.open(src) as im:
                    im = upright(im).convert("RGB")
                    im.thumbnail((a.max, a.max), Image.LANCZOS)
                    im.save(os.path.join(a.resize, f), "JPEG", quality=88, optimize=True)
            print("  %-46s %s  focus=%s" % (f[:46], out[f]["palette"][0], out[f]["focus"]))
        except Exception as e:                      # a corrupt file must not stop the run
            print("  SKIP %s (%s)" % (f, e))

    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out, "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=1, ensure_ascii=False)
    print("\n%d photo(s) -> %s" % (len(out), a.out))


if __name__ == "__main__":
    main()
