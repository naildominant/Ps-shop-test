#!/usr/bin/env python3
"""Собирает статический сайт PS SHOP в папку dist/.

    python3 scripts/build.py

Берёт data/games.json (его обновляет scripts/catalog.py) и src/static/*.
Настройки через переменные окружения:
    SITE_URL   адрес сайта для ссылок и превью (по умолчанию https://psshop.uz)
    ORDER_API  адрес Cloudflare Worker (заявки в бота и счётчики корзины); пусто — заявка только через Telegram
    HITS_URL   адрес счётчиков корзины (ORDER_API + /hits) для полки «Хиты»
"""
import datetime as dt
import html
import json
import os
import re
import shutil
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, 'dist')
SITE_URL = os.environ.get('SITE_URL', 'https://psshop.uz').rstrip('/')
ORDER_API = os.environ.get('ORDER_API') or 'https://psshop.psshop.workers.dev'
BASE = os.environ.get('BASE_PATH', '').rstrip('/')  # '' для psshop.uz, '/Ps-shop-test' для naildominant.github.io
TZ = dt.timezone(dt.timedelta(hours=5))  # Ташкент
TODAY = dt.datetime.now(TZ).date()
GTA_RELEASE = '2026-11-19T00:00:00+05:00'

CONTACTS = {
    'manager': 'https://t.me/Gaynullin_Nail',
    'channel': 'https://t.me/psshopgo',
    'reviews': 'https://t.me/xpsshopotziv',
    'community': 'https://t.me/psshopchatgo',
    'rent': 'https://t.me/psshop_arenda',
    'instagram': 'https://instagram.com/psshop.go',
    'olx': 'https://m.olx.uz/list/user/6lj3A/',
}
LANG_RU = {'voice': 'Русская озвучка', 'subs': 'Русские субтитры', 'en': 'Английский язык', '': 'Уточните у менеджера'}

E = html.escape


def money(n):
    return f'{n:,}'.replace(',', ' ')


def parse_date(s):
    if not s:
        return None
    try:
        if re.match(r'\d\d\.\d\d\.\d{4}$', s):
            d, m, y = map(int, s.split('.'))
            return dt.date(y, m, d)
        return dt.date.fromisoformat(s[:10])
    except ValueError:
        return None


# ---------- данные ----------
def cart_hits():
    """Какие игры чаще кладут в корзину (счётчики Cloudflare Worker, адрес в HITS_URL)."""
    url = os.environ.get('HITS_URL')
    if not url:
        return set()
    try:
        import urllib.request
        counts = json.loads(urllib.request.urlopen(url, timeout=20).read())
    except Exception as e:
        print('Счётчики корзины недоступны:', e)
        return set()
    top = sorted(((n, gid) for gid, n in counts.items() if n >= 3), reverse=True)[:20]
    return {gid for _, gid in top}


def load():
    games = json.load(open(os.path.join(ROOT, 'data', 'games.json'), encoding='utf-8'))
    popular = cart_hits()
    rel_file = os.path.join(ROOT, 'data', 'releases.json')
    releases = json.load(open(rel_file, encoding='utf-8')) if os.path.exists(rel_file) else {}
    out = []
    for g in games:
        if g.get('editions'):
            opts = [{'key': e['name'], 'label': e['name'], 'price': e['price'], 'plat': 'PS5'} for e in g['editions']]
        else:
            opts = [{'key': p, 'label': p, 'price': g[p.lower()], 'plat': p} for p in ('PS4', 'PS5') if g.get(p.lower())]
        if not opts:
            continue
        rel = parse_date(releases.get(g['id'])) or parse_date(g.get('release_post'))
        g['opts'] = opts
        g['min'] = min(o['price'] for o in opts)
        g['plats'] = sorted({o['plat'] for o in opts})
        g['rel'] = rel
        g['pre'] = bool(g.get('preorder')) and (rel is None or rel > TODAY)
        g['new'] = bool(rel and TODAY - dt.timedelta(days=365) <= rel <= TODAY)
        g['vr'] = 'vr' in g.get('notes', [])
        g['hit'] = bool(g.get('hit')) or g['id'] in popular  # топ-50 из канала + чаще всего кладут в корзину
        g['coop'] = bool(g.get('players') and re.search(r'[–-]\s*\d', g['players']))
        out.append(g)
    return out


def best_opt(g):
    best = g['opts'][0]
    for o in g['opts']:
        if o['price'] <= best['price']:
            best = o
    return best


