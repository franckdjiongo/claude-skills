#!/usr/bin/env python3
"""Crop and upscale a region of a screenshot so its text becomes legible.

Why this exists: app screenshots are often captured at full resolution
(1440x900, 1920x1080, retina 2x...). At that size, a multimodal read of the
whole image renders small UI text (employee names, totals, button labels,
error messages, status badges) illegibly. Cropping the region of interest and
upscaling it 2-3x makes those exact strings readable, which is essential when
you must transcribe what the UI *actually* says rather than trust a
voice-dictated prompt.

Coordinates can be given in absolute pixels or as fractions of width/height
(0..1), which is handy when you don't know the exact resolution yet.

Examples
--------
# Read the modal in the center, absolute pixels, 2x:
python zoom_crop.py --src shot.png --box 620 320 1320 650 --scale 2 --out modal.png

# Read the footer (bottom 10% strip) using fractions:
python zoom_crop.py --src shot.png --frac 0 0.9 1 1 --scale 2 --out footer.png

# Just upscale the whole image 2x to skim it:
python zoom_crop.py --src shot.png --scale 2 --out whole.png

Tip: run --info first to print the image size, then pick a box.
"""
import argparse
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required: pip install pillow --break-system-packages")


def main():
    p = argparse.ArgumentParser(description="Crop + upscale a screenshot region.")
    p.add_argument("--src", required=True, help="source image path")
    p.add_argument("--out", help="output image path (required unless --info)")
    p.add_argument("--box", nargs=4, type=int, metavar=("X1", "Y1", "X2", "Y2"),
                   help="crop box in absolute pixels")
    p.add_argument("--frac", nargs=4, type=float, metavar=("X1", "Y1", "X2", "Y2"),
                   help="crop box as fractions of width/height (0..1)")
    p.add_argument("--scale", type=float, default=2.0, help="upscale factor (default 2)")
    p.add_argument("--info", action="store_true", help="print image size and exit")
    args = p.parse_args()

    im = Image.open(args.src).convert("RGB")
    w, h = im.size
    if args.info:
        print(f"{args.src}: {w}x{h}")
        return

    if not args.out:
        p.error("--out is required unless --info is set")

    if args.frac:
        x1, y1, x2, y2 = args.frac
        box = (int(x1 * w), int(y1 * h), int(x2 * w), int(y2 * h))
    elif args.box:
        box = tuple(args.box)
    else:
        box = (0, 0, w, h)

    crop = im.crop(box)
    if args.scale != 1.0:
        crop = crop.resize(
            (max(1, int(crop.width * args.scale)), max(1, int(crop.height * args.scale))),
            Image.LANCZOS,
        )
    crop.save(args.out)
    print(f"saved {args.out} ({crop.width}x{crop.height}) from box {box} of {w}x{h}")


if __name__ == "__main__":
    main()
