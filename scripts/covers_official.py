#!/usr/bin/env python3
"""Подбирает официальные обложки игр: сначала Steam, потом Википедия.

    python3 scripts/covers_official.py          # только игры, для которых обложки ещё нет
    python3 scripts/covers_official.py --all    # перепроверить все
    python3 scripts/covers_official.py --missing  # повторить для ненайденных
    python3 scripts/covers_official.py --only gta-5,elden-ring

Результат: data/covers-official/<id>.jpg и data/covers-sources.json (откуда взята каждая обложка).
Если обложка подобрана неправильно, добавьте игру в SKIP или поправьте QUERY ниже,
или положите свою картинку в data/covers-manual/<id>.webp — ручная обложка важнее всего.
"""
import difflib
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
OUT = os.path.join(DATA, 'covers-official')
SRC_FILE = os.path.join(DATA, 'covers-sources.json')
UA = 'PSShopCatalog/1.0 (game catalog cover lookup)'

# Как искать игру, если название в канале отличается от официального
QUERY = {
    'gta-5': 'Grand Theft Auto V', 'gta-trilogy': 'Grand Theft Auto: The Trilogy – The Definitive Edition',
    'fc-24': 'EA SPORTS FC 24', 'fc-25': 'EA SPORTS FC 25', 'fc-26': 'EA SPORTS FC 26',
    'spider-man': "Marvel's Spider-Man Remastered", 'spider-man-2': "Marvel's Spider-Man 2",
    'spider-man-miles-morales': "Marvel's Spider-Man: Miles Morales", 'ведьмак-3-дикая-охота': 'The Witcher 3: Wild Hunt',
    'vedmak-3-dikaya-ohota': 'The Witcher 3: Wild Hunt', 'tachki-3-gonki': 'Cars 3: Driven to Win',
    'the-cowabunga-collection': 'Teenage Mutant Ninja Turtles: The Cowabunga Collection', 'day-z': 'DayZ',
    'stalker-trilogy': 'S.T.A.L.K.E.R.: Legends of the Zone Trilogy', 'call-of-duty-modern-warfare-1': 'Call of Duty: Modern Warfare (2019)',
    'call-of-duty-modern-warfare-2': 'Call of Duty: Modern Warfare II', 'call-of-duty-modern-warfare-3': 'Call of Duty: Modern Warfare III',
    'call-of-duty-black-ops-iii': 'Call of Duty: Black Ops III', 'call-of-duty-wwii': 'Call of Duty: WWII',
    'the-last-of-us-part-1': 'The Last of Us Part I', 'the-last-of-us-part-2-remastered': 'The Last of Us Part II Remastered',
    'god-of-war-2018': 'God of War', 'god-of-war-ragnarok': 'God of War Ragnarök', 'resident-evil-4': 'Resident Evil 4 (2005)',
    'resident-evil-4-remake-vr2': 'Resident Evil 4', 'resident-evil-2-remake': 'Resident Evil 2', 'resident-evil-2': 'Resident Evil 2',
    'resident-evil-8-village-vr2': 'Resident Evil Village', 'resident-evil-9-requiem': 'Resident Evil Requiem',
    'resident-evil-7-biohazard-gold-edition': 'Resident Evil 7 Biohazard', 'mortal-kombat-11-ultimate': 'Mortal Kombat 11',
    'mortal-kombat-11': 'Mortal Kombat 11', 'diablo-4': 'Diablo IV', 'naruto-x-boruto-ultimate-ninja-storm': 'NARUTO X BORUTO Ultimate Ninja STORM CONNECTIONS',
    'hitman': 'HITMAN', 'hitman-3-world-of-assassination': 'HITMAN World of Assassination', 'nba-2k24': 'NBA 2K24', 'nba-2k25': 'NBA 2K25',
    'nba-2k26': 'NBA 2K26', 'ovecooked-overcooked-2': 'Overcooked! 2', 'overcooked-overcooked-2': 'Overcooked! 2',
    'unravel-1-2-yarnny-bundle': 'Unravel Two', 'little-nightmares-1-and-2-bundle': 'Little Nightmares II',
    'tomb-raider': 'Shadow of the Tomb Raider Definitive Edition', 'uncharted-4': 'UNCHARTED: Legacy of Thieves Collection',
    'need-for-speed-deluxe-edition': 'Need for Speed', 'ghost-of-yotei': 'Ghost of Yōtei', 'black-desert-standard-edition': 'Black Desert',
    'nhl-26-standard-edition': 'NHL 26', 'crash-bandicoot-n-sane-trilogy-ctr-nitro-fueled': 'Crash Bandicoot N. Sane Trilogy',
    'assassin-s-creed-black-flag-resynced': "Assassin's Creed IV Black Flag", 'assassin-s-creed-iv-black-flag': "Assassin's Creed IV Black Flag",
    'expeditions-a-mudrunner-game': 'Expeditions: A MudRunner Game', 'hollow-knight-silksong': 'Hollow Knight: Silksong',
    'detroit-become-human': 'Detroit: Become Human', 'sifu': 'Sifu', 'way-of-the-hunter': 'Way of the Hunter',
}
# Точный номер игры в Steam, если поиск ошибается
APPID = {'gta-5': 3240220, 'the-elder-scrolls-v-skyrim': 489830, 'brothers': 2153350, 'kingdom-come-deliverance-royal-edition': 379430,
         'kingdom-come-deliverance': 379430}
