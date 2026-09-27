#!/usr/bin/env python3
"""Comparison sheets for the direction document (needs Pillow: pip install pillow).

  python3 tools/sheets.py
    mockups/<scene>/compare.png   v1 and the three candidates, half size, labelled, colours on screen
    mockups/<scene>/zoom.png      the same crop from each at 2x (nearest), where the glyphs show
    mockups/compare/v1-retina-softening.png   v1's canvas as a 2x screen shows it (needs capture-v1)
    mockups/compare/c-rays-2x6-vs-2x4-*.png   candidate C at 2x6 vs 2x4 rays per cell (needs render-mockups c6)
    tools/frames/colour-counts.json
"""
import json, os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
def font(size):
    for f in ['/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', '/System/Library/Fonts/Menlo.ttc']:
        if os.path.exists(f): return ImageFont.truetype(f, size)
    return ImageFont.load_default()
F, SMALL = font(18), font(14)
INK, TEXT = (14, 16, 22), (230, 226, 214)
LABELS = {'v1': 'v1 (today)', 'a': 'A  Chroma blocks', 'b': 'B  Ink & paper', 'c': 'C  Semantic mosaic'}
ZOOM = {'vista': (360, 560, 700, 760), 'road': (500, 420, 800, 620), 'fire': (700, 560, 1000, 760)}
scenes = [s['name'] for s in json.load(open('tools/scenes.json'))['scenes']]
os.makedirs('mockups/compare', exist_ok=True)
counts = {}
for n in scenes:
    ims = {k: Image.open(f'mockups/{n}/{k}.png').convert('RGB') for k in LABELS}
    counts[n] = {k: len(set(im.getdata())) for k, im in ims.items()}
    W, H, pad, top = 720, 450, 8, 30
    sheet = Image.new('RGB', (W * 2 + pad * 3, (H + top) * 2 + pad * 3), INK); d = ImageDraw.Draw(sheet)
    for i, k in enumerate(LABELS):
        x, y = pad + (i % 2) * (W + pad), pad + (i // 2) * (H + top + pad)
        d.text((x, y + 4), f'{LABELS[k]}   ·   {counts[n][k]} colours on screen', fill=TEXT, font=F)
        sheet.paste(ims[k].resize((W, H), Image.LANCZOS), (x, y + top))
    sheet.save(f'mockups/{n}/compare.png')
    x0, y0, x1, y1 = ZOOM[n]; zw, zh = (x1 - x0) * 2, (y1 - y0) * 2
    zs = Image.new('RGB', (zw * 2 + pad * 3, (zh + top) * 2 + pad * 3), INK); d = ImageDraw.Draw(zs)
    for i, k in enumerate(LABELS):
        x, y = pad + (i % 2) * (zw + pad), pad + (i // 2) * (zh + top + pad)
        d.text((x, y + 4), f'{LABELS[k]}   ·   2x zoom', fill=TEXT, font=F)
        zs.paste(ims[k].crop(ZOOM[n]).resize((zw, zh), Image.NEAREST), (x, y + top))
    zs.save(f'mockups/{n}/zoom.png')
json.dump(counts, open('tools/frames/colour-counts.json', 'w'), indent=1)
print(json.dumps(counts))

if os.path.exists('tools/frames/road/v1-dpr2.png'):
    a, b = Image.open('mockups/road/v1.png').convert('RGB'), Image.open('tools/frames/road/v1-dpr2.png').convert('RGB')
    x0, y0, w, h = 560, 500, 160, 110
    o = Image.new('RGB', (w * 8 + 16, h * 4 + 34), INK); d = ImageDraw.Draw(o)
    d.text((4, 6), 'v1 as rendered (1 CSS px = 1 px)', fill=TEXT, font=SMALL)
    d.text((w * 4 + 16, 6), 'v1 on a 2x Retina screen (the browser upscales the canvas)', fill=TEXT, font=SMALL)
    o.paste(a.crop((x0, y0, x0 + w, y0 + h)).resize((w * 4, h * 4), Image.NEAREST), (0, 34))
    o.paste(b.crop((x0 * 2, y0 * 2, (x0 + w) * 2, (y0 + h) * 2)).resize((w * 4, h * 4), Image.NEAREST), (w * 4 + 16, 34))
    o.save('mockups/compare/v1-retina-softening.png')

for scene, box, name in [('road', (640, 130, 960, 330), 'tree'), ('vista', (360, 560, 700, 760), 'castle')]:
    c6 = f'tools/frames/{scene}/c6.png'
    if not os.path.exists(c6): continue
    a, b = Image.open(c6).convert('RGB').crop(box), Image.open(f'mockups/{scene}/c.png').convert('RGB').crop(box)
    w, h = a.size
    o = Image.new('RGB', (w * 4 + 12, h * 2 + 30), INK); d = ImageDraw.Draw(o)
    d.text((4, 6), 'C with 2x6 rays per cell', fill=TEXT, font=SMALL); d.text((w * 2 + 16, 6), 'C with 2x4 rays per cell (chosen)', fill=TEXT, font=SMALL)
    o.paste(a.resize((w * 2, h * 2), Image.NEAREST), (0, 30)); o.paste(b.resize((w * 2, h * 2), Image.NEAREST), (w * 2 + 12, 30))
    o.save(f'mockups/compare/c-rays-2x6-vs-2x4-{name}.png')