# ---------- иконки ----------
IC = {
    'search': '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    'cart': '<path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L20.5 8H6.2"/><circle cx="10" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/>',
    'plus': '<path d="M12 5v14M5 12h14"/>',
    'check': '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    'close': '<path d="M6 6l12 12M18 6 6 18"/>',
    'remote': '<path d="M5 12.5a10 10 0 0 1 14 0M8 15.5a5.5 5.5 0 0 1 8 0"/><circle cx="12" cy="19" r="1.2"/><path d="M2 9.5a14.5 14.5 0 0 1 20 0"/>',
    'shield': '<path d="M12 3 5 6v5.5c0 4.3 3 8 7 9.5 4-1.5 7-5.2 7-9.5V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
    'chat': '<path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12z"/>',
    'pad': '<path d="M7.5 7h9a5 5 0 0 1 4.9 6l-.8 3.9a2.2 2.2 0 0 1-3.8 1L15 15.8H9l-1.8 2.1a2.2 2.2 0 0 1-3.8-1L2.6 13a5 5 0 0 1 4.9-6z"/><path d="M8 10v3M6.5 11.5h3"/><circle cx="15.5" cy="11" r=".6"/><circle cx="17.5" cy="12.5" r=".6"/>',
    'play': '<circle cx="12" cy="12" r="9"/><path d="m10 8.8 5 3.2-5 3.2z"/>',
    'tg': '<path d="M21 4 3 11l6.5 2.2L18 7l-6.5 7.8L17 20z"/>',
    'arrow': '<path d="M5 12h14M13 6l6 6-6 6"/>',
}


def icon(name, cls=''):
    return f'<svg viewBox="0 0 24 24" aria-hidden="true"{f" class={cls!r}" if cls else ""}>{IC[name]}</svg>'


# ---------- разметка ----------
NAV = [('catalog', '/catalog/', 'Каталог'), ('subs', '/subscriptions/', 'Подписки'), ('rent', '/rent/', 'Аренда PS5'), ('install', '/install/', 'Установка')]


def layout(*, title, desc, body, path, page='', og_image=None, og_type='website', extra_head=''):
    og = og_image or f'{SITE_URL}/static/img/og-default.jpg'
    nav = ''.join(f'<a href="{href}"{" aria-current=\"page\"" if key == page else ""}>{label}</a>' for key, href, label in NAV)
    return f'''<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{E(title)}</title>
<meta name="description" content="{E(desc)}">
<link rel="canonical" href="{SITE_URL}{path}">
<meta name="theme-color" content="#07061a">
<meta property="og:type" content="{og_type}">
<meta property="og:site_name" content="PS SHOP">
<meta property="og:locale" content="ru_RU">
<meta property="og:title" content="{E(title)}">
<meta property="og:description" content="{E(desc)}">
<meta property="og:url" content="{SITE_URL}{path}">
<meta property="og:image" content="{og}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/static/img/favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="/static/img/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Unbounded:wght@700;800&display=swap">
<link rel="stylesheet" href="/static/styles.css?v={VERSION}">
{extra_head}</head>
<body data-page="{page}">
<a class="sr" href="#main">К содержимому</a>
<header class="top">
  <div class="wrap top-in">
    <a class="brand" href="/" aria-label="PS SHOP — на главную"><img src="/static/img/mark-96.webp" width="40" height="40" alt=""><b>PS SHOP</b></a>
    <nav class="nav" aria-label="Разделы">{nav}</nav>
    <div class="top-tools">
      <form class="search" id="search" action="/catalog/" role="search">
        {icon('search')}<input id="search-q" name="q" type="search" placeholder="Найти игру" autocomplete="off" aria-label="Найти игру">
      </form>
      <button class="icon-btn search-open" id="search-open" aria-label="Поиск" aria-expanded="false">{icon('search')}</button>
      <button class="icon-btn" id="cart-open" aria-label="Корзина">{icon('cart')}<span class="cart-count" id="cart-count" hidden>0</span></button>
    </div>
  </div>
</header>
<main id="main">
{body}
</main>
{footer()}
{cart_drawer()}
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script>window.PS={{base:{json.dumps(BASE)},api:{json.dumps(ORDER_API.rstrip('/'))},manager:{json.dumps(CONTACTS["manager"])}}};</script>
<script src="/static/app.js?v={VERSION}" defer></script>
</body>
</html>
'''


def footer():
    c = CONTACTS
    return f'''<footer class="foot">
  <div class="wrap foot-in">
    <div>
      <a class="brand" href="/"><img src="/static/img/mark-96.webp" width="40" height="40" alt="" loading="lazy"><b>PS SHOP</b></a>
      <p>Цифровые игры и подписки для PlayStation 4 и PlayStation 5 в Ташкенте. Работаем более 3 лет. На связи 24/7.</p>
    </div>
    <div>
      <h3>Магазин</h3>
      <ul>
        <li><a href="/catalog/">Каталог игр</a></li>
        <li><a href="/subscriptions/">Подписки PS Plus и EA Play</a></li>
        <li><a href="/rent/">Аренда PS5</a></li>
        <li><a href="/install/">Как происходит установка</a></li>
      </ul>
    </div>
    <div>
      <h3>Связь</h3>
      <ul>
        <li><a href="{c['manager']}" target="_blank" rel="noopener">Заказы: @Gaynullin_Nail</a></li>
        <li><a href="{c['channel']}" target="_blank" rel="noopener">Telegram-канал</a></li>
        <li><a href="{c['reviews']}" target="_blank" rel="noopener">Отзывы</a></li>
        <li><a href="{c['community']}" target="_blank" rel="noopener">Сообщество игроков</a></li>
        <li><a href="{c['instagram']}" target="_blank" rel="noopener">Instagram</a></li>
        <li><a href="{c['olx']}" target="_blank" rel="noopener">OLX</a></li>
      </ul>
    </div>
  </div>
  <div class="wrap foot-note">PS SHOP — независимый магазин. PlayStation, PS4 и PS5 — товарные знаки их владельцев.</div>
</footer>'''


