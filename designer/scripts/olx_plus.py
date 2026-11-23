# OLX PS Plus: quote cards (A), framed real review screenshots with blurred avatars (B), tariff card (C). 1200x900.
# Usage: python3 scripts/olx_plus.py <dir with review_0X_*.png>
import sys; sys.path.insert(0, "scripts")
from psfx import *

SRC = sys.argv[1]; OUT = "output/olx/plus"; W, H = 1200, 900
GOLD, TXT, SUB, CARD = (255, 205, 120), (242, 239, 255), (169, 163, 212), (22, 18, 52)

def base():
    return neon_bg((W, H), blobs=[((500, -100, 1400, 700), (90, 35, 180), 220), ((-300, 400, 600, 1100), (110, 30, 130), 230),
                                 ((800, 600, 1400, 1100), (110, 75, 10), 200)], base=(7, 6, 26))
def mark(bg): spaced(ImageDraw.Draw(bg), (W - 44, H - 48), "PS SHOP", font("unbounded", 22, "Bold"), TXT, 5, "r")
def save(bg, name):
    p = f"{OUT}/{name}.jpg"; grain(bg, 3, seed=2).convert("RGB").save(p, quality=92, optimize=True, progressive=True); print(p)

def plus_icon(s):
    im = Image.new("RGBA", (s, s), (0, 0, 0, 0)); m = Image.new("L", (s, s), 0); d = ImageDraw.Draw(m); t = s * .34; r = s * .08
    d.rounded_rectangle(((s - t) / 2, 0, (s + t) / 2, s - 1), r, fill=255); d.rounded_rectangle((0, (s - t) / 2, s - 1, (s + t) / 2), r, fill=255)
    g = grad(Image.new("RGBA", (s, s), (255, 255, 255, 255)), (255, 236, 150), (214, 140, 20), axis=0); g.putalpha(m); return g

def wrap(d, txt, f, maxw):
    out, cur = [], ""
    for w in txt.split():
        t = (cur + " " + w).strip()
        if d.textlength(t, font=f) <= maxw: cur = t
        else: out.append(cur); cur = w
    return out + [cur]

# ---------- A: quote cards
QUOTES = [("Купил подписку Deluxe на 12 месяцев — всё работает чётко, сделали всё быстро. Спасибо ребятам", "Азизбек У."),
          ("Оформил годовую подписку Plus, разобраться с установкой помог Наиль. Всё грамотно объяснил, сделано оперативно — сын доволен, и я вместе с ним", "Narzullaev"),
          ("Всё чётко работает, Наиль делает всё оперативно и качественно. Брали годовую подписку — доволен. Поддержка в любое время", "Сашка")]
HEAD = {"ru": "Отзывы клиентов", "uz": "Mijozlar fikrlari"}
for i, (q, a) in enumerate(QUOTES, 1):
    for lg, head in HEAD.items():
        bg = base(); bg.alpha_composite(logo(84), (52, 40)); d = ImageDraw.Draw(bg)
        spaced(d, (W - 56, 80), head.upper(), font("manrope", 24, "Bold"), GOLD, 5, "r")
        card = Image.new("RGBA", (W, H), (0, 0, 0, 0)); ImageDraw.Draw(card).rounded_rectangle((70, 170, W - 70, 770), 36, fill=CARD + (235,), outline=(130, 100, 240), width=2)
        shadow(bg, card, (0, 0), (0, 20), 30, 0.6); bg.alpha_composite(card); d = ImageDraw.Draw(bg)
        d.text((110, 150), "“", font=font("unbounded", 200, "Black"), fill=GOLD)
        size = 46
        while True:
            f = font("manrope", size, "SemiBold"); ls = wrap(d, "«" + q + "»", f, W - 260)
            if len(ls) * size * 1.35 <= 380 or size < 30: break
            size -= 2
        y = 330
        for ln in ls: d.text((130, y), ln, font=f, fill=TXT); y += int(size * 1.35)
        d.text((130, 700), "— " + a, font=font("manrope", 32, "Bold"), fill=GOLD)
        bg.alpha_composite(plus_icon(56), (W - 150, 690))
        mark(bg); save(bg, f"A{i}_review_{lg}")