# Игры, которых точно нет в Steam: сразу ищем на Википедии
WIKI_ONLY = {
    'fc-24': 'EA Sports FC 24',
    'bloodborne-game-of-the-year': 'Bloodborne', 'demon-s-souls': "Demon's Souls (2020 video game)", 'gran-turismo-7': 'Gran Turismo 7',
    'astro-bot': 'Astro Bot', 'astro-bot-rescue-mission-vr': 'Astro Bot Rescue Mission', 'shadow-of-the-colossus': 'Shadow of the Colossus (2018 video game)',
    'grand-theft-auto-vi': 'Grand Theft Auto VI', 'minecraft': 'Minecraft', 'minecraft-legends': 'Minecraft Legends',
    'minecraft-dungeons': 'Minecraft Dungeons', 'god-of-war-iii-remastered': 'God of War III', 'mortal-kombat-1': 'Mortal Kombat 1',
    'saros-deluxe': 'Saros (video game)', 'marvel-s-wolverine-deluxe': "Marvel's Wolverine", 'death-stranding-2': 'Death Stranding 2: On the Beach',
    'ratchet-clank': 'Ratchet & Clank (2016 video game)', 'god-of-war-sons-of-sparta': 'God of War: Sons of Sparta',
    'call-of-duty-modern-warfare-4': 'Call of Duty: Modern Warfare 4', 'halo-campaign-evolved': 'Halo: Campaign Evolved',
    'grounded-2': 'Grounded 2', 'forza-horizon-5': 'Forza Horizon 5',
}
# Не трогать (оставить обложку из канала)
SKIP = {'ea-star-wars-triple-bundle', 'resident-evil-remake-trilogy-4', 'resident-evil-raccoon-city-edition-3', 'resident-evil-triple-pack-4-5-6',
        'resident-evil-bundle-gold-edition', 'mortal-kombat-11-ultimate-injustice-2', 'mortal-kombat-elder-god-bundle', 'metro-saga-bundle',
        'outlast-1-outlast-2-bundle', 'far-cry-4-far-cry-primal', 'far-cry-5-far-cry-new-dawn', 'assassin-s-creed-bundle-black-flag-unity-syndicate',
        'limbo-inside-bundle', 'moving-out-moving-out-2-bundle', 'mafia-trilogy', 'the-sims-4-my-first-pet-stuff', 'crysis-remastered-trilogy',
        'wolfenstein-alt-history-collection', 'batman-arkham-collection', 'monopoly', 'tomb-raider', 'little-nightmares-1-and-2-bundle',
        'unravel-1-2-yarnny-bundle', 'overcooked-overcooked-2', 'job-simulator', 'carx-street',
        # Википедия подобрала не ту часть игры или слишком мелкую картинку
        'call-of-duty-modern-warfare-2-campaign-remastered', 'call-of-duty-modern-warfare-2', 'diablo-2', 'diablo-3', 'hot-wheels',
        'hot-wheels-2', 'mortal-kombat-xl', 'mortal-shell-2', 'grounded-2', 'high-on-life-2', 'ratchet-clank', 'rayman-legends',
        'poppy-playtime-chapter-5', 'painkiller', 'hell-let-loose-vietnam', 'god-of-war-sons-of-sparta', 'minecraft-dungeons',
        'god-of-war-iii-remastered'}
BAD_WORDS = re.compile(r'soundtrack|dlc|season pass|demo|artbook|upgrade|pack\b|bundle|expansion|costume|wallpaper|playtest|benchmark|editor|server', re.I)


def get(url, binary=False):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    for i in range(3):
        try:
            data = urllib.request.urlopen(req, timeout=40).read()
            return data if binary else data.decode('utf-8', 'replace')
        except urllib.error.HTTPError as e:
            if e.code in (404, 403):
                return None
            time.sleep(2 * (i + 1))
        except Exception:
            time.sleep(2 * (i + 1))
    return None


def norm(s):
    s = s.lower().replace('’', "'").replace('ö', 'o').replace('ō', 'o')
    s = re.sub(r'[™®©]', '', s)
    s = re.sub(r'\b(standard|deluxe|ultimate|digital|gold|edition|game of the year|goty|remastered|definitive|vr2?|the)\b', ' ', s)
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()


def clean_title(t):
    t = re.sub(r'\((?:VR2?|[^)]*СРАЗУ[^)]*|\d[^)]*)\)', '', t, flags=re.I)
    t = re.sub(r'\b(STANDARD|DELUXE|ULTIMATE|GOLD|DIGITAL)\s*(EDITION)?\b', '', t, flags=re.I)
    return re.sub(r'\s+', ' ', t).strip(' -:')


def steam_image(appid):
    for name in ('library_600x900_2x.jpg', 'library_600x900.jpg'):
        img = get(f'https://cdn.cloudflare.steamstatic.com/steam/apps/{appid}/{name}', binary=True)
        if img and len(img) > 5000:
            return img
    return None


