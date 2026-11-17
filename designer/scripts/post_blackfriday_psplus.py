# Black Friday −20% на PS Plus: объёмный золотой «плюс» (своя форма, не логотип Sony) + огромное −20%.
import sys; sys.path.insert(0, "scripts")
from psfx import *

W, H = POST
bg = neon_bg((W, H), blobs=[((180, 150, 900, 760), (120, 82, 10), 200), ((300, 700, 800, 1200), (60, 22, 120), 220)], base=(6, 5, 8))

# ---------- 3D-плюс
P, T, R = 440, 150, 34          # размер, толщина перекладины, скругление
face = Image.new("RGBA", (P * SS, P * SS), (0, 0, 0, 0))
m = Image.new("L", face.size, 0); md = ImageDraw.Draw(m)
a, b = (P - T) / 2 * SS, (P + T) / 2 * SS
md.rounded_rectangle((a, 0, b, P * SS - 1), R * SS, fill=255)
md.rounded_rectangle((0, a, P * SS - 1, b), R * SS, fill=255)
gold = grad(Image.new("RGBA", face.size, (255, 255, 255, 255)), (255, 236, 150), (214, 140, 20), axis=0)
face.alpha_composite(gold); face.putalpha(m)
# блик и кромка
hl = Image.new("RGBA", face.size, (0, 0, 0, 0))
ImageDraw.Draw(hl).polygon([(0, 0), (int(face.width * .7), 0), (0, int(face.height * .7))], fill=(255, 255, 255, 60))
hl.putalpha(ImageChops.multiply(hl.split()[3], m)); face.alpha_composite(hl)
edge = m.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.MaxFilter(5))
e = Image.new("RGBA", face.size, (255, 248, 210, 255)); e.putalpha(edge.point(lambda v: min(255, v * 2))); face.alpha_composite(e)
cam = Cam(W / 2, 470, yaw=-24, pitch=16, roll=-8, focal=1500, scale=1.0)
plus = box3d(face, m, cam, (W, H), depth=90, w=P, h=P, side=((90, 50, 0), (200, 130, 20)), rim=(255, 220, 120), layers=40)
shadow(bg, plus, (0, 0), (30, 60), 40, 0.9)
glow(bg, plus, (0, 0), 70, 1, (255, 170, 30))
bg.alpha_composite(plus)
reflection(bg, plus, plus.getbbox()[3] - 6, strength=0.16, fade=0.22, blur=4)

# ---------- плоский текст
d = ImageDraw.Draw(bg)
tag = text_img("СКИДКА НА PS PLUS", font("unbounded", 40, "Bold"), (255, 214, 90, 255), pad=6, tracking=6)
bg.alpha_composite(tag, ((W - tag.width) // 2, 770))
big = text_img("−20%", font("unbounded", 250, "Black"), pad=10)
bx, by = (W - big.width) // 2, 830
bg.alpha_composite(big, (bx, by))
d = ImageDraw.Draw(bg)
ly = by + big.height + 22
lw = lined(d, ly, "BLACK FRIDAY  ·  ДО 30 ДЕКАБРЯ", font("manrope", 24, "Bold"), fill=(235, 225, 200), sp=6, line=(200, 160, 60))
cta = cta_pill(bg, W / 2, H - 112, "Оформить: @Gaynullin_Nail", font("manrope", 28, "Bold"), fill=(255, 210, 80), color=(30, 18, 0))

header(bg, right_top="BLACK FRIDAY", right_sub="ПОДПИСКИ PS PLUS", top_color=(255, 205, 80))
check({"tag": ((W - tag.width) / 2, 770, (W + tag.width) / 2, 770 + tag.height), "−20%": (bx, by, bx + big.width, by + big.height),
       "line": ((W - lw) / 2 - 106, ly, (W + lw) / 2 + 106, ly + 26), "cta": cta})
out = grain(bg, 5, seed=4); out.save("output/ps_shop_blackfriday_psplus.png")
preview(out, sys.argv[1] if len(sys.argv) > 1 else "output/_preview.png")
