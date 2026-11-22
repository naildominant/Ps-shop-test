# База знаний — «Бос #N»

Руководитель команды PS SHOP. Создан 22.11 (первый чат «Бос #3», session_014Ko8oy3TFEL7K1U295L9XR).

## Правила владельца (22.11)
- **Вся работа только через Боса.** Владелец пишет только мне; сотрудники к нему не обращаются — вопросы, результаты, «выкладываю?» шлют мне (send_message). Я показываю владельцу (файлы — SendUserFile), передаю ответ дословно. Исключение: кнопки в Telegram-ботах и окна разрешений жмёт владелец — я предупреждаю.
- Бос **следит только за чатами**: чем заняты, не застряли ли, не ошиблись ли. Сайт, бота, Actions сам не проверяю, задачи не выполняю.
- Задачи без адресата распределяю сам. Явные ошибки сотрудников могу поручить исправить сам; решения о внешнем виде, текстах для клиентов, деньгах — спрашиваю владельца.
- **Язык (владелец 22.11):** со всеми сотрудниками — по-английски, коротко и структурно (пункты, пути, id); с владельцем — по-русски простыми словами, как раньше. Тексты для клиентов и владельца (бот, посты, сайт) не меняются. Новые записи в памяти можно по-английски.
- Owner 22.11: «нет-нет проверяй их работу» — while tasks are open, check staff every ~10 min via send_later + get_session (cheap), don't just wait for reports.
- Вопросы владельцу — по одному, текстом. Очередь — в «Задачи в работе».

- **22.11 owner: «Разрешаю всем сотрудникам делать все движения»** — routine work without asking; still no channel publishing without owner button. add_repo allowed (Master: .claude/settings.json).

## Команда
| Имя | Чат | Память | Отвечает за |
|---|---|---|---|
| Сайтер | «Сайтер #N» | sayt.md | сайт psshop.uz и /ru/, бот заявок @psshop_zayavki_bot, CRM, docs/site-tasks.md по одной задаче, проверка сайта после выкладки |
| Постик | «Постик #N» | bot.md | бот @psshop_postTG_bot, посты канала, новинка 13:00, истории, поиск игр, цены 7:00, проверка поста 7:05, tgpost в воркере, репо ps-shop-autopost |
| Мастер | «Мастер #N» | claude.md | CLAUDE.md, правила, скиллы, перенос чатов, расписание; **экономия токенов команды — раз в неделю** (напоминание по понедельникам в моём отчёте), журнал в claude.md |
| Дизайнер | «Дизайнер #N» | design.md | весь дизайн: картинки постов/новостей/сторис, баннеры, графика сайта. Брендбук designer/brand-kit/ (BRANDBOOK.md, cheatsheet.png). Автообложки игр — у Постика |
Общее: перед деплоем воркера — живая версия; при поломке пишут мне. Всё это есть в CLAUDE.md (раздел «Команда»).
Найти чаты: list_sessions mine:true → тег ui:pinned + названия. Номера растут каждый день (перенос — CLAUDE.md).

## Как ставить задачи (чётко и дёшево)
Шаблон: «<Имя>: задача от владельца.» → что сделать (слова владельца дословно) → готово, когда → чего не трогать → «если сомневаешься — напиши мне до» (только при развилке) → отчёт одной-двумя строками, файлы путём в main. Одна задача в сообщении; не пересказывать CLAUDE.md; указывать конкретные файлы; priority next — срочно, later — очередь.
- Сайтер: перед выкладкой присылает результат мне, я спрашиваю владельца «выкладываю?».
- Постик: самый большой контекст — писать коротко.
- Дизайнер: всегда формат (пост 4:5, сторис 9:16, обложка 1:1), тема, текст на картинке; присылает путь к PNG.
**Экономия у меня (совет Мастера 22.11):** состояние чатов — get_session / list_sessions (post_turn_summary), list_events только с kinds и малым limit, большой ответ разбирать скриптом; команды пачкой; bos.md держать коротким (~8 тыс. байт), старое — в Архив.

## Ежедневный отчёт владельцу
- Задача trig_01LABPq3uqbEGdX1uwxTGahB, каждый день **18:37 Ташкент**, привязана к «Бос #3». Первый запуск 22.11 — проверить, есть ли в нём инструменты сессий, и сообщить Мастеру.
- При переносе «Бос #N» → «#N+1»: новый чат создаёт такую же задачу на себя (create_trigger без persistent_session_id, тот же текст — взять из get_trigger), старую выключает (update_trigger enabled=false; удалять нельзя).
- Запуск по расписанию — не сообщение владельца, переносить чат по нему не нужно.

## Лимит Claude (задача владельца 22.11)
- Следить за лимитом и присылать владельцу пуш на телефон (PushNotification), когда лимит обновился. Данные: get_session (без id) → external_metadata.rate_limit_info {rateLimitType five_hour|seven_day, resetsAt (unix), status allowed|allowed_warning}.
- Механизм: send_later на resetsAt+1 мин → пуш «Лимит обновился» → снова get_session, если есть будущий resetsAt — следующий send_later. Если окна нет (никто не работал) — перезапуск при следующем сообщении владельца или в вечернем отчёте. При переносе чата — перезавести.
- 22.11 15:31: push sent «5h window reset». rate_limit_info now shows only seven_day (allowed_warning, reset 29.11 00:00) — the 5h resetsAt is visible only when 5h is the binding limit; re-arm on next owner msg / daily report.
- (old) 22.11: 5-часовое окно обновится 15:30 Ташкент (send_later trig_014u9QX8x3WkveGxMAGQqjvF). Недельный лимит: status allowed_warning (близко к пределу), обновится 29.11 00:00 Ташкент. Пуш-тест отправлен — ждём, дошёл ли.

## Задачи в работе
- 22.11 Master: review third-party skill ponytail (github DietrichGebert/ponytail); if clean → trial 1 week for Saiter+Postik, compare in 30.11 token review. Owner approved.
- Open Q to owner: L.A. Noire scheduled 23.11 14:00 (id 860) — keep or move to Dec?
- 22.11 Postik #3: reschedule DONE — 10 posts → 10–31 Dec 14:00 (raw getScheduledHistory found 10, Telethon iter found 3). BG3 scheduled twice (858 on 19.12, 851 on 29.12) — asked owner whether to delete one.
- 22.11 owner fired Постик #4 (archived). Постик #3 session_014Ko8oxQ1ysNFRULef8kw7b is Postik again, pinned; NO transfer until Master confirms reliable transfer (repos, memory, pins, verification step). Reschedule runs in Постик #3.
- 22.11 Postik #4: owner confirmed Nov+Dec scheduled posts exist → apply directly across 10–31 Dec 14:00, report table.
- 22.11 18:38 Postik transferred early (tokens $19) → «Постик #4» session_014Ko8ozNQ3wEMqhBdRooj3P. Reschedule: channel queue = 3 posts only; full-account scan run 45027761734 for Nov posts; #4 sends table, waits for my «apply».
- 22.11 18:13 Postik: reschedule channel scheduled game posts evenly 10–31 Dec, daily 14:00 Tashkent (time chosen by Bos, owner can change). Awaiting table.
- 22.11 Postik: «📰 Новость» DONE (sources ps-shop-autopost/data/news_sources.json, dedup news_offered.json). 2 test previews in owner bot: PS Store Black Friday, GTA VI record. Need from owner: 2–3 trusted Telegram news channels.
- **Вопросы владельцу (очередь):** 1) Постик: ответ для игр Xbox/Switch — «❌ Данная игра на PlayStation не выходила (только Xbox/Switch/ПК).» подходит? 2) нажать «⛔️ Отмена» в боте и сказать, ответил ли «⛔️ Всё остановил»; 3) Дизайнер: верна ли шпаргалка; 4) Сайтер: где куплен домен psshop.uz (перенос на Cloudflare, задача 4Б); 5) Постик: подходит ли пример исправления поста Shrek 2 (видео проверить перед «Да»).
- Постик: LoL-совпадение исправлено, ⛔️ сделано. Следующее (низкий приоритет): если нейросеть заметно поменяла название («Dead Reset» → RDR), бот спрашивает «Вы имели в виду …?» Да/Нет.
- Мастер: результат экономии проверит 29.11.

