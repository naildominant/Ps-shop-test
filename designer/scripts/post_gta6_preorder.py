# GTA VI: предзаказ до 20 ноября. Ретро-сцена 80-х (схема H): закатное солнце, сетка пола, объёмная «20» на горизонте.
import sys; sys.path.insert(0, "scripts")
from psfx import *

W, H = POST
HZ = 905  # линия горизонта
bg = neon_bg((W, H), blobs=[((60, 380, 1020, 1000), (150, 30, 110), 200), ((-200, 900, 1300, 1500), (50, 16, 120), 230)], base=(8, 4, 16))

# ---------- солнце с полосами
R, sc = 330, (W // 2, HZ - 70)
sun = Image.new("RGBA", (W, H), (0, 0, 0, 0))
s = grad(Image.new("RGBA", (2 * R, 2 * R), (255, 255, 255, 255)), (255, 214, 90), (255, 60, 150), axis=1)
m = Image.new("L", (2 * R, 2 * R), 0); md = ImageDraw.Draw(m); md.ellipse((0, 0, 2 * R - 1, 2 * R - 1), fill=255)
for k in range(7):  # прорези снизу
    y = int(R * 1.05 + k * k * 4.2 + k * 26); md.rectangle((0, y, 2 * R, y + 6 + k * 3), fill=0)
s.putalpha(m); sun.alpha_composite(s, (sc[0] - R, sc[1] - R))
cut = Image.new("L", (W, H), 255); ImageDraw.Draw(cut).rectangle((0, HZ, W, H), fill=0)
sun.putalpha(ImageChops.multiply(sun.split()[3], cut))
glow(bg, sun, (0, 0), 90, 1, (255, 80, 140)); bg.alpha_composite(sun)

# ---------- пол
floor = Image.new("RGBA", (W, H), (0, 0, 0, 0)); ImageDraw.Draw(floor).rectangle((0, HZ, W, H), fill=(10, 4, 26, 235))
bg.alpha_composite(floor)
retro_grid(bg, HZ, color=(255, 70, 200), alpha=110, step=210)
ImageDraw.Draw(bg).line((0, HZ, W, HZ), fill=(255, 150, 220), width=3)

# ---------- 3D «20»
F = font("russo", 400)
d0 = ImageDraw.Draw(Image.new("L", (1, 1))); bb = d0.textbbox((0, 0), "20", font=F)
TW, TH = bb[2] - bb[0] + 20, bb[3] - bb[1] + 20
m = Image.new("L", (TW * SS, TH * SS), 0)
ImageDraw.Draw(m).text(((10 - bb[0]) * SS, (10 - bb[1]) * SS), "20", font=font("russo", 400 * SS), fill=255)
face = grad(Image.new("RGBA", m.size, (255, 255, 255, 255)), (255, 255, 255), (120, 235, 255), axis=1)
face.putalpha(m)
edge = m.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.MaxFilter(5))
e = Image.new("RGBA", m.size, (255, 255, 255, 255)); e.putalpha(edge); face.alpha_composite(e)
cam = Cam(W / 2, HZ - 150, yaw=-22, pitch=12, roll=-4, focal=1500, scale=1.0)
num = box3d(face, m, cam, (W, H), depth=80, w=TW, h=TH, side=((40, 10, 90), (255, 60, 170)), rim=(255, 170, 230), layers=40)
shadow(bg, num, (0, 0), (20, 40), 30, 0.8)
glow(bg, num, (0, 0), 50, 1, (80, 200, 255))
bg.alpha_composite(num)
reflection(bg, num, num.getbbox()[3] - 4, strength=0.25, fade=0.25, blur=5)

# ---------- плоский текст
tag_f = font("montserrat", 26, "Bold")
d = ImageDraw.Draw(bg)
tw = spaced(d, (W / 2, 205), "GTA VI  ·  ULTIMATE EDITION", tag_f, (255, 200, 120), 7, "c")
title = text_img("ПРЕДЗАКАЗ", font("russo", 132), pad=8)
tx, ty = (W - title.width) // 2, 245
bg.alpha_composite(title, (tx, ty))
d = ImageDraw.Draw(bg)
sub_y = 1010
sw = spaced(d, (W / 2, sub_y), "УСПЕЙ ДО 20 НОЯБРЯ", font("montserrat", 46, "ExtraBold"), (255, 255, 255), 4, "c")
ly = sub_y + 78
lw = lined(d, ly, "БОНУСЫ ПРЕДЗАКАЗА + ПОДАРКИ ОТ PS SHOP", font("montserrat", 20, "Bold"), fill=(255, 210, 235), sp=4, line=(255, 120, 200), length=50)
cta = cta_pill(bg, W / 2, H - 140, "Оформить: @Gaynullin_Nail", font("montserrat", 28, "Bold"), fill=(255, 210, 90), color=(40, 10, 30))

header(bg, right_top="GTA VI", right_sub="ТОЛЬКО ДО 20.11", top_color=(255, 190, 110))
check({"tag": ((W - tw) / 2, 205, (W + tw) / 2, 235), "title": (tx, ty, tx + title.width, ty + title.height),
       "sub": ((W - sw) / 2, sub_y, (W + sw) / 2, sub_y + 56), "line": ((W - lw) / 2 - 76, ly, (W + lw) / 2 + 76, ly + 22), "cta": cta})
out = grain(bg, 5, seed=6); out.save("output/ps_shop_gta6_preorder.png")
preview(out, sys.argv[1] if len(sys.argv) > 1 else "output/_preview.png")
