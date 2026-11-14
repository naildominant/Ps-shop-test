#!/usr/bin/env python3
"""Собирает каталог игр из публичного Telegram-канала @psshopgo.

Запуск:
    python3 scripts/catalog.py            # скачать канал и обновить data/games.json + обложки
    python3 scripts/catalog.py --cache D  # взять уже скачанные страницы t.me/s из папки D

Что делает:
  1. Листает https://t.me/s/psshopgo до самого первого поста.
  2. Находит посты с играми (есть «ЦЕНА» и цена для PS4/PS5 или издания).
  3. Если игра выкладывалась несколько раз, берёт самый свежий пост.
     Пост удалён -> игры нет в канале -> игры нет на сайте.
  4. Скачивает обложки (WebP, до 640 px) в src/static/covers/.
  5. Пишет data/games.json. Посты, которые не удалось разобрать, пишет в data/skipped.json.
"""
import concurrent.futures as cf
import glob
import html
import io
import json
import os
import re
import sys
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHANNEL = 'psshopgo'
DATA = os.path.join(ROOT, 'data')
COVERS = os.path.join(ROOT, 'src', 'static', 'covers')
UA = 'Mozilla/5.0 (compatible; psshop-catalog/1.0)'

# Ручные исправления опечаток в названиях (post id -> название)
TITLE_FIX = {
    549: 'RESIDENT EVIL RACCOON CITY EDITION (3 ИГРЫ)',
    68: 'OVERCOOKED + OVERCOOKED 2',
    273: 'FAR CRY 5 + FAR CRY NEW DAWN',
    402: 'DOOM: THE DARK AGES',
    1055: 'RATCHET & CLANK: RIFT APART',
    1225: 'GRAND THEFT AUTO VI',
}
# Дополнения к постам особого формата (post id -> поля)
POST_EXTRA = {
    1225: {'preorder': True, 'release_post': '19.11.2026', 'lang': 'subs', 'players': '1'},
}
# Посты, которые не надо показывать (дубли со старой ценой и т. п.)
SKIP_POSTS = {416, 472}
# Пост «Black Friday 11.11 / −50% на топ-50 игр» — источник хитов
HITS_POST = 1228


# ---------- загрузка ----------
def get(url, tries=4):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            return urllib.request.urlopen(req, timeout=40).read()
        except Exception:
            if i == tries - 1:
                raise
            time.sleep(2 * (i + 1))


def fetch_pages():
    pages, before = [], None
    for _ in range(200):
        url = f'https://t.me/s/{CHANNEL}' + (f'?before={before}' if before else '')
        s = get(url).decode('utf-8', 'replace')
        ids = [int(x) for x in re.findall(rf'data-post="{CHANNEL}/(\d+)"', s)]
        if not ids:
            break
        pages.append(s)
        low = min(ids)
        if low <= 1 or low == before:
            break
        before = low
    return pages


# ---------- разбор постов ----------
def clean_text(fragment):
    x = re.sub(r'<br\s*/?>', '\n', fragment)
    x = re.sub(r'</(blockquote|p|div)>', '\n', x)
    x = re.sub(r'<[^>]+>', '', x)
    return html.unescape(x).replace('\xa0', ' ').strip()


def parse_posts(pages):
    posts = {}
    for s in pages:
        for m in re.finditer(r'<div class="tgme_widget_message_wrap.*?(?=<div class="tgme_widget_message_wrap|\Z)', s, re.S):
            b = m.group(0)
            pid = re.search(rf'data-post="{CHANNEL}/(\d+)"', b)
            if not pid:
                continue
            pid = int(pid.group(1))
            t = re.search(r'<div class="tgme_widget_message_text[^"]*"[^>]*>(.*?)</div>\s*(?:<div class="tgme_widget_message_footer|<div class="tgme_widget_message_reply_markup|$)', b, re.S)
            if not t:
                t = re.search(r'<div class="tgme_widget_message_text[^"]*"[^>]*>(.*?)</div>', b, re.S)
            raw = t.group(1) if t else ''
            links = []
            for a in re.finditer(r'<a href="([^"]+)"[^>]*>(.*?)</a>', raw, re.S):
                links.append((html.unescape(a.group(1)), clean_text(a.group(2)).upper()))
            imgs = [u for u in re.findall(r"tgme_widget_message_photo_wrap[^>]*background-image:url\('([^']+)'\)", b)]
            date = re.search(r'datetime="([^"]+)"', b)
            posts[pid] = {'id': pid, 'text': clean_text(raw), 'cover': imgs[0] if imgs else None,
                          'links': links, 'date': date.group(1)[:10] if date else ''}
    return [posts[k] for k in sorted(posts)]


