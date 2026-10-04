#!/usr/bin/env python3
"""Pull the best still frames out of video clips - no AI, just ffmpeg.

For each clip it samples a few frames a second, scores every one for
sharpness and exposure, drops near-duplicates, spreads the picks across the
clip, then extracts the winners at full resolution. Phone HDR (HLG / PQ) is
tone-mapped to SDR, so frames do not come out washed-out grey.

Usage:
    python scripts/frames.py --video clip.mov --out ./photos
    python scripts/frames.py --videos ./clips --out ./photos --count 8

Then run analyze.py on --out like any other photo folder.

Options:
    --count N      frames to keep per clip (default 8)
    --min-gap S    minimum seconds between picks (default: spread evenly)
    --max PX       long edge of the extracted frames (default 2160)
    --format       jpg | png (default jpg)

Needs ffmpeg and ffprobe on PATH:
    Windows: winget install Gyan.FFmpeg     macOS: brew install ffmpeg
    Linux:   apt install ffmpeg
"""
import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile

try:
    from PIL import Image, ImageFilter, ImageStat
except ImportError:
    sys.exit("Pillow is required: pip install -r requirements.txt")

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

VIDEO_EXT = (".mp4", ".mov", ".m4v", ".mkv", ".webm", ".avi", ".mts", ".3gp")
LAPLACE = ImageFilter.Kernel((3, 3), [0, 1, 0, 1, -4, 1, 0, 1, 0], scale=1, offset=128)


def need(tool):
    if not shutil.which(tool):
        sys.exit("%s not found. Install ffmpeg:\n"
                 "  Windows: winget install Gyan.FFmpeg\n"
                 "  macOS:   brew install ffmpeg\n"
                 "  Linux:   apt install ffmpeg" % tool)


def probe(path):
    """Duration and whether the stream is HDR."""
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=color_transfer,color_primaries,width,height:format=duration",
         "-of", "json", path],
        capture_output=True, text=True, encoding="utf-8", errors="replace")
    if out.returncode != 0:
        raise RuntimeError(out.stderr.strip() or "ffprobe failed")
    info = json.loads(out.stdout or "{}")
    st = (info.get("streams") or [{}])[0]
    dur = float((info.get("format") or {}).get("duration") or 0)
    hdr = st.get("color_transfer") in ("arib-std-b67", "smpte2084")
    return dur, hdr


def tonemap_chain(hdr):
    """HLG/PQ -> SDR BT.709. Without it a phone's HDR clip extracts as flat
    grey, because the PNG/JPEG has no way to say 'this is HDR'."""
    if not hdr:
        return ""
    return ("zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,"
            "tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p,")


def score(img):
    """Sharpness (Laplacian spread) scaled by how well exposed the frame is."""
    g = img.convert("L")
    sharp = ImageStat.Stat(g.filter(LAPLACE)).stddev[0]
    st = ImageStat.Stat(g)
    mean, spread = st.mean[0], st.stddev[0]
    exposure = 1.0
    if mean < 45:
        exposure = max(0.15, mean / 45)                  # crushed shadows
    elif mean > 215:
        exposure = max(0.15, (255 - mean) / 40)          # blown highlights
    flat = min(1.0, spread / 38)                         # fog, a lens cap, a wall
    return sharp * exposure * (0.4 + 0.6 * flat), sharp, mean


def dhash(img):
    g = img.convert("L").resize((9, 8), Image.LANCZOS)
    px = list(g.tobytes())
    bits = 0
    for y in range(8):
        for x in range(8):
            bits = (bits << 1) | (px[y * 9 + x] > px[y * 9 + x + 1])
    return bits


def hamming(a, b):
    return bin(a ^ b).count("1")


