# OLX rent photos 1200x900: owner's real photos, color/shadow fix, framed on brand bg + caption. No bg removal.
# Usage: python3 scripts/olx_rent_photos.py <dir with rent_0X.jpg>
import sys; sys.path.insert(0, "scripts")
from psfx import *
from PIL import ImageOps, ImageEnhance

SRC = sys.argv[1]; OUT = "output/olx/rent"; W, H = 1200, 900
GOLD, TXT, SUB = (255, 205, 120), (242, 239, 255), (169, 163, 212)

def fix(name, lift=0.0):
    im = ImageOps.exif_transpose(Image.open(f"{SRC}/{name}")).convert("RGB")
    a = np.asarray(im).astype(float) / 255
    m = a.reshape(-1, 3).mean(0); a *= (m.mean() / m) ** 0.5            # soften warm cast
    if lift:                                                             # lift harsh shadows
        L = np.asarray(Image.fromarray((a.mean(2) * 255).astype("uint8")).filter(ImageFilter.GaussianBlur(40))).astype(float) / 255
        a = a + lift * np.clip(0.55 - L, 0, 1)[..., None] * (1 - a) * 1.2
    lo, hi = np.percentile(a, 1), np.percentile(a, 99.5); a = np.clip((a - lo) / (hi - lo), 0, 1) ** 0.92
    im = Image.fromarray((a * 255).astype("uint8"))
    im = ImageEnhance.Color(im).enhance(1.06); im = ImageEnhance.Sharpness(im).enhance(1.15)
    return im

def cover(im, w, h, cy=0.5):
    k = max(w / im.width, h / im.height); im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    x = (im.width - w) // 2; y = int((im.height - h) * cy); return im.crop((x, y, x + w, y + h))

def panel(bg, im, box, rad=26):
    x0, y0, x1, y1 = box; ph = cover(im, x1 - x0, y1 - y0).convert("RGBA"); ph.putalpha(rounded_mask(ph.size, rad))
    lay = Image.new("RGBA", bg.size, (0, 0, 0, 0)); lay.alpha_composite(ph, (x0, y0))
    shadow(bg, lay, (0, 0), (0, 18), 30, 0.7); bg.alpha_composite(lay)
    ImageDraw.Draw(bg).rounded_rectangle(box, rad, outline=(150, 120, 255), width=2)

def base():
    return neon_bg((W, H), blobs=[((500, -100, 1400, 700), (90, 35, 180), 220), ((-300, 400, 600, 1100), (110, 30, 130), 230)], base=(7, 6, 26))

def mark(bg):
    d = ImageDraw.Draw(bg); spaced(d, (W - 40, H - 44), "PS SHOP", font("unbounded", 22, "Bold"), TXT, 5, "r")

def caption(bg, title, sub=None, x=60, y=None):
    d = ImageDraw.Draw(bg); ft = font("unbounded", 54, "Bold"); fs = font("manrope", 30, "Bold")
    y = y or (H - (150 if sub else 100))
    d.text((x, y), title, font=ft, fill=TXT)
    if sub: d.text((x, y + 74), sub, font=fs, fill=GOLD)

def save(bg, name):
    p = f"{OUT}/{name}.jpg"; grain(bg, 3, seed=2).convert("RGB").save(p, quality=92, optimize=True, progressive=True); print(p)

P = {n: fix(f"rent_0{n}.jpg", lift) for n, lift in [(1, .1), (2, .1), (3, .1), (4, .1), (5, .45), (6, .1), (7, .45)]}
L = {"ru": {"hero": ("Аренда PS5", "PS5 Slim + 2 джойстика"), "kit": ("Комплект аренды", "PS5 · 2 джойстика · все кабели"),
            "pair": ("2 джойстика", "в комплекте"), "pick": ("Можно выбрать джойстики", None)},
     "uz": {"hero": ("PS5 ijara", "PS5 Slim + 2 joystik"), "kit": ("Ijara to‘plami", "PS5 · 2 joystik · barcha kabellar"),
            "pair": ("2 ta joystik", "to‘plamda"), "pick": ("Joystiklarni tanlash mumkin", None)}}
for lg, t in L.items():
    # 1 hero: console tall left + controllers right
    bg = base(); panel(bg, P[4], (60, 60, 500, 840)); panel(bg, P[2], (540, 60, 1140, 510))
    bg.alpha_composite(logo(84), (560, 560)); caption(bg, *t["hero"], x=560, y=680); save(bg, f"01_hero_{lg}")
    # 2 kit collage
    bg = base(); panel(bg, P[1], (60, 50, 400, 680)); panel(bg, P[2], (430, 50, 1140, 360)); panel(bg, P[3], (430, 380, 1140, 680))
    caption(bg, *t["kit"], y=720); mark(bg); save(bg, f"02_kit_{lg}")
    # 3 white pair close-up
    bg = base(); panel(bg, P[5].rotate(90, expand=True), (60, 50, 1140, 700)); caption(bg, *t["pair"], y=730); mark(bg); save(bg, f"03_pair_{lg}")
    # 4 black+purple — only if owner confirms
    if "--pick" in sys.argv:
        bg = base(); panel(bg, P[7], (60, 50, 1140, 720)); caption(bg, t["pick"][0], y=760); mark(bg); save(bg, f"04_pick_{lg}")
# 5–6 console alone (no text → one version)
for i, n in ((5, 1), (6, 4)):  # both PS5 Slim; rent_06 (standard PS5) not used — different model
    bg = base(); panel(bg, P[n], (300, 40, 900, 840)); mark(bg); save(bg, f"0{i}_console")
