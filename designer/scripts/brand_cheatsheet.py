"""Шпаргалка брендбука PS SHOP: логотип, цвета, шрифты, схема поста. 1080×1740.
Запуск из designer/: python3 scripts/brand_cheatsheet.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
from psfx import *
from PIL import Image, ImageDraw, ImageFilter

W, H = 1080, 1740
M = 64                                     # поля
TXT, MUTED, FAINT = (242, 239, 255), (169, 163, 212), (111, 106, 156)
GOLD = (255, 205, 120)
EDGE = (150, 138, 255, 60)

def F(name, size, w=None): return font(name, size, w)

base = neon_bg((W, H), blobs=[((-300, -260, 640, 520), (70, 26, 150), 240),
                              ((560, 520, 1500, 1300), (20, 60, 170), 260),
                              ((-200, 1200, 600, 1900), (60, 20, 120), 240)], base=(7, 6, 26))
d = ImageDraw.Draw(base)

def label(y, txt):
    spaced(d, (M, y), txt, F("manrope", 19, "Bold"), MUTED, 6)

def glass(box, r=22, fill=(34, 29, 92, 92)):
    g = Image.new("RGBA", base.size, (0, 0, 0, 0)); gd = ImageDraw.Draw(g)
    gd.rounded_rectangle(box, r, fill=fill, outline=EDGE, width=2); base.alpha_composite(g)

def hgrad(w, h, stops):
    a = np.zeros((h, w, 3)); xs = np.linspace(0, 1, w)
    for c in range(3): a[:, :, c] = np.interp(xs, [s[0] for s in stops], [s[1][c] for s in stops])
    return Image.fromarray(a.astype("uint8")).convert("RGBA")

def rmask(w, h, r):
    m = Image.new("L", (w, h), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), r, fill=255); return m

# ---------- шапка
base.alpha_composite(logo(132), (M - 20, 40))
spaced(d, (W - M, 70), "БРЕНДБУК", F("manrope", 22, "ExtraBold"), GOLD, 8, "r")
spaced(d, (W - M, 104), "ШПАРГАЛКА ДИЗАЙНЕРА", F("manrope", 17, "SemiBold"), MUTED, 5, "r")

d.text((M, 214), "Наш стиль", font=F("unbounded", 84, "Black"), fill=TXT)
d.text((M, 322), "тёмная ночь · свет фиолет → голубой · золото для кнопки", font=F("manrope", 26, "Medium"), fill=MUTED)

# ---------- градиент
y = 400
label(y, "ФИРМЕННЫЙ ГРАДИЕНТ")
stops = [(0, (195, 92, 255)), (.48, (106, 85, 255)), (1, (43, 200, 255))]
gw, gh = W - 2 * M, 118
g = hgrad(gw, gh, stops); base.paste(g, (M, y + 36), rmask(gw, gh, 24))
for x, code, anc in [(M + 26, "#C35CFF", "l"), (W // 2, "#6A55FF", "m"), (W - M - 26, "#2BC8FF", "r")]:
    d.text((x, y + 36 + gh / 2), code, font=F("manrope", 26, "ExtraBold"), fill=(255, 255, 255), anchor=anc + "m")

# ---------- плитки цветов
y = 600
label(y, "ЦВЕТА")
tiles = [("Ночь · фон", "#07061A", (7, 6, 26)), ("Глубина", "#0E0C2A", (14, 12, 42)),
         ("Текст", "#F2EFFF", (242, 239, 255)), ("Подписи", "#A9A3D4", (169, 163, 212)),
         ("Кнопка", "#FFCD78", GOLD), ("Скидка", "#FF6B95", (255, 107, 149)),
         ("Наличие", "#45E3A4", (69, 227, 164)), ("Подсказка", "#FFC54D", (255, 197, 77))]
cols, gap = 4, 16
tw = (W - 2 * M - gap * (cols - 1)) // cols; th = 104
for i, (name, code, col) in enumerate(tiles):
    x = M + (i % cols) * (tw + gap); ty = y + 36 + (i // cols) * (th + 58)
    sw = Image.new("RGBA", (tw, th), col + (255,)); base.paste(sw, (x, ty), rmask(tw, th, 18))
    d.rounded_rectangle((x, ty, x + tw - 1, ty + th - 1), 18, outline=EDGE, width=2)
    d.text((x + 2, ty + th + 12), name, font=F("manrope", 20, "Bold"), fill=TXT)
    d.text((x + tw - 2, ty + th + 12), code, font=F("manrope", 18, "Medium"), fill=FAINT, anchor="ra")

# ---------- шрифты
y = 1000
label(y, "ШРИФТЫ")
rows = [("Unbounded", "заголовки и цены", "229 000 сум", F("unbounded", 50, "Black"), TXT),
        ("Oswald", "огромное слово в постах", "ПРЕДЗАКАЗ", F("oswald", 64, "Bold"), TXT),
        ("Manrope", "обычный текст, кнопки", "Игры и подписки для PS5", F("manrope", 36, "SemiBold"), MUTED)]
ry = y + 36
for nm, role, sample, fnt, col in rows:
    glass((M, ry, W - M, ry + 104), 22)
    d.text((M + 28, ry + 52), sample, font=fnt, fill=col, anchor="lm")
    d.text((W - M - 28, ry + 36), nm, font=F("manrope", 22, "ExtraBold"), fill=TXT, anchor="rm")
    d.text((W - M - 28, ry + 68), role, font=F("manrope", 18, "Medium"), fill=FAINT, anchor="rm")
    ry += 120

# ---------- схема поста + правила логотипа
y = 1430
label(y, "СХЕМА ПОСТА 4:5")
fx, fy, fw, fh = M, y + 36, 168, 210
glass((fx, fy, fx + fw, fy + fh), 16, fill=(14, 12, 42, 230))
base.alpha_composite(logo(30), (fx + 12, fy + 10))
spaced(d, (fx + fw - 12, fy + 20), "GTA VI", F("manrope", 9, "Bold"), GOLD, 2, "r")
hero = hgrad(84, 70, stops); base.paste(hero, (fx + 42, fy + 52), rmask(84, 70, 10))
d.rounded_rectangle((fx + 26, fy + 134, fx + fw - 26, fy + 152), 4, fill=TXT)
d.rounded_rectangle((fx + 46, fy + 160, fx + fw - 46, fy + 165), 2, fill=GOLD)
d.rounded_rectangle((fx + 48, fy + 180, fx + fw - 48, fy + 196), 8, fill=GOLD)

rules = [("Логотип", "слева сверху, высота ≈130 px, отступ ≈50 px"),
         ("Герой", "3D-предмет в центре: обложка, телефон, плюс"),
         ("Слово", "одно огромное, под ним строка с разрядкой"),
         ("Кнопка", "золотая: «Оформить: @Gaynullin_Nail»"),
         ("Нельзя", "тянуть и перекрашивать логотип, стиль Sony")]
tx = fx + fw + 40; ty = fy + 4
for k, v in rules:
    d.text((tx, ty), k, font=F("manrope", 21, "ExtraBold"), fill=GOLD if k != "Нельзя" else (255, 107, 149))
    d.text((tx + 130, ty), v, font=F("manrope", 21, "Medium"), fill=TXT)
    ty += 42

check_box = (0, 0, W, H)
out = os.path.join(os.path.dirname(__file__), "..", "brand-kit", "cheatsheet.png")
grain(base, 3, seed=2).save(out)
print("saved", os.path.abspath(out))
