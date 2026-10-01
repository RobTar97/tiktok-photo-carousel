#!/usr/bin/env python3
"""Generate three synthetic demo "photos" (gradients + shapes) so the examples need no copyrighted images.

python3 make_demo_photos.py   ->  writes examples/photos/{sunset,hallway,sea}.jpg
"""
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parent / "photos"
W, H = 1600, 2400  # 2:3 portrait, like a phone/DSLR frame


def vertical_gradient(stops):
    img = Image.new("RGB", (W, H))
    px = img.load()
    for y in range(H):
        t = y / (H - 1)
        for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
            if t0 <= t <= t1:
                k = (t - t0) / (t1 - t0)
                c = tuple(round(a + (b - a) * k) for a, b in zip(c0, c1))
                break
        for x in range(W):
            px[x, y] = c
    return img


def sunset():
    img = vertical_gradient([(0, (40, 50, 90)), (0.45, (240, 150, 80)), (0.62, (255, 215, 130)),
                             (0.63, (30, 60, 90)), (1, (10, 25, 45))])
    glow = Image.new("RGB", (W, H), (0, 0, 0))
    ImageDraw.Draw(glow).ellipse((W / 2 - 220, H * 0.58 - 220, W / 2 + 220, H * 0.58 + 220), fill=(255, 240, 200))
    glow = glow.filter(ImageFilter.GaussianBlur(90))
    return Image.blend(img, Image.composite(glow, img, glow.convert("L")), 0.8)


def hallway():
    img = Image.new("RGB", (W, H), (225, 228, 232))
    d = ImageDraw.Draw(img)
    vx, vy = W / 2, H * 0.45
    for i in range(0, 17):  # converging floor/ceiling/wall lines
        t = i / 16
        d.line((W * t, H, vx, vy), fill=(180, 186, 195), width=4)
        d.line((W * t, 0, vx, vy), fill=(240, 242, 245), width=4)
    for k in range(1, 9):  # receding frames
        s = 1 - k / 9
        hw, hh = W * 0.5 * s, H * 0.42 * s
        d.rectangle((vx - hw, vy - hh, vx + hw, vy + hh), outline=(120, 140, 200), width=max(2, int(14 * s)))
    return img.filter(ImageFilter.GaussianBlur(2))


def sea():
    img = vertical_gradient([(0, (130, 180, 235)), (0.5, (205, 228, 250)), (0.51, (60, 120, 170)), (1, (20, 60, 100))])
    d = ImageDraw.Draw(img)
    for i in range(40):  # gentle wave strokes
        y = H * 0.55 + i * 38
        d.line([(x, y + 8 * math.sin(x / 80 + i)) for x in range(0, W, 20)], fill=(255, 255, 255), width=2)
    return img


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    for name, fn in [("sunset", sunset), ("hallway", hallway), ("sea", sea)]:
        fn().save(OUT / f"{name}.jpg", quality=90)
        print("wrote", OUT / f"{name}.jpg")