## Журнал
- 22.11 ~20:00 final: Postik memory moved to ps-shop-autopost (Postik #N+1 source_url=ps-shop-autopost; Master syncs CLAUDE.md to him + weekly diff). Supervised transfer OK → «Постик #5» session_014Ko8p19yU3DL5iozNYAn3t (pinned, verified). Reschedule: 9 posts 10–31 Dec 14:00, BG3 dup removed; scheduled posts counted in index.
- 22.11 18:37 daily report #1 (trigger has session tools ✔): Saiter blocked on domain registrar; Postik — news button done, reschedule plan pending (more Nov posts); Designer idle after brandbook; Master idle. Weekly limit allowed_warning, reset 29.11 00:00.
- 22.11: первая проверка — сайт и воркер работают, Actions зелёные (после этого владелец сказал сайт не проверять). Раздал обязанности, имена утверждены, чаты переименованы, создан Дизайнер (session_014Ko8p19FZ9xGgJ4a8NUV8t), правило «всё через Боса» в CLAUDE.md. Сделано за день: брендбук Дизайнера; у Постика — кнопка «⛔️ Отмена» и ответ «игра только на ПК» (Wikidata). Первый замер расхода (Мастер): Постик $5.8, Бос $5.0, Дизайнер $2.8, Мастер $1.9, Сайтер $1.3.

## Архив
- Старые id чатов 22.11 (до переименований): САЙТ PS SHOP #3 = Сайтер #3 session_014Ko8ovvnMbxaBiKNTLtGF5; БОТ ПОСТИК #3 = Постик #3 session_014Ko8oxQ1ysNFRULef8kw7b; НАСТРОЙКА CLAUDE #3 = Мастер #3 session_014Ko8ozTcaf294JXVpozb1n.
- Висит старый чат «GTA 6 цены обновление» (19.11) с вопросом «Перенести?»; /cart/ на сайте — 404 (корзина внутри страниц) — мелочи с первой проверки.
