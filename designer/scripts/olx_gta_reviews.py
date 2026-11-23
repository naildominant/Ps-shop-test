# OLX GTA 6 reviews: quote cards R1–R2 (ru/uz header) + framed screenshots S1–S2 (avatars blurred). 1200x900.
# Usage: python3 scripts/olx_gta_reviews.py <dir with review_*.png>
import sys; sys.path.insert(0, "scripts")
from psfx import *
SRC = sys.argv[1]; OUT = "output/olx/gta"; W, H = 1200, 900
GOLD, TXT, CARD = (255, 205, 120), (242, 239, 255), (22, 18, 52)

def base():
    return neon_bg((W, H), blobs=[((500, -100, 1400, 700), (120, 40, 150), 220), ((-300, 400, 600, 1100), (110, 30, 130), 230),
                                 ((800, 600, 1400, 1100), (120, 60, 20), 200)], base=(7, 6, 26))
def mark(bg): spaced(ImageDraw.Draw(bg), (W - 44, H - 48), "PS SHOP", font("unbounded", 22, "Bold"), TXT, 5, "r")
def save(bg, name):
    p = f"{OUT}/{name}.jpg"; grain(bg, 3, seed=2).convert("RGB").save(p, quality=92, optimize=True, progressive=True); print(p)
def wrap(d, txt, f, maxw):
    out, cur = [], ""
    for w in txt.split():
        t = (cur + " " + w).strip()
        if d.textlength(t, font=f) <= maxw: cur = t
        else: out.append(cur); cur = w
    return out + [cur]

QUOTES = [("Купил GTA 6, спасибо большое! Всё быстро, качественно, оперативно", "Альберт"),
          ("Спасибо, Наиль! Купил GTA 6 недорого, ещё и всё быстро сделал", "Клиент PS SHOP")]
HEAD = {"ru": "Отзывы клиентов", "uz": "Mijozlar fikrlari"}
cov = Image.open("assets/covers/gta6-cover.jpg").convert("RGBA").resize((150, 150), Image.LANCZOS); cov.putalpha(rounded_mask(cov.size, 18))
for i, (q, a) in enumerate(QUOTES, 1):
    for lg, head in HEAD.items():
        bg = base(); bg.alpha_composite(logo(84), (52, 40)); d = ImageDraw.Draw(bg)
        spaced(d, (W - 56, 80), head.upper(), font("manrope", 24, "Bold"), GOLD, 5, "r")
        card = Image.new("RGBA", (W, H), (0, 0, 0, 0)); ImageDraw.Draw(card).rounded_rectangle((70, 170, W - 70, 770), 36, fill=CARD + (235,), outline=(130, 100, 240), width=2)
        shadow(bg, card, (0, 0), (0, 20), 30, 0.6); bg.alpha_composite(card); d = ImageDraw.Draw(bg)
        d.text((110, 150), "“", font=font("unbounded", 200, "Black"), fill=GOLD)
        f = font("manrope", 54, "SemiBold"); y = 330
        for ln in wrap(d, "«" + q + "»", f, W - 300): d.text((130, y), ln, font=f, fill=TXT); y += 74
        d.text((130, 690), "— " + a, font=font("manrope", 34, "Bold"), fill=GOLD)
        bg.alpha_composite(cov, (W - 240, 580)); d.text((W - 165, 745), "GTA 6", font=font("unbounded", 22, "Bold"), fill=TXT, anchor="mm")
        mark(bg); save(bg, f"R{i}_review_{lg}")

def blur_circles(im, pts):
    for x, y, r in pts:
        box = (x - r, y - r, x + r, y + r); reg = im.crop(box).filter(ImageFilter.GaussianBlur(18))
        m = Image.new("L", reg.size, 0); ImageDraw.Draw(m).ellipse((0, 0, 2 * r, 2 * r), fill=255); im.paste(reg, box[:2], m)
    return im
SHOTS = [("review_ps5home_gta.png", (0, 925, 880, 2025), [(74, 1981, 60), (346, 1975, 70)]),
         ("review_ingame_photo.png", (0, 960, 1100, 1935), [(74, 1857, 60)])]
for j, (fn, crop, pts) in enumerate(SHOTS, 1):
    im = blur_circles(Image.open(f"{SRC}/{fn}").convert("RGB"), pts).crop(crop)
    k = min(800 / im.height, 820 / im.width); im = im.resize((int(im.width * k), int(im.height * k)), Image.LANCZOS).convert("RGBA")
    im.putalpha(rounded_mask(im.size, 28)); x, y = (W - im.width) // 2 + 110, (H - im.height) // 2
    bg = base(); lay = Image.new("RGBA", (W, H), (0, 0, 0, 0)); lay.alpha_composite(im, (x, y))
    shadow(bg, lay, (0, 0), (0, 20), 30, 0.7); bg.alpha_composite(lay)
    ImageDraw.Draw(bg).rounded_rectangle((x, y, x + im.width, y + im.height), 28, outline=(150, 120, 255), width=2)
    bg.alpha_composite(logo(84), (40, 40)); mark(bg); save(bg, f"S{j}_screenshot")
