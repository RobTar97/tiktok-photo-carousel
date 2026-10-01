#!/usr/bin/env python3
"""tiktok-photo-carousel: put text on photos for a TikTok photo-mode carousel.

Pure Pillow. No network, no AI image generation, no API keys. Photos are never modified in place.

Usage:
  python3 carousel.py --photos DIR --script script.json|script.txt --out OUT [options]
  python3 carousel.py --list-styles | --list-filters

Script formats are documented in references/script-format.md.
"""
import argparse
import json
import re
import sys
from pathlib import Path

try:
    from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps
except ImportError:
    sys.exit("Pillow is required: pip install Pillow  (or: pip install -r requirements.txt)")

Image.MAX_IMAGE_PIXELS = None  # phone/DSLR photos are big; this is a local tool
HERE = Path(__file__).resolve().parent
FONT_DIR = HERE.parent / "fonts"
EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}

# Safe zones as fractions of the canvas: (top, bottom, side). TikTok covers the status bar at the top,
# the caption/buttons at the bottom and the like/comment icons at the right edge.
PRESETS = {
    "tiktok": {"size": "1080x1920", "safe": (0.12, 0.25, 0.08)},
    "instagram": {"size": "1080x1350", "safe": (0.06, 0.10, 0.08)},
}
POS_CENTER = {"top": 0.22, "upper": 0.32, "middle": 0.43}

CJK_CANDIDATES = [  # first existing wins; override with --cjk-font
    "C:/Windows/Fonts/YuGothB.ttc", "C:/Windows/Fonts/meiryob.ttc", "C:/Windows/Fonts/msyhbd.ttc",
    "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc", "/System/Library/Fonts/PingFang.ttc",
    "/Library/Fonts/Arial Unicode.ttf",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc", "/usr/share/fonts/noto-cjk/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc", "/usr/share/fonts/google-noto-cjk/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf",
]


def hexrgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


# ---------------------------------------------------------------- fonts
def resolve_font_path(spec):
    p = Path(spec)
    if p.is_absolute() and p.exists():
        return p
    if (FONT_DIR / spec).exists():
        return FONT_DIR / spec
    return None


def load_font(spec, size, variation=None):
    path = resolve_font_path(spec) if spec else None
    if path is None:
        print(f"warning: font '{spec}' not found, using Pillow's default font", file=sys.stderr)
        return ImageFont.load_default(size)
    font = ImageFont.truetype(str(path), size)
    if variation:
        try:
            font.set_variation_by_name(variation)
        except Exception:
            pass  # static font or unknown instance name: keep the default weight
    return font


def find_cjk_font(cli_value):
    if cli_value:
        return cli_value
    for c in CJK_CANDIDATES:
        if Path(c).exists():
            return c
    return None


