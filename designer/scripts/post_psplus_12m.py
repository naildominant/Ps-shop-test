# PS Plus на 12 месяцев: огромное «12», лесенка из трёх объёмных плюсов (Essential / Extra / Deluxe).
import sys; sys.path.insert(0, "scripts")
from psfx import *

W, H = POST
bg = neon_bg((W, H), blobs=[((100, 120, 900, 700), (110, 70, 12), 190), ((200, 700, 1000, 1300), (50, 24, 120), 230)], base=(6, 5, 12))
sparks(bg, 40, seed=11)

def plus3d(c1, c2, rim, P=124, T=44, R=11, yaw=-26):
    face = Image.new("RGBA", (P * SS, P * SS), (0, 0, 0, 0)); m = Image.new("L", face.size, 0); md = ImageDraw.Draw(m)
    a, b = (P - T) / 2 * SS, (P + T) / 2 * SS
    md.rounded_rectangle((a, 0, b, P * SS - 1), R * SS, fill=255); md.rounded_rectangle((0, a, P * SS - 1, b), R * SS, fill=255)
    face.alpha_composite(grad(Image.new("RGBA", face.size, (255, 255, 255, 255)), c1, c2, axis=0)); face.putalpha(m)
    hl = Image.new("RGBA", face.size, (0, 0, 0, 0))
    ImageDraw.Draw(hl).polygon([(0, 0), (int(face.width * .7), 0), (0, int(face.height * .7))], fill=(255, 255, 255, 60))
    hl.putalpha(ImageChops.multiply(hl.split()[3], m)); face.alpha_composite(hl)
    return face, m

tiers = [("Essential", (200, 222, 255), (96, 124, 224), (225, 238, 255), (40, 52, 120), (110, 130, 220)),
         ("Extra",     (255, 236, 150), (214, 140, 20), (255, 220, 120), (90, 50, 0), (200, 130, 20)),
         ("Deluxe",    (255, 190, 240), (170, 60, 230), (255, 210, 250), (70, 20, 120), (200, 90, 240))]

# ---------- плоский текст сверху
tag = text_img("PS PLUS", font("unbounded", 46, "Bold"), (255, 214, 90, 255), pad=6, tracking=14)
bg.alpha_composite(tag, ((W - tag.width) // 2, 196))
big = text_img("12", font("unbounded", 330, "Black"), pad=10)
bx, by = (W - big.width) // 2, 262
bg.alpha_composite(big, (bx, by))
mon = text_img("МЕСЯЦЕВ", font("unbounded", 92, "Black"), (242, 239, 255, 255), pad=6, tracking=4)
mx, my = (W - mon.width) // 2, by + big.height - 6
bg.alpha_composite(mon, (mx, my))

# ---------- лесенка плюсов
rows = [800, 940, 1080]; boxes = {}
for i, ((name, c1, c2, rim, s1, s2), y) in enumerate(zip(tiers, rows)):
    cx = 200 + i * 95
    face, m = plus3d(c1, c2, rim)
    cam = Cam(cx, y, yaw=-26, pitch=14, roll=-8, focal=1500, scale=1.0)
    pl = box3d(face, m, cam, (W, H), depth=40, w=124, h=124, side=(s1, s2), rim=rim, layers=22)
    shadow(bg, pl, (0, 0), (14, 26), 22, 0.9); glow(bg, pl, (0, 0), 40, 1, c2); bg.alpha_composite(pl)
    t = text_img(name, font("unbounded", 58, "Bold"), (242, 239, 255, 255), pad=6)
    tx, ty = cx + 100, y - t.height // 2
    bg.alpha_composite(t, (tx, ty)); boxes[name] = (tx, ty, tx + t.width, ty + t.height)
    d = ImageDraw.Draw(bg); d.line((tx + t.width + 24, y + 6, W - 70, y + 6), fill=c2 + (120,), width=2)

d = ImageDraw.Draw(bg)
cta = cta_pill(bg, W / 2, H - 112, "Оформить: @Gaynullin_Nail", font("manrope", 28, "Bold"), fill=(255, 210, 80), color=(30, 18, 0))
header(bg, right_top="BLACK FRIDAY", right_sub="ДО 30 НОЯБРЯ", top_color=(255, 205, 80))
boxes.update({"tag": ((W - tag.width) / 2, 196, (W + tag.width) / 2, 196 + tag.height), "12": (bx, by + 30, bx + big.width, by + big.height - 40),
              "mon": (mx, my, mx + mon.width, my + mon.height), "cta": cta})
check(boxes)
out = grain(bg, 5, seed=9); out.convert("RGB").save("output/ps_shop_psplus_12m.png")
preview(out, sys.argv[1] if len(sys.argv) > 1 else "output/_preview.png", 800)
