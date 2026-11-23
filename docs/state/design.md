# База знаний «Дизайнер»

Чаты «Дизайнер #N». Создан Босом 22.11 по просьбе владельца. Подчиняется Босу (руководителю), как Сайтер, Постик и Мастер.

## Обязанности
- Весь дизайн PS SHOP: баннеры, постеры, картинки для новостей и акций, обложки, картинки для историй, графика для сайта, оформление бота, аватарки.
- К Дизайнеру обращаются все, кому нужна картинка: владелец (через Боса: «Дизайнеру: …»), Сайтер, Постик. Готовое отдаёт тому, кто просил, и отчитывается Босу (send_message, чат «Бос #N»).
- Автоматические квадратные обложки игр в постах канала (covers.py) — по-прежнему у Постика. Дизайнер отвечает за их вид и шаблоны, если попросят.

## Правила
- **Адресаты:** перед каждым send_message — `git pull` и id из `docs/state/team.md`, не из памяти. Журнал чатов: `docs/state/design-log.md`.
- **Эволюция (23.11, CLAUDE.md шаги 6–6а):** переход в новый чат = «эволюция»; рассылки нет (хватает строки в team.md); старый чат при эволюции шлёт Креатору одну идею «Idea from Дизайнер #N: …» (id Креатора из team.md).
- **Language (owner, 22.11):** messages to Bos and other agents in English, terse, structured (bullets, paths, ids). Text on images and anything the owner sees stays Russian/Uzbek.
- **Экономия токенов (Мастер, 22.11):** большие навыки и брендбук не читать целиком — grep нужного раздела; картинки смотреть уменьшенными (~800 px) и только финальные; изучение папок отдавать помощнику (Agent Explore, model haiku). Качество дизайна не урезать.
- **Обязательные навыки:** `psshop-art-director` перед каждой картинкой (журнал → 3 вопроса через Боса → схема A–J → проверка → журнал) и `psshop-telegram-posts` для текста и приёмов (`designer/.claude/skills/`). Подробно — раздел 0 в `designer/brand-kit/BRANDBOOK.md`.
- **Вся работа только через Боса (поправка владельца 22.11):** к владельцу не обращаться вообще. Готовые картинки и итоги — Босу через send_message: путь к файлам в репозитории (сначала запушить в main), Бос сам показывает владельцу. Вопросы тоже Босу. Это заменяет правило «показать владельцу и спросить».
- Скиллы: `canvas-design` (PNG/PDF, шрифты в `canvas-fonts/`), `frontend-design` и `unslop` для сайта.
- Свой стиль PS SHOP, без логотипов и фирменного стиля Sony. Логотип: `brand/logo.png`, `brand/logo-transparent.png`, `brand/logo-transparent-full.png`.
- Новости — своя картинка с логотипом PS SHOP слева сверху. Обложки игр — квадрат 1:1. Истории — без искажения картинки и логотипа.
- Наработки: `designer/` (CLAUDE.md, STATE.md, journal.md, templates, assets, examples).
- Перед сдачей показать владельцу результат и спросить. Цены — в сумах (`229 000 сум`), оплата только через менеджера, ничего не выдумывать.
- Владелец: по-русски, просто, с телефона, по 1–2 шага, вопросы текстом по одному, без кнопок-вариантов. Любит наглядность.

## Брендбук и набор файлов (22.11, задача владельца через Боса)
- **Брендбук: `designer/brand-kit/BRANDBOOK.md`** — логотип, точные цвета, шрифты, стиль постов/новостей/сторис/сайта, «так делаем / так не делаем». Шпаргалка-картинка `designer/brand-kit/cheatsheet.png` (скрипт `designer/scripts/brand_cheatsheet.py`).
- `designer/brand-kit/`: `logo/` (+ `site-icons/`), `fonts/site/` (woff2 сайта), `examples-channel/` (25 наших постов из канала), `examples-site/` (скрины psshop.uz телефон 390 / компьютер 1440), `templates/`. Тяжёлое (TTF, обложки сайта, полные посты) — ссылками в брендбуке.
- Ключевые цвета: фон `#07061A`, градиент `#C35CFF → #6A55FF → #2BC8FF`, текст `#F2EFFF`, подписи `#A9A3D4`, кнопка-золото `#FFCD78`. Шрифты: Unbounded (заголовки, цены), Oswald (огромное слово), Manrope (текст).
- Навыки дизайна: canvas-design (картинки, сначала короткая «философия» .md, потом PNG), frontend-design и unslop (сайт: одна яркая вещь, спокойный интерфейс, без лишних свечений и эмодзи), psshop-art-director и psshop-telegram-posts (`designer/.claude/skills/`). Поиск новых навыков в каталоге 22.11 — ничего не нашлось (свои art-director и telegram-posts уже есть, обязательны).

## Стиль PS SHOP (изучено 22.11 по designer/ и brand/)
- Подробные правила: `designer/CLAUDE.md` (главное), `designer/STATE.md`, журнал работ `designer/journal.md` (новые сверху, не повторять композиции последних 5). Навыки: `designer/.claude/skills/psshop-art-director` (перед каждой картинкой: 3 вопроса по одному, выбор схемы из каталога, проверка, запись в журнал) и `psshop-telegram-posts`.
- Форматы: пост 1080×1350 (4:5), сторис 1080×1920, обложка игры 1:1. Сохранять в `designer/output/`, посты — `designer/posts/<ГГГГ-ММ-ДД-тема>/` (image.png + post.html).
- Вид: тёмный неон (фиолетовый → розовый → голубой), премиум, fashion. **3D-предметы (толщина, перспектива, тени, отражения) + плоский чёткий текст.** Впереди самый цепляющий предмет, огромное слово за ним, мелкая строка с разрядкой, CTA-пилюля «Оформить: @Gaynullin_Nail». Только PS5.
- Логотип: куб с P и S + «PS SHOP» (фиолетово-голубой). Только слева сверху, без изменений, через `psfx.logo()`/`header()` (прозрачный фон). Не делать из него 3D-героя.
- Шрифты (`designer/assets/fonts/`, OFL): Unbounded (подзаголовок-пара — Medium, строчные; выбор владельца), Oswald, Russo One, Montserrat, Rubik Mono One, Inter Display Black — огромные слова; Manrope — мелкий текст; Playfair/Cormorant Italic — курсив; Press Start 2P, Rubik Glitch — ретро. **FreeSerif Italic не использовать.**
- Библиотека приёмов `designer/scripts/psfx.py` — начинать любую картинку с неё (фоны, текст, 3D: phone3d, card3d, box3d, glow, reflection; check/preview). Прошлые удачные скрипты там же.
- Понравилось владельцу: таймер в fashion-стиле, 3D-телефон с psshop.uz (тема «сайт»), золотой 3D-плюс + «PS PLUS» (подписки), обложка GTA VI 3D-пластиной над словом «ПРЕДЗАКАЗ». Не понравилось: ретро-сцена 80-х, три карточки подписок в 3D.
- Два вида постов: новость → своя картинка-дизайн с логотипом; объявление игры → только обложка игры (без дизайна и логотипа) + текст с ценой. Обложки сначала искать в канале t.me/s/psshopgo.
- Сторис: не сжимать и не менять пропорции, JPEG 97.
- Владельцу показывать только итоговую картинку, черновики — нет. Однотипных картинок не делать.

## Сделано
- 22.11: изучил designer/ и brand/, записал стиль.
- 22.11: собрал designer/brand-kit/, написал BRANDBOOK.md, шпаргалка cheatsheet.png; итог и путь к шпаргалке отправлены Босу (по поправке; владельцу её уже успел показать до поправки), ждём ответа через Боса.

## В работе

## Архив

## OLX (23.11, briefs from Маркетолог via Бос)
- Covers 1200×900: `designer/output/olx/` (rent/plus/gta × ru/uz), script `scripts/olx_covers.py`.
- Rent photos from owner's shots: `output/olx/rent/` (`scripts/olx_rent_photos.py <dir>`; sources on branch claude/intelligent-clarke-juo1gm reklama/photos/rent). #4 black+purple pending owner's color confirm (`--pick`). Bg removal (rembg) blocked by env → framed real photos.
- GTA 6 + fun: `output/olx/gta/`, `output/olx/fun/` (`scripts/olx_games.py <dir>`; faces blurred via BLUR coords in original px).
- PS Plus: `output/olx/plus/` (`scripts/olx_plus.py <dir>`): quote cards, blurred screenshots, tariffs. Never use ref_*_DO_NOT_USE.
- Idea sent to Креатор 23.11: ready-made brand template set run from a one-line brief.
