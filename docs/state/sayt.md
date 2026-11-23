# База знаний — чаты «САЙТ PS SHOP»

Обновлено: 24.11.2026 (эволюция «Сайтер #4» → «Сайтер #5»). Подробный список задач: `docs/site-tasks.md`. Журнал: `docs/state/sayt-log.md`.

## Команда (утверждено владельцем 22.11)
- Я — **Сайтер** (чаты «САЙТ PS SHOP #N», название не меняется). Обязанности: сайт psshop.uz и /ru/, заявки (бот @psshop_zayavki_bot, /orderbot, handleOrder, CRM), задачи docs/site-tasks.md по одной, проверка сайта после выкладки, живая версия воркера перед деплоем, обновлять этот файл после каждого шага.
- Бос — руководитель, чат «БОС #N» (память docs/state/bos.md), отчёт владельцу по этому файлу. Задачи «Сайтеру: …» от Боса = задачи владельца; по готовности отчитаться Босу через send_message. Застрял/сломалось — писать Босу.
- Постик — «БОТ ПОСТИК», Мастер — «НАСТРОЙКА CLAUDE».
- Дизайнер — чат «Дизайнер #N»: картинки, баннеры, графика для сайта — просить у него через send_message.
- 22.11 Бос передал (со слов владельца, сам владелец в чате Сайтера пока не подтвердил): вся работа через Боса — вопросы, результаты, «выкладываю?» и скриншоты слать Босу через send_message, к владельцу не обращаться; ответ владельца от Боса считать ответом владельца. Вопрос про регистратора psshop.uz задаёт Бос.
- 22.11 (от Боса, решение владельца): сообщения Босу и другим агентам — на английском, кратко и структурно (пункты, пути, id). Тексты для владельца и клиентов (сайт uz/ru, ответы бота) — без изменений. Правило «задачи от Боса = задачи владельца» теперь есть и в CLAUDE.md (раздел «Команда»); новые названия чатов — «Сайтер #N».

- **23.11 rename (owner):** owner = «Founder» (он же раньше «Бос» в его словах), chat «Бос #N» → «Менеджер #N» (same session id, team.md row «Менеджер»). Orders/payment = owner himself (@Gaynullin_Nail), no separate human manager. Below, old «Бос» = today's «Менеджер». Reports/questions → Менеджер (id from team.md).

## Как всё устроено
- Сайт psshop.uz — статический, собирается `scripts/build.py` в `dist/`, публикуется GitHub Pages workflow `update-catalog.yml` (каждые 10 мин из воркера, раз в час, при пуше в main). Код сайта: `src/static/app.js`, `styles.css`, `sw.js`.
- Правки сайта: ветка сессии → PR → merge в main (владелец подтверждает «выкладываю?» / «+») → ветку сбросить на origin/main. Сайт обновляется через ~1 мин.
- Домен psshop.uz сейчас указывает на GitHub Pages (A 185.199.108–111.153, www → CNAME naildominant.github.io). Регистратор неизвестен (спросили владельца).
- Cloudflare Worker `psshop` (https://psshop.psshop.workers.dev), деплой `python3 scripts/deploy_worker.py` (Cloudflare API, keep_bindings). Воркер меняют и «БОТ ПОСТИК» — ПЕРЕД ДЕПЛОЕМ скачать живую версию (`GET .../workers/scripts/psshop/content/v2`), править её. Ключ Cloudflare в сессии: Workers и KV да, создавать зоны (домены) — НЕТ.
- **Деплой воркера (23.11, после поломки):** keep_bindings обязательно с "ai" (в deploy_worker.py теперь ['secret_text','ai']). Мои деплои T2/T3 22.11 шли с keep_bindings ['secret_text'] → снесли AI binding (поиск/голос бота Постика не работали до 23.11 ~15:45, Постик восстановил). После каждого деплоя проверять GET .../workers/scripts/psshop/settings → bindings: AI, STORE, BOT_TOKEN, TGPOST_*.
- KV `psshop-store`: order:seq (счётчик заявок), order:<№> (заявка, 180 дн), ordc:<код> → №, orderbot:secret (webhook бота заявок), orderbot:await (ждём сумму скидки).
- Бот заявок @psshop_zayavki_bot, имя «PSSHOP BOT», аватар «PS SHOP BOT» (логотип + BOT). Токен = секрет воркера BOT_TOKEN, владелец CHAT_ID 5562428297. Webhook → POST /orderbot (заголовок-секрет = KV orderbot:secret); подключение GET /orderbot/setup?key=<секрет>&set=1.
- Google Таблица «PS SHOP CRM» (id 17MKwvBfqCoRMtiqSskPOet4wRO1ewuvyEGjeSPIFCZc), коннектор Google Sheets. Листы: «Мой отчёт» (формулы), «Сводка» (формулы + график, id 1351099655, теперь с 21-й строки), «Заявки» (id 1), «Посетители» (id 2). Скрипт таблицы универсальный (`docs/google-sheet-script.js`, обновляет строку по key/keyCol) — не менять.

## Решения и правила
- Задачи делать строго по одной: сделал → показал → ждать «да» владельца.
- Заявка: номер (старые 1–14 проставлены вручную, новые с 15). Кнопки под заявкой: ✅ Купил / 💸 Купил со скидкой (бот спрашивает сумму, «950000» или «950к») / ⏳ В обработке / ❌ Отказался. Пишется в «Заявки»: H «Статус», K «№ заявки», L «Оплачено, uzs», M «Статус изменён». Статус в таблице — выпадающий список и цвет.
- Выручка: «Сводка» строки 13–19 (продано по заявкам сегодня/7/30 дней, если «Оплачено» пусто и статус «Купил» — берётся «Сумма»).
- Клиент после заказа: сайт генерирует код, открывает t.me/psshop_zayavki_bot?start=<код>; бот шлёт подтверждение (ru/uz по языку сайта) + кнопку «Написать менеджеру» с готовым текстом. Купил/Со скидкой/В обработке — уведомление клиенту; «Отказался» клиенту не пишется. Общение с клиентом — в личке владельца, бот только сопровождает. Если заявка ещё не дошла до узла KV — кнопка «🔄 Проверить заявку».
- Телефон в заказе: узбекский +998 и ровно 9 цифр (9 цифр без кода и «8…» тоже принимаются), приводится к «+998 90 123 45 67»; @username / t.me/… → @username; иностранные с + (10–15 цифр) пропускаются.
- «Посетители» = служебный лист для Claude (сырые данные, коды, можно расширять); для владельца — понятные листы/страница из него.
- Платный хостинг не нужен: ускорение = сервис-воркер + перенос на Cloudflare (есть узел в Ташкенте).
- Странные города в статистике = VPN (часовой пояс телефона Ташкент) и единичные боты; не ошибка.

## Предпочтения владельца
- По-русски, просто, по 1–2 шага; вопросы текстом по одному, без кнопок-вариантов. Часто с телефона, иногда с ноутбука.
- Любит наглядность: карточки, графики, значки, цвет, а не простыни текста. Колонки в таблицах — широкие, текст переносится.
- Перед выкладкой на сайт показать результат и спросить.

## В работе и планы
- **Задача 4, часть Б (в работе):** перенос на Cloudflare. Владелец сел за ноутбук; ждём: на каком сайте куплен домен psshop.uz, и вход в dash.cloudflare.com. Шаги: владелец добавляет psshop.uz в Cloudflare (Free) → меняет NS у регистратора → Claude настраивает (вариант: проксировать GitHub Pages через Cloudflare с кэшированием или раздавать dist из воркера; нужен доступ к зоне — проверить права ключа после добавления).
- 5. Убрать ссылку «Отзывы клиентов» рядом с заголовком «Гарантии» (ru и uz).
- 6. Город посетителя без «VPN-городов»: настоящее место (часовой пояс, прошлый визит) + пометка «(VPN)»; боты — «бот», не считать в сводке.
- 7. График «Визиты по дням»: даты по порядку слева направо, «18.11», нули в пустые дни; округлить средние до 0,1.
- 8. «Мой отчёт» наглядно (карточки, полоски, значки итога визита); поиск писать только итоговым словом (сейчас пишет каждую букву). Открытый вопрос: отдельная страница для телефона (Claude советует) или в таблице.
- 9. Старые заявки №1–14: выяснить, кто купил и за сколько, проставить статус/оплачено (со слов владельца или по переписке в личке).

- 23.11 «Офис PS SHOP» v3 = 3D (three.js r128 cdnjs + OrbitControls jsdelivr 0.128.0; 2D plan tab + fallback). Local test: npm pack three@0.128.0 into scratchpad + playwright route (CDNs blocked here). Private claude.ai artifact https://claude.ai/artifact/Hf1jdbtH2kenFcjJV4F3y9 (owner-only, NOT on GitHub Pages). Source = docs/team-structure.md only. Rebuild: python3 tools/office/build_office.py <out.html> → publish same artifact (Artifact url=…). Seats/colors in tools/office/office.template.html (SEAT).
- 23.11 Owner's workout page (personal): private artifact https://claude.ai/artifact/6smsetQZyfU5n2E8vkq2jz, source tools/workout/workout.html (publish same file path / url). db+user capabilities: history data/users/<id>/workouts, current data/users/<id>/state/current; localStorage copy. Rest timers by owner plan: warmup 2:00, dumbbell 5:00 between rounds, bench 5:00, between blocks 5:00. Owner: «Отлично получилось… дальше будем дорабатывать эту систему» → expect more iterations (office + workout).
- 23.11 Office v5: Менеджер walks desk to desk, returns to Штаб each lap. Office artifact sharing is «Anyone with the link» (owner may set private). Prompt for owner's brother (build own AI office, 10 questions first) given to owner in chat.
- 24.11 (Мастер, owner «все автоматически»): auto checks built on branch sayt/auto-checks (9675445): Action site-health.yml 09:13 TAS; worker GET /health + cron '23 5 * * *' remindStuckOrders. NOT deployed: safety check blocked live worker deploy/schedule change without owner's own words in this chat. To go live: deploy branch worker.js (fetch live first, diff), PUT schedules [*/10, 0 2, 23 5], verify bindings incl ai, merge Action. Weekly CRM summary = scheduled task trig_01VTCKuJAHQ45YUZhuf954cE (Mon 11:07).
- 23.11 T1–T3 ALL CLOSED. Old: new owner tasks via Бос #4 (session_014Ko8ovmxXetwTVooX1LTHV), do one at a time, report to Бос, wait OK: T1 GTA 6 default edition = Ultimate (catalog «+» adds Ultimate, game page preselects it; check 390px+desktop, uz+/ru/); T2 resend all past orders to owner via @psshop_zayavki_bot with bought/not bought buttons → status into CRM «Заявки» (tell Бос before sending); T3 order number offset +1100 (17 → 1117), keep CRM ids consistent, note mapping here. Task 4B (Cloudflare) on hold: registrar answer still not received.
- 23.11 T1 DONE: PR #37 merged after owner OK, live-checked (catalog.json "d", game page uz/ru Ultimate). Card price stays "от 978 000" (owner). Next: T2.
- 23.11 T2 DONE: owner marked all 17 (5 Купил, 2 Скидка, 3 В обработке, 7 Отказался; paid 7 964 000). Resend route kept for reuse.
- 23.11 T3 DONE (deployed 21:55Z after owner OK): mapping CRM/visible № = KV n + 1100 (ON(n) in worker). Old 1–17 → 1101–1117 (KV row[10]+html, CRM K2:K18). Next order №1118 (order:seq=17 internal). ON(n)=n+1100 in all visible numbers; internal n stays in KV order:<n>, ordc, callback ord:<n>. CRM «№ заявки» = n+1100. On publish: fetch live worker → apply ON patch → deploy; KV order:1..17 row[10]=n+1100 & html №n→№n+1100; CRM K2:K18 = 1101..1117.

## Проблемы и открытые вопросы
- Старые 14 заявок в боте без кнопок — статус только через таблицу.
- Существование @username сайт проверить не может.
- 21.11 мой деплой воркера затёр правки «БОТ ПОСТИК» (/tgpost/review, кнопка fixp:) — та сессия вернула; локальный worker.js синхронизирован с живым.
