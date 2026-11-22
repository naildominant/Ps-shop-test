# База знаний «Постик» (бывш. «БОТ ПОСТИК»)

**Я — Постик**: Telegram-бот @psshop_postTG_bot, посты канала @psshopgo, цены, поиск игр, раздел tgpost воркера, приватный репо `ps-shop-autopost`. Подробности и история — `bot-log.md`.
**Команда:** Бос (руководитель, bos.md), Сайтер (сайт), Мастер (настройка Claude), Дизайнер (картинки новостей/акций/историй, баннеры, шаблоны — просить через send_message; обложки игр covers.py — мои).
**Правило 22.11:** вся работа через Боса — вопросы и результаты отправлять Босу (send_message), к владельцу в чате не обращаться; ответ от Боса = ответ владельца. Кнопки в боте владелец жмёт сам. Написал владелец сам — ответить ему.
**Язык с командой (22.11):** сообщения Босу и другим агентам — по-английски, кратко, списком (пути, id); тексты для владельца (бот, канал) — по-русски.
**Экономия (Мастер 22.11):** команды подряд — одним Bash; изучение кода — помощнику (Explore/haiku); проверки перед выкладкой не урезать.

## Устройство (кратко)
- **Репо:** `Ps-shop-test` — `designer/` (шаблоны, emoji.json, scripts/publish.py), `worker/worker.js` (копия воркера), `docs/state/`. `ps-shop-autopost` (add_repo, push в main `git -c push.negotiate=true push`) — tools/, workflows, AGENT.md, data/. Секреты: TG_API_ID, TG_API_HASH, TG_2FA, GH_DISPATCH, CLAUDE_CODE_OAUTH_TOKEN; сессия Telethon `state/session.enc`.
- **Воркер `psshop`** (psshop.psshop.workers.dev): деплой PUT через Cloudflare API (`metadata`: main_module worker.js, compat 2024-09-23, keep_bindings ai/plain_text/secret_text/kv_namespace; файл с `filename=worker.js`). **Перед деплоем скачать живую версию** (content/v2) и сверить — его меняет и Сайтер. Cron: `*/10` каталог сайта, `0 2 * * *` отчёт цен 7:00. KV: tgpost:gh (= GH_DISPATCH, вход агента), await, awaittime, find, pendtask, pending, history, report, chindex, supindex, testkey и др. Эндпоинты /tgpost/: preview, say, file, emoji-map, review (с img), report, index, findtest (?key=testkey&q=…; &intent=1, &dbg=1).
- **Агент** `agent.yml` (Claude Code + AGENT.md), режимы new_game | task | edit | check. Выход: `out/preview.txt`, `out/update.txt` (+`update_note_<id>.txt` для check), `out/covers.txt`, `out/price_set.txt`. Сохранение с 4 повторами push, превью уходит в любом случае.
- **«📰 Новость» (22.11):** кнопка → агент `mode=news` (AGENT.md): источники `data/news_sources.json` (сайты; поле telegram пока пусто — агент не нашёл), без повторов `data/news_offered.json`, текст psshop-telegram-posts, картинка psshop-art-director + BRANDBOOK (логотип слева сверху, 1080×1350) → обычное превью. Тест 22.11: Black Friday PS Store, GTA VI 32,5 млн (папки posts/2026-11-22-news-*).
- **Меню:** «🔎 Найти игру», «🆕 Игра от поставщика», «📰 Новость», «⛔️ Отмена» (`cancelAll`: отменяет agent/post/story/channel (не по расписанию)/dm в очереди и в работе, сбрасывает ожидания; «⛔️ Всё остановил»; расписание и канал не трогает; «🛑 Отмена», «отмена/стоп» тоже работают). Любой текст/фото/пересланное = задача (пересланное + комментарий за 15 с = одна).
- **Превью:** ✅ Опубликовать / 🕒 Позже / ❌ Доработка / 🗑 Отменить; после выхода «📲 В историю». Голосовые → Whisper → текст.
- **Поиск:** кнопка или фраза «скинь/есть ли…» (`isFindRequest`). Каталог chindex — только объявления игр (`listingTitle`/`game_title`). Нейросеть llama-3.3-70b → official/ru; точное сравнение (`matchTitles` strict, `gnorm`, `partOk`, `pickMain`). Нет в канале → поставщик (кандидаты + нейросеть, принимается только если название совпадает с началом — `sameGame`) → агент делает объявление. Нет и там → `platformCheck` (Wikidata P400): только ПК → «❌ Данная игра на PlayStation не выходила, она вышла только на ПК»; иначе/не уверен → «❌ Данной игры нет в наличии». Если нейросеть заметно поменяла латинское название (`doubtful`: не аббревиатура, сходство <0.5) — сначала «🤔 вы имели в виду «…»?» Да/Нет (KV tgpost:dym:<id>, callback dym/dyn).
- **Цены:** `morning.yml` 5:30 (cron `30 0 * * *`): каталог поставщика → `price_watch.py`: подорожало → сразу правит цену в канале (кроме роста >2× — «проверьте»), подешевело — не трогает. Отчёт в 7:00 одним сообщением, кнопки ✅ Принято / ✏️ Есть правки (агент → `price_set.txt`). Формула: рубли П3 Standard ×200 + 99 000, вверх до …9 000; нет PS4 у поставщика → PS4 = PS5.
- **Проверка постов:** `post-check.yml` 7:05 (cron `5 2 * * *`), **3 поста в день**, от свежих к старым: `post_check.py pick` (обложка квадрат ≥600/не альбом, премиум-эмоджи, геймплей открывается, тематический эмоджи, ОТЗЫВЫ/АКСЕССУАРЫ/НАПИСАТЬ НАМ, шаблон; 🇬🇧 без премиума и игроки/язык — не повод сами по себе). Отмечено в `data/post_check.json`. Агент `check` → «БЫЛО/СТАЛО» (+новая обложка `covers.py fetch`) → «Да» → `channel.py edit` (текст + image.jpg → applied_image.jpg).
- Новинка дня 13:00 (daily-game.yml), история (story.yml), сообщения контактам (dm.yml).