def pick(video, out_dir, count, min_gap, max_px, fmt):
    dur, hdr = probe(video)
    if dur <= 0:
        print("  SKIP %s (no duration)" % os.path.basename(video))
        return []
    stem = os.path.splitext(os.path.basename(video))[0]
    # A few candidates a second, capped so a long clip stays quick.
    rate = min(4.0, 360.0 / dur)
    tmp = tempfile.mkdtemp(prefix="frames_")
    try:
        cmd = ["ffmpeg", "-v", "error", "-i", video, "-vf",
               tonemap_chain(hdr) + "fps=%.4f,scale=360:-2" % rate,
               "-q:v", "4", os.path.join(tmp, "c_%05d.jpg")]
        r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
        if r.returncode != 0:
            print("  SKIP %s (%s)" % (os.path.basename(video), r.stderr.strip()[:200]))
            return []
        cands = []
        for f in sorted(os.listdir(tmp)):
            n = int(f[2:7])
            t = (n - 1) / rate + 0.5 / rate
            with Image.open(os.path.join(tmp, f)) as im:
                im.load()
                sc, sharp, mean = score(im)
                cands.append({"t": round(min(t, dur - 0.05), 2), "score": sc, "sharp": sharp,
                              "luma": mean, "hash": dhash(im)})
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    if not cands:
        return []
    gap = min_gap if min_gap is not None else max(0.6, dur / (count * 1.6))
    best = sorted(cands, key=lambda c: -c["score"])
    floor = best[0]["score"] * 0.25          # never keep a frame 4x worse than the best
    chosen = []
    for c in best:
        if len(chosen) >= count or c["score"] < floor:
            break
        if any(abs(c["t"] - k["t"]) < gap for k in chosen):
            continue
        if any(hamming(c["hash"], k["hash"]) < 10 for k in chosen):
            continue                          # the same shot, a moment later
        chosen.append(c)
    chosen.sort(key=lambda c: c["t"])

    saved = []
    for c in chosen:
        name = "%s_t%06.2f.%s" % (stem, c["t"], fmt)
        dest = os.path.join(out_dir, name)
        vf = tonemap_chain(hdr) + ("scale='if(gt(iw,ih),min(%d,iw),-2)':'if(gt(iw,ih),-2,min(%d,ih))'" % (max_px, max_px))
        cmd = ["ffmpeg", "-v", "error", "-y", "-ss", "%.3f" % c["t"], "-i", video,
               "-frames:v", "1", "-vf", vf]
        cmd += (["-q:v", "2"] if fmt == "jpg" else [])
        cmd.append(dest)
        r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
        if r.returncode == 0 and os.path.exists(dest):
            saved.append({"file": name, "video": os.path.basename(video), "t": c["t"],
                          "score": round(c["score"], 1), "sharpness": round(c["sharp"], 1),
                          "luma": round(c["luma"], 1), "hdr": hdr})
    print("  %-40s %5.1fs  %s%d candidates -> %d frames" %
          (os.path.basename(video)[:40], dur, "HDR->SDR  " if hdr else "", len(cands), len(saved)))
    return saved


def contact(out_dir, rows):
    if not rows:
        return
    from PIL import ImageDraw
    cols, cw, ch = 4, 270, 480
    n = len(rows)
    sheet = Image.new("RGB", (cols * cw, ((n + cols - 1) // cols) * (ch + 26)), (14, 14, 16))
    d = ImageDraw.Draw(sheet)
    for i, r in enumerate(rows):
        with Image.open(os.path.join(out_dir, r["file"])) as im:
            im = im.convert("RGB")
            im.thumbnail((cw - 8, ch - 8))
            x, y = (i % cols) * cw, (i // cols) * (ch + 26)
            sheet.paste(im, (x + 4, y + 4))
            d.text((x + 6, y + ch + 6), "%s  %.1fs  sharp %d" % (r["video"][:18], r["t"], r["sharpness"]),
                   fill=(220, 220, 220))
    sheet.save(os.path.join(out_dir, "_frames.png"))


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--video", action="append", default=[], help="a clip (repeatable)")
    ap.add_argument("--videos", help="a folder of clips")
    ap.add_argument("--out", required=True, help="where the frames go - usually the photos folder")
    ap.add_argument("--count", type=int, default=8)
    ap.add_argument("--min-gap", type=float, default=None)
    ap.add_argument("--max", type=int, default=2160)
    ap.add_argument("--format", choices=["jpg", "png"], default="jpg")
    a = ap.parse_args()

    need("ffmpeg"); need("ffprobe")
    clips = list(a.video)
    if a.videos:
        if not os.path.isdir(a.videos):
            sys.exit("No such folder: " + a.videos)
        clips += [os.path.join(a.videos, f) for f in sorted(os.listdir(a.videos))
                  if f.lower().endswith(VIDEO_EXT)]
    if not clips:
        sys.exit("No clips given. Use --video FILE or --videos FOLDER.")
    os.makedirs(a.out, exist_ok=True)

    rows = []
    for c in clips:
        try:
            rows += pick(c, a.out, a.count, a.min_gap, a.max, a.format)
        except Exception as e:                       # one bad clip must not stop the rest
            print("  SKIP %s (%s)" % (os.path.basename(c), e))

    log = os.path.join(a.out, "_frames.json")
    with open(log, "w", encoding="utf-8") as fh:
        json.dump(rows, fh, indent=1, ensure_ascii=False)
    contact(a.out, rows)
    print("\n%d frame(s) -> %s" % (len(rows), a.out))
    if rows:
        print("contact sheet: %s" % os.path.join(a.out, "_frames.png"))
        print("next: python scripts/analyze.py --photos %s --out <work>/analysis.json --resize <work>/photos" % a.out)


if __name__ == "__main__":
    main()
