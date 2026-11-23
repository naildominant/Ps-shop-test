# PS SHOP team structure: org chart + daily schedule. Text only from docs/team-structure.md. Portrait 1080x1920 + landscape 1920x1080.
import sys; sys.path.insert(0, "scripts")
from psfx import *
TXT, SUB, GOLD = (242, 239, 255), (169, 163, 212), (255, 205, 120)
C = {"FOUNDER": (242, 239, 255), "Менеджер": GOLD, "Сайтер": (90, 210, 255), "Постик": (255, 120, 210),
     "Дизайнер": (190, 140, 255), "Маркетолог": (255, 160, 80), "СММщик": (255, 195, 140), "Креатор": (120, 230, 150), "Мастер": (110, 150, 255)}
TEAM = [("Сайтер", "сайт и заявки", False), ("Постик", "бот постов, канал, цены", True), ("Дизайнер", "вся графика", False),
        ("Маркетолог", "стратегия, OLX", True), ("СММщик", "общение с клиентами", True), ("Креатор", "идеи, как работать лучше", False),
        ("Мастер", "правила команды и переходы чатов", False)]
DAY = [("05:30", "Цены поставщика, автоповышение цен", "Постик", True), ("07:00", "Отчёт о ценах владельцу", "Постик", False),
       ("07:05", "Проверка 3 старых постов", "Постик", False), ("08:17", "Обновление каталога поставщика", "Постик", False),
       ("08:41", "Обновление поиска по каналу", "Постик", False), ("13:03", "«Новинка дня» — черновик поста", "Постик", False),
       ("18:37", "Ежедневный отчёт владельцу", "Менеджер", False)]
NOTE = [("каждые 10 мин", "новые посты канала → сайт"), ("каждый час :07", "пересборка каталога сайта")]

def fit(d, txt, name, size, maxw, w=None):
    while d.textlength(txt, font=font(name, size, w)) > maxw and size > 14: size -= 1
    return font(name, size, w)

def badge(bg, x, y, r=17):
    d = ImageDraw.Draw(bg); d.ellipse((x - r, y - r, x + r, y + r), fill=GOLD)
    d.text((x, y + 1), "?", font=font("unbounded", int(r * 1.3), "Black"), fill=(20, 12, 40), anchor="mm")

def box(bg, xy, name, role, q=False, nsz=34, rsz=24):
    x0, y0, x1, y1 = xy; col = C[name]; lay = Image.new("RGBA", bg.size, (0, 0, 0, 0)); ld = ImageDraw.Draw(lay)
    ld.rounded_rectangle(xy, 20, fill=(22, 18, 52, 235), outline=col + (255,), width=3)
    ld.rounded_rectangle((x0, y0, x0 + 10, y1), 5, fill=col + (255,))
    shadow(bg, lay, (0, 0), (0, 10), 16, 0.5); bg.alpha_composite(lay); d = ImageDraw.Draw(bg)
    h = y1 - y0; w = x1 - x0 - 50
    fn = fit(d, name, "unbounded", nsz, w, "Bold")
    if role:
        d.text((x0 + 28, y0 + h * .36), name, font=fn, fill=col, anchor="lm")
        d.text((x0 + 28, y0 + h * .72), role, font=fit(d, role, "manrope", rsz, w, "SemiBold"), fill=TXT, anchor="lm")
    else: d.text((x0 + 28, y0 + h / 2), name, font=fn, fill=col, anchor="lm")
    if q: badge(bg, x1 - 4, y0 + 4)

def line(bg, pts, col=(120, 100, 220), w=3): ImageDraw.Draw(bg).line(pts, fill=col, width=w)