## Правила
- Шаблон: 🎮 НАЗВАНИЕ 🎮 / ↪️язык / ↪️Издание / ↪️Кол-во игроков / пусто / цитата 💵ЦЕНА PS4/PS5 - N UZS / пусто / жми👉ГЕЙМПЛЕЙ + тематический обычный эмоджи (<plain>), ОТЗЫВЫ🔥 (t.me/xpsshopotziv), АКСЕССУАРЫ (t.me/PsShopConsolesDualsense), 🛒НАПИСАТЬ НАМ (t.me/Gaynullin_Nail).
- Премиум-коды: 🎮5467583879948803288 ↪️5314606606678237326 💵5409048419211682843 👉5465198403573012261 🔥5807654210715522568 🛒5440841102871517055 🇷🇺5190924072678085128; 5429240168571776335 = логотип Rockstar. Только проверенные (designer/emoji.json; чёрный список data/emoji_verified.json).
- На задачу — новый пост; видео обязательно; язык только подтверждённый; обложки 1:1; новости — своя картинка с логотипом.
- В канал без кнопки владельца не публиковать (кроме автоповышения цен). Перед массовыми правками — пример. Секреты не в чат и не в публичный репо.
- Владелец: просто, по-русски, минимум сообщений от бота; не любит лишние посты в поиске и новый пост вместо готового.

## Сейчас (22.11)
- **DONE 22.11 — reschedule:** all 10 scheduled game posts of @psshopgo moved to 10–31 Dec 14:00 (schedule-move.yml apply, verified 0 mismatches). Lesson: Telethon `iter_messages(scheduled=True)` returned only 3 — use raw `messages.GetScheduledHistoryRequest(hash=0)` (returned 10). BG3 duplicate: 851 deleted (identical to 858, kept newer 858), 9 posts re-spread: 10.12 SF6, 13.12 CoD AW, 15.12 SnowRunner, 18.12 KCD2, 20.12 BG3, 23.12 Stupid Never Dies, 26.12 Wukong, 28.12 Clair Obscur, 31.12 BeamNG.
- **Scheduled posts are «in channel» (owner 22.11):** `channel.py index` → `save_scheduled` → `data/scheduled.json` (raw getScheduledHistory); `bot.py index` adds them to chindex with `s` = date; worker search: scheduled → «🕒 Уже стоит в отложенных: <игра> — ДД.ММ в ЧЧ:ММ» (no forward); `game_post.py pick` excludes them. Refresh: channel.yml daily, post-check, schedule-move apply (commits scheduled.json + bot.py index).
- Bos rule 22.11: no frequent polling (sleep/send_later); 1–2 checks per run.
- 22.11: «Постик #4» archived by owner; active Postik = «БОТ ПОСТИК #3» (session_014Ko8oxQ1ysNFRULef8kw7b, pinned). **No daily transfer until Master confirms the new transfer procedure works.** Reschedule continued here (owner approved apply).
- Готово сегодня: проверка постов (3/день), цены в 5:30, «⛔️ Отмена», «только ПК», строгий выбор у поставщика.
- Ждут кнопок владельца: проверка постов 1059, 923 (новая обложка), 800 (1261 применён).
- Ждём от Боса: формулировка для игр на Xbox/Switch без PlayStation (сейчас «нет в наличии»); отзыв о поиске.
- Отложено: 41 игра нет у поставщика; 15 сомнительных совпадений; набор «PS Shop Premium».

## Проблемы
- Workers AI REST недоступен (только привязка); модели снимают — при 5028 менять модель. Wikidata и *.workers.dev из контейнера закрыты — проверять через воркер (/findtest). Логи Actions иногда 404 сразу после запуска; push в GitHub иногда отказывает («commit_refs_rules», «cannot lock ref») — повторять.

## Архив
- Цены «БЫЛО/СТАЛО» по посту/сообщению (21.11) — заменено автоповышением + одним отчётом. Таблица сверки цен (artifact 1HecKDQKSoeNU2APs897rk) — не в меню.