def cart_drawer():
    return f'''<div class="scrim" id="scrim" hidden></div>
<aside class="drawer" id="cart" aria-label="Корзина" aria-hidden="true" inert>
  <div class="drawer-head"><h2>Корзина</h2><button class="icon-btn" data-close-cart aria-label="Закрыть">{icon('close')}</button></div>
  <div class="drawer-body" id="cart-body"></div>
</aside>'''


def price_html(g, from_=True):
    frm = '<span class="from">от</span>' if from_ and len(g['opts']) > 1 and len({o['price'] for o in g['opts']}) > 1 else ''
    return f'<div class="price">{frm}{money(g["min"])}<small>uzs</small></div>'


def tags(g, limit=2):
    t = []
    if g['pre']:
        t.append('<span class="tag tag-pre">Предзаказ</span>')
    if g.get('hit'):
        t.append('<span class="tag tag-hit">Хит</span>')
    if g['new'] and not g['pre']:
        t.append('<span class="tag tag-new">Новинка</span>')
    return ''.join(t[:limit])


def card(g, lazy=True):
    o = best_opt(g)
    return f'''<article class="card">
  <div class="card-media">
    <a class="card-img" href="/game/{g['id']}/"><img src="/static/covers/sm/{g['id']}.webp" alt="{E(g['title'])}" width="300" height="400"{' loading="lazy"' if lazy else ''} decoding="async"></a>
    <div class="card-tags">{tags(g)}</div>
    <button class="card-add" data-add="{g['id']}" data-opt="{E(o['key'])}" aria-label="В корзину: {E(g['title'])}">{icon('plus')}</button>
  </div>
  <div class="card-body">
    <span class="card-meta">{' / '.join(g['plats'])}</span>
    <a class="card-title" href="/game/{g['id']}/">{E(g['title'])}</a>
    {price_html(g)}
  </div>
</article>'''


def shelf(title, items, href=None, eager=0):
    if not items:
        return ''
    more = f'<a href="{href}">Смотреть все</a>' if href else ''
    cards = ''.join(card(g, lazy=i >= eager) for i, g in enumerate(items))
    return f'''<section class="sec wrap"><div class="sec-head"><h2>{title}</h2>{more}</div><div class="shelf">{cards}</div></section>'''


