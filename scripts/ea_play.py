#!/usr/bin/env python3
"""Берёт свежие игры EA Play для PlayStation с официального сайта EA.

    python3 scripts/ea_play.py   -> data/ea_play.json

Сайт EA отдаёт без браузера только первые ~11 игр вкладки PlayStation (первая и вторая страница),
дальше список подгружается их скриптом. Поэтому на сайте PS SHOP показываем: свежие игры с EA
первыми, ниже — проверенный список из data/services.json, и ссылку на полный список у EA.
Если EA недоступен, файл не трогаем.
"""
import html
import json
import os
import re
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'https://www.ea.com/ru-ru/ea-play/games'
TABS = ['ea-app', 'ea-play-pro', 'xbox', 'playstation', 'steam', 'egs']  # порядок вкладок на странице EA


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (compatible; psshop-catalog/1.0)'})
    return urllib.request.urlopen(req, timeout=40).read().decode('utf-8', 'replace')


def clean(t):
    t = html.unescape(t)
    t = re.sub(r'[™®©]', '', t)
    t = re.sub(r'^EA SPORTS\s+(College Football)', r'\1', t)
    t = re.sub(r'^FC[- ](\d+)$', r'EA SPORTS FC \1', t)
    t = re.sub(r'^F1\s', 'F1 ', t)
    return re.sub(r'\s+', ' ', t).strip()


def titles(fragment):
    return [clean(t) for t in re.findall(r'<ea-game-box[^>]*?\btitle="([^"]*)"', fragment, re.S)]


def main():
    page = get(URL)
    sets = list(re.finditer(r'<ea-box-set([^>]*)>(.*?)</ea-box-set>', page, re.S))
    if len(sets) < len(TABS):
        raise SystemExit('Страница EA изменилась: не нашёл вкладки, файл не меняю')
    attrs, body = sets[TABS.index('playstation')].groups()
    out = titles(body)
    ajax = re.search(r'ajax-url="([^"]+)"', attrs)
    total = re.search(r'total-count="(\d+)"', attrs)
    if ajax:
        try:
            out += titles(get('https://www.ea.com' + html.unescape(ajax.group(1))))
        except Exception as e:
            print('вторая страница EA недоступна:', e)
    seen, fresh = set(), []
    for t in out:
        if t.lower() not in seen:
            seen.add(t.lower())
            fresh.append(t)
    if len(fresh) < 3:
        raise SystemExit('С EA пришло слишком мало игр, файл не меняю')
    data = {'source': URL, 'total': int(total.group(1)) if total else None, 'fresh': fresh}
    json.dump(data, open(os.path.join(ROOT, 'data', 'ea_play.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'EA Play (PlayStation): {len(fresh)} свежих игр из {data["total"]}')


if __name__ == '__main__':
    main()