def steam(gid, title):
    if gid in APPID:
        img = steam_image(APPID[gid])
        return {'source': 'steam', 'match': f'appid {APPID[gid]}', 'score': 1, 'appid': APPID[gid], 'image': img} if img else None
    q = QUERY.get(gid, clean_title(title))
    raw = get('https://store.steampowered.com/api/storesearch/?' + urllib.parse.urlencode({'term': q, 'cc': 'us', 'l': 'english'}))
    if not raw:
        return None
    items = [i for i in json.loads(raw).get('items', []) if i.get('type') == 'app' and not BAD_WORDS.search(i['name'])]
    best, score = None, 0
    for i in items[:8]:
        s = difflib.SequenceMatcher(None, norm(q), norm(i['name'])).ratio()
        if s > score:
            best, score = i, s
    if not best or score < 0.62:
        return None
    img = steam_image(best['id'])
    return {'source': 'steam', 'match': best['name'], 'score': round(score, 2), 'appid': best['id'], 'image': img} if img else None


_last = [0.0]


def wiki_get(params):
    """Запрос к Википедии не чаще раза в 1.5 секунды (правила Wikimedia)."""
    for i in range(4):
        wait = 1.5 - (time.time() - _last[0])
        if wait > 0:
            time.sleep(wait)
        _last[0] = time.time()
        raw = get('https://en.wikipedia.org/w/api.php?' + urllib.parse.urlencode({**params, 'format': 'json'}))
        if raw and raw.lstrip().startswith('{'):
            return json.loads(raw)
        time.sleep(10 * (i + 1))
    return None


def wiki(gid, title):
    q = WIKI_ONLY.get(gid) or QUERY.get(gid) or clean_title(title)
    d = wiki_get({'action': 'query', 'generator': 'search', 'gsrsearch': f'{q} video game', 'gsrlimit': 3,
                  'prop': 'pageprops', 'ppprop': 'page_image', 'redirects': 1})
    if not d:
        return None
    pages = sorted(d.get('query', {}).get('pages', {}).values(), key=lambda p: p.get('index', 99))
    for p in pages:
        fname = p.get('pageprops', {}).get('page_image')
        if not fname or fname.lower().endswith('.svg'):
            continue
        s = difflib.SequenceMatcher(None, norm(q.split('(')[0]), norm(p['title'].split('(')[0])).ratio()
        if s < 0.7:
            continue
        info = wiki_get({'action': 'query', 'titles': f'File:{fname}', 'prop': 'imageinfo', 'iiprop': 'url|size', 'iiurlwidth': 800})
        if not info:
            continue
        ii = next(iter(info['query']['pages'].values())).get('imageinfo', [{}])[0]
        url = ii.get('thumburl') or ii.get('url')
        if not url:
            continue
        time.sleep(1.0)
        img = get(url, binary=True)
        if img and len(img) > 5000:
            return {'source': 'wikipedia', 'match': p['title'], 'score': round(s, 2), 'url': url, 'image': img}
    return None


def valid_image(data):
    import io
    from PIL import Image
    try:
        im = Image.open(io.BytesIO(data))
        im.verify()
        return im.size[0] >= 200
    except Exception:
        return False


def main():
    games = json.load(open(os.path.join(DATA, 'games.json'), encoding='utf-8'))
    os.makedirs(OUT, exist_ok=True)
    sources = json.load(open(SRC_FILE, encoding='utf-8')) if os.path.exists(SRC_FILE) else {}
    only = set(sys.argv[sys.argv.index('--only') + 1].split(',')) if '--only' in sys.argv else None
    redo = '--all' in sys.argv
    found = missed = 0
    for g in games:
        gid = g['id']
        if only and gid not in only:
            continue
        if gid in SKIP:
            sources[gid] = {'source': 'channel', 'why': 'оставлена картинка из канала'}
            p = os.path.join(OUT, gid + '.jpg')
            if os.path.exists(p):
                os.remove(p)
            continue
        if not redo and not only and gid in sources and not ('--missing' in sys.argv and sources[gid].get('why') == 'не найдено'):
            continue
        r = None if gid in WIKI_ONLY else steam(gid, g['title'])
        r = r or wiki(gid, g['title'])
        if r and not valid_image(r['image']):
            r = None
        if r:
            img = r.pop('image')
            open(os.path.join(OUT, gid + '.jpg'), 'wb').write(img)
            sources[gid] = r
            found += 1
            print(f'+ {gid:45} {r["source"]:9} {r["match"]}')
        else:
            sources[gid] = {'source': 'channel', 'why': 'не найдено'}
            p = os.path.join(OUT, gid + '.jpg')
            if os.path.exists(p):
                os.remove(p)
            missed += 1
            print(f'- {gid:45} не найдено')
        time.sleep(0.4)
    json.dump(sources, open(SRC_FILE, 'w', encoding='utf-8'), ensure_ascii=False, indent=1, sort_keys=True)
    print(f'найдено: {found}, не найдено: {missed}')


if __name__ == '__main__':
    main()
