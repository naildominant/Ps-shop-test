#!/usr/bin/env python3
"""Делает прозрачный логотип и иконки из оригинала brand/logo.png (логотип на чёрном фоне).

    python3 scripts/make_logo.py

Убирает только чёрный фон: прозрачность считается по яркости пикселя, поэтому тёмно-синяя
внутренняя грань кубика остаётся на месте (раньше её срезали вместе с фоном).
"""
import os

import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, 'src', 'static', 'img')
T = 9  # фон оригинала — чистый чёрный; тёмно-синяя грань кубика ярче этого порога


def transparent(src):
    """Прозрачным делаем только внешний чёрный фон — тот, что связан с краями картинки.
    Всё внутри логотипа (в том числе тёмная грань кубика) остаётся как в оригинале."""
    from scipy import ndimage
    a = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
    m = a.max(axis=2)
    dark = m < T
    lab, _ = ndimage.label(dark)
    edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bg = np.isin(lab, edge[edge > 0])
    alpha = np.ones_like(m)
    alpha[bg] = np.clip((m[bg] - 1) / (T - 1), 0, 1)  # мягкий край вместо резкой «лесенки»
    out = np.dstack([a, alpha * 255]).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def bright_with_inner_face():
    """Яркий вырезанный логотип (brand/logo-transparent.png) + тёмная внутренняя грань из оригинала.
    Вырезанная версия ярче оригинала, но в ней пропала грань — подкладываем её снизу."""
    base = transparent(os.path.join(ROOT, 'brand', 'logo.png'))
    base = base.crop(base.getbbox())
    bright = Image.open(os.path.join(ROOT, 'brand', 'logo-transparent.png')).convert('RGBA')
    bright = bright.crop(bright.getbbox()).resize(base.size, Image.LANCZOS)
    out = Image.alpha_composite(base, bright)
    return out


def main():
    full = bright_with_inner_face()
    full.save(os.path.join(ROOT, 'brand', 'logo-transparent-full.png'))
    a = np.asarray(full)[:, :, 3]
    rows = np.where(a.max(1) > 20)[0]
    gaps = [r for r in range(rows.min(), rows.max()) if a[r].max() <= 20]
    split = gaps[0] if gaps else full.height
    icon = full.crop((0, 0, full.width, split))
    icon = icon.crop(icon.getbbox())
    s = max(icon.size)
    sq = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    sq.paste(icon, ((s - icon.width) // 2, (s - icon.height) // 2), icon)
    for n in (96, 192):
        sq.resize((n, n), Image.LANCZOS).save(os.path.join(IMG, f'mark-{n}.webp'), 'WEBP', quality=92)
    sq.resize((96, 96), Image.LANCZOS).save(os.path.join(IMG, 'mark-96.png'))

    def tile(n, pad):
        bg = Image.new('RGBA', (n, n), (9, 7, 30, 255))
        mask = Image.new('L', (n, n), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, n - 1, n - 1), radius=int(n * .22), fill=255)
        ic = sq.resize((n - 2 * pad, n - 2 * pad), Image.LANCZOS)
        bg.paste(ic, (pad, pad), ic)
        out = Image.new('RGBA', (n, n), (0, 0, 0, 0))
        out.paste(bg, (0, 0), mask)
        return out
    tile(32, 2).save(os.path.join(IMG, 'favicon-32.png'))
    tile(180, 18).save(os.path.join(IMG, 'apple-touch-icon.png'))
    tile(512, 56).save(os.path.join(IMG, 'icon-512.png'))
    tile(48, 3).save(os.path.join(ROOT, 'src', 'static', 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)])

    yy, xx = np.mgrid[0:630, 0:1200]
    d1 = np.exp(-(((xx - 300) / 420) ** 2 + ((yy - 200) / 300) ** 2))
    d2 = np.exp(-(((xx - 950) / 420) ** 2 + ((yy - 500) / 320) ** 2))
    og = Image.fromarray(np.stack([7 + 70 * d1 + 10 * d2, 6 + 20 * d1 + 60 * d2, 22 + 140 * d1 + 150 * d2], -1).clip(0, 255).astype('uint8'))
    logo = full.copy()
    logo.thumbnail((470, 470), Image.LANCZOS)
    og.paste(logo, ((1200 - logo.width) // 2, (630 - logo.height) // 2), logo)
    og.save(os.path.join(IMG, 'og-default.jpg'), quality=88)
    print('Логотип и иконки обновлены, размер значка', sq.size)


if __name__ == '__main__':
    main()
