#!/usr/bin/env python3
"""Generate every piece of artwork used by Castle of Questions.

All images are drawn procedurally with Pillow and NumPy: no external
image files are read. Run it again with a different --seed to get a
fresh set of paintings.

    python art/generate_art.py                # writes into docs/assets
    python art/generate_art.py out_dir --seed 7
"""
import argparse
import math
import os
import random

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

W, H = 800, 520                       # room view size (matches the game's SVG viewBox)
BACK = (200, 100, 600, 400)           # back wall rectangle
LEFT = [(0, 0), (200, 100), (200, 400), (0, 520)]
RIGHT = [(600, 100), (800, 0), (800, 520), (600, 400)]
FLOOR = [(200, 400), (600, 400), (800, 520), (0, 520)]
CEIL = [(0, 0), (800, 0), (600, 100), (200, 100)]


# ---------------------------------------------------------------- helpers
def value_noise(w, h, scale, rng, octaves=4):
    """Smooth fractal noise in [0,1], shape (h, w)."""
    out = np.zeros((h, w))
    amp, total = 1.0, 0.0
    for o in range(octaves):
        s = max(1, int(scale / (2 ** o)))
        gw, gh = w // s + 2, h // s + 2
        g = (rng.random((gh, gw)) * 255).astype(np.uint8)
        layer = Image.fromarray(g).resize((gw * s, gh * s), Image.BICUBIC).crop((0, 0, w, h))
        out += np.asarray(layer, float) / 255 * amp
        total += amp
        amp *= 0.5
    return out / total


def to_img(arr):
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


def tint(rgb, f):
    return tuple(int(max(0, min(255, c * f))) for c in rgb)


def persp_coeffs(dst, src):
    """Coefficients mapping output quad `dst` to source quad `src` for Image.PERSPECTIVE."""
    a, b = [], []
    for (x, y), (X, Y) in zip(dst, src):
        a.append([x, y, 1, 0, 0, 0, -X * x, -X * y])
        a.append([0, 0, 0, x, y, 1, -Y * x, -Y * y])
        b += [X, Y]
    return np.linalg.solve(np.array(a, float), np.array(b, float)).tolist()


def warp_onto(canvas, tex, quad, shade=None):
    """Paste texture `tex` into polygon `quad` (TL, TR, BR, BL) with perspective."""
    tw, th = tex.size
    c = persp_coeffs(quad, [(0, 0), (tw, 0), (tw, th), (0, th)])
    warped = tex.convert("RGB").transform(canvas.size, Image.PERSPECTIVE, c, Image.BICUBIC)
    if shade is not None:
        warped = Image.fromarray((np.asarray(warped, float) * shade[..., None]).clip(0, 255).astype(np.uint8))
    mask = Image.new("L", canvas.size, 0)
    ImageDraw.Draw(mask).polygon(quad, fill=255)
    canvas.paste(warped, (0, 0), mask)


