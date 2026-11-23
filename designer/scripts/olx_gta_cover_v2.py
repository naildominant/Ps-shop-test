# OLX GTA 6 cover v2 (owner: bigger art, bigger text, readable as phone thumbnail). 1200x900.
import sys; sys.path.insert(0, "scripts")
from psfx import *
W, H = 1200, 900; GOLD, TXT = (255, 205, 120), (242, 239, 255)
for lg, (l1, l2) in {"ru": ("Навсегда", "гарантия 5 лет"), "uz": ("Umrbod", "5 yil kafolat")}.items():
    art = Image.open("assets/covers/gta6-jason-lucia.jpg").convert("RGB")
    k = max(W / art.width, H / art.height); art = art.resize((int(art.width * k) + 1, int(art.height * k) + 1), Image.LANCZOS)
    bg = art.crop((0, 0, W, H)).filter(ImageFilter.GaussianBlur(30)).convert("RGBA")
    sh = np.zeros((H, W, 4)); sh[..., :3] = (10, 6, 26); sh[..., 3] = (0.55 + 0.3 * np.clip(1 - np.linspace(0, 1, W) / 0.6, 0, 1))[None, :] * 255
    bg.alpha_composite(Image.fromarray(sh.astype("uint8")))
    cam = Cam(975, 470, yaw=-16, pitch=6, roll=-4, focal=1900)
    card = card3d(Image.open("assets/covers/gta6-cover.jpg"), 640, cam, (W, H), depth=18, rad=28, edge=((255, 200, 120), (255, 90, 170)))
    shadow(bg, card, (0, 0), (-26, 40), 40, 0.9); glow(bg, card, (0, 0), 60, 1, (255, 110, 170)); bg.alpha_composite(card)
    bg.alpha_composite(logo(96), (44, 34)); d = ImageDraw.Draw(bg)
    f = font("unbounded", 210, "Black"); d.text((44, 190), "GTA", font=f, fill=TXT); d.text((44, 400), "6", font=f, fill=GOLD)
    fb = font("unbounded", 54, "Bold"); d.text((52, 660), l1, font=fb, fill=TXT); d.text((52, 735), l2, font=fb, fill=GOLD)
    spaced(d, (W - 40, H - 44), "PS SHOP", font("unbounded", 22, "Bold"), TXT, 5, "r")
    grain(bg, 3, seed=2).convert("RGB").save(f"output/olx/olx_gta_{lg}_v2.jpg", quality=92, optimize=True, progressive=True)