# ---------- B: real screenshots, avatars blurred
def blur_circles(im, pts, r):
    for x, y in pts:
        box = (x - r, y - r, x + r, y + r); reg = im.crop(box).filter(ImageFilter.GaussianBlur(18))
        m = Image.new("L", reg.size, 0); ImageDraw.Draw(m).ellipse((0, 0, 2 * r, 2 * r), fill=255); im.paste(reg, box[:2], m)
    return im
SHOTS = [("review_03_apr.png", (0, 905, 1179, 1765), [(74, 1710), (310, 1704), (530, 1704)]),
         ("review_04_mar.png", (0, 575, 1179, 1700), [(74, 884), (310, 878), (68, 1650)])]
for j, (fn, crop, pts) in enumerate(SHOTS, 1):
    im = blur_circles(Image.open(f"{SRC}/{fn}").convert("RGB"), pts, 58).crop(crop)
    k = min(820 / im.height, 760 / im.width); im = im.resize((int(im.width * k), int(im.height * k)), Image.LANCZOS).convert("RGBA")
    im.putalpha(rounded_mask(im.size, 28)); x, y = (W - im.width) // 2 + 120, (H - im.height) // 2
    bg = base(); lay = Image.new("RGBA", (W, H), (0, 0, 0, 0)); lay.alpha_composite(im, (x, y))
    shadow(bg, lay, (0, 0), (0, 20), 30, 0.7); bg.alpha_composite(lay)
    ImageDraw.Draw(bg).rounded_rectangle((x, y, x + im.width, y + im.height), 28, outline=(150, 120, 255), width=2)
    bg.alpha_composite(logo(84), (40, 40)); bg.alpha_composite(plus_icon(70), (60, H - 140))
    mark(bg); save(bg, f"B{j}_screenshot")

# ---------- C: tariffs
T = [("Essential", ["269 000", "429 000", "629 000"]), ("Extra", ["309 000", "629 000", "979 000"]), ("Deluxe", ["389 000", "699 000", "1 268 000"])]
LBL = {"ru": (["1 месяц", "3 месяца", "12 месяцев"], "сум", "12 месяцев — выгоднее всего"),
       "uz": (["1 oy", "3 oy", "12 oy"], "so‘m", "12 oy — eng foydali")}
for lg, (cols, cur, best) in LBL.items():
    bg = base(); bg.alpha_composite(logo(84), (52, 36)); d = ImageDraw.Draw(bg)
    bg.alpha_composite(plus_icon(74), (W - 380, 46)); d.text((W - 290, 50), "PS Plus", font=font("unbounded", 54, "Bold"), fill=TXT)
    x0, cw, y0, rh = 300, 280, 250, 150
    hl = Image.new("RGBA", (W, H), (0, 0, 0, 0)); ImageDraw.Draw(hl).rounded_rectangle((x0 + 2 * cw + 8, y0 - 80, x0 + 3 * cw - 8, y0 + 3 * rh + 4), 26, fill=(255, 205, 120, 40), outline=GOLD + (255,), width=3)
    glow(bg, hl, (0, 0), 20, 1, (255, 170, 30)); bg.alpha_composite(hl); d = ImageDraw.Draw(bg)
    fh = font("manrope", 28, "Bold")
    for c, lab in enumerate(cols): d.text((x0 + c * cw + cw / 2, y0 - 40), lab, font=fh, fill=GOLD if c == 2 else SUB, anchor="mm")
    for r, (name, ps) in enumerate(T):
        y = y0 + r * rh; d.line((60, y, W - 60, y), fill=(70, 60, 140), width=2)
        d.text((60, y + rh / 2), name, font=font("unbounded", 40, "Bold"), fill=TXT, anchor="lm")
        for c, p in enumerate(ps):
            cx = x0 + c * cw + cw / 2
            d.text((cx, y + rh / 2 - 14), p, font=font("unbounded", 40 if len(p) < 9 else 36, "Bold"), fill=GOLD if c == 2 else TXT, anchor="mm")
            d.text((cx, y + rh / 2 + 32), cur, font=font("manrope", 22, "SemiBold"), fill=SUB, anchor="mm")
    highlight(bg, (60, 745), best, font("manrope", 32, "Bold"), bg=GOLD, fg=(20, 12, 40), padx=26, pady=14)
    mark(bg); save(bg, f"C_tariffs_{lg}")