def num(s):
    v = int(re.sub(r'\D', '', s))
    return v * 1000 if v < 1000 else v


PRICE = r'([\d][\d .,]*\d)\s*(?:uzs|сум|sum)'
STOP_TITLE = re.compile(r'(АКЦИЯ|СКИДКА|ИГРЫ СРАЗУ|ИГР СРАЗУ|BLACK FRIDAY|ИГРА ДНЯ|РАСПРОДАЖ)', re.I)


def title_of(lines):
    for l in lines:
        c = re.sub(r'^[^\wА-Яа-яЁё]+|[^\wА-Яа-яЁё)!]+$', '', l).strip()
        if not c or STOP_TITLE.search(c):
            continue
        return c
    return None


def extract_game(p):
    t = p['text']
    if not t or not re.search(r'ЦЕНА', t, re.I):
        return None, 'нет слова ЦЕНА'
    lines = [l.strip() for l in t.split('\n')]
    title = TITLE_FIX.get(p['id']) or title_of(lines)
    if not title or len(title) > 70:
        return None, 'не найдено название'
    title = re.sub(r'[™®]', '', title).strip()
    prices, editions, pre, vr = {}, [], False, False
    for l in lines:
        m = re.search(r'\b(PS[45])\s*[-—–:]\s*' + PRICE, l, re.I)
        if m:
            prices[m.group(1).upper()] = num(m.group(2))
        else:
            m2 = re.search(r'^[^\wА-Яа-я]*(?:PS5\s*[-—–]\s*)?([A-Za-zА-Яа-я][A-Za-zА-Яа-я ()\'.]{2,30}?)\s*[-—–:]\s*' + PRICE, l, re.I)
            if m2 and not re.match(r'(PS|ЦЕНА|Цена|Только|Было|Стало|Скидка)', m2.group(1), re.I):
                name = m2.group(1).strip()
                name = {'standart': 'Standard', 'стандарт': 'Standard'}.get(name.lower(), name[:1].upper() + name[1:])
                editions.append({'name': name, 'price': num(m2.group(2))})
        if re.search(PRICE, l, re.I):
            if 'ПРЕДЗАКАЗ' in l.upper():
                pre = True
            if 'VR' in l:
                vr = True
    if not prices and not editions:
        return None, 'не найдена цена PS4/PS5'
    lang = ''
    for l in lines:
        ll = l.lower()
        if 'озвучк' in ll:
            lang = 'voice'; break
        if 'субтитр' in ll:
            lang = 'subs'; break
        if 'английск' in ll:
            lang = 'en'; break
    ed = re.search(r'Издание\s*[-—–]\s*(.+)', t)
    pl = re.search(r'Кол-во игроков\s*[-—–]\s*(.+)', t)
    rd = re.search(r'ДАТА ВЫХОДА\s*[-—–]?\s*(\d\d\.\d\d\.\d{4})', t)
    notes = []
    if 'PS+' in t and 'необходима' in t:
        notes.append('psplus')
    if vr or re.search(r'\bVR2?\b', title):
        notes.append('vr')
    gameplay = next((h for h, txt in p['links'] if re.search(r'ГЕЙМПЛЕЙ|ТРЕЙЛЕР|СМОТРЕТЬ', txt) and re.search(r'youtu|vk\.com|rutube', h)), None)
    g = {
        'title': title, 'post': p['id'], 'date': p['date'],
        'ps4': prices.get('PS4'), 'ps5': prices.get('PS5'),
        'editions': editions if editions and not prices else None,
        'preorder': pre, 'release_post': rd.group(1) if rd else None, 'lang': lang,
        'edition': (ed.group(1).strip() if ed else None), 'players': (pl.group(1).strip() if pl else None),
        'notes': notes, 'gameplay': gameplay, 'cover_url': p['cover'],
    }
    g.update(POST_EXTRA.get(p['id'], {}))
    if g['editions'] and not g['ps5'] and not g['ps4']:
        g['ps5'] = min(e['price'] for e in g['editions'])
    return g, None


def norm(s):
    return re.sub(r'[^a-z0-9а-я]', '', s.lower().replace('ё', 'е'))


