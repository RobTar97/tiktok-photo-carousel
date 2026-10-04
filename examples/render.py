#!/usr/bin/env python3
"""Regenerate every example render in this folder.

    python examples/render.py            # from the repo root
    npm run examples                     # same thing

For each deck in examples/decks/ it builds the page, exports the slides,
runs the readability audit with --fix until it is clean, then composes the
two overview images the README shows:

    examples/renders/templates.png   every template
    examples/renders/presets.png     every preset, same demo photo

Needs what the skill needs: Node + Playwright, Python + Pillow.
"""
import json
import os
import shutil
import subprocess
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

try:
    from PIL import Image, ImageDraw
except ImportError:
    sys.exit("Pillow is required: pip install -r skills/tiktok-photo-carousel/requirements.txt")

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SKILL = os.path.join(ROOT, "skills", "tiktok-photo-carousel", "scripts")
PHOTOS = os.path.join(HERE, "photos")
DECKS = os.path.join(HERE, "decks")
RENDERS = os.path.join(HERE, "renders")
NODE = shutil.which("node") or "node"
PY = sys.executable


def run(cmd, quiet=True):
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        sys.exit("failed: %s\n%s" % (" ".join(cmd[:3]), r.stderr or r.stdout))
    if not quiet:
        print(r.stdout.rstrip())
    return r.stdout


def render(name):
    deck = os.path.join(DECKS, name + ".json")
    html = os.path.join(DECKS, name + ".html")
    out = os.path.join(RENDERS, name)
    print("  %s" % name)
    for _ in range(3):
        run([NODE, os.path.join(SKILL, "build.js"), "--deck", deck, "--out", html])
        run([NODE, os.path.join(SKILL, "export.js"), "--html", html, "--out", out,
             "--format", "jpg", "--no-contact", "--no-upload"])
        audit = run([PY, os.path.join(SKILL, "audit.py"), "--out", out, "--fix", deck])
        if "+ slide" not in audit:
            break
    last = [l for l in audit.splitlines() if l.startswith(("All copy", "FAIL", "WARN"))]
    print("    " + (last[0] if last else "audited"))
    for junk in (html, deck + ".bak", os.path.join(out, "_fix.json")):
        if os.path.exists(junk):
            os.remove(junk)
    shutil.rmtree(os.path.join(out, "_bg"), ignore_errors=True)


def slides_in(folder):
    return sorted(os.path.join(folder, f) for f in os.listdir(folder)
                  if f[:2].isdigit() and f.endswith(".jpg"))


def compose(files, path, cols, labels=None, w=216, h=384):
    rows = (len(files) + cols - 1) // cols
    lab = 26 if labels else 0
    sheet = Image.new("RGB", (w * cols, (h + lab) * rows), (12, 12, 14))
    draw = ImageDraw.Draw(sheet)
    for i, f in enumerate(files):
        x, y = (i % cols) * w, (i // cols) * (h + lab)
        sheet.paste(Image.open(f).convert("RGB").resize((w, h), Image.LANCZOS), (x, y))
        if labels:
            draw.text((x + 8, y + h + 7), labels[i], fill=(225, 225, 225))
    sheet.save(path)
    print("  %s  (%d slides)" % (os.path.relpath(path, ROOT), len(files)))


def main():
    if not os.path.isdir(PHOTOS) or not os.listdir(PHOTOS):
        print("demo photos")
        run([PY, os.path.join(HERE, "make_demo_photos.py")])
    print("analysis")
    run([PY, os.path.join(SKILL, "analyze.py"), "--photos", PHOTOS,
         "--out", os.path.join(DECKS, "analysis.json")])
    print("renders")
    for name in ("templates-1", "templates-2", "presets"):
        render(name)
    print("overviews")
    compose(slides_in(os.path.join(RENDERS, "templates-1")) + slides_in(os.path.join(RENDERS, "templates-2")),
            os.path.join(RENDERS, "templates.png"), cols=8)
    presets = json.load(open(os.path.join(DECKS, "presets.json"), encoding="utf-8"))
    compose(slides_in(os.path.join(RENDERS, "presets")), os.path.join(RENDERS, "presets.png"), cols=5,
            labels=[s.get("preset", "") for s in presets["slides"]], w=270, h=480)
    print("done")


if __name__ == "__main__":
    main()
