#!/usr/bin/env python3
"""Реальные даты выхода игр — из Википедии (карточка игры, поле «released»).

    python3 scripts/releases.py           # только игры без даты
    python3 scripts/releases.py --all     # перепроверить все

Результат: data/releases.json {id игры: "ГГГГ-ММ-ДД"}. «Новинки» на сайте = вышли за последний год.
Берём самую раннюю дату из карточки (обычно это и есть выход на PlayStation).
Даты Steam не используем: там выход на ПК, у многих игр Sony он был на годы позже.
Если дата неверная — поправьте её в data/releases.json вручную, скрипт её не перезапишет.
"""
import datetime as dt
import difflib
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'data', 'releases.json')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from covers_official import QUERY, WIKI_ONLY, clean_title, norm  # noqa: E402

UA = 'PSShopCatalog/1.0 (game catalog release dates)'
MONTHS = {m: i for i, m in enumerate(['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
                                      'september', 'october', 'november', 'december'], 1)}
SKIP_WORDS = re.compile(r'bundle|trilogy|collection|сразу|\+|набор', re.I)
_last = [0.0]


def api(params):
    for i in range(4):
        wait = 1.5 - (time.time() - _last[0])
        if wait > 0:
            time.sleep(wait)
        _last[0] = time.time()
        try:
            req = urllib.request.Request('https://en.wikipedia.org/w/api.php?' + urllib.parse.urlencode({**params, 'format': 'json'}),
                                         headers={'User-Agent': UA})
            raw = urllib.request.urlopen(req, timeout=40).read().decode('utf-8', 'replace')
            if raw.lstrip().startswith('{'):
                return json.loads(raw)
        except Exception:
            pass
        time.sleep(8 * (i + 1))
    return None


def dates_in(text):
    out = []
    for y, m, d in re.findall(r'\{\{\s*(?:start date|release date|video game release[^|]*\|[^}]*?)?\s*\|?\s*(\d{4})\s*\|\s*(\d{1,2})\s*\|\s*(\d{1,2})', text, re.I):
        out.append((int(y), int(m), int(d)))
    for mon, d, y in re.findall(r'([A-Z][a-z]+)\s+(\d{1,2}),\s*(\d{4})', text):
        if mon.lower() in MONTHS:
            out.append((int(y), MONTHS[mon.lower()], int(d)))
    for d, mon, y in re.findall(r'(\d{1,2})\s+([A-Z][a-z]+)\s+(\d{4})', text):
        if mon.lower() in MONTHS:
            out.append((int(y), MONTHS[mon.lower()], int(d)))
    res = []
    for y, m, d in out:
        try:
            if 1990 < y < 2035:
                res.append(dt.date(y, m, d))
        except ValueError:
            pass
    return res


def release_of(gid, title):
    q = WIKI_ONLY.get(gid) or QUERY.get(gid) or clean_title(title)
    d = api({'action': 'query', 'generator': 'search', 'gsrsearch': f'{q} video game', 'gsrlimit': 3,
             'prop': 'revisions', 'rvprop': 'content', 'rvslots': 'main', 'redirects': 1})
    if not d:
        return None, None
    pages = sorted(d.get('query', {}).get('pages', {}).values(), key=lambda x: x.get('index', 99))
    for pg in pages:
        page = pg['title']
        if difflib.SequenceMatcher(None, norm(q.split('(')[0]), norm(page.split('(')[0])).ratio() < 0.7:
            continue
        try:
            text = pg['revisions'][0]['slots']['main']['*']
        except (KeyError, IndexError):
            continue
        m = re.search(r'\|\s*released\s*=(.*?)(?:\n\s*\|\s*[a-z_ ]+=|\n\}\})', text, re.S | re.I)
        if not m:
            continue
        ds = dates_in(m.group(1))
        if ds:
            return min(ds).isoformat(), page
    return None, None


def main():
    games = json.load(open(os.path.join(ROOT, 'data', 'games.json'), encoding='utf-8'))
    data = json.load(open(OUT, encoding='utf-8')) if os.path.exists(OUT) else {}
    redo = '--all' in sys.argv
    found = 0
    for g in games:
        gid = g['id']
        if (gid in data and not redo) or SKIP_WORDS.search(g['title']):
            continue
        # новинкой может быть только игра, выложенная в канал недавно (или предзаказ)
        posted = dt.date.fromisoformat(g['date']) if g.get('date') else None
        if not redo and posted and (dt.date.today() - posted).days > 400 and not g.get('preorder'):
            continue
        date, page = release_of(gid, g['title'])
        if date:
            data[gid] = date
            found += 1
            print(f'+ {gid:45} {date}  ({page})')
        else:
            print(f'- {gid:45} не найдено')
    json.dump(dict(sorted(data.items())), open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'найдено новых дат: {found}, всего с датой: {len(data)}')


if __name__ == '__main__':
    main()
