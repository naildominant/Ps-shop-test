# GTA VI: предзаказ до 20 ноября (v2). Эстетика заката Vice City: размытый арт на фоне, официальная обложка 3D-пластиной, плоский текст.
import sys; sys.path.insert(0, "scripts")
from psfx import *

W, H = POST
# ---------- фон: арт Джейсона и Люсии, сильно размыт и затемнён
art = Image.open("assets/covers/gta6-jason-lucia.jpg").convert("RGB")
k = max(W / art.width, H / art.height); art = art.resize((int(art.width * k) + 1, int(art.height * k) + 1), Image.LANCZOS)
art = art.crop(((art.width - W) // 2, (art.height - H) // 2, (art.width - W) // 2 + W, (art.height - H) // 2 + H))
bg = art.filter(ImageFilter.GaussianBlur(38)).convert("RGBA")
shade = np.zeros((H, W, 4)); t = np.linspace(0, 1, H)[:, None]
shade[..., 0], shade[..., 1], shade[..., 2] = 14, 6, 26
shade[..., 3] = (0.42 + 0.5 * np.clip((t - 0.45) / 0.4, 0, 1) + 0.35 * np.clip(1 - t / 0.16, 0, 1)) * 255
bg.alpha_composite(Image.fromarray(shade.astype("uint8")))

# ---------- герой: обложка игры 3D-пластиной
cover = Image.open("assets/covers/gta6-cover.jpg")
cam = Cam(W / 2, 520, yaw=-18, pitch=8, roll=-5, focal=1700, scale=1.0)
card = card3d(cover, 560, cam, (W, H), depth=18, rad=30, edge=((255, 200, 120), (255, 90, 170)))
shadow(bg, card, (0, 0), (24, 50), 40, 0.9)
glow(bg, card, (0, 0), 70, 1, (255, 110, 160))
bg.alpha_composite(card)
sparks(bg, 40, area=(60, 170, W - 60, 820), seed=11)

# ---------- плоский текст
d = ImageDraw.Draw(bg)
title = text_img("ПРЕДЗАКАЗ", font("oswald", 150, "Bold"), pad=8)
tx, ty = (W - title.width) // 2, 860
bg.alpha_composite(title, (tx, ty))
d = ImageDraw.Draw(bg)
sy = ty + title.height + 6
sw = spaced(d, (W / 2, sy), "УСПЕЙ ДО 20 НОЯБРЯ", font("manrope", 34, "Bold"), (255, 205, 120), 8, "c")
# три плашки-бонуса (стекло)
chips = ["Vintage Vice City", "1 месяц GTA+", "Подарки от PS SHOP"]
cf = font("manrope", 23, "SemiBold"); gap = 14
ws = [d.textlength(c, font=cf) + 44 for c in chips]; x = (W - sum(ws) - gap * 2) / 2; cy = sy + 66
for c, w in zip(chips, ws):
    g = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(g).rounded_rectangle((x, cy, x + w, cy + 50), 25, fill=(255, 255, 255, 30), outline=(255, 255, 255, 110), width=2)
    bg.alpha_composite(g); ImageDraw.Draw(bg).text((x + 22, cy + 11), c, font=cf, fill=(255, 255, 255)); x += w + gap
chips_box = ((W - sum(ws) - gap * 2) / 2, cy, (W + sum(ws) + gap * 2) / 2, cy + 50)
cta = cta_pill(bg, W / 2, H - 128, "Оформить: @Gaynullin_Nail", font("manrope", 28, "Bold"), fill=(255, 205, 110), color=(40, 12, 30))

header(bg, right_top="GTA VI", right_sub="ULTIMATE EDITION · PS5", top_color=(255, 200, 120))
check({"title": (tx, ty, tx + title.width, ty + title.height), "sub": ((W - sw) / 2, sy, (W + sw) / 2, sy + 40),
       "chips": chips_box, "cta": cta})
out = grain(bg, 4, seed=7); out.save("output/ps_shop_gta6_preorder.png")
preview(out, sys.argv[1] if len(sys.argv) > 1 else "output/_preview.png")
