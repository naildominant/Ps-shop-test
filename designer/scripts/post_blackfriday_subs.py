# Black Friday: −20% на все подписки. Минимализм: чёрный фон, стопка 3D-карточек подписок, плоский текст.
import sys; sys.path.insert(0, "scripts")
from psfx import *

W, H = POST
bg = neon_bg((W, H), blobs=[((170, 160, 910, 820), (60, 22, 130), 190)], base=(5, 4, 9))

# ---------- 3D-карточки подписок
CW, CH = 560, 350
def card_face(name, c1, c2, rim):
    f = grad(Image.new("RGBA", (CW * SS, CH * SS), (255, 255, 255, 255)), c1, c2, axis=1)
    d = ImageDraw.Draw(f)
    spaced(d, (44 * SS, 44 * SS), name, font("manrope", 34 * SS, "Bold"), (255, 255, 255), 6 * SS)
    spaced(d, (44 * SS, 96 * SS), "ПОДПИСКА PS PLUS", font("manrope", 17 * SS, "Medium"), (190, 180, 225), 4 * SS)
    # плашка −20% на карточке
    fb = font("unbounded", 30 * SS, "Bold"); tw = d.textlength("−20%", font=fb)
    x1, y1 = (CW - 44) * SS, (CH - 44) * SS
    d.rounded_rectangle((x1 - tw - 44 * SS, y1 - 62 * SS, x1, y1), 31 * SS, fill=rim + (255,))
    d.text((x1 - tw - 22 * SS, y1 - 54 * SS), "−20%", font=fb, fill=(10, 6, 20))
    # чип
    d.rounded_rectangle((44 * SS, (CH - 106) * SS, 112 * SS, (CH - 56) * SS), 10 * SS, outline=(255, 255, 255, 70), width=2 * SS)
    m = rounded_mask(f.size, 34 * SS); f.putalpha(m)
    r = Image.new("L", f.size, 0); ImageDraw.Draw(r).rounded_rectangle((0, 0, f.width - 1, f.height - 1), 34 * SS, outline=255, width=3 * SS)
    e = Image.new("RGBA", f.size, rim + (255,)); e.putalpha(r.point(lambda v: v * 0.8)); f.alpha_composite(e)
    gl = Image.new("RGBA", f.size, (0, 0, 0, 0))
    ImageDraw.Draw(gl).polygon([(0, 0), (int(f.width * .55), 0), (0, int(f.height * .9))], fill=(255, 255, 255, 18))
    gl.putalpha(ImageChops.multiply(gl.split()[3], m)); f.alpha_composite(gl)
    return f, m

cards = [  # сзади → вперёд
    ("ESSENTIAL", (16, 20, 46), (30, 44, 96), (110, 170, 255), 0),
    ("EXTRA", (26, 14, 48), (62, 28, 110), (180, 130, 255), 1),
    ("DELUXE", (12, 8, 18), (40, 16, 52), (255, 130, 220), 2),
]
layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
for name, c1, c2, rim, i in cards:
    face, m = card_face(name, c1, c2, rim)
    cam = Cam(W / 2 + 20 - i * 40, 325 + i * 112, yaw=-26, pitch=34, roll=-14, focal=1600, scale=0.95)
    lay = box3d(face, m, cam, (W, H), depth=12, w=CW, h=CH, side=((20, 14, 36), tuple(min(255, v // 2 + 40) for v in rim)), rim=rim)
    shadow(layer, lay, (0, 0), (10, 34), 24, 0.85)
    layer.alpha_composite(lay)
glow(bg, layer, (0, 0), 60, 1, (120, 60, 230))
bg.alpha_composite(layer)

# ---------- плоский текст
d = ImageDraw.Draw(bg)
big = text_img("−20%", font("unbounded", 230, "Black"), pad=10)
bx, by = (W - big.width) // 2, 815
bg.alpha_composite(big, (bx, by))
sub = text_img("на все подписки", font("manrope", 54, "SemiBold"), (235, 230, 250, 255), pad=8)
sx, sy = (W - sub.width) // 2, by + big.height + 8
bg.alpha_composite(sub, (sx, sy))
d = ImageDraw.Draw(bg)
ly = sy + sub.height + 34
lw = lined(d, ly, "BLACK FRIDAY  ·  ДО 30 ДЕКАБРЯ", font("manrope", 22, "Bold"), fill=(200, 190, 230), sp=6, line=(120, 100, 170))
cta = cta_pill(bg, W / 2, H - 120, "Оформить: @Gaynullin_Nail", font("manrope", 28, "Bold"), fill=(255, 255, 255), color=(20, 10, 40))

header(bg, right_top="BLACK FRIDAY", right_sub="PS SHOP · ТАШКЕНТ")
check({"−20%": (bx, by, bx + big.width, by + big.height), "sub": (sx, sy, sx + sub.width, sy + sub.height),
       "line": ((W - lw) / 2 - 106, ly, (W + lw) / 2 + 106, ly + 26), "cta": cta})
out = grain(bg, 5, seed=3); out.save("output/ps_shop_blackfriday_subs.png")
preview(out, sys.argv[1] if len(sys.argv) > 1 else "output/_preview.png")
