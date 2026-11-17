"""psfx — общая библиотека приёмов PS SHOP для картинок (Pillow + numpy).

Подключение в скрипте из папки designer/:
    import sys; sys.path.insert(0, "scripts"); from psfx import *

Правила владельца: 3D-объекты + плоский 2D-текст; логотип только слева сверху и без изменений;
в текстах на картинке только PS5; максимум 2 шрифта.
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
import numpy as np, math, random, os

POST = (1080, 1350)
STORY = (1080, 1920)
SS = 2  # суперсэмплинг для 3D-объектов

# ---------------------------------------------------------------- шрифты
_HERE = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.path.join(_HERE, "..", "assets", "fonts")
INTER = "/usr/share/fonts/opentype/inter/"
FONTS = {
    # огромные слова и заголовки
    "display":   (INTER + "InterDisplay-Black.otf", None),
    "unbounded": ("Unbounded[wght].ttf", "Black"),
    "russo":     ("RussoOne-Regular.ttf", None),
    "oswald":    ("Oswald[wght].ttf", "Bold"),
    "montserrat":("Montserrat[wght].ttf", "Black"),
    # fashion-курсив
        "playfair":  ("PlayfairDisplay-Italic[wght].ttf", "Italic"),
    "cormorant": ("Cormorant-Italic[wght].ttf", "Medium Italic"),
    # мелкие строки с разрядкой, кнопки
    "text":      (INTER + "Inter-Medium.otf", None),
    "semibold":  (INTER + "Inter-SemiBold.otf", None),
    "bold":      (INTER + "Inter-Bold.otf", None),
    "black":     (INTER + "Inter-Black.otf", None),
    "manrope":   ("Manrope[wght].ttf", "Medium"),
    # ретро 80-х и глитч
    "pixel":     ("PressStart2P-Regular.ttf", None),
    "glitch":    ("RubikGlitch-Regular.ttf", None),
    "mono":      ("RubikMonoOne-Regular.ttf", None),
}

def font(name, size, weight=None):
    """font("unbounded", 200) или font("manrope", 24, "Bold"). Можно передать путь к файлу."""
    path, default_w = FONTS.get(name, (name, None))
    if not os.path.isabs(path):
        path = os.path.join(FONT_DIR, path)
    f = ImageFont.truetype(path, size)
    w = weight or default_w
    if w and path.endswith("].ttf"):
        try: f.set_variation_by_name(w)
        except Exception: pass
    return f

# ---------------------------------------------------------------- базовые инструменты
def tint(im, col):
    t = Image.new("RGBA", im.size, tuple(col[:3]) + (255,)); t.putalpha(im.split()[3]); return t

def glow(base, im, xy=(0, 0), blur=30, times=1, color=None):
    """Неоновое свечение под слоем im. color — перекрасить свечение."""
    src = tint(im, color) if color else im
    g = Image.new("RGBA", base.size, (0, 0, 0, 0)); g.alpha_composite(src, (int(xy[0]), int(xy[1])))
    g = g.filter(ImageFilter.GaussianBlur(blur))
    for _ in range(times): base.alpha_composite(g)

def shadow(base, im, xy, offset=(30, 45), blur=30, opacity=1.0):
    a = im.split()[3].point(lambda v: int(v * opacity))
    s = Image.new("RGBA", im.size, (0, 0, 0, 255)); s.putalpha(a)
    g = Image.new("RGBA", base.size, (0, 0, 0, 0)); g.alpha_composite(s, (int(xy[0] + offset[0]), int(xy[1] + offset[1])))
    base.alpha_composite(g.filter(ImageFilter.GaussianBlur(blur)))

def grad(im, c1, c2, axis=1, c3=None):
    """Заливка непрозрачной части im градиентом (axis=1 слева→направо, 0 сверху→вниз)."""
    a = np.array(im.convert("RGBA")).astype(float); n = a.shape[axis]; t = np.linspace(0, 1, n)
    t = t[None, :] if axis == 1 else t[:, None]
    if c3 is None:
        for k in range(3): a[..., k] = c1[k] * (1 - t) + c2[k] * t
    else:
        for k in range(3):
            a[..., k] = np.where(t < .5, c1[k] * (1 - 2 * t) + c2[k] * 2 * t, c2[k] * (2 - 2 * t) + c3[k] * (2 * t - 1))
    return Image.fromarray(a.astype("uint8"))

def rounded_mask(size, r):
    m = Image.new("L", size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), r, fill=255); return m

# ---------------------------------------------------------------- типографика (плоская)
def text_img(txt, fnt, fill=(255, 255, 255, 255), sx=1.0, pad=20, tracking=0):
    """Текст отдельным слоем. sx<1 — сжатие ширины (слово-постер), tracking — разрядка в px."""
    d = ImageDraw.Draw(Image.new("L", (1, 1)))
    if tracking:
        w = sum(d.textlength(c, font=fnt) for c in txt) + tracking * (len(txt) - 1)
        bb = d.textbbox((0, 0), txt, font=fnt); h = bb[3] - bb[1]
        im = Image.new("RGBA", (int(w) + 2 * pad, h + pad), (0, 0, 0, 0)); dd = ImageDraw.Draw(im); x = pad
        for c in txt: dd.text((x, -bb[1] + pad // 2), c, font=fnt, fill=fill); x += d.textlength(c, font=fnt) + tracking
    else:
        bb = d.textbbox((0, 0), txt, font=fnt)
        im = Image.new("RGBA", (bb[2] - bb[0] + 2 * pad, bb[3] - bb[1] + pad), (0, 0, 0, 0))
        ImageDraw.Draw(im).text((-bb[0] + pad, -bb[1] + pad // 2), txt, font=fnt, fill=fill)
    if sx != 1.0: im = im.resize((max(1, int(im.width * sx)), im.height), Image.LANCZOS)
    return im

def spaced(d, xy, txt, fnt, fill, sp=6, anchor="l"):
    """Строка с разрядкой прямо на холсте. anchor: l / c / r. Возвращает ширину."""
    w = sum(d.textlength(c, font=fnt) for c in txt) + sp * (len(txt) - 1); x, y = xy
    x = x - w if anchor == "r" else (x - w / 2 if anchor == "c" else x)
    for c in txt: d.text((x, y), c, font=fnt, fill=fill); x += d.textlength(c, font=fnt) + sp
    return w

def lined(d, y, txt, fnt, fill=(235, 228, 255), sp=8, cx=None, W=1080, line=(200, 170, 255), gap=26, length=80):
    """Тонкая строка с разрядкой и линиями по бокам (по центру)."""
    cx = W / 2 if cx is None else cx
    w = spaced(d, (cx, y), txt, fnt, fill, sp, "c"); h = fnt.size * 0.62
    for x1, x2 in [(cx - w / 2 - gap - length, cx - w / 2 - gap), (cx + w / 2 + gap, cx + w / 2 + gap + length)]:
        d.line((x1, y + h, x2, y + h), fill=line, width=2)
    return w

def cta_pill(base, cx, y, txt="psshop.uz  →", fnt=None, fill=(255, 255, 255), color=(60, 20, 140), outline=False):
    """Кнопка-пилюля. outline=True — прозрачная с обводкой. Возвращает бокс."""
    fnt = fnt or font("black", 34); d = ImageDraw.Draw(base); tw = d.textlength(txt, font=fnt)
    pw, ph = tw + 100, fnt.size + 46; px = cx - pw / 2
    pill = Image.new("RGBA", base.size, (0, 0, 0, 0)); pd = ImageDraw.Draw(pill)
    if outline: pd.rounded_rectangle((px, y, px + pw, y + ph), ph / 2, outline=fill + (255,), width=3, fill=(120, 60, 255, 60))
    else: pd.rounded_rectangle((px, y, px + pw, y + ph), ph / 2, fill=fill + (255,))
    glow(base, pill, (0, 0), 20, 1); base.alpha_composite(pill)
    ImageDraw.Draw(base).text((px + 50, y + 23 - fnt.size * 0.12), txt, font=fnt, fill=(fill if outline else color))
    return (px, y, px + pw, y + ph)

def highlight(base, xy, txt, fnt, bg=(255, 80, 210), fg=(255, 255, 255), padx=22, pady=10, angle=0):
    """Плашка-выделение: фраза в цветном прямоугольнике."""
    d = ImageDraw.Draw(Image.new("L", (1, 1))); bb = d.textbbox((0, 0), txt, font=fnt)
    w, h = bb[2] - bb[0] + 2 * padx, bb[3] - bb[1] + 2 * pady
    im = Image.new("RGBA", (w, h), bg + (255,)); ImageDraw.Draw(im).text((padx - bb[0], pady - bb[1]), txt, font=fnt, fill=fg)
    if angle: im = im.rotate(angle, resample=Image.BICUBIC, expand=True)
    base.alpha_composite(im, (int(xy[0]), int(xy[1]))); return im.size

# ---------------------------------------------------------------- фон и фактура
NEON = [(100, 32, 205), (150, 30, 150), (20, 60, 215)]

def neon_bg(size=POST, blobs=None, base=(6, 4, 14)):
    """Тёмный фон с мягкими неоновыми пятнами. blobs: [((x0,y0,x1,y1), (r,g,b), blur), ...]"""
    W, H = size
    blobs = blobs or [((W * .13, H * .09, W * .89, H * .67), NEON[0], 210),
                      ((-W * .28, H * .52, W * .46, H * 1.1), NEON[1], 230),
                      ((W * .57, H * .44, W * 1.3, H), NEON[2], 230)]
    bg = Image.new("RGB", size, base)
    for box, col, r in blobs:
        g = Image.new("RGB", size); ImageDraw.Draw(g).ellipse(box, fill=col); bg = ImageChops.add(bg, g.filter(ImageFilter.GaussianBlur(r)))
    return bg.convert("RGBA")

def diagonal_split(base, color=(255, 70, 190), alpha=70, k=0.35, y=0.55):
    """Диагональный разрез фона: вторая зона цвета."""
    W, H = base.size; m = Image.new("RGBA", base.size, (0, 0, 0, 0))
    ImageDraw.Draw(m).polygon([(0, H * y + W * k / 2), (W, H * y - W * k / 2), (W, H), (0, H)], fill=color + (alpha,))
    base.alpha_composite(m)

def retro_grid(base, horizon, color=(140, 90, 255), alpha=55, step=220):
    """Ретро-сетка пола 80-х ниже линии horizon."""
    W, H = base.size; d = ImageDraw.Draw(base)
    for i in range(-14, 15): d.line((W / 2 + i * 30, horizon, W / 2 + i * step, H), fill=color + (alpha,), width=2)
    for k in range(14):
        y = horizon + (k ** 1.8) * 6
        if y < H: d.line((0, y, W, y), fill=color + (int(alpha * (1 - k / 14)),), width=2)

def sparks(base, n=50, area=None, avoid=None, seed=7):
    """Искры. area=(x0,y0,x1,y1); avoid — бокс, где искр быть не должно (например, текст)."""
    rnd = random.Random(seed); W, H = base.size; x0, y0, x1, y1 = area or (20, 20, W - 20, H - 20); d = ImageDraw.Draw(base)
    for _ in range(n):
        x, y = rnd.randint(int(x0), int(x1)), rnd.randint(int(y0), int(y1))
        if avoid and avoid[0] < x < avoid[2] and avoid[1] < y < avoid[3]: continue
        r = rnd.choice([1, 1, 2, 2, 3])
        d.ellipse((x - r, y - r, x + r, y + r), fill=rnd.choice([(255, 160, 240), (140, 190, 255), (255, 255, 255)]) + (rnd.randint(60, 190),))

def dot_grid(d, x, y, cols=6, rows=3, step=22, color=(150, 140, 220, 150)):
    for i in range(cols):
        for j in range(rows): d.ellipse((x + i * step - 2, y + j * step - 2, x + i * step + 2, y + j * step + 2), fill=color)

def grain(base, amount=6, seed=None):
    rng = np.random.default_rng(seed); W, H = base.size
    a = np.array(base.convert("RGB")).astype(float) + rng.normal(0, amount, (H, W, 1))
    return Image.fromarray(np.clip(a, 0, 255).astype("uint8"))

def chroma_shift(im, dx=6):
    """Хроматическое смещение (глитч) для слоя RGBA."""
    out = Image.new("RGBA", (im.width + 2 * dx, im.height), (0, 0, 0, 0))
    out.alpha_composite(tint(im, (255, 40, 120)), (0, 0))
    cy = tint(im, (40, 220, 255)); a = np.array(cy); a[..., 3] = (a[..., 3] * .85).astype("uint8")
    out.alpha_composite(Image.fromarray(a), (2 * dx, 0)); out.alpha_composite(im, (dx, 0)); return out

# ---------------------------------------------------------------- логотип (не изменять!)
def logo(height=132, path=None):
    """Логотип PS SHOP целиком (куб + надпись), тёмный фон → прозрачный. Ставить слева сверху."""
    path = path or os.path.join(_HERE, "..", "assets", "logo.png")
    lg = Image.open(path).convert("RGB").crop((250, 190, 1004, 1040))
    a = np.array(lg).astype(float); lum = a.max(axis=2) / 255
    lg = Image.fromarray(np.dstack([a, np.clip((lum - 0.05) * 3.5, 0, 1) * 255]).astype("uint8"), "RGBA")
    return lg.resize((int(lg.width * height / lg.height), height), Image.LANCZOS)

def header(base, right_top="NEW", right_sub="ОНЛАЙН-МАГАЗИН", logo_h=132, top_color=(255, 150, 230)):
    """Логотип слева сверху + две строки справа."""
    W = base.size[0]; base.alpha_composite(logo(logo_h), (44, 34)); d = ImageDraw.Draw(base)
    if right_top: spaced(d, (W - 56, 58), right_top, font("black", 24), top_color, 8, "r")
    if right_sub: spaced(d, (W - 56, 94), right_sub, font("text", 18), (190, 180, 235), 5, "r")

# ---------------------------------------------------------------- 3D
def _coeffs(dst, src):
    A, B = [], []
    for (x, y), (u, v) in zip(dst, src):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); A.append([0, 0, 0, x, y, 1, -v * x, -v * y]); B += [u, v]
    return np.linalg.solve(np.array(A, float), np.array(B, float)).tolist()

def warp(img, quad, size):
    """Натянуть картинку на четырёхугольник quad (лв, пв, пн, лн) на холсте size."""
    s = [(0, 0), (img.width, 0), (img.width, img.height), (0, img.height)]
    return img.transform(size, Image.PERSPECTIVE, _coeffs(quad, s), Image.BICUBIC)

class Cam:
    """Простая 3D-камера: повороты в градусах (yaw — вокруг вертикали, pitch — наклон, roll — крен)."""
    def __init__(self, cx, cy, yaw=-24, pitch=10, roll=-9, focal=1500, scale=1.0):
        self.cx, self.cy, self.f, self.s = cx, cy, focal, scale
        self.ry, self.rx, self.rz = map(math.radians, (yaw, pitch, roll))
    def __call__(self, X, Y, Z, ss=SS):
        ry, rx, rz = self.ry, self.rx, self.rz
        X, Z = X * math.cos(ry) + Z * math.sin(ry), -X * math.sin(ry) + Z * math.cos(ry)
        Y, Z = Y * math.cos(rx) - Z * math.sin(rx), Y * math.sin(rx) + Z * math.cos(rx)
        X, Y = X * math.cos(rz) - Y * math.sin(rz), X * math.sin(rz) + Y * math.cos(rz)
        k = self.f / (self.f + Z) * self.s
        return ((self.cx + X * k) * ss, (self.cy + Y * k) * ss)
    def quad(self, w, h, z):
        a, b = w / 2, h / 2; return [self(-a, -b, z), self(a, -b, z), self(a, b, z), self(-a, b, z)]

def box3d(face, mask, cam, size, depth=30, w=None, h=None, side=((60, 40, 140), (170, 100, 240)), rim=(230, 200, 255), layers=26):
    """Выдавленный объект: лицевая картинка face + торец толщиной depth. Возвращает слой размера size (обычный, не SS)."""
    w = w or face.width / SS; h = h or face.height / SS
    big = (size[0] * SS, size[1] * SS); P = Image.new("RGBA", big, (0, 0, 0, 0))
    for i in range(layers + 1):
        t = i / layers; z = depth / 2 - t * depth
        c = tuple(int(side[0][k] * (1 - t) + side[1][k] * t) for k in range(3)) if t < .92 else rim
        lay = Image.new("RGBA", mask.size, c + (255,)); lay.putalpha(mask)
        P.alpha_composite(warp(lay, cam.quad(w, h, z), big))
    P.alpha_composite(warp(face, cam.quad(w, h, -depth / 2), big))
    return P.resize(size, Image.LANCZOS)

def phone_face(screenshot, w=460, h=960, rad=70, bezel=14, status=True, edge=((255, 130, 235), (90, 200, 255))):
    """Лицевая сторона телефона (в SS-масштабе): экран со скриншотом, строка состояния, вырез, блик, кромка."""
    FW, FH = w * SS, h * SS; face = Image.new("RGBA", (FW, FH), (0, 0, 0, 0)); fd = ImageDraw.Draw(face)
    fd.rounded_rectangle((0, 0, FW - 1, FH - 1), rad * SS, fill=(14, 11, 26, 255))
    sw, sh = (w - 2 * bezel) * SS, (h - 2 * bezel) * SS; SB = 50 * SS if status else 0
    scr = Image.open(screenshot).convert("RGB") if isinstance(screenshot, str) else screenshot.convert("RGB")
    scr = scr.resize((sw, int(sw * scr.height / scr.width)), Image.LANCZOS).crop((0, 0, sw, sh - SB))
    s = Image.new("RGB", (sw, sh), (12, 9, 24)); s.paste(scr, (0, SB))
    if status: ImageDraw.Draw(s).text((30 * SS, 14 * SS), "9:41", font=font("semibold", 17 * SS), fill=(235, 230, 255))
    s = s.convert("RGBA"); s.putalpha(rounded_mask((sw, sh), (rad - bezel) * SS)); face.alpha_composite(s, (bezel * SS, bezel * SS))
    fd.rounded_rectangle(((w / 2 - 58) * SS, (bezel + 12) * SS, (w / 2 + 58) * SS, (bezel + 44) * SS), 16 * SS, fill=(0, 0, 0, 255))
    gl = Image.new("RGBA", face.size, (0, 0, 0, 0))
    ImageDraw.Draw(gl).polygon([(0, 0), (int(FW * .62), 0), (0, int(FH * .42))], fill=(255, 255, 255, 26))
    m = rounded_mask(face.size, rad * SS); gl.putalpha(ImageChops.multiply(gl.split()[3], m)); face.alpha_composite(gl)
    r = Image.new("L", face.size, 0); ImageDraw.Draw(r).rounded_rectangle((0, 0, FW - 1, FH - 1), rad * SS, outline=255, width=5 * SS)
    e = grad(Image.new("RGBA", face.size, (255, 255, 255, 255)), *edge); e.putalpha(r); face.alpha_composite(e)
    return face, m

def phone3d(screenshot, cam, size=POST, w=460, h=960, depth=34, buttons=True):
    """Объёмный телефон с открытым сайтом. Пример: phone3d("assets/shots/m_home.png", Cam(550,660,scale=.8))."""
    face, m = phone_face(screenshot, w, h)
    big = (size[0] * SS, size[1] * SS); P = Image.new("RGBA", big, (0, 0, 0, 0))
    layer = box3d(face, m, cam, size, depth, w, h).resize(big, Image.LANCZOS)
    if buttons:
        d = ImageDraw.Draw(layer)
        for y0, y1 in [(-250, -170), (-140, -20)]:
            d.polygon([cam(-w / 2 - 3, y0, -6), cam(-w / 2 - 3, y1, -6), cam(-w / 2 - 3, y1, 8), cam(-w / 2 - 3, y0, 8)], fill=(120, 90, 210, 255))
    return layer.resize(size, Image.LANCZOS)

def card3d(img, w, cam, size=POST, depth=14, rad=None, edge=((255, 120, 230), (90, 200, 255))):
    """Карточка (обложка игры, скриншот) стеклянной 3D-пластиной."""
    im = img.convert("RGB") if not isinstance(img, str) else Image.open(img).convert("RGB")
    h = int(w * im.height / im.width); rad = rad or int(w * .08)
    face = im.resize((w * SS, h * SS), Image.LANCZOS).convert("RGBA"); m = rounded_mask(face.size, rad * SS); face.putalpha(m)
    r = Image.new("L", face.size, 0); ImageDraw.Draw(r).rounded_rectangle((0, 0, face.width - 1, face.height - 1), rad * SS, outline=255, width=4 * SS)
    e = grad(Image.new("RGBA", face.size, (255, 255, 255, 255)), *edge); e.putalpha(r); face.alpha_composite(e)
    return box3d(face, m, cam, size, depth, w, h)

def reflection(base, layer, floor_y, strength=0.22, fade=0.18, blur=3):
    """Отражение слоя на «полу» ниже floor_y."""
    bb = layer.getbbox()
    if not bb: return
    part = layer.crop(bb).transpose(Image.FLIP_TOP_BOTTOM); a = np.array(part).astype(float); h = a.shape[0]
    a[..., 3] *= np.clip(strength * (1 - np.arange(h) / (h * fade)), 0, 1)[:, None]
    base.alpha_composite(Image.fromarray(a.astype("uint8")).filter(ImageFilter.GaussianBlur(blur)), (bb[0], int(floor_y)))

def pocket(base, y0, y1, color=(8, 5, 22), alpha=240):
    """Тёмная растяжка снизу: объект «выходит» из слова."""
    W, H = base.size; t = np.clip((np.arange(H) - y0) / (y1 - y0), 0, 1)[:, None]
    a = np.zeros((H, W, 4)); a[..., 0], a[..., 1], a[..., 2] = color; a[..., 3] = (t ** 1.4) * alpha
    base.alpha_composite(Image.fromarray(a.astype("uint8")))

# ---------------------------------------------------------------- проверка перед отправкой
def check(boxes, size=POST, margin=40):
    """boxes: {"имя": (x0,y0,x1,y1)} для текстовых блоков. Печатает вылеты за край и наложения текста."""
    W, H = size; ok = True; items = list(boxes.items())
    for n, (x0, y0, x1, y1) in items:
        if x0 < margin or y0 < margin * .5 or x1 > W - margin or y1 > H - margin * .5:
            print(f"⚠ {n}: близко к краю или за краем {tuple(map(int, (x0, y0, x1, y1)))}"); ok = False
    for i in range(len(items)):
        for j in range(i + 1, len(items)):
            a, b = items[i][1], items[j][1]
            if a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]:
                print(f"⚠ наложение: {items[i][0]} × {items[j][0]}"); ok = False
    print("✓ текст в порядке" if ok else "— поправить перед отправкой"); return ok

def preview(img, path, w=540):
    """Уменьшенная копия для самопроверки (владельцу не отправлять)."""
    im = img if isinstance(img, Image.Image) else Image.open(img)
    im.resize((w, int(w * im.height / im.width)), Image.LANCZOS).save(path)
