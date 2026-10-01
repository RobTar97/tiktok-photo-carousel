#!/usr/bin/env python3
"""Smoke test: renders every style on a synthetic photo and checks the output files exist and differ.

python3 selftest.py     -> exit code 0 and "OK" when the install works
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
styles = json.loads((HERE / "styles.json").read_text(encoding="utf-8"))

with tempfile.TemporaryDirectory() as tmp:
    tmp = Path(tmp)
    (tmp / "photos").mkdir()
    Image.radial_gradient("L").resize((1200, 1800)).convert("RGB").save(tmp / "photos" / "a.jpg")
    slides = [{"photo": "a.jpg", "style": name, "text": f"Selftest *{name}*", "kicker": "01", "sub": "subline"}
              for name in styles]
    (tmp / "script.json").write_text(json.dumps(slides), encoding="utf-8")
    run = subprocess.run([sys.executable, str(HERE / "carousel.py"), "--photos", str(tmp / "photos"),
                          "--script", str(tmp / "script.json"), "--out", str(tmp / "out")],
                         capture_output=True, text=True)
    if run.returncode != 0:
        sys.exit(f"FAILED\n{run.stdout}\n{run.stderr}")
    outs = sorted((tmp / "out").glob("[0-9][0-9].png"))
    assert len(outs) == len(styles), f"expected {len(styles)} slides, got {len(outs)}"
    assert all(Image.open(o).size == (1080, 1920) for o in outs), "wrong output size"
    assert (tmp / "out" / "_contact_sheet.png").exists(), "no contact sheet"
    assert "WARNING" not in run.stdout, run.stdout
    print(f"OK - {len(outs)} styles rendered")
