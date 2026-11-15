#!/usr/bin/env python3
"""Акции из Telegram-канала -> data/promos.json.

Вызывается из scripts/catalog.py после разбора постов. Акция = пост со словами «скидка», «акция»,
«только сегодня», «игра дня», «Black Friday», «цена была» и ценами «старая ➜ новая».
Срок: «только сегодня» — день поста; «до 2 декабря» / «только 11 ноября» — эта дата;
иначе считаем, что акция шла 2 дня. После срока на сайте — «Акция завершилась» и обычная цена.
"""
import datetime as dt
import difflib
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'data', 'promos.json')
KEY = re.compile(r'скидк|акци|только сегодня|игра дня|black friday|цена была|специальн[а-я]* цен|распродаж', re.I)
SKIP = re.compile(r'ps ?plus|подписк|список игр|направлени|голосов', re.I)
PRICE = r'(\d[\d .,]*\d|\d)\s*(?:000\s*)?(?:сум|uzs)?'
ARROW = r'\s*(?:➜|→|➡️|➡|->)\s*'
MONTHS = {'января': 1, 'февраля': 2, 'марта': 3, 'апреля': 4, 'мая': 5, 'июня': 6, 'июля': 7, 'августа': 8,
          'сентября': 9, 'октября': 10, 'ноября': 11, 'декабря': 12}


def num(s):
    v = int(re.sub(r'\D', '', s) or 0)
    return v * 1000 if 0 < v < 1000 else v


def norm(s):
    return re.sub(r'[^a-z0-9а-я]', '', s.lower().replace('ё', 'е'))


def until_of(text, posted):
    t = text.lower()
    m = re.search(r'(?:до|только)\s+(\d{1,2})\s+(' + '|'.join(MONTHS) + ')', t)
    if m:
        d = dt.date(posted.year, MONTHS[m.group(2)], int(m.group(1)))
        if d < posted - dt.timedelta(days=30):
            d = d.replace(year=d.year + 1)
        return d
    m = re.search(r'(\d{1,2})\.(\d{1,2})\b', text[:60])  # «BLACK FRIDAY 11.11»
    if m and 1 <= int(m.group(2)) <= 12 and 1 <= int(m.group(1)) <= 31:
        try:
            d = dt.date(posted.year, int(m.group(2)), int(m.group(1)))
            if abs((d - posted).days) <= 7:
                return d
        except ValueError:
            pass
    if 'сегодня' in t:
        return posted
    return posted + dt.timedelta(days=2)


def clean_name(line):
    line = re.sub(r'^[^\wА-Яа-я]+', '', line)
    line = re.sub(r'(?i)^(?:🔥\s*)?(?:игра дня\s*[—–-]\s*)', '', line)
    line = re.sub(r'(?i)\s*[—–-]\s*(?:скидка|акция).*$', '', line)
    line = re.sub(r'[:\s]+$', '', line)
    return re.sub(r'[^\wА-Яа-я)]+$', '', line).strip()


def items_of(text):
    lines = [l.strip() for l in text.split('\n')]
    items, last_name = [], None
    head = re.search(r'(?i)игра дня\s*[—–-]\s*([^\n]+)', text) or re.search(r'(?i)(?:только сегодня на|цены только сегодня на)\s*\n*\s*[^\w]*([^\n]+)', text)
    for i, l in enumerate(lines):
        if not l:
            continue
        m = re.search(PRICE + r'\s*(?:сум|uzs)?' + ARROW + PRICE, l, re.I)
        if m and re.search(r'сум|uzs|\d{3}', l, re.I):
            old, new = num(m.group(1)), num(m.group(2))
            if old > new > 0:
                plat = re.search(r'\b(PS[45])\b', l)
                name = last_name or (clean_name(head.group(1)) if head else None)
                if name:
                    items.append({'name': name, 'old': old, 'new': new, 'plat': plat.group(1) if plat else None})
            continue
        if re.search(r'\d{3}', l) or len(l) > 60 or KEY.search(l):
            continue
        n = clean_name(l)
        if n and len(n) >= 2 and not re.match(r'(?i)(цена|для заказа|успей|пиши|приобрести)', n):
            last_name = n
    was = re.search(r'(?i)цена была\s*' + PRICE, text)
    now = re.search(r'(?i)(?:теперь(?: всего)?|сейчас)\s*' + PRICE, text)
    if was and now:
        title = re.search(r'^[^\wА-Яа-я]*([^\n]+?)\s*[—–-]\s*(?:скидка|акция)', text, re.I | re.M)
        if title:
            items.append({'name': clean_name(title.group(1)), 'old': num(was.group(1)), 'new': num(now.group(1)), 'plat': None})
    return items


ALIAS = {'gtav': 'gta5', 'gta5deluxe': 'gta5', 'gtatrylogy': 'gtatrilogy', 'fifa26': 'fc26', 'eafc26': 'fc26',
         'codmodernwarfare2019': 'callofdutymodernwarfare1', 'marvelsspiderman': 'spiderman', 'marvelsspiderman2': 'spiderman2',
         'thelastofusparti': 'thelastofuspart1', 'thelastofuspartiiremastered': 'thelastofuspart2remastered', 'skyrim': 'theelderscrollsvskyrim',
         'acvalhalla': 'assassinscreedvalhalla', 'acodyssey': 'assassinscreedodyssey', 'diabloiv': 'diablo4', 'rdr2': 'reddeadredemption2'}


def match(name, games):
    keys = {norm(g['title']): g['id'] for g in games}
    k = ALIAS.get(norm(name), norm(name))
    if k in keys:
        return keys[k]
    digits = lambda x: re.findall(r'\d+', x)
    for cand in difflib.get_close_matches(k, keys.keys(), 3, 0.78):
        if digits(cand) == digits(k):  # «GTA 3» не должна совпасть с «GTA VI», «FC 25» с «FC 26»
            return keys[cand]
    return None


def build(posts, games, keep_days=45):
    today = dt.date.today()
    promos = []
    for p in posts:
        t = p['text'] or ''
        if not KEY.search(t) or SKIP.search(t[:120]) or not p.get('date'):
            continue
        posted = dt.date.fromisoformat(p['date'])
        if (today - posted).days > keep_days:
            continue
        items = []
        for it in items_of(t):
            gid = match(it['name'], games)
            if gid and not any(x['id'] == gid for x in items):
                items.append({'id': gid, 'old': it['old'], 'new': it['new'], 'plat': it['plat']})
        if not items:
            continue
        title = next((l.strip(' 🖤🔥💥❤️') for l in t.split('\n') if l.strip() and not re.match(r'^[\W_]+$', l.strip())), 'Акция')
        promos.append({'post': p['id'], 'date': p['date'], 'until': until_of(t, posted).isoformat(), 'title': title[:80], 'items': items})
    promos.sort(key=lambda x: -x['post'])
    json.dump(promos, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    return promos