# ---------------------------------------------------------------- photo fitting
def fit_photo(img, size, mode, focus):
    W, H = size
    img = ImageOps.exif_transpose(img).convert("RGB")
    if mode == "cover" or img.height * W / img.width >= H:
        return ImageOps.fit(img, size, Image.LANCZOS, centering=tuple(focus))
    # "blur": whole photo, full width, over a blurred darkened copy of itself
    bg = ImageOps.fit(img, size, Image.LANCZOS).filter(ImageFilter.GaussianBlur(40))
    bg = ImageEnhance.Brightness(bg).enhance(0.55)
    fg = img.resize((W, round(img.height * W / img.width)), Image.LANCZOS)
    bg.paste(fg, (0, (H - fg.height) // 2))
    return bg


# ---------------------------------------------------------------- filters (simple, deterministic)
def grain(img, amount):
    noise = Image.effect_noise(img.size, 40).convert("RGB")
    return Image.blend(img, ImageChops.overlay(img, noise), amount)


def tint(img, rgb, amount):
    return Image.blend(img, ImageChops.multiply(img, Image.new("RGB", img.size, rgb)), amount)


def glow(img, radius, strength):
    blurred = img.filter(ImageFilter.GaussianBlur(radius))
    return ImageChops.screen(img, ImageEnhance.Brightness(blurred).enhance(strength))


def f_dreamcore(img):
    img = tint(ImageEnhance.Color(img).enhance(0.75), (205, 240, 235), 0.45)
    return grain(ImageEnhance.Contrast(glow(img, 14, 0.35)).enhance(0.92), 0.12)


def f_bloom(img):
    img = glow(ImageEnhance.Brightness(img).enhance(1.08), 18, 0.28)
    img = ImageEnhance.Color(ImageEnhance.Contrast(img).enhance(0.9)).enhance(0.9)
    return grain(img, 0.1)


def f_vhs(img):
    r, g, b = img.split()
    img = Image.merge("RGB", (ImageChops.offset(r, 6, 0), g, ImageChops.offset(b, -6, 0)))
    img = ImageEnhance.Color(ImageEnhance.Contrast(img).enhance(1.15)).enhance(1.2)
    lines = Image.new("L", img.size, 255)
    d = ImageDraw.Draw(lines)
    for y in range(0, img.height, 4):
        d.line([(0, y), (img.width, y)], fill=225)
    return grain(ImageChops.multiply(img, Image.merge("RGB", (lines, lines, lines))), 0.2)


def f_warm(img):
    return grain(ImageEnhance.Contrast(tint(img, (255, 235, 205), 0.35)).enhance(0.95), 0.08)


def f_golden(img):
    img = tint(img, (255, 230, 195), 0.28)
    return grain(ImageEnhance.Color(ImageEnhance.Contrast(img).enhance(1.08)).enhance(1.12), 0.05)


def f_contrast(img):
    return ImageEnhance.Color(ImageEnhance.Contrast(img).enhance(1.25)).enhance(1.15)


def f_bw(img):
    return ImageOps.grayscale(img).convert("RGB")


FILTERS = {"none": lambda i: i, "dreamcore": f_dreamcore, "bloom": f_bloom, "vhs": f_vhs,
           "warm": f_warm, "golden": f_golden, "contrast": f_contrast, "bw": f_bw}


def apply_filter(img, name):
    if name in (None, ""):
        name = "none"
    if name not in FILTERS:
        sys.exit(f"unknown filter '{name}'. Available: {', '.join(FILTERS)}")
    return FILTERS[name](img)


# ---------------------------------------------------------------- text layout
def has_cjk(s):
    return any(ord(c) > 0x2E80 for c in s)


def tokenize(text):
    """-> list of forced-break blocks; each block is a list of [word, highlighted, space_before].
    '*word*' toggles highlight, ' // ' or newline forces a line break, CJK wraps per character."""
    out = []
    for seg in re.split(r"\s*//\s*|\n", text):
        toks, hl, pending = [], False, False
        for part in re.split(r"(\*)", seg):
            if part == "*":
                hl = not hl
                continue
            if part.startswith(" ") and toks:
                pending = True
            for w in (x for x in part.split(" ") if x):
                if has_cjk(w):
                    for j, ch in enumerate(w):
                        toks.append([ch, hl, pending and j == 0])
                else:
                    toks.append([w, hl, pending])
                pending = True
            pending = pending and part.endswith(" ")
        out.append(toks)
    return out


def wrap(blocks, font, maxw, gap):
    lines = []
    for toks in blocks:
        cur, w = [], 0
        for t, hl, sp in toks:
            tw = font.getlength(t)
            add = tw + (gap if cur and sp else 0)
            if cur and w + add > maxw:
                lines.append(cur)
                cur, w, add = [], 0, tw
            cur.append((t, hl, bool(cur) and sp))
            w += add
        if cur:
            lines.append(cur)
    return lines


def line_width(line, font, gap):
    return sum(font.getlength(t) + (gap if sp else 0) for t, _, sp in line)


def top_gradient(img, strength, frac=0.5):
    """Black-to-transparent gradient from the top edge; strength = opacity at the very top."""
    W, H = img.size
    g = Image.linear_gradient("L").rotate(180).resize((W, int(H * frac)))
    mask = Image.new("L", img.size, 0)
    mask.paste(g.point(lambda v: int(v * strength)), (0, 0))
    return Image.composite(Image.new("RGB", img.size, (0, 0, 0)), img, mask)


def render_text(img, slide, st, cjk_font, pos, size, safe):
    W, H = size
    s_top, s_bot, s_side = safe
    text = slide["text"]
    kicker, sub = slide.get("kicker"), slide.get("sub")
    align = slide.get("align", st.get("align", "center"))
    use_cjk = has_cjk(text) and cjk_font
    if has_cjk(text) and not cjk_font:
        print("warning: CJK text but no CJK font found; pass --cjk-font /path/to/font", file=sys.stderr)
    spec, variation = (cjk_font, "Bold") if use_cjk else (st["font"], st.get("variation"))
    side = W * s_side + (W * 0.012 if align == "left" else 0)
    maxw = W - 2 * side
    zone_top, zone_bot = H * s_top, H * (1 - s_bot)
    blocks = tokenize(text)
    fs = slide.get("size", st["size_max"])
    while True:
        font = load_font(spec, fs, variation)
        gap = font.getlength(" ")
        lines = wrap(blocks, font, maxw, gap)
        lh = fs * st["line_spacing"]
        kfs = max(40, round(fs * 0.5))
        extra_top = (kfs * 1.3 + fs * 0.35) if kicker else 0
        extra_bot = (kfs * 1.3 + fs * 0.3) if sub else 0
        total = lh * len(lines) + extra_top + extra_bot
        widest = max(line_width(l, font, gap) for l in lines)
        top = H * POS_CENTER.get(pos, POS_CENTER["upper"]) - total / 2
        ok = widest <= maxw and top >= zone_top and top + total <= zone_bot and len(lines) <= 6
        if ok or fs <= st["size_min"]:
            break
        fs -= 4
    top = max(zone_top, min(top, zone_bot - total))
    warn = None if ok else "text may not fit the safe zone at the minimum size - shorten it"

    def block_x(width):
        return side if align == "left" else (W - width) / 2

    # readability: top gradient for editorial styles, otherwise a soft dark patch only where the photo is bright
    if st.get("gradient"):
        img = top_gradient(img, st["gradient"])
    else:
        x0 = block_x(widest) - 40
        box = (max(0, x0 - 20), max(0, top - 50), min(W, x0 + widest + 100), min(H, top + total + 50))
        lum = ImageOps.grayscale(img.crop(tuple(int(v) for v in box))).resize((1, 1)).getpixel((0, 0))
        alpha = int(max(0, min(0.4, (lum - 70) / 255 * 0.7)) * 255)
        if alpha:
            scrim = Image.new("L", img.size, 0)
            ImageDraw.Draw(scrim).rounded_rectangle(box, radius=50, fill=alpha)
            img = Image.composite(Image.new("RGB", img.size, (0, 0, 0)), img,
                                  scrim.filter(ImageFilter.GaussianBlur(70)))

    sh = st.get("shadow")
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)

    def put(x, y, t, f, col, stroke):
        if sh:
            sd.text((x + sh[0], y + sh[1]), t, font=f, fill=(0, 0, 0, sh[3]))
        d.text((x, y), t, font=f, fill=col + (255,), stroke_width=stroke, stroke_fill=hexrgb(st["stroke_color"]))

    secondary = hexrgb(st.get("secondary", st["color"]))
    y = top
    if kicker:  # small letter-spaced label above the text, e.g. "01"
        kf = load_font(spec, kfs, variation)
        spaced = " ".join(kicker) if len(kicker) <= 4 else kicker
        put(block_x(kf.getlength(spaced)), y, spaced, kf, secondary, 0)
        y += extra_top
    for line in lines:
        x = block_x(line_width(line, font, gap))
        for t, hl, sp in line:
            if sp:
                x += gap
            put(x, y, t, font, hexrgb(st["highlight"] if hl else st["color"]), st["stroke"])
            x += font.getlength(t)
        y += lh
    if sub:
        y += fs * 0.3 - (lh - fs)
        sf = load_font(spec, kfs, variation)
        put(block_x(sf.getlength(sub)), y, sub, sf, secondary, 0)

    out = img.convert("RGBA")
    if sh:
        out = Image.alpha_composite(out, shadow.filter(ImageFilter.GaussianBlur(sh[2])))
    return Image.alpha_composite(out, layer).convert("RGB"), fs, warn


def draw_stamp(img, text, safe):
    """Retro camcorder date stamp in the top-left safe corner."""
    W, H = img.size
    f = load_font("SpaceMono-Bold.ttf", round(W * 0.04))
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    xy = (W * safe[2], H * safe[0] + 12)
    d.text((xy[0] + 3, xy[1] + 3), text, font=f, fill=(0, 0, 0, 150))
    d.text(xy, text, font=f, fill=(255, 190, 90, 235))
    return Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")


def debug_overlay(img, safe):
    W, H = img.size
    o = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(o)
    for box in [(0, 0, W, H * safe[0]), (0, H * (1 - safe[1]), W, H),
                (0, 0, W * safe[2], H), (W * (1 - safe[2]), 0, W, H)]:
        d.rectangle(box, fill=(255, 0, 0, 70))
    return Image.alpha_composite(img.convert("RGBA"), o).convert("RGB")


# ---------------------------------------------------------------- script + CLI
def load_script(path):
    p = Path(path)
    if not p.exists():
        sys.exit(f"script not found: {p}")
    if p.suffix == ".json":
        data = json.loads(p.read_text(encoding="utf-8"))
        return data["slides"] if isinstance(data, dict) else data
    slides = []
    for line in p.read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        m = re.match(r"^(top|upper|middle)\s*\|\s*(.*)$", line)
        slides.append({"pos": m.group(1), "text": m.group(2)} if m else {"text": line.strip()})
    return slides


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--photos", help="folder with the source photos")
    ap.add_argument("--script", help="slides: .txt (one per line) or .json")
    ap.add_argument("--out", help="output folder (created if missing)")
    ap.add_argument("--style", default="dreamcore", help="style name from styles.json (see --list-styles)")
    ap.add_argument("--preset", default="tiktok", choices=list(PRESETS), help="canvas size + safe zones")
    ap.add_argument("--size", help="override canvas size, e.g. 1080x1440")
    ap.add_argument("--safe", help="override safe zones as top,bottom,side fractions, e.g. 0.12,0.25,0.08")
    ap.add_argument("--fit", default="cover", choices=["cover", "blur"])
    ap.add_argument("--filter", help="override the style's filter (see --list-filters; 'none' disables)")
    ap.add_argument("--pos", default="upper", choices=list(POS_CENTER), help="default text position")
    ap.add_argument("--cjk-font", help="font file for Japanese/Chinese/Korean text (auto-detected if omitted)")
    ap.add_argument("--format", default="png", choices=["png", "jpg"])
    ap.add_argument("--quality", type=int, default=92, help="JPEG quality")
    ap.add_argument("--debug", action="store_true", help="shade the unsafe UI zones red")
    ap.add_argument("--list-styles", action="store_true")
    ap.add_argument("--list-filters", action="store_true")
    a = ap.parse_args()

    styles = json.loads((HERE / "styles.json").read_text(encoding="utf-8"))
    if a.list_styles:
        for name, st in styles.items():
            print(f"{name:16} font={st['font']} filter={st['filter']}")
        return
    if a.list_filters:
        print("\n".join(FILTERS))
        return
    if not (a.photos and a.script and a.out):
        ap.error("--photos, --script and --out are required")
    if a.style not in styles:
        sys.exit(f"unknown style '{a.style}'. Available: {', '.join(styles)}")

    preset = PRESETS[a.preset]
    size = tuple(int(v) for v in (a.size or preset["size"]).lower().split("x"))
    safe = tuple(float(v) for v in a.safe.split(",")) if a.safe else preset["safe"]
    cjk = find_cjk_font(a.cjk_font)

    photo_dir = Path(a.photos)
    if not photo_dir.is_dir():
        sys.exit(f"photo folder not found: {photo_dir}")
    photos = sorted(p for p in photo_dir.iterdir() if p.suffix.lower() in EXTS)
    slides = load_script(a.script)
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)

    rendered = []
    for i, s in enumerate(slides):
        if s.get("photo"):
            photo = Path(s["photo"])
            photo = photo if photo.is_absolute() else photo_dir / photo
        else:
            photo = photos[i] if i < len(photos) else None
        if photo is None or not photo.exists():
            print(f"slide {i + 1}: photo not found ({photo}), skipped", file=sys.stderr)
            continue
        style_name = s.get("style", a.style)
        if style_name not in styles:
            sys.exit(f"slide {i + 1}: unknown style '{style_name}'")
        st = styles[style_name]
        img = fit_photo(Image.open(photo), size, s.get("fit", a.fit), s.get("focus", [0.5, 0.5]))
        img = apply_filter(img, s.get("filter", a.filter or st["filter"]))
        if s.get("stamp"):
            img = draw_stamp(img, s["stamp"], safe)
        msg = f"slide {i + 1}: {photo.name}"
        if s.get("text"):
            img, fs, warn = render_text(img, s, st, cjk, s.get("pos", a.pos), size, safe)
            msg += f"  font {fs}px" + (f"  WARNING: {warn}" if warn else "")
        print(msg)
        if a.debug:
            img = debug_overlay(img, safe)
        name = out / f"{i + 1:02d}.{a.format}"
        img.save(name, quality=a.quality) if a.format == "jpg" else img.save(name)
        rendered.append(img)

    if rendered:  # one-glance review sheet
        tw = 270
        th = round(tw * size[1] / size[0])
        sheet = Image.new("RGB", (tw * len(rendered) + 10 * (len(rendered) + 1), th + 20), (20, 20, 20))
        for k, im in enumerate(rendered):
            sheet.paste(im.resize((tw, th), Image.LANCZOS), (10 + k * (tw + 10), 10))
        sheet.save(out / "_contact_sheet.png")
    print(f"done: {len(rendered)} slide(s) -> {out}")


if __name__ == "__main__":
    main()