def slug(t):
    tr = str.maketrans({'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y',
                        'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f',
                        'х': 'h', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ы': 'y', 'э': 'e', 'ю': 'yu', 'я': 'ya'})
    s = t.lower().translate(tr)
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', s)).strip('-') or 'game'


def hits_from(posts):
    p = next((x for x in posts if x['id'] == HITS_POST), None)
    if not p:
        return []
    return [n.strip() for n, _ in re.findall(r'\n([^\n━]+)\n\s*([\d ]+) сум ➜', p['text'])]


HIT_ALIAS = {'gtav': 'gta5', 'codmodernwarfare2019': 'callofdutymodernwarfare1', 'marvelsspiderman': 'spiderman',
             'codblackopsiii': 'callofdutyblackopsiii', 'thelastofusparti': 'thelastofuspart1', 'marvelsspiderman2': 'spiderman2',
             'eafc26': 'fc26', 'thelastofuspartiiremastered': 'thelastofuspart2remastered', 'godofwarragnarök': 'godofwarragnarok',
             'codblackopscoldwar': 'callofdutyblackopscoldwar', 'codwwii': 'callofdutywwii', 'codblackops6': 'callofdutyblackops6',
             'ghostofyōtei': 'ghostofyotei', 'skyrim': 'theelderscrollsvskyrim', 'acvalhalla': 'assassinscreedvalhalla',
             'acodyssey': 'assassinscreedodyssey', 'farcry5newdawn': 'farcry5farcrynewdawn', 'residentevil4remake': 'residentevil4remakevr2',
             'bloodbornegoty': 'bloodbornegameoftheyear', 'crashnsanetrilogyctr': 'crashbandicootnsanetrilogyctrnitrofueled', 'diabloiv': 'diablo4'}


def build(posts):
    import difflib
    games, skipped = {}, []
    for p in posts:
        if p['id'] in SKIP_POSTS:
            continue
        g, why = extract_game(p)
        if not g:
            if p['text'] and re.search(r'ЦЕНА', p['text'], re.I) and re.search(PRICE, p['text'], re.I):
                skipped.append({'post': p['id'], 'reason': why, 'start': p['text'][:80]})
            continue
        games[norm(g['title'])] = g  # посты идут по возрастанию -> выигрывает самый свежий
    keys = list(games)
    for name in hits_from(posts):
        k = HIT_ALIAS.get(norm(name), norm(name))
        if k not in games:
            m = difflib.get_close_matches(k, keys, 1, 0.75)
            if not m:
                continue
            k = m[0]
        games[k]['hit'] = True
    used = set()
    out = []
    for g in sorted(games.values(), key=lambda a: -a['post']):
        s = slug(g['title'])
        if s in used:
            s = f"{s}-{g['post']}"
        used.add(s)
        g['id'] = s
        out.append(g)
    return out, skipped


# ---------- обложки ----------
def fetch_covers(games):
    from PIL import Image
    os.makedirs(COVERS, exist_ok=True)
    stamp_file = os.path.join(DATA, 'covers.json')
    stamps = json.load(open(stamp_file)) if os.path.exists(stamp_file) else {}

    def one(g):
        path = os.path.join(COVERS, g['id'] + '.webp')
        if os.path.exists(path) and stamps.get(g['id']) == g['post']:
            return g['id'], g['post']
        if not g.get('cover_url'):
            return g['id'], None
        data = get(g['cover_url'])
        im = Image.open(io.BytesIO(data)).convert('RGB')
        im.thumbnail((640, 640))
        im.save(path, 'WEBP', quality=78, method=6)
        return g['id'], g['post']

    with cf.ThreadPoolExecutor(8) as ex:
        for gid, post in ex.map(one, games):
            if post:
                stamps[gid] = post
    live = {g['id'] for g in games}
    for f in glob.glob(os.path.join(COVERS, '*.webp')):
        if os.path.basename(f)[:-5] not in live:
            os.remove(f)
    stamps = {k: v for k, v in stamps.items() if k in live}
    json.dump(stamps, open(stamp_file, 'w'), indent=0, sort_keys=True)


def main():
    cache = sys.argv[sys.argv.index('--cache') + 1] if '--cache' in sys.argv else None
    if cache:
        pages = [open(f, encoding='utf-8').read() for f in sorted(glob.glob(os.path.join(cache, '*.html')))]
    else:
        pages = fetch_pages()
    posts = parse_posts(pages)
    games, skipped = build(posts)
    if len(games) < 50:
        sys.exit(f'Слишком мало игр ({len(games)}), похоже канал не загрузился. Каталог не трогаю.')
    os.makedirs(DATA, exist_ok=True)
    fetch_covers(games)
    for g in games:
        g.pop('cover_url', None)
    json.dump(games, open(os.path.join(DATA, 'games.json'), 'w'), ensure_ascii=False, indent=1)
    json.dump(skipped, open(os.path.join(DATA, 'skipped.json'), 'w'), ensure_ascii=False, indent=1)
    print(f'постов: {len(posts)}, игр: {len(games)}, хитов: {sum(1 for g in games if g.get("hit"))}, не разобрано: {len(skipped)}')


if __name__ == '__main__':
    main()
