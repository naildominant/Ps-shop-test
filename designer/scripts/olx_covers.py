# OLX covers 1200x900 (4:3): 3 ads x ru/uz. Left: flat text; right: 3D hero. Logo top-left.
import sys; sys.path.insert(0, "scripts")
from psfx import *

W, H = 1200, 900
GOLD = (255, 205, 120)

def gold_plus(cam, P=330):
    T, R = int(P * .34), int(P * .08)
    face = Image.new("RGBA", (P * SS, P * SS), (0, 0, 0, 0)); m = Image.new("L", face.size, 0); md = ImageDraw.Draw(m)
    a, b = (P - T) / 2 * SS, (P + T) / 2 * SS
    md.rounded_rectangle((a, 0, b, P * SS - 1), R * SS, fill=255); md.rounded_rectangle((0, a, P * SS - 1, b), R * SS, fill=255)
    face.alpha_composite(grad(Image.new("RGBA", face.size, (255, 255, 255, 255)), (255, 236, 150), (214, 140, 20), axis=0)); face.putalpha(m)
    hl = Image.new("RGBA", face.size, (0, 0, 0, 0))
    ImageDraw.Draw(hl).polygon([(0, 0), (int(face.width * .7), 0), (0, int(face.height * .7))], fill=(255, 255, 255, 60))
    hl.putalpha(ImageChops.multiply(hl.split()[3], m)); face.alpha_composite(hl)
    return box3d(face, m, cam, (W, H), depth=70, w=P, h=P, side=((90, 50, 0), (200, 130, 20)), rim=(255, 220, 120), layers=36)

def hero(kind):
    if kind == "plus":
        cam = Cam(890, 455, yaw=-24, pitch=14, roll=-8, focal=1500)
        return gold_plus(cam), (255, 170, 30)
    img = "assets/covers/gta6-cover.jpg" if kind == "gta" else "assets/covers/gta6-jason-lucia.jpg"
    if kind == "gta":
        cam = Cam(880, 470, yaw=-20, pitch=8, roll=-5, focal=1700); w = 380
    else:
        cam = Cam(915, 450, yaw=-22, pitch=10, roll=-6, focal=1600); w = 400
    return card3d(Image.open(img), w, cam, (W, H), depth=16, rad=26, edge=((255, 200, 120), (255, 90, 170))), (255, 110, 170)

def fit(txt, name, size, maxw, weight=None):
    while True:
        f = font(name, size, weight)
        if ImageDraw.Draw(Image.new("L", (1, 1))).textlength(txt, font=f) <= maxw or size < 40: return f
        size -= 4

def make(kind, title, benefit, chips, out):
    bg = neon_bg((W, H), blobs=[((560, 80, 1300, 820), (110, 40, 200), 200), ((-300, 450, 500, 1100), (130, 30, 140), 230),
                               ((700, 500, 1400, 1100), (20, 60, 210), 220)], base=(7, 6, 26))
    h, gc = hero(kind)
    shadow(bg, h, (0, 0), (26, 50), 38, 0.85); glow(bg, h, (0, 0), 60, 1, gc); bg.alpha_composite(h)
    reflection(bg, h, h.getbbox()[3] - 4, strength=0.14, fade=0.2, blur=4)
    sparks(bg, 26, area=(640, 80, 1160, 820), seed=5)
    bg.alpha_composite(logo(104), (52, 40))
    d = ImageDraw.Draw(bg); x = 64; maxw = 560
    lines = title.split("\n"); f = fit(max(lines, key=len), "unbounded", 116, maxw)
    y = 300 - (len(lines) - 1) * 70
    boxes = {}
    for i, ln in enumerate(lines):
        d.text((x, y), ln, font=f, fill=(242, 239, 255)); bb = d.textbbox((x, y), ln, font=f); boxes[f"t{i}"] = bb; y = bb[3] + 18
    y += 26
    d.rectangle((x, y, x + 90, y + 6), fill=GOLD); y += 34
    fb = fit(benefit, "manrope", 44, maxw, "Bold")
    d.text((x, y), benefit, font=fb, fill=GOLD); bb = d.textbbox((x, y), benefit, font=fb); boxes["benefit"] = bb; y = bb[3] + 30
    fc = font("manrope", 30, "SemiBold")
    for c in chips:
        d.text((x, y), "•  " + c, font=fc, fill=(169, 163, 212)); bb = d.textbbox((x, y), "•  " + c, font=fc); boxes[c] = bb; y = bb[3] + 12
    # footer
    d.line((x, H - 96, W - 64, H - 96), fill=(80, 70, 150), width=2)
    spaced(d, (x, H - 64), "PS SHOP", font("unbounded", 30, "Bold"), (242, 239, 255), 6)
    spaced(d, (W - 64, H - 60), "TOSHKENT", font("manrope", 22, "SemiBold"), (169, 163, 212), 6, "r")
    check(boxes, (W, H), 40)
    grain(bg, 4, seed=3).convert("RGB").save(out, quality=92, optimize=True, progressive=True)
    preview(Image.open(out), out.replace(".jpg", "_pv.png"), 600)

ADS = [
 ("rent", {"ru": ("Аренда\nPS5", "Доставка, 2 джойстика, GTA 6", []),
           "uz": ("PS5\nijara", "Yetkazib berish, 2 joystik, GTA 6", [])}),
 ("plus", {"ru": ("PS Plus", "от 269 000 сум", []),
           "uz": ("PS Plus", "269 000 so‘mdan", [])}),
 ("gta",  {"ru": ("GTA 6", "Навсегда · гарантия 5 лет", []),
           "uz": ("GTA 6", "Umrbod · 5 yil kafolat", [])}),
]
for kind, langs in ADS:
    for lg, (t, b, c) in langs.items():
        print(kind, lg); make(kind, t, b, c, f"output/olx/olx_{kind}_{lg}.jpg")