# ---------- страницы ----------
def page_home(games):
    gta = next((g for g in games if g['id'] == 'grand-theft-auto-vi'), None)
    hits = [g for g in games if g.get('hit') and not g['pre']]
    pre = [g for g in games if g['pre']]
    new = sorted([g for g in games if g['new']], key=lambda g: g['rel'], reverse=True)
    coop = [g for g in games if g['coop'] and (g.get('hit') or g['new'])] or [g for g in games if g['coop']]
    cheap = sorted([g for g in games if g['min'] <= 200000], key=lambda g: g['min'])
    vr = [g for g in games if g['vr']]
    hero = ''
    if gta:
        o = best_opt(gta)
        hero = f'''<section class="wrap">
  <div class="hero" id="gta">
    <div class="hero-bg" style="background-image:url('/static/covers/{gta['id']}.webp')"></div>
    <div class="hero-in">
      <div>
        <div class="hero-tags"><span class="tag tag-pre">Предзаказ</span><span class="tag">PS5</span><span class="tag">Выход 19 ноября</span></div>
        <h1>GTA VI</h1>
        <p class="hero-sub">Джейсон, Люсия и Вайс-Сити. Оформите заранее, и в день релиза игра уже будет на вашей консоли.</p>
        <div class="timer" id="timer" data-to="{GTA_RELEASE}" role="timer" aria-label="До выхода GTA 6">
          <div class="timer-cell glass"><b data-u="d">--</b><span>дней</span></div>
          <div class="timer-cell glass"><b data-u="h">--</b><span>часов</span></div>
          <div class="timer-cell glass"><b data-u="m">--</b><span>минут</span></div>
          <div class="timer-cell glass"><b data-u="s">--</b><span>секунд</span></div>
        </div>
        <p class="timer-done" id="timer-done" hidden>GTA 6 уже вышла</p>
        <div class="hero-buy">
          <a class="btn btn-main" href="/game/{gta['id']}/">Оформить</a>
          <div class="hero-price"><small>Standard / Ultimate</small><span class="num">от {money(gta['min'])}</span> <small style="display:inline">uzs</small></div>
        </div>
        <p class="hero-note">Наши клиенты заходят в игру 18 ноября в 23:30.</p>
      </div>
      <a class="hero-cover" href="/game/{gta['id']}/"><img src="/static/covers/{gta['id']}.webp" alt="GTA VI" width="330" height="440" fetchpriority="high"></a>
    </div>
  </div>
</section>'''
    perks = f'''<section class="wrap perks" aria-label="Почему PS SHOP">
  <div class="perk glass"><div class="perk-ic">{icon('remote')}</div><div><b>Подключим дистанционно</b><span>Консоль никуда везти не нужно</span></div></div>
  <div class="perk glass"><div class="perk-ic">{icon('shield')}</div><div><b>Гарантия</b><span>Работоспособность, замена или возврат</span></div></div>
  <div class="perk glass"><div class="perk-ic">{icon('chat')}</div><div><b>На связи 24/7</b><span>Поможем и после покупки</span></div></div>
  <div class="perk glass"><div class="perk-ic">{icon('pad')}</div><div><b>{len(games)} игр</b><span>Для PS4 и PS5</span></div></div>
</section>'''
    promo = f'''<section class="sec wrap promo">
  <a class="promo-card glass" href="/subscriptions/">
    <h3>PS Plus</h3>
    <p>Сотни игр по подписке, онлайн с друзьями и облачные сохранения. Есть EA Play.</p>
    <div class="big-num grad-text">269&nbsp;000<small>uzs / месяц</small></div>
    <span class="btn btn-sm">Выбрать подписку</span>
  </a>
  <a class="promo-card glass is-blue" href="/rent/">
    <h3>Аренда PS5</h3>
    <p>Привезём консоль с двумя джойстиками, установим и настроим у вас дома в Ташкенте.</p>
    <div class="big-num grad-text">от 200&nbsp;000<small>uzs / сутки</small></div>
    <span class="btn btn-sm">Смотреть цены</span>
  </a>
</section>'''
    pre = [g for g in pre if g['id'] != 'grand-theft-auto-vi']
    body = hero + perks + shelf('Предзаказы', pre, '/catalog/?f=pre', eager=3) + shelf('Хиты', hits, '/catalog/?f=hit') \
        + shelf('Новинки', new, '/catalog/?f=new') + promo + shelf('Играть вместе', coop, '/catalog/?f=coop') \
        + shelf('До 200 000 uzs', cheap, '/catalog/?sort=price') + shelf('Для VR', vr, '/catalog/?f=vr') + guarantees_block()
    return layout(title='PS SHOP — игры для PS4 и PS5 в Ташкенте', path='/', page='home',
                  desc=f'{len(games)} цифровых игр для PlayStation 4 и 5, подписки PS Plus и аренда PS5. Подключим дистанционно, гарантия, на связи 24/7.',
                  body=body)


def page_catalog(games):
    chips = [('', 'Все'), ('ps5', 'PS5'), ('ps4', 'PS4'), ('pre', 'Предзаказ'), ('hit', 'Хиты'), ('voice', 'Русская озвучка'),
             ('ru', 'На русском'), ('coop', 'Для компании'), ('vr', 'VR'), ('new', 'Новинки')]
    chip_html = ''.join(f'<button class="chip" data-f="{k}" aria-pressed="{"true" if not k else "false"}">{l}</button>' for k, l in chips)
    first = ''.join(card(g, lazy=i >= 6) for i, g in enumerate(games[:24]))
    body = f'''<div class="wrap">
  <div class="page-head"><h1>Каталог игр</h1><p>Все игры из нашего канала с актуальными ценами для PS4 и PS5.</p></div>
  <div class="toolbar">
    <div class="chips" id="chips" role="group" aria-label="Фильтры">{chip_html}</div>
    <label class="sr" for="sort">Сортировка</label>
    <select class="select" id="sort"><option value="new">Сначала новые</option><option value="price">Сначала дешевле</option><option value="price-desc">Сначала дороже</option><option value="az">По алфавиту</option></select>
  </div>
  <p class="found" id="found">{len(games)} игр</p>
  <div class="grid" id="grid">{first}</div>
  <div class="empty glass" id="empty" hidden>
    <h3>Не нашли нужную игру?</h3>
    <p>Напишите нам, найдём за 10 минут.</p>
    <a class="btn btn-main" id="empty-tg" href="{CONTACTS['manager']}" target="_blank" rel="noopener">{icon('tg')}Написать в Telegram</a>
  </div>
  <div class="more"><button class="btn" id="more" hidden>Показать ещё</button></div>
</div>'''
    return layout(title='Каталог игр для PS4 и PS5 — PS SHOP', path='/catalog/', page='catalog',
                  desc=f'{len(games)} игр для PlayStation 4 и 5 с ценами в сумах. Поиск, фильтры, предзаказы и хиты.', body=body)


