# OLX rent cover v2 (owner 23.11): «Аренда PS5 без залога», real GTA 6 poster huge, huge text. 1200x900.
import sys; sys.path.insert(0, "scripts")
from psfx import *
W, H = 1200, 900; GOLD, TXT = (255, 205, 120), (242, 239, 255)
T = {"ru": (["Аренда", "PS5"], "без залога", "Доставка · 2 джойстика · GTA 6"),
     "uz": (["PS5", "ijara"], "garovsiz", "Yetkazib berish · 2 joystik · GTA 6")}
for lg, (head, big2, ben) in T.items():
    art = Image.open("assets/covers/gta6-jason-lucia.jpg").convert("RGB")
    k = max(W / art.width, H / art.height); art = art.resize((int(art.width * k) + 1, int(art.height * k) + 1), Image.LANCZOS)
    bg = art.crop((0, 0, W, H)).filter(ImageFilter.GaussianBlur(30)).convert("RGBA")
    sh = np.zeros((H, W, 4)); sh[..., :3] = (10, 6, 26); sh[..., 3] = (0.55 + 0.32 * np.clip(1 - np.linspace(0, 1, W) / 0.6, 0, 1))[None, :] * 255
    bg.alpha_composite(Image.fromarray(sh.astype("uint8")))
    cam = Cam(1020, 440, yaw=-16, pitch=6, roll=-4, focal=1900)
    card = card3d(Image.open("assets/covers/gta6-cover.jpg"), 660, cam, (W, H), depth=18, rad=28, edge=((255, 200, 120), (255, 90, 170)))
    shadow(bg, card, (0, 0), (-26, 40), 40, 0.9); glow(bg, card, (0, 0), 60, 1, (255, 110, 170)); bg.alpha_composite(card)
    bg.alpha_composite(logo(92), (44, 30)); d = ImageDraw.Draw(bg)
    f = font("unbounded", 140, "Black"); y = 165
    for ln in head: d.text((40, y), ln, font=f, fill=TXT); y += 165
    hb = font("unbounded", 92, "Black")
    highlight(bg, (40, y + 18), big2, hb, bg=GOLD, fg=(20, 12, 40), padx=24, pady=16, angle=2)
    d = ImageDraw.Draw(bg)
    fb = font("manrope", 40, "ExtraBold")
    while d.textlength(ben, font=fb) > 700: fb = font("manrope", fb.size - 2, "ExtraBold")
    d.text((46, 770), ben, font=fb, fill=TXT)
    spaced(d, (W - 40, H - 44), "PS SHOP", font("unbounded", 22, "Bold"), TXT, 5, "r")
    grain(bg, 3, seed=2).convert("RGB").save(f"output/olx/olx_rent_{lg}_v2.jpg", quality=92, optimize=True, progressive=True)