def chart(bg, X, Y, Wd, bh, gap):
    # top: Владелец — Менеджер, then Бос
    box(bg, (X, Y, X + Wd, Y + bh), "FOUNDER", "владелец: решения, заказы и оплата", True)
    by = Y + bh + gap; line(bg, [(X + 40, Y + bh), (X + 40, by)])
    box(bg, (X, by, X + Wd, by + bh), "Менеджер", "руководитель Claude-команды")
    y = by + bh + gap; tx = X + 40; last = y
    for name, role, q in TEAM:
        ind = 70 if name == "СММщик" else 0
        bx0 = X + 80 + ind
        box(bg, (bx0, y, X + Wd, y + bh), name, role, q)
        if name == "СММщик": line(bg, [(X + 110, y - gap), (X + 110, y + bh / 2), (bx0, y + bh / 2)], C["Маркетолог"])
        else: line(bg, [(tx, y + bh / 2), (bx0, y + bh / 2)]); last = y + bh / 2
        y += bh + gap
    line(bg, [(tx, by + bh), (tx, last)])
    return y

def schedule(bg, X, Y, Wd, rh, tsz=34, dsz=26):
    d = ImageDraw.Draw(bg); d.text((X, Y), "День по часам", font=font("unbounded", 40, "Bold"), fill=TXT)
    d.text((X + Wd, Y + 22), "Ташкент", font=font("manrope", 24, "SemiBold"), fill=SUB, anchor="rm"); y = Y + 70
    for t, what, who, q in DAY:
        col = C[who]; d.rounded_rectangle((X, y, X + Wd, y + rh - 10), 16, fill=(22, 18, 52, 220))
        d.rounded_rectangle((X, y, X + 8, y + rh - 10), 4, fill=col)
        d.text((X + 26, y + (rh - 10) / 2), t, font=font("unbounded", tsz, "Bold"), fill=col, anchor="lm")
        tw = d.textlength("00:00", font=font("unbounded", tsz, "Bold")) + 50
        ww = Wd - tw - 160
        d.text((X + tw, y + (rh - 10) / 2), what, font=fit(d, what, "manrope", dsz, ww, "SemiBold"), fill=TXT, anchor="lm")
        d.text((X + Wd - 20, y + (rh - 10) / 2), who, font=font("manrope", 22, "Bold"), fill=col, anchor="rm")
        if q: badge(bg, X + Wd - 4, y + 4, 14)
        y += rh
    y += 10
    for t, what in NOTE:
        d.text((X + 8, y), t, font=font("manrope", 26, "Bold"), fill=C["Сайтер"])
        d.text((X + 8 + d.textlength(t + "  ", font=font("manrope", 26, "Bold")), y), "— " + what + " (Сайтер, авто)", font=fit(d, "— " + what + " (Сайтер, авто)", "manrope", 24, Wd - 260, "Medium"), fill=SUB)
        y += 44
    return y

def legend(bg, x, y):
    badge(bg, x + 14, y + 14, 14); ImageDraw.Draw(bg).text((x + 40, y + 14), "обсудить с Менеджером", font=font("manrope", 24, "SemiBold"), fill=SUB, anchor="lm")

def header(bg, title_size=58):
    bg.alpha_composite(logo(96), (44, 34)); d = ImageDraw.Draw(bg)
    d.text((bg.width - 50, 64), "Структура PS SHOP", font=font("unbounded", title_size, "Bold"), fill=TXT, anchor="rm")
    d.text((bg.width - 50, 112), "кто за что отвечает", font=font("manrope", 28, "SemiBold"), fill=GOLD, anchor="rm")

def save(bg, p): grain(bg, 3, seed=2).convert("RGB").save(p, optimize=True); print(p)

# portrait
W, H = 1080, 1920; bg = neon_bg((W, H), base=(7, 6, 26)); header(bg, 50)
y = chart(bg, 50, 190, W - 100, 88, 18)
legend(bg, 54, y - 2)
schedule(bg, 50, y + 50, W - 100, 74)
save(bg, "output/team/team_structure_portrait.png")
# landscape
W, H = 1920, 1080; bg = neon_bg((W, H), blobs=[((900, 0, 1900, 700), NEON[0], 220), ((-200, 500, 800, 1300), NEON[1], 240)], base=(7, 6, 26)); header(bg, 52)
y = chart(bg, 50, 170, 880, 76, 14)
legend(bg, 54, y - 4)
schedule(bg, 1000, 170, 870, 86, 36, 28)
save(bg, "output/team/team_structure_landscape.png")