def page_game(g, games):
    o = best_opt(g)
    opts = ''.join(f'<button class="opt" role="radio" aria-checked="{"true" if x is o else "false"}" data-key="{E(x["key"])}" data-price="{x["price"]}"><b>{E(x["label"])}</b><span>{money(x["price"])} uzs</span></button>' for x in g['opts'])
    facts = [('Язык', LANG_RU.get(g.get('lang', ''), '')), ('Издание', ' / '.join(e['name'] for e in g['editions']) if g.get('editions') else (g.get('edition') or 'Standard')),
             ('Игроков', g.get('players') or '1'), ('Дата выхода' if g['rel'] else 'Платформа', g['rel'].strftime('%d.%m.%Y') if g['rel'] else ' / '.join(g['plats']))]
    notes = []
    if 'psplus' in g.get('notes', []):
        notes.append('Для этой игры нужна подписка PS Plus.')
    if g['vr']:
        notes.append('Для игры нужен шлем PS VR / PS VR2.')
    same = [x for x in games if x['id'] != g['id'] and x.get('hit')][:12]
    gameplay = f'<a class="link-quiet" href="{E(g["gameplay"])}" target="_blank" rel="noopener" data-track="gameplay">{icon("play")}Геймплей</a>' if g.get('gameplay') else ''
    body = f'''<div class="game">
  <div class="game-bg" style="background-image:url('/static/covers/{g['id']}.webp')"></div>
  <div class="wrap game-in">
    <div class="game-cover"><img src="/static/covers/{g['id']}.webp" alt="{E(g['title'])}" width="380" height="507" fetchpriority="high"></div>
    <div>
      <nav class="crumbs" aria-label="Навигация"><a href="/">Главная</a><span>/</span><a href="/catalog/">Каталог</a></nav>
      <div class="hero-tags">{tags(g, 3)}<span class="tag">{' / '.join(g['plats'])}</span></div>
      <h1>{E(g['title'])}</h1>
      <div class="opts" role="radiogroup" aria-label="{'Издание' if g.get('editions') else 'Платформа'}">{opts}</div>
      <div class="buy glass" data-game="{g['id']}">
        <div class="buy-price grad-text" id="buy-price">{money(o['price'])}<small>uzs</small></div>
        <p class="buy-note">{'Предзаказ: игра станет доступна в день выхода.' if g['pre'] else 'Цифровая версия. Подключим дистанционно.'}</p>
        <div class="buy-actions">
          <button class="btn btn-main" data-order="{g['id']}" data-opt="{E(o['key'])}">Оформить</button>
          <button class="btn" data-add="{g['id']}" data-opt="{E(o['key'])}" data-label="В корзину">В корзину</button>
        </div>
      </div>
      <div class="facts">{''.join(f'<div class="fact"><span>{k}</span><b>{E(v)}</b></div>' for k, v in facts)}</div>
      {''.join(f'<p class="note">{n}</p>' for n in notes)}
      <div class="game-links">{gameplay}<a class="link-quiet" href="{CONTACTS['channel']}/{g['post']}" target="_blank" rel="noopener">{icon('tg')}Пост в канале</a></div>
    </div>
  </div>
</div>
{shelf('Популярное', same)}'''
    plat = ' и '.join(g['plats'])
    desc = f'{g["title"]} для {plat}: {"от " if len(g["opts"]) > 1 else ""}{money(g["min"])} uzs. {LANG_RU.get(g.get("lang", ""), "")}. Подключим дистанционно, гарантия, на связи 24/7.'
    ld = {'@context': 'https://schema.org', '@type': 'Product', 'name': g['title'], 'image': f'{SITE_URL}/static/covers/{g["id"]}.webp',
          'offers': {'@type': 'AggregateOffer', 'priceCurrency': 'UZS', 'lowPrice': g['min'], 'highPrice': max(x['price'] for x in g['opts']),
                     'availability': 'https://schema.org/PreOrder' if g['pre'] else 'https://schema.org/InStock'}}
    head = f'<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>\n'
    return layout(title=f'{g["title"]} — {money(g["min"])} uzs для {plat} | PS SHOP', desc=desc, path=f'/game/{g["id"]}/',
                  page='game', og_image=f'{SITE_URL}/static/covers/{g["id"]}.webp', og_type='product', body=body, extra_head=head)


def load_services():
    return json.load(open(os.path.join(ROOT, 'data', 'services.json'), encoding='utf-8'))


def months(n):
    n = int(n)
    return f'{n} месяц' if n == 1 else f'{n} месяца' if n in (2, 3, 4) else f'{n} месяцев'


def days_word(n):
    return 'сутки' if n == 1 else 'суток'


