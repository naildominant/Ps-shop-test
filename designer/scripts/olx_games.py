# OLX GTA 6 + fun: owner's gameplay phone shots (black bars cropped), faces blurred, framed on brand bg. 1200x900.
# Usage: python3 scripts/olx_games.py <dir with *.png>
import sys; sys.path.insert(0, "scripts")
from psfx import *
from PIL import ImageEnhance

SRC = sys.argv[1]; W, H = 1200, 900
GOLD, TXT = (255, 205, 120), (242, 239, 255)
BLUR = {"gta_red_car.png": [(200, 1410, 160)],
        "mk1_brutality_group.png": [(133, 1377, 80), (258, 1332, 75), (320, 1644, 70), (1050, 1600, 75), (623, 1635, 60)]}

def load(fn):
    im = Image.open(f"{SRC}/{fn}").convert("RGB")
    for x, y, r in BLUR.get(fn, []):
        box = (x - r, y - r, x + r, y + r); reg = im.crop(box).filter(ImageFilter.GaussianBlur(r / 3))
        m = Image.new("L", reg.size, 0); ImageDraw.Draw(m).ellipse((0, 0, 2 * r, 2 * r), fill=255); im.paste(reg, box[:2], m.filter(ImageFilter.GaussianBlur(6)))
    im = im.crop((0, 230, 1179, 2325))
    im = ImageEnhance.Contrast(im).enhance(1.06); return ImageEnhance.Color(im).enhance(1.08)

def cover(im, w, h, cy=0.5):
    k = max(w / im.width, h / im.height); im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    x = (im.width - w) // 2; y = int((im.height - h) * cy); return im.crop((x, y, x + w, y + h))

def panel(bg, im, box, cy=0.5, rad=26):
    x0, y0, x1, y1 = box; ph = cover(im, x1 - x0, y1 - y0, cy).convert("RGBA"); ph.putalpha(rounded_mask(ph.size, rad))
    lay = Image.new("RGBA", bg.size, (0, 0, 0, 0)); lay.alpha_composite(ph, (x0, y0))
    shadow(bg, lay, (0, 0), (0, 18), 30, 0.7); bg.alpha_composite(lay)
    ImageDraw.Draw(bg).rounded_rectangle(box, rad, outline=(150, 120, 255), width=2)

def base():
    return neon_bg((W, H), blobs=[((500, -100, 1400, 700), (90, 35, 180), 220), ((-300, 400, 600, 1100), (110, 30, 130), 230)], base=(7, 6, 26))
def mark(bg): spaced(ImageDraw.Draw(bg), (W - 44, H - 48), "PS SHOP", font("unbounded", 22, "Bold"), TXT, 5, "r")
def caption(bg, txt, y=740): ImageDraw.Draw(bg).text((60, y), txt, font=font("unbounded", 56, "Bold"), fill=TXT)
def save(bg, path):
    grain(bg, 3, seed=2).convert("RGB").save(path, quality=92, optimize=True, progressive=True); print(path)

I = {f: load(f) for f in ["gta_title_tv.png", "gta_red_car.png", "gta_car_road.png", "gta_bridge.png",
                          "fc_friends_tv.png", "mk1_select_friends.png", "mk1_brutality_group.png"]}
CY = {"gta_title_tv.png": .62, "gta_red_car.png": .55, "gta_car_road.png": .38, "gta_bridge.png": .42,
      "fc_friends_tv.png": .55, "mk1_select_friends.png": .52, "mk1_brutality_group.png": .55}
TX = {"ru": {"title": "GTA 6 уже у наших клиентов", "play": "Играйте уже сегодня", "fc": "Играйте вдвоём", "mk": "Вечер с друзьями"},
      "uz": {"title": "GTA 6 allaqachon mijozlarimizda", "play": "Bugunoq o‘ynang", "fc": "Ikki kishi bo‘lib o‘ynang", "mk": "Do‘stlar bilan kecha"}}

def single_text(fn, txt, path):
    bg = base(); panel(bg, I[fn], (60, 50, 1140, 700), CY[fn])
    f = 56
    while ImageDraw.Draw(bg).textlength(txt, font=font("unbounded", f, "Bold")) > W - 120: f -= 2
    ImageDraw.Draw(bg).text((60, 740), txt, font=font("unbounded", f, "Bold"), fill=TXT); mark(bg); save(bg, path)

def single(fn, path):
    bg = base(); panel(bg, I[fn], (60, 40, 1140, 820), CY[fn]); mark(bg); save(bg, path)

for lg, t in TX.items():
    single_text("gta_title_tv.png", t["title"], f"output/olx/gta/01_title_{lg}.jpg")
    bg = base()
    for k, fn in enumerate(["gta_red_car.png", "gta_car_road.png", "gta_bridge.png"]):
        panel(bg, I[fn], (60 + k * 365, 50, 60 + k * 365 + 345, 700), CY[fn])
    caption(bg, t["play"]); mark(bg); save(bg, f"output/olx/gta/02_gameplay_{lg}.jpg")
    single_text("fc_friends_tv.png", t["fc"], f"output/olx/fun/fc_{lg}.jpg")
    single_text("mk1_brutality_group.png", t["mk"], f"output/olx/fun/mk1_{lg}.jpg")
for n, fn in ((3, "gta_red_car.png"), (4, "gta_car_road.png"), (5, "gta_bridge.png")):
    single(fn, f"output/olx/gta/0{n}_gameplay.jpg")
single("mk1_select_friends.png", "output/olx/fun/mk1_select.jpg")
