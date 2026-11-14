# PS SHOP: сайт psshop.uz

Витрина цифровых игр и подписок для PS4 и PS5. Каталог собирается автоматически из Telegram-канала [@psshopgo](https://t.me/psshopgo).

## Как это работает

```
Telegram-канал @psshopgo
        │  каждые 10 минут (Cloudflare Worker запускает GitHub Actions)
        ▼
scripts/catalog.py ── читает канал, находит игры и цены, готовит обложки
        │                 (официальные из Steam/Википедии, иначе из поста)
        ▼
scripts/build.py ──── собирает сайт в папку dist/ (страница на каждую игру, sitemap, превью ссылок)
        ▼
GitHub Pages ──────── сайт psshop.uz

Корзина на сайте ──► worker/worker.js (Cloudflare) ──► бот @psshop_zayavki_bot ──► Наиль
```

- **Новая игра в канале** появится на сайте в течение 10–15 минут. **Изменили цену в посте** — обновится. **Удалили пост** — игра пропадёт.
- Пост с игрой должен содержать название, слово «ЦЕНА» и строки вида `PS5 - 229 000 uzs`. Посты, которые не удалось разобрать, записываются в `data/skipped.json`.
- **Хиты** = топ-50 из поста Black Friday в канале + игры, которые чаще всего кладут в корзину на сайте.

## Как поменять

| Что | Где |
|---|---|
| Цены подписок PS Plus / EA Play, аренды, брони | `data/services.json` |
| Обложку игры | положить картинку в `data/covers-manual/<id-игры>.webp` (id — из адреса страницы игры) |
| Как искать официальную обложку | `scripts/covers_official.py` (`QUERY`, `APPID`, `SKIP`) |
| Тексты страниц, гарантии, установка | `scripts/build.py` |
| Дизайн | `src/static/styles.css` |
| Поведение (корзина, поиск, таймер) | `src/static/app.js` |

После изменения в ветке `main` сайт пересобирается и публикуется сам (GitHub → Actions → update-catalog).

## Запуск у себя

```bash
pip install pillow
python3 scripts/catalog.py   # обновить каталог из канала
python3 scripts/build.py     # собрать сайт в dist/
python3 -m http.server 8000 --directory dist
```

## Сервер заявок (Cloudflare Worker)

Код: `worker/worker.js`, адрес: `https://psshop.psshop.workers.dev`.
Настройки в Cloudflare → Workers → psshop → Settings: `BOT_TOKEN` (секрет), `CHAT_ID`, `GH_TOKEN` (секрет, для запуска обновления каталога), `GH_REPO`, `ALLOWED`.