def page_subs(sv):
    def plan(p, kind):
        rows = ''
        for m, price in p['prices'].items():
            best = m == '12'
            rows += f'''<div class="sub-row{' is-best' if best else ''}">
  <div><b>{months(m)}</b>{'<span class="best-pill">Выгоднее всего</span>' if best else ''}</div>
  <div class="sub-price num">{money(price)}<small>uzs</small></div>
  <button class="btn btn-sm{' btn-main' if best else ''}" data-add="{p['id']}" data-opt="{months(m)}" data-label="В корзину">В корзину</button>
</div>'''
        about = f'<p>{E(p["about"])}</p>' if p.get('about') else ''
        return f'''<article class="sub glass">
  <header><span class="sub-kind">{kind}</span><h3>{E(p['name'])}</h3>{about}</header>
  <div class="sub-rows">{rows}</div>
</article>'''
    ea = sv['eaplay']
    body = f'''<div class="wrap">
  <div class="page-head"><h1>Подписки</h1><p>PS Plus для PS4 и PS5 и EA Play. Подписка на 12 месяцев выходит выгоднее всего: один раз оформили и играете весь год.</p></div>
  <section class="sec"><div class="sec-head"><h2>PS Plus</h2></div><div class="subs">{''.join(plan(p, 'PS Plus') for p in sv['psplus'])}</div></section>
  <section class="sec"><div class="sec-head"><h2>EA Play</h2></div>
    <div class="subs subs-ea">{plan(ea, 'EA Play')}
      <article class="sub glass ea-games"><header><h3>Что входит</h3><p>Большая коллекция игр EA: спорт, гонки, экшен и кооператив.</p></header>
        <ul>{''.join(f'<li>{E(x)}</li>' for x in ea['games'])}</ul></article>
    </div>
  </section>
  <p class="sec hint">Подписки оформляются так же, как игры: добавьте в корзину и отправьте заявку. Подключим дистанционно.</p>
</div>'''
    return layout(title='Подписки PS Plus и EA Play в Ташкенте — PS SHOP', path='/subscriptions/', page='subs',
                  desc='PS Plus Essential, Extra и Deluxe (Premium) на 1, 3 и 12 месяцев, EA Play. Цены в сумах, подключим дистанционно.', body=body)


def page_rent(sv):
    r = sv['rent']

    def table(rows, title):
        base = rows[0]['price']
        out = ''
        for x in rows:
            save = base * x['days'] - x['price']
            right = '' if x['days'] == 1 else f'''<div class="rent-save"><span class="save-pill">Экономия {money(save)} uzs</span><span class="muted num">{money(x['price'] // x['days'])} uzs/сутки</span></div>'''
            out += f'''<div class="rent-row glass"><div class="rent-days"><b class="grad-text">{x['days']}</b><span>{days_word(x['days'])}</span></div>
  <div class="rent-price num">{money(x['price'])}<small>uzs</small></div>{right}</div>'''
        return f'<section class="sec"><div class="sec-head"><h2>{title}</h2></div><div class="rent-list">{out}</div></section>'
    tg = f'{CONTACTS["manager"]}?text=' + urllib.parse.quote('Здравствуйте! Хочу арендовать PS5.')
    body = f'''<div class="wrap">
  <div class="page-head"><h1>Аренда PS5</h1><p>Привезём PlayStation 5, установим и настроим у вас дома. Отлично для вечера с друзьями или турнира в FC.</p></div>
  <div class="rent-cta"><a class="btn btn-main" href="{tg}" target="_blank" rel="noopener">{icon('tg')}Забронировать в Telegram</a>
    <a class="link-quiet" href="{CONTACTS['rent']}" target="_blank" rel="noopener">Группа аренды @psshop_arenda</a></div>
  <ul class="incl">{''.join(f'<li class="glass">{icon("check")}<span>{E(x)}</span></li>' for x in r['includes'])}</ul>
  {table(r['rental'], 'Прокат')}
  {table(r['extension'], 'Продление')}
  <section class="sec"><div class="sec-head"><h2>Бронирование</h2></div>
    <div class="book glass"><p>Чтобы забронировать консоль, внесите предоплату</p><div class="big-num grad-text num">{money(r['booking'])}<small>uzs</small></div></div>
    <ol class="steps">
      <li class="glass"><b>1</b><span>Вы вносите предоплату {money(r['booking'])} uzs</span></li>
      <li class="glass"><b>2</b><span>Мы бронируем консоль за вами</span></li>
      <li class="glass"><b>3</b><span>Готовим консоль для вас</span></li>
    </ol>
  </section>
  <div class="sec rent-cta"><a class="btn btn-main" href="{tg}" target="_blank" rel="noopener">{icon('tg')}Забронировать в Telegram</a></div>
</div>'''
    return layout(title='Аренда PS5 в Ташкенте — PS SHOP', path='/rent/', page='rent',
                  desc='Аренда PlayStation 5 в Ташкенте: от 200 000 uzs в сутки, доставка, установка и настройка дома.', body=body)


GUARANTEES = [
    ('Игра работает', 'Игра запустится и будет работать. Если что-то пойдёт не так, разберёмся сразу, а не «когда-нибудь».'),
    ('Замена или возврат', 'Если проблему не получилось решить, заменим игру или вернём деньги. Без долгих споров.'),
    ('Аккаунт в безопасности', 'Игра ставится через отдельного пользователя на консоли. Ваш личный профиль и данные остаются нетронутыми.'),
    ('Понятная инструкция', 'Пришлём подробную пошаговую инструкцию. Справится даже тот, кто впервые держит джойстик.'),
    ('На связи 24/7', 'Не пропадаем после оплаты. Пишите в любое время: подскажем, поможем, быстро решим.'),
]