# ---------------------------------------------------------------- textures
def tex_bricks(w, h, base, mortar, bw, bh, rng, jitter=0.18):
    arr = np.zeros((h, w, 3))
    n = value_noise(w, h, 24, rng)
    for row in range(h // bh + 1):
        off = (bw // 2) if row % 2 else 0
        for col in range(-1, w // bw + 2):
            f = 1 + rng.uniform(-jitter, jitter)
            x0, y0 = col * bw + off, row * bh
            arr[y0:y0 + bh, max(0, x0):max(0, x0 + bw)] = tint(base, f)
    arr *= (0.8 + 0.4 * n)[..., None]
    ys, xs = np.mgrid[0:h, 0:w]
    row = ys // bh
    off = np.where(row % 2 == 1, bw // 2, 0)
    is_m = ((ys % bh) < 3) | (((xs - off) % bw) < 3)
    arr[is_m] = mortar
    return to_img(arr)


def tex_planks(w, h, base, rng, plank=40, vertical=False):
    if vertical:
        w, h = h, w
    ys, xs = np.mgrid[0:h, 0:w]
    n = value_noise(w, h, 60, rng)
    grain = np.sin(xs / 7.0 + n * 18) * 0.5 + 0.5
    arr = np.ones((h, w, 3)) * np.array(base, float)
    shade = np.ones((h, w))
    for i in range(h // plank + 1):
        shade[i * plank:(i + 1) * plank] *= 1 + rng.uniform(-0.15, 0.15)
    arr *= (0.78 + 0.3 * grain * 0.6 + 0.12 * n)[..., None] * shade[..., None]
    arr[(ys % plank) < 2] *= 0.35
    img = to_img(arr)
    return img.rotate(90, expand=True) if vertical else img


def tex_tiles(w, h, c1, c2, size, rng):
    ys, xs = np.mgrid[0:h, 0:w]
    check = ((xs // size + ys // size) % 2).astype(bool)
    arr = np.where(check[..., None], np.array(c1, float), np.array(c2, float))
    n = value_noise(w, h, 30, rng)
    arr *= (0.85 + 0.3 * n)[..., None]
    arr[((xs % size) < 2) | ((ys % size) < 2)] *= 0.5
    return to_img(arr)


def tex_damask(w, h, base, accent, rng, cell=48):
    img = Image.new("RGB", (w, h), base)
    d = ImageDraw.Draw(img)
    for y in range(-cell, h + cell, cell):
        for x in range(-cell, w + cell, cell):
            ox = cell // 2 if (y // cell) % 2 else 0
            cx, cy = x + ox, y
            s = cell * 0.32
            d.polygon([(cx, cy - s), (cx + s * 0.6, cy), (cx, cy + s), (cx - s * 0.6, cy)], fill=accent)
            d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=tint(accent, 1.25))
    for x in range(0, w, cell * 3):
        d.rectangle([x, 0, x + 3, h], fill=tint(base, 0.7))
    arr = np.asarray(img, float) * (0.82 + 0.3 * value_noise(w, h, 40, rng))[..., None]
    return to_img(arr)


def tex_shelves(w, h, rng):
    img = Image.new("RGB", (w, h), (52, 34, 20))
    d = ImageDraw.Draw(img)
    palette = [(122, 32, 30), (34, 70, 46), (30, 44, 90), (140, 104, 42), (90, 50, 80), (70, 46, 28), (150, 140, 120)]
    shelf_h = 60
    for y in range(0, h, shelf_h):
        x = 4
        while x < w - 4:
            bw = rng.integers(8, 20)
            bh = rng.integers(int(shelf_h * 0.55), shelf_h - 8)
            col = palette[rng.integers(len(palette))]
            col = tint(col, rng.uniform(0.75, 1.2))
            d.rectangle([x, y + shelf_h - 6 - bh, x + bw - 2, y + shelf_h - 6], fill=col)
            d.line([x + 2, y + shelf_h - 6 - bh + 6, x + bw - 4, y + shelf_h - 6 - bh + 6], fill=tint(col, 1.5), width=2)
            x += bw
            if rng.random() < 0.06:
                x += rng.integers(10, 30)
        d.rectangle([0, y + shelf_h - 6, w, y + shelf_h], fill=(92, 60, 32))
    for x in (0, w - 8):
        d.rectangle([x, 0, x + 8, h], fill=(92, 60, 32))
    return img


def tex_beams(w, h, rng):
    img = tex_planks(w, h, (60, 42, 28), rng, plank=30)
    d = ImageDraw.Draw(img)
    for x in range(0, w, 110):
        d.rectangle([x, 0, x + 26, h], fill=(40, 26, 16))
    return img


THEMES = {
    "stone":   dict(wall=lambda r: tex_bricks(400, 300, (108, 102, 94), (50, 46, 42), 64, 30, r),
                    side=lambda r: tex_bricks(400, 300, (98, 92, 86), (46, 42, 38), 64, 30, r),
                    floor=lambda r: tex_bricks(400, 300, (88, 78, 66), (40, 34, 28), 90, 60, r, 0.25),
                    ceil=lambda r: tex_beams(400, 300, r), rug=(110, 30, 30)),
    "timber":  dict(wall=lambda r: tex_planks(400, 300, (130, 84, 46), r, 36, vertical=True),
                    side=lambda r: tex_planks(400, 300, (118, 76, 42), r, 36, vertical=True),
                    floor=lambda r: tex_planks(400, 300, (104, 68, 38), r, 30),
                    ceil=lambda r: tex_beams(400, 300, r), rug=(36, 70, 90)),
    "library": dict(wall=lambda r: tex_bricks(400, 300, (120, 100, 80), (60, 48, 36), 56, 28, r),
                    side=lambda r: tex_shelves(400, 300, r),
                    floor=lambda r: tex_tiles(400, 300, (140, 120, 90), (60, 48, 36), 50, r),
                    ceil=lambda r: tex_beams(400, 300, r), rug=(40, 80, 50)),
    "royal":   dict(wall=lambda r: tex_damask(400, 300, (110, 24, 30), (196, 150, 60), r),
                    side=lambda r: tex_damask(400, 300, (96, 20, 26), (176, 132, 50), r),
                    floor=lambda r: tex_tiles(400, 300, (200, 192, 176), (40, 36, 34), 50, r),
                    ceil=lambda r: tex_beams(400, 300, r), rug=(130, 24, 32)),
    "throne":  dict(wall=lambda r: tex_damask(400, 300, (60, 26, 84), (200, 160, 70), r),
                    side=lambda r: tex_damask(400, 300, (52, 22, 74), (180, 140, 60), r),
                    floor=lambda r: tex_tiles(400, 300, (220, 210, 190), (120, 96, 40), 50, r),
                    ceil=lambda r: tex_beams(400, 300, r), rug=(150, 20, 36)),
}


def glow(canvas, cx, cy, radius, color, strength):
    layer = Image.new("RGB", canvas.size, (0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=color)
    layer = layer.filter(ImageFilter.GaussianBlur(radius * 0.55))
    arr = np.asarray(canvas, float) + np.asarray(layer, float) * strength
    return to_img(arr)


def torch(canvas, x, y):
    canvas = glow(canvas, x, y - 10, 90, (255, 170, 70), 0.55)
    d = ImageDraw.Draw(canvas)
    d.polygon([(x - 8, y), (x + 8, y), (x + 5, y + 34), (x - 5, y + 34)], fill=(50, 36, 22))
    d.rectangle([x - 12, y - 4, x + 12, y + 2], fill=(70, 52, 30))
    d.polygon([(x, y - 36), (x + 11, y - 8), (x, y - 2), (x - 11, y - 8)], fill=(255, 150, 40))
    d.polygon([(x, y - 24), (x + 6, y - 8), (x, y - 4), (x - 6, y - 8)], fill=(255, 236, 150))
    return canvas


def room(theme, seed):
    rng = np.random.default_rng(seed)
    t = THEMES[theme]
    img = Image.new("RGB", (W, H), (0, 0, 0))
    ys, xs = np.mgrid[0:H, 0:W]
    # side walls get darker toward the viewer
    left_shade = 0.45 + 0.55 * (xs / 200.0).clip(0, 1)
    right_shade = 0.45 + 0.55 * ((W - xs) / 200.0).clip(0, 1)
    floor_shade = 0.5 + 0.5 * ((H - ys) / 120.0).clip(0, 1)
    warp_onto(img, t["ceil"](rng), CEIL, shade=np.full((H, W), 0.45))
    warp_onto(img, t["floor"](rng), FLOOR, shade=floor_shade)
    warp_onto(img, t["side"](rng), LEFT, shade=left_shade)
    warp_onto(img, t["side"](rng), RIGHT, shade=right_shade)
    back = t["wall"](rng).resize((400, 300))
    img.paste(back, (200, 100))
    d = ImageDraw.Draw(img)
    # skirting and corner lines
    for a, b in [((200, 100), (200, 400)), ((600, 100), (600, 400)), ((200, 400), (600, 400)), ((200, 100), (600, 100))]:
        d.line([a, b], fill=(20, 16, 12), width=3)
    # rug in perspective
    rug = Image.new("RGB", (200, 120), t["rug"])
    rd = ImageDraw.Draw(rug)
    rd.rectangle([8, 8, 191, 111], outline=(200, 160, 70), width=4)
    rd.rectangle([20, 20, 179, 99], outline=tint(t["rug"], 1.5), width=2)
    rd.polygon([(100, 30), (150, 60), (100, 90), (50, 60)], outline=(200, 160, 70), width=3)
    warp_onto(img, rug, [(300, 418), (500, 418), (570, 500), (230, 500)])
    img = torch(img, 228, 190)
    img = torch(img, 572, 190)
    # vignette
    v = 1 - 0.55 * (((xs - W / 2) / (W / 2)) ** 2 + ((ys - H / 2) / (H / 1.6)) ** 2).clip(0, 1)
    return to_img(np.asarray(img, float) * v[..., None])


# ---------------------------------------------------------------- characters
def character(kind, rng):
    S = 2  # draw at 2x then downsample for smooth edges
    img = Image.new("RGBA", (240 * S, 320 * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    def P(pts):
        return [(x * S, y * S) for x, y in pts]

    def E(box, **kw):
        d.ellipse([v * S for v in box], **kw)

    E((50, 296, 190, 316), fill=(0, 0, 0, 90))  # shadow
    skin = (232, 190, 150)

    def body(robe, trim, beard=None, arms=True):
        dark = tint(robe, 0.7)
        d.polygon(P([(85, 150), (155, 150), (190, 304), (50, 304)]), fill=robe)
        d.polygon(P([(120, 150), (155, 150), (190, 304), (128, 304)]), fill=dark)
        d.rectangle([v * S for v in (70, 210, 170, 220)], fill=trim)
        if arms:
            d.polygon(P([(85, 155), (60, 230), (78, 238), (98, 180)]), fill=dark)
            d.polygon(P([(155, 155), (180, 230), (162, 238), (142, 180)]), fill=dark)
            E((58, 228, 80, 248), fill=skin)
            E((160, 228, 182, 248), fill=skin)
        E((88, 72, 152, 150), fill=skin)
        E((103, 102, 113, 114), fill=(40, 30, 24))
        E((127, 102, 137, 114), fill=(40, 30, 24))
        E((96, 116, 110, 126), fill=(240, 150, 140, 120))
        E((130, 116, 144, 126), fill=(240, 150, 140, 120))
        if beard:
            d.polygon(P([(92, 120), (148, 120), (136, 182), (120, 196), (104, 182)]), fill=beard)
        else:
            d.arc([v * S for v in (106, 118, 134, 136)], 20, 160, fill=(120, 50, 40), width=2 * S)

    if kind == "jester":
        body((150, 40, 60), (230, 200, 60))
        d.polygon(P([(120, 150), (155, 150), (190, 304), (120, 304)]), fill=(40, 90, 160))
        d.polygon(P([(88, 92), (152, 92), (190, 40), (150, 76), (120, 30), (90, 76), (50, 40)]), fill=(150, 40, 60))
        d.polygon(P([(120, 30), (150, 76), (190, 40), (152, 92), (120, 92)]), fill=(40, 90, 160))
        for x, y in [(50, 40), (190, 40), (120, 30)]:
            E((x - 7, y - 7, x + 7, y + 7), fill=(240, 210, 60))
        d.polygon(P([(85, 148), (155, 148), (145, 166), (130, 156), (120, 168), (110, 156), (95, 166)]), fill=(240, 210, 60))
    elif kind == "knight":
        body((140, 146, 156), (90, 30, 30))
        d.polygon(P([(100, 160), (140, 160), (140, 230), (120, 250), (100, 230)]), fill=(150, 30, 34))
        d.line(P([(120, 168), (120, 236)]), fill=(230, 200, 80), width=5 * S)
        d.line(P([(104, 196), (136, 196)]), fill=(230, 200, 80), width=5 * S)
        E((84, 66, 156, 154), fill=(170, 176, 186))
        d.rectangle([v * S for v in (92, 104, 148, 112)], fill=(30, 30, 36))
        d.polygon(P([(120, 66), (128, 40), (140, 30), (132, 62)]), fill=(200, 40, 50))
        d.line(P([(185, 120), (185, 300)]), fill=(120, 110, 100), width=4 * S)
        d.polygon(P([(185, 90), (193, 120), (177, 120)]), fill=(200, 200, 210))
    elif kind == "wizard":
        body((50, 50, 130), (220, 190, 80), beard=(230, 230, 236))
        d.polygon(P([(80, 92), (160, 92), (128, 4), (118, 6)]), fill=(50, 50, 130))
        d.rectangle([v * S for v in (76, 86, 164, 96)], fill=(40, 40, 110))
        for x, y in [(110, 50), (128, 70), (120, 30)]:
            d.polygon(P([(x, y - 6), (x + 2, y - 2), (x + 6, y), (x + 2, y + 2), (x, y + 6), (x - 2, y + 2), (x - 6, y), (x - 2, y - 2)]), fill=(250, 220, 90))
        d.line(P([(52, 90), (52, 300)]), fill=(110, 76, 40), width=5 * S)
        E((42, 76, 62, 96), fill=(120, 220, 255))
    elif kind == "monk":
        body((110, 82, 52), (60, 44, 28))
        d.polygon(P([(80, 140), (90, 74), (120, 56), (150, 74), (160, 140), (150, 100), (120, 80), (90, 100)]), fill=(96, 70, 44))
        d.rectangle([v * S for v in (100, 200, 140, 230)], fill=(150, 30, 30))
        d.line(P([(102, 214), (138, 214)]), fill=(230, 200, 80), width=2 * S)
    elif kind == "cook":
        body((236, 232, 222), (180, 60, 50))
        E((86, 30, 154, 80), fill=(250, 250, 250))
        E((96, 18, 144, 60), fill=(250, 250, 250))
        d.rectangle([v * S for v in (92, 66, 148, 84)], fill=(240, 240, 240))
        d.ellipse([v * S for v in (160, 210, 210, 236)], fill=(90, 90, 96))
        d.line(P([(110, 128), (130, 128)]), fill=(80, 50, 30), width=4 * S)
    elif kind == "bard":
        body((40, 120, 90), (220, 180, 60))
        d.polygon(P([(84, 84), (156, 84), (150, 62), (92, 60)]), fill=(150, 40, 40))
        d.polygon(P([(140, 64), (190, 20), (170, 66)]), fill=(240, 240, 220))
        E((150, 186, 200, 246), fill=(170, 110, 50))
        E((164, 204, 180, 220), fill=(60, 36, 20))
        d.line(P([(175, 190), (210, 140)]), fill=(120, 76, 36), width=6 * S)
    elif kind == "lady":
        body((120, 60, 140), (230, 200, 120), arms=True)
        d.polygon(P([(80, 304), (60, 304), (90, 150)]), fill=(120, 60, 140))
        d.polygon(P([(98, 76), (142, 76), (124, 4), (116, 4)]), fill=(240, 180, 200))
        d.polygon(P([(124, 4), (190, 120), (180, 126), (126, 14)]), fill=(255, 240, 250, 150))
        E((112, 136, 128, 150), fill=(240, 220, 120))
    elif kind == "alchemist":
        body((70, 90, 60), (160, 120, 60), beard=(110, 80, 50))
        d.polygon(P([(88, 90), (152, 90), (148, 64), (92, 64)]), fill=(60, 50, 40))
        E((96, 100, 116, 118), outline=(200, 200, 200), width=2 * S)
        E((124, 100, 144, 118), outline=(200, 200, 200), width=2 * S)
        E((158, 200, 196, 240), fill=(90, 200, 120))
        d.rectangle([v * S for v in (170, 180, 184, 204)], fill=(180, 230, 200))
    elif kind == "parrot":
        d.line(P([(40, 240), (200, 240)]), fill=(110, 76, 40), width=8 * S)
        d.line(P([(120, 240), (120, 304)]), fill=(90, 60, 30), width=8 * S)
        E((80, 120, 160, 236), fill=(220, 40, 40))
        d.polygon(P([(110, 210), (140, 210), (150, 300), (100, 300)]), fill=(40, 90, 200))
        E((90, 70, 150, 130), fill=(220, 40, 40))
        E((96, 150, 156, 220), fill=(240, 200, 40))
        d.polygon(P([(140, 90), (170, 100), (150, 120)]), fill=(240, 230, 210))
        E((122, 86, 136, 100), fill=(255, 255, 255))
        E((126, 90, 133, 97), fill=(0, 0, 0))
    elif kind == "owl":
        d.line(P([(40, 270), (200, 270)]), fill=(110, 76, 40), width=8 * S)
        E((70, 100, 170, 270), fill=(130, 100, 70))
        E((88, 150, 152, 262), fill=(200, 176, 140))
        d.polygon(P([(70, 120), (82, 70), (100, 106)]), fill=(130, 100, 70))
        d.polygon(P([(170, 120), (158, 70), (140, 106)]), fill=(130, 100, 70))
        for cx in (100, 140):
            E((cx - 20, 100, cx + 20, 140), fill=(250, 220, 120))
            E((cx - 9, 111, cx + 9, 129), fill=(20, 20, 20))
        d.polygon(P([(114, 136), (126, 136), (120, 152)]), fill=(220, 160, 50))
    elif kind == "cat":
        E((70, 170, 170, 300), fill=(120, 116, 112))
        E((80, 110, 160, 190), fill=(120, 116, 112))
        d.polygon(P([(82, 140), (86, 92), (110, 122)]), fill=(120, 116, 112))
        d.polygon(P([(158, 140), (154, 92), (130, 122)]), fill=(120, 116, 112))
        for cx in (104, 136):
            E((cx - 9, 138, cx + 9, 154), fill=(140, 220, 90))
            d.line(P([(cx, 140), (cx, 152)]), fill=(0, 0, 0), width=3 * S)
        d.polygon(P([(116, 160), (124, 160), (120, 166)]), fill=(230, 150, 160))
        d.line(P([(170, 280), (200, 230), (196, 200)]), fill=(120, 116, 112), width=12 * S, joint="curve")
    elif kind == "merchant":
        body((150, 96, 40), (90, 40, 110), beard=(70, 50, 36))
        d.polygon(P([(84, 96), (156, 96), (150, 62), (120, 48), (90, 62)]), fill=(90, 40, 110))
        d.rectangle([v * S for v in (82, 88, 158, 100)], fill=(230, 190, 70))
        E((112, 52, 128, 68), fill=(200, 40, 60))
        E((20, 220, 82, 292), fill=(170, 140, 90))
        d.polygon(P([(36, 224), (66, 224), (60, 206), (42, 206)]), fill=(150, 120, 76))
        d.line(P([(34, 214), (68, 214)]), fill=(90, 60, 30), width=3 * S)
        for x, y in [(168, 262), (180, 270), (174, 252), (190, 258)]:
            E((x - 8, y - 5, x + 8, y + 5), fill=(240, 200, 70), outline=(150, 110, 30))
    elif kind == "trickster":
        body((70, 30, 90), (60, 170, 90))
        d.polygon(P([(120, 150), (155, 150), (190, 304), (120, 304)]), fill=(40, 120, 70))
        for i in range(4):                                       # harlequin diamonds
            y = 170 + i * 32
            d.polygon(P([(120, y), (132, y + 16), (120, y + 32), (108, y + 16)]), fill=(230, 190, 60) if i % 2 else (20, 14, 24))
        d.polygon(P([(76, 160), (84, 70), (120, 40), (156, 70), (164, 160), (148, 150), (146, 90), (94, 90), (92, 150)]), fill=(50, 20, 66))  # hood
        d.polygon(P([(94, 98), (146, 98), (150, 116), (132, 122), (120, 114), (108, 122), (90, 116)]), fill=(20, 14, 24))  # mask
        for cx in (108, 132):
            E((cx - 5, 104, cx + 5, 112), fill=(250, 220, 80))
        d.arc([v * S for v in (100, 116, 140, 142)], 15, 165, fill=(40, 20, 30), width=3 * S)   # wide grin
        d.polygon(P([(118, 40), (150, 6), (140, 30), (166, 22)]), fill=(60, 170, 90))
        E((160, 16, 172, 28), fill=(230, 190, 60))
        for i, (x, y) in enumerate([(176, 200), (190, 176), (204, 196)]):   # juggled orbs
            E((x - 8, y - 8, x + 8, y + 8), fill=[(220, 60, 60), (80, 160, 230), (240, 210, 70)][i])
    elif kind == "sphinx":
        sand, shade, gold, blue = (214, 170, 100), (176, 132, 70), (232, 194, 76), (40, 70, 150)
        for sx in (1, -1):   # wings fanning up behind
            cx = 120
            for i in range(5):
                tip = (cx + sx * (70 + i * 6), 40 + i * 26)
                d.polygon(P([(cx + sx * 20, 160), tip, (cx + sx * (62 + i * 6), 70 + i * 26)]),
                          fill=tint(gold, 0.75 + i * 0.05) if i % 2 else (190, 150, 70))
        E((44, 230, 196, 306), fill=shade)                       # haunches
        d.polygon(P([(86, 150), (154, 150), (170, 300), (70, 300)]), fill=sand)  # chest
        for x in (82, 132):                                      # front legs and paws
            d.rectangle([v * S for v in (x, 220, x + 26, 300)], fill=sand, outline=shade, width=2 * S)
            E((x - 6, 288, x + 32, 308), fill=shade)
        d.line(P([(196, 290), (220, 250), (214, 226)]), fill=shade, width=8 * S, joint="curve")
        E((206, 216, 222, 234), fill=(150, 100, 50))
        # nemes headdress
        d.polygon(P([(76, 170), (84, 90), (120, 66), (156, 90), (164, 170), (150, 176), (140, 120), (100, 120), (90, 176)]), fill=gold)
        for y in range(96, 176, 12):
            d.line(P([(80, y), (98, y + 4)]), fill=blue, width=4 * S)
            d.line(P([(160, y), (142, y + 4)]), fill=blue, width=4 * S)
        E((96, 86, 144, 150), fill=(200, 150, 96))               # face
        d.rectangle([v * S for v in (92, 84, 148, 94)], fill=blue)
        for cx in (108, 132):
            E((cx - 7, 108, cx + 7, 116), fill=(250, 240, 220))
            E((cx - 3, 108, cx + 3, 116), fill=(30, 20, 20))
            d.line(P([(cx - 9, 104), (cx + 9, 104)]), fill=(40, 30, 30), width=2 * S)
        d.arc([v * S for v in (110, 124, 130, 138)], 20, 160, fill=(110, 50, 40), width=2 * S)
        d.rectangle([v * S for v in (114, 146, 126, 168)], fill=blue)  # braided beard
        E((112, 62, 128, 78), fill=(230, 60, 60))                # uraeus jewel
    elif kind == "ghost":
        ghost = Image.new("RGBA", img.size, (0, 0, 0, 0))
        g = ImageDraw.Draw(ghost)
        pts = [(70, 300), (70, 120), (90, 80), (120, 68), (150, 80), (170, 120), (170, 300)]
        wave = [(170 - i * 20, 300 - (12 if i % 2 else 0)) for i in range(6)]
        g.polygon([(x * S, y * S) for x, y in pts + wave], fill=(225, 235, 255, 170))
        for cx in (104, 136):
            g.ellipse([(cx - 9) * S, 120 * S, (cx + 9) * S, 144 * S], fill=(40, 50, 80, 220))
        g.ellipse([110 * S, 160 * S, 130 * S, 186 * S], fill=(40, 50, 80, 200))
        ghost = ghost.filter(ImageFilter.GaussianBlur(2 * S))
        img = Image.alpha_composite(img, ghost)
    return img.resize((240, 320), Image.LANCZOS)


# ---------------------------------------------------------------- props
def chest(state):
    """state: closed, open or mimic."""
    S = 2
    img = Image.new("RGBA", (200 * S, 160 * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    R = lambda *b: [v * S for v in b]
    wood, dark, iron, gold = (128, 78, 36), (84, 50, 22), (60, 60, 66), (226, 186, 70)
    d.ellipse(R(14, 140, 186, 158), fill=(0, 0, 0, 90))
    d.rectangle(R(20, 80, 180, 150), fill=wood)
    for y in (96, 116, 136):
        d.line(R(20, y, 180, y), fill=dark, width=2 * S)
    if state == "closed":
        d.chord(R(20, 30, 180, 130), 180, 360, fill=tint(wood, 1.1))
        d.rectangle(R(20, 78, 180, 86), fill=iron)
        for x in (40, 152):
            d.rectangle(R(x, 34, x + 8, 150), fill=iron)
        d.rectangle(R(88, 70, 112, 100), fill=gold)
        d.ellipse(R(96, 80, 104, 88), fill=(40, 30, 20))
    else:
        d.polygon(R(20, 80, 180, 80, 166, 20, 34, 20), fill=dark)       # lid flipped back
        d.rectangle(R(30, 76, 170, 84), fill=(30, 20, 12))
        for x in (40, 152):
            d.rectangle(R(x, 80, x + 8, 150), fill=iron)
        if state == "open":
            for i in range(14):
                x, y = 36 + (i * 37) % 128, 76 + (i % 3) * 3
                d.ellipse(R(x, y - 4, x + 14, y + 6), fill=gold, outline=(150, 110, 30))
        else:
            d.rectangle(R(30, 66, 170, 84), fill=(150, 20, 30))
            for i in range(9):
                x = 30 + i * 15.5
                d.polygon(R(x, 84, x + 15, 84, x + 7.5, 70), fill=(250, 246, 230))
                d.polygon(R(x, 20, x + 15, 20, x + 7.5, 36), fill=(250, 246, 230))
            d.polygon(R(70, 84, 130, 84, 150, 120, 110, 104, 96, 130), fill=(210, 70, 90))  # tongue
            for cx in (64, 136):
                d.ellipse(R(cx - 12, 2, cx + 12, 26), fill=(250, 230, 80))
                d.ellipse(R(cx - 4, 6, cx + 4, 22), fill=(10, 10, 10))
    return img.resize((200, 160), Image.LANCZOS)


def well():
    S = 2
    img = Image.new("RGBA", (220 * S, 220 * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    R = lambda *b: [v * S for v in b]
    d.ellipse(R(20, 196, 200, 216), fill=(0, 0, 0, 90))
    for x in (40, 170):                                   # posts
        d.rectangle(R(x, 30, x + 10, 150), fill=(100, 66, 34))
    d.polygon(R(20, 40, 200, 40, 110, 4), fill=(140, 40, 36))   # roof
    d.line(R(45, 70, 175, 70), fill=(90, 60, 30), width=5 * S)  # crank axle
    d.line(R(110, 70, 110, 110), fill=(200, 190, 160), width=2 * S)
    d.rectangle(R(100, 108, 120, 126), fill=(120, 80, 40))       # bucket
    d.rectangle(R(30, 130, 190, 200), fill=(120, 116, 110))
    d.ellipse(R(30, 116, 190, 146), fill=(150, 146, 140))
    d.ellipse(R(42, 120, 178, 142), fill=(20, 40, 60))
    d.ellipse(R(70, 124, 110, 134), fill=(90, 140, 190, 140))
    for row in range(3):
        y = 150 + row * 16
        for i in range(6):
            x = 30 + (i * 28 + (14 if row % 2 else 0)) % 160
            d.rectangle(R(x, y, min(x + 26, 190), y + 14), outline=(90, 86, 80), width=S)
    return img.resize((220, 220), Image.LANCZOS)


def item(kind):
    S = 3
    img = Image.new("RGBA", (96 * S, 96 * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    R = lambda *b: [v * S for v in b]
    d.ellipse(R(14, 80, 82, 92), fill=(0, 0, 0, 80))
    gold = (236, 196, 76)
    if kind == "ladle":
        d.line(R(70, 10, 46, 60), fill=gold, width=7 * S)
        d.ellipse(R(20, 52, 60, 84), fill=gold, outline=(150, 110, 30), width=2 * S)
        d.ellipse(R(28, 58, 52, 74), fill=(250, 226, 140))
    elif kind == "book":
        d.polygon(R(14, 30, 48, 22, 48, 82, 14, 88), fill=(130, 30, 40))
        d.polygon(R(82, 30, 48, 22, 48, 82, 82, 88), fill=(150, 36, 46))
        d.polygon(R(20, 32, 46, 26, 46, 76, 20, 82), fill=(246, 236, 210))
        d.polygon(R(76, 32, 50, 26, 50, 76, 76, 82), fill=(246, 236, 210))
        for y in (38, 46, 54, 62):
            d.line(R(24, y, 42, y - 4), fill=(120, 100, 80), width=S)
            d.line(R(54, y - 4, 72, y), fill=(120, 100, 80), width=S)
    elif kind == "ring":
        d.ellipse(R(22, 40, 74, 86), outline=gold, width=7 * S)
        d.polygon(R(48, 18, 62, 32, 48, 46, 34, 32), fill=(80, 200, 240), outline=(220, 250, 255))
    elif kind == "helmet":
        d.chord(R(16, 18, 80, 90), 180, 360, fill=(176, 182, 192))
        d.rectangle(R(16, 52, 80, 82), fill=(150, 156, 168))
        d.rectangle(R(24, 58, 72, 64), fill=(30, 30, 36))
        d.line(R(48, 64, 48, 82), fill=(30, 30, 36), width=3 * S)
        d.polygon(R(48, 18, 56, 4, 66, 0, 58, 16), fill=(200, 40, 50))
    return img.resize((96, 96), Image.LANCZOS)


ITEMS = ["ladle", "book", "ring", "helmet"]


CHARACTERS = ["jester", "knight", "wizard", "monk", "cook", "bard", "lady", "alchemist", "parrot", "owl", "cat", "ghost", "merchant", "sphinx", "trickster"]


# ---------------------------------------------------------------- paintings
def painting(kind, rng):
    w, h = 176, 126
    img = Image.new("RGB", (w, h))
    d = ImageDraw.Draw(img)
    ys, xs = np.mgrid[0:h, 0:w]
    if kind in ("landscape", "sunset", "lake"):
        top = np.array([rng.integers(40, 120), rng.integers(80, 160), rng.integers(150, 230)], float)
        bot = np.array([rng.integers(200, 255), rng.integers(150, 220), rng.integers(100, 180)], float)
        if kind == "sunset":
            top, bot = np.array([60, 40, 110.]), np.array([250, 140, 60.])
        t = (ys / h)[..., None]
        img = to_img(top * (1 - t) + bot * t)
        d = ImageDraw.Draw(img)
        sx, sy = rng.integers(30, w - 30), rng.integers(20, 50)
        d.ellipse([sx - 14, sy - 14, sx + 14, sy + 14], fill=(255, 236, 170))
        base = rng.integers(60, 90)
        for layer in range(3):
            n = value_noise(w, 1, 40 - layer * 10, rng)[0]
            col = tint((70 + layer * 10, 90 + layer * 20, 80 - layer * 10), 1 - layer * 0.15)
            pts = [(x, base + layer * 14 - n[x] * (40 - layer * 8)) for x in range(w)] + [(w, h), (0, h)]
            d.polygon(pts, fill=col)
        if kind == "lake":
            d.rectangle([0, h - 34, w, h], fill=(70, 110, 150))
            for i in range(8):
                y = h - 30 + i * 4
                d.line([(rng.integers(0, w // 2), y), (rng.integers(w // 2, w), y)], fill=(150, 190, 220))
        for _ in range(rng.integers(3, 8)):
            tx, ty = rng.integers(0, w), rng.integers(h - 40, h - 10)
            d.polygon([(tx, ty - 22), (tx + 8, ty), (tx - 8, ty)], fill=(30, 60, 36))
    elif kind == "sea":
        t = (ys / h)[..., None]
        img = to_img(np.array([120, 170, 210.]) * (1 - t) + np.array([230, 230, 240.]) * t)
        d = ImageDraw.Draw(img)
        d.rectangle([0, 60, w, h], fill=(30, 70, 110))
        for i in range(14):
            y = 64 + i * 5
            for x in range(-10, w, 18):
                o = rng.integers(0, 10)
                d.arc([x + o, y, x + o + 16, y + 8], 200, 340, fill=(200, 220, 240), width=1)
        sx = rng.integers(40, w - 40)
        d.polygon([(sx - 22, 66), (sx + 22, 66), (sx + 14, 76), (sx - 14, 76)], fill=(90, 50, 30))
        d.line([(sx, 66), (sx, 30)], fill=(60, 40, 20), width=2)
        d.polygon([(sx + 1, 32), (sx + 20, 60), (sx + 1, 60)], fill=(240, 236, 220))
    elif kind == "stilllife":
        img = to_img(np.ones((h, w, 3)) * np.array([60, 44, 34.]) * (0.7 + 0.5 * value_noise(w, h, 30, rng))[..., None])
        d = ImageDraw.Draw(img)
        d.rectangle([0, 86, w, h], fill=(110, 70, 40))
        d.ellipse([40, 70, 136, 104], fill=(180, 170, 150))
        cols = [(200, 40, 40), (230, 180, 40), (120, 160, 40), (120, 40, 120), (240, 130, 40)]
        for _ in range(6):
            cx, cy, r = rng.integers(56, 120), rng.integers(56, 82), rng.integers(9, 15)
            c = cols[rng.integers(len(cols))]
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c)
            d.ellipse([cx - r // 2, cy - r // 2 - 3, cx, cy - 3], fill=tint(c, 1.4))
        d.rectangle([140, 40, 156, 96], fill=(40, 90, 70))
        d.ellipse([136, 30, 160, 48], fill=(40, 90, 70))
    else:  # geometric
        img = Image.new("RGB", (w, h), (236, 228, 210))
        d = ImageDraw.Draw(img)
        cols = [(200, 40, 40), (30, 60, 150), (240, 200, 40), (236, 228, 210), (20, 20, 20)]
        xs_cut = sorted(rng.choice(range(20, w - 20), 2, replace=False))
        ys_cut = sorted(rng.choice(range(20, h - 20), 2, replace=False))
        xb, yb = [0, *xs_cut, w], [0, *ys_cut, h]
        for i in range(3):
            for j in range(3):
                d.rectangle([xb[i], yb[j], xb[i + 1], yb[j + 1]], fill=cols[rng.integers(len(cols))])
        for x in xs_cut:
            d.rectangle([x - 2, 0, x + 2, h], fill=(20, 20, 20))
        for y in ys_cut:
            d.rectangle([0, y - 2, w, y + 2], fill=(20, 20, 20))
    # brush texture
    arr = np.asarray(img.filter(ImageFilter.GaussianBlur(0.7)), float)
    arr *= (0.9 + 0.2 * value_noise(w, h, 6, rng, 2))[..., None]
    img = to_img(arr)
    # gilded frame
    F = 12
    framed = Image.new("RGB", (w + F * 2, h + F * 2), (150, 110, 40))
    fd = ImageDraw.Draw(framed)
    for i in range(F):
        c = tint((210, 160, 60), 0.6 + 0.6 * math.sin(i / F * math.pi))
        fd.rectangle([i, i, w + F * 2 - 1 - i, h + F * 2 - 1 - i], outline=c)
    framed.paste(img, (F, F))
    return framed


PAINTING_KINDS = ["landscape", "sunset", "lake", "sea", "stilllife", "geometric"]


# ---------------------------------------------------------------- set pieces
def stairs():
    img = Image.new("RGBA", (260, 240), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle([30, 20, 230, 240], fill=(70, 64, 58, 255))
    d.pieslice([30, -80, 230, 120], 180, 360, fill=(70, 64, 58, 255))
    d.rectangle([50, 30, 210, 240], fill=(12, 10, 8, 255))
    d.pieslice([50, -50, 210, 110], 180, 360, fill=(12, 10, 8, 255))
    for i in range(9):
        y = 240 - i * 22
        inset = i * 7
        c = int(170 - i * 14)
        d.rectangle([50 + inset, y - 22, 210 - inset, y], fill=(c, c - 8, c - 18, 255))
        d.line([50 + inset, y - 22, 210 - inset, y - 22], fill=(c + 30, c + 24, c + 10, 255), width=2)
    return img


def title_art(seed):
    rng = np.random.default_rng(seed)
    w, h = 800, 360
    ys, xs = np.mgrid[0:h, 0:w]
    t = (ys / h)[..., None]
    img = to_img(np.array([10, 12, 34.]) * (1 - t) + np.array([60, 40, 70.]) * t)
    d = ImageDraw.Draw(img)
    for _ in range(220):
        x, y, s = rng.integers(0, w), rng.integers(0, h - 120), rng.random()
        c = int(150 + 105 * s)
        d.point((x, y), fill=(c, c, c))
        if s > 0.93:
            d.line([(x - 2, y), (x + 2, y)], fill=(c, c, c))
            d.line([(x, y - 2), (x, y + 2)], fill=(c, c, c))
    img = glow(img, 640, 80, 70, (255, 240, 200), 0.5)
    d = ImageDraw.Draw(img)
    d.ellipse([610, 50, 670, 110], fill=(250, 244, 220))
    d.ellipse([628, 46, 682, 100], fill=(22, 20, 44))
    hill = value_noise(w, 1, 120, rng)[0]
    d.polygon([(x, 300 - hill[x] * 40) for x in range(w)] + [(w, h), (0, h)], fill=(18, 16, 24))
    sil = (24, 20, 30)
    d.rectangle([240, 170, 560, 300], fill=sil)
    for x in range(240, 560, 20):
        d.rectangle([x, 160, x + 10, 172], fill=sil)
    towers = [(200, 110, 60), (300, 80, 50), (380, 40, 46), (460, 90, 50), (540, 120, 60)]
    for x, top, tw in towers:
        d.rectangle([x, top, x + tw, 300], fill=sil)
        d.polygon([(x - 6, top), (x + tw + 6, top), (x + tw // 2, top - 50)], fill=(30, 24, 40))
        d.line([(x + tw // 2, top - 50), (x + tw // 2, top - 70)], fill=sil, width=2)
        d.polygon([(x + tw // 2, top - 70), (x + tw // 2 + 16, top - 64), (x + tw // 2, top - 58)], fill=(160, 30, 40))
        for wy in range(top + 20, 280, 34):
            if rng.random() < 0.6:
                img = glow(img, x + tw // 2, wy + 6, 10, (255, 190, 90), 0.6)
                d = ImageDraw.Draw(img)
                d.rectangle([x + tw // 2 - 4, wy, x + tw // 2 + 4, wy + 12], fill=(255, 210, 120))
    d.pieslice([370, 230, 430, 290], 180, 360, fill=(10, 8, 6))
    d.rectangle([370, 260, 430, 300], fill=(10, 8, 6))
    return img


def throne_room(seed):
    img = room("throne", seed)
    d = ImageDraw.Draw(img)
    d.rectangle([340, 170, 460, 400], fill=(200, 160, 60))
    d.polygon([(340, 170), (400, 120), (460, 170)], fill=(220, 180, 70))
    d.rectangle([356, 186, 444, 330], fill=(140, 20, 36))
    d.rectangle([326, 300, 474, 340], fill=(210, 170, 64))
    d.rectangle([340, 340, 460, 400], fill=(170, 130, 50))
    for x in (230, 520):
        d.rectangle([x, 120, x + 50, 300], fill=(140, 20, 36))
        d.polygon([(x, 300), (x + 25, 320), (x + 50, 300)], fill=(140, 20, 36))
        d.polygon([(x + 25, 170), (x + 37, 200), (x + 25, 230), (x + 13, 200)], fill=(220, 180, 70))
    img = glow(img, 400, 150, 60, (255, 230, 150), 0.4)
    return img


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out", nargs="?", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docs", "assets"))
    ap.add_argument("--seed", type=int, default=1995)
    ap.add_argument("--paintings", type=int, default=24)
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)

    def save(img, name, **kw):
        path = os.path.join(a.out, name)
        img.save(path, optimize=True, **kw)
        print("wrote", name)

    for i, theme in enumerate(["stone", "timber", "library", "royal", "throne"]):
        save(room(theme, a.seed + i).convert("RGB"), f"room_{theme}.jpg", quality=86)
    for i, kind in enumerate(CHARACTERS):
        save(character(kind, np.random.default_rng(a.seed + 100 + i)), f"char_{kind}.png")
    for i in range(a.paintings):
        rng = np.random.default_rng(a.seed + 200 + i)
        save(painting(PAINTING_KINDS[i % len(PAINTING_KINDS)], rng), f"painting_{i:02d}.png")
    for state in ("closed", "open", "mimic"):
        save(chest(state), f"chest_{state}.png")
    save(well(), "well.png")
    for kind in ITEMS:
        save(item(kind), f"item_{kind}.png")
    save(stairs(), "stairs.png")
    save(title_art(a.seed + 300), "title.jpg", quality=88)
    save(throne_room(a.seed + 400).convert("RGB"), "throne.jpg", quality=86)


if __name__ == "__main__":
    main()