def guarantees_block():
    cards = ''.join(f'''<article class="gcard glass"><div class="perk-ic">{icon('shield' if i < 3 else 'chat' if i == 4 else 'check')}</div><h3>{E(t)}</h3><p>{E(d)}</p></article>'''
                    for i, (t, d) in enumerate(GUARANTEES))
    return f'''<section class="sec wrap"><div class="sec-head"><h2>Гарантии</h2><a href="{CONTACTS['reviews']}" target="_blank" rel="noopener">Отзывы клиентов</a></div>
<div class="gcards">{cards}</div></section>'''


def page_install():
    steps = [
        ('Получаете данные аккаунта', 'После оплаты пришлём логин и пароль от аккаунта с игрой, плюс подробную инструкцию.'),
        ('Добавляете нового пользователя', 'На PlayStation выберите «Добавить пользователя» и войдите с нашими данными. Ваш аккаунт остаётся на месте: на одной консоли помещается до 16 аккаунтов.'),
        ('Открываете Библиотеку', 'Войдите в новый профиль и откройте «Библиотеку». Игра уже ждёт там.'),
        ('Устанавливаете и играете', 'Нажмите «Загрузить», дождитесь окончания установки и запускайте игру.'),
        ('Мы рядом на каждом шаге', 'Если что-то непонятно, пишите в Telegram: подскажем по шагам или подключим дистанционно. Всё под ключ.'),
    ]
    items = ''.join(f'''<li class="istep glass"><b class="grad-text">{i + 1}</b><div><h3>{E(t)}</h3><p>{E(d)}</p></div></li>''' for i, (t, d) in enumerate(steps))
    body = f'''<div class="wrap">
  <div class="page-head"><h1>Как происходит установка</h1><p>Пять простых шагов, и игра на вашей консоли. Приезжать никуда не нужно, а если запутаетесь, проведём за руку.</p></div>
  <ol class="isteps">{items}</ol>
  <div class="rent-cta"><a class="btn btn-main" href="/catalog/">Выбрать игру</a><a class="link-quiet" href="{CONTACTS['manager']}" target="_blank" rel="noopener">{icon('tg')}Задать вопрос в Telegram</a></div>
</div>
{guarantees_block()}'''
    return layout(title='Как происходит установка игры — PS SHOP', path='/install/', page='install',
                  desc='Как установить игру из PS SHOP на PS4 или PS5: пять простых шагов, инструкция и поддержка 24/7.', body=body)


def page_stub(path, page, title, h1, text):
    body = f'''<div class="wrap"><div class="page-head"><h1>{h1}</h1><p>{text}</p></div>
<p style="margin-top:24px"><a class="btn btn-main" href="{CONTACTS['manager']}" target="_blank" rel="noopener">{icon('tg')}Написать в Telegram</a></p></div>'''
    return layout(title=title, desc=text, path=path, page=page, body=body)


def page_404():
    body = f'''<div class="wrap"><div class="empty glass" style="margin-top:60px"><h3>Такой страницы нет</h3><p>Возможно, игру убрали из каталога. Посмотрите похожие или напишите нам.</p>
<a class="btn btn-main" href="/catalog/">Открыть каталог</a></div></div>'''
    return layout(title='Страница не найдена — PS SHOP', desc='Страница не найдена', path='/404.html', body=body)


# ---------- данные для браузера ----------
ALIASES = [
    (r'GRAND THEFT AUTO|GTA', 'гта gta grand theft auto'), (r'\bVI\b', '6'), (r'\bV\b(?!R)', '5'),
    (r'CALL OF DUTY', 'cod колда кол оф дьюти'), (r'SPIDER', 'человек паук спайдер spider'),
    (r'\bFC \d|FIFA', 'фифа fifa фк'), (r'MORTAL KOMBAT', 'мортал комбат mk'), (r'RESIDENT EVIL', 'резидент ивел обитель зла re'),
    (r'GOD OF WAR', 'год оф вар бог войны gow'), (r'MINECRAFT', 'майнкрафт'), (r'RED DEAD', 'рдр rdr ред дед'),
    (r'LAST OF US', 'одни из нас тлоу tlou'), (r'ВЕДЬМАК', 'witcher'), (r'CYBERPUNK', 'киберпанк'), (r'ASSASSIN', 'ассасин ac'),
    (r'NEED FOR SPEED', 'нфс nfs'), (r'UFC', 'юфс'), (r'HOGWARTS', 'хогвартс гарри поттер'), (r'NBA', 'нба баскетбол'),
    (r'TEKKEN', 'теккен'), (r'ELDEN', 'элден'), (r'GRAN TURISMO', 'гран туризмо gt'), (r'FAR CRY', 'фар край'),
    (r'BATTLEFIELD', 'батлфилд бф bf'), (r'HORIZON', 'хорайзон'), (r'UNCHARTED', 'анчартед'), (r'DETROIT', 'детройт'),
    (r'SILENT HILL', 'сайлент хилл'), (r'DEATH STRANDING', 'дес стрендинг'), (r'GHOST OF', 'призрак цусимы гост'),
    (r'NARUTO', 'наруто'), (r'LEGO', 'лего'), (r'IT TAKES TWO', 'для двоих'), (r'FORZA', 'форза'), (r'DIABLO', 'диабло'),
    (r'STAR WARS', 'звёздные войны звездные войны'), (r'BATMAN', 'бэтмен бетмен'), (r'HITMAN', 'хитман'), (r'MAFIA', 'мафия'),
    (r'DOOM', 'дум'), (r'METRO', 'метро'), (r'STALKER', 'сталкер'), (r'SIMS', 'симс'), (r'WWE', 'реслинг'), (r'NHL', 'нхл хоккей'),
    (r'F1 ', 'формула 1 ф1'), (r'CRASH', 'крэш креш'), (r'SEKIRO', 'секиро'), (r'BLOODBORNE', 'бладборн'), (r'DAYS GONE', 'жизнь после'),
]


def search_words(title):
    extra = ' '.join(w for rx, w in ALIASES if re.search(rx, title))
    return f'{title} {extra}'


def catalog_json(games):
    rows = []
    for g in games:
        rows.append({'id': g['id'], 't': g['title'], 's': search_words(g['title']), 'o': [[o['key'], o['price']] for o in g['opts']],
                     'pl': g['plats'], 'm': g['min'], 'p': g['post'],
                     'f': [k for k in ('pre', 'hit', 'new', 'vr', 'coop') if g.get(k)] + (['voice'] if g.get('lang') == 'voice' else [])
                     + (['ru'] if g.get('lang') in ('voice', 'subs') else []),
                     'r': g['rel'].isoformat() if g['rel'] else None})
    return rows


VERSION = dt.datetime.now(TZ).strftime('%Y%m%d%H%M')


def make_thumbs():
    """Лёгкие обложки 330x440 для карточек (полные 600x800 — для страницы игры)."""
    from PIL import Image
    src = os.path.join(ROOT, 'src', 'static', 'covers')
    dst = os.path.join(DIST, 'static', 'covers', 'sm')
    os.makedirs(dst, exist_ok=True)
    for f in os.listdir(src):
        if f.endswith('.webp'):
            Image.open(os.path.join(src, f)).resize((330, 440), Image.LANCZOS).save(os.path.join(dst, f), 'WEBP', quality=74, method=6)


def with_base(text):
    """Добавляет путь сайта к ссылкам вида /catalog/, /static/… (нужно, пока сайт живёт не в корне домена)."""
    if not BASE:
        return text
    text = re.sub(r'(href|src|action)="/(?!/)', lambda m: f'{m.group(1)}="{BASE}/', text)
    return text.replace("url('/static/", f"url('{BASE}/static/")


def write(rel, text):
    if rel.endswith('.html'):
        text = with_base(text)
    path = os.path.join(DIST, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'w', encoding='utf-8').write(text)


def main():
    games = load()
    if os.path.exists(DIST):
        shutil.rmtree(DIST)
    shutil.copytree(os.path.join(ROOT, 'src', 'static'), os.path.join(DIST, 'static'))
    shutil.copy(os.path.join(ROOT, 'src', 'static', 'favicon.ico'), os.path.join(DIST, 'favicon.ico'))
    make_thumbs()
    write('index.html', page_home(games))
    write('catalog/index.html', page_catalog(games))
    for g in games:
        write(f'game/{g["id"]}/index.html', page_game(g, games))
    sv = load_services()
    write('subscriptions/index.html', page_subs(sv))
    write('rent/index.html', page_rent(sv))
    write('install/index.html', page_install())
    write('404.html', page_404())
    rows = catalog_json(games)
    for p in sv['psplus'] + [sv['eaplay']]:
        rows.append({'id': p['id'], 't': ('PS Plus ' if p['id'].startswith('ps-plus') else '') + p['name'], 'k': 'sub',
                     'o': [[months(m), v] for m, v in p['prices'].items()], 'pl': [], 'm': min(p['prices'].values()), 'f': [], 's': ''})
    write('static/catalog.json', json.dumps(rows, ensure_ascii=False, separators=(',', ':')))
    urls = ['/', '/catalog/', '/subscriptions/', '/rent/', '/install/'] + [f'/game/{g["id"]}/' for g in games]
    write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
          + ''.join(f'<url><loc>{SITE_URL}{u}</loc></url>\n' for u in urls) + '</urlset>\n')
    write('robots.txt', f'User-agent: *\nAllow: /\nSitemap: {SITE_URL}/sitemap.xml\n')
    print(f'Собрано: {len(games)} игр, {len(urls)} страниц -> dist/')


if __name__ == '__main__':
    main()
