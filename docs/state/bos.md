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
| Маркетолог | «Маркетолог #N» | reklama.md | реклама: объявления OLX и BIR BIR (с 22.11, создан владельцем). Картинки — через Дизайнера |
Общее: перед деплоем воркера — живая версия; при поломке пишут мне. Всё это есть в CLAUDE.md (раздел «Команда»).
Найти чаты: list_sessions mine:true → тег ui:pinned + названия. Номера растут каждый день (перенос — CLAUDE.md).

## Как ставить задачи (чётко и дёшево)
Шаблон: «<Имя>: задача от владельца.» → что сделать (слова владельца дословно) → готово, когда → чего не трогать → «если сомневаешься — напиши мне до» (только при развилке) → отчёт одной-двумя строками, файлы путём в main. Одна задача в сообщении; не пересказывать CLAUDE.md; указывать конкретные файлы; priority next — срочно, later — очередь.
- Сайтер: перед выкладкой присылает результат мне, я спрашиваю владельца «выкладываю?».
- Постик: самый большой контекст — писать коротко.
- Дизайнер: всегда формат (пост 4:5, сторис 9:16, обложка 1:1), тема, текст на картинке; присылает путь к PNG.
**Экономия у меня (совет Мастера 22.11):** состояние чатов — get_session / list_sessions (post_turn_summary), list_events только с kinds и малым limit, большой ответ разбирать скриптом; команды пачкой; bos.md держать коротким (~8 тыс. байт), старое — в Архив.

## Ежедневный отчёт владельцу
- Задача trig_013WZ2BgBM8CHVSHsjq9tLmQ, каждый день **18:37 Ташкент**, привязана к «Бос #4» (session_014Ko8ovmxXetwTVooX1LTHV). Старая trig_01LABPq3uqbEGdX1uwxTGahB (Бос #3) выключена 22.11.
- При переносе «Бос #N» → «#N+1»: новый чат создаёт такую же задачу на себя (create_trigger без persistent_session_id, тот же текст — взять из get_trigger), старую выключает (update_trigger enabled=false; удалять нельзя).
- Запуск по расписанию — не сообщение владельца, переносить чат по нему не нужно.

## Лимит Claude (задача владельца 22.11)
- Следить за лимитом и присылать владельцу пуш на телефон (PushNotification), когда лимит обновился. Данные: get_session (без id) → external_metadata.rate_limit_info {rateLimitType five_hour|seven_day, resetsAt (unix), status allowed|allowed_warning}.
- Механизм: send_later на resetsAt+1 мин → пуш «Лимит обновился» → снова get_session, если есть будущий resetsAt — следующий send_later. Если окна нет (никто не работал) — перезапуск при следующем сообщении владельца или в вечернем отчёте. При переносе чата — перезавести.
- 22.11 15:31: push sent «5h window reset». rate_limit_info now shows only seven_day (allowed_warning, reset 29.11 00:00) — the 5h resetsAt is visible only when 5h is the binding limit; re-arm on next owner msg / daily report.
- (old) 22.11: 5-часовое окно обновится 15:30 Ташкент (send_later trig_014u9QX8x3WkveGxMAGQqjvF). Недельный лимит: status allowed_warning (близко к пределу), обновится 29.11 00:00 Ташкент. Пуш-тест отправлен — ждём, дошёл ли.

## Задачи в работе (на 23.11) Ids: see docs/state/team.md (source of truth since 22.11).
- Team now: Сайтер #4 session_014Ko8oxakuJuMavdiYmLwLk; Постик #5 session_014Ko8p19yU3DL5iozNYAn3t (repo ps-shop-autopost only; memory there); Мастер #4 session_014Ko8oxKsCXiBjYiakVSKJE; Дизайнер #4 session_014Ko8owBDWyasHngmZMRm7v; Маркетолог #1 session_014Ko8ow3Pj9znwGG17DRV1X (briefed 22.11, waiting OLX/BIR BIR links from owner). Archived: Постик #4. Постик #3 unpinned.
- Owner 23.11: 3 Saiter tasks sent to Сайтер #3 (one at a time, report to me): T1 GTA 6 default Ultimate (catalog "+" too); T2 resend all past orders via @psshop_zayavki_bot with bought/not-bought buttons → CRM status; T3 order number offset +1100 (17→1117). T1 DONE live (PR #37). T2 DONE (17 marked; 7 bought, 7 964 000 uzs). T3 DONE live (next order №1118, old №1101–1117). All 3 closed; ask owner for next Saiter task.
- Master: ponytail skill installed for Saiter+Postik (pinned ebd8654c), trial result in 30.11 token review. Weekly token review 29–30.11.
- Postik done 22.11: ⛔️ Отмена, «только ПК», «Вы имели в виду», 📰 Новость, reschedule 9 posts 10–31 Dec 14:00 (BG3 dup removed), scheduled posts in index, «📅 Другая дата» + calendar with 📌.
- **Questions to owner (queue):** 1) L.A. Noire scheduled 23.11 14:00 (id 860) — keep or move to Dec? 2) domain psshop.uz registrar (Saiter task 4Б); 3) 2 test news previews in bot — publish/cancel; 4) 2–3 trusted Telegram news channels; 5) Xbox/Switch reply wording; 6) brandbook cheatsheet OK?; 7) Shrek 2 post-check example OK?
- Triggers of Бос: daily report trig_013WZ2BgBM8CHVSHsjq9tLmQ (18:37, bound to Бос #4) — new Бос must recreate on itself (same prompt via get_trigger) and disable old.

## Журнал
- 22.11 ~20:00 final: Postik memory moved to ps-shop-autopost (Postik #N+1 source_url=ps-shop-autopost; Master syncs CLAUDE.md to him + weekly diff). Supervised transfer OK → «Постик #5» session_014Ko8p19yU3DL5iozNYAn3t (pinned, verified). Reschedule: 9 posts 10–31 Dec 14:00, BG3 dup removed; scheduled posts counted in index.
- 22.11 18:37 daily report #1 (trigger has session tools ✔): Saiter blocked on domain registrar; Postik — news button done, reschedule plan pending (more Nov posts); Designer idle after brandbook; Master idle. Weekly limit allowed_warning, reset 29.11 00:00.
- 22.11: первая проверка — сайт и воркер работают, Actions зелёные (после этого владелец сказал сайт не проверять). Раздал обязанности, имена утверждены, чаты переименованы, создан Дизайнер (session_014Ko8p19FZ9xGgJ4a8NUV8t), правило «всё через Боса» в CLAUDE.md. Сделано за день: брендбук Дизайнера; у Постика — кнопка «⛔️ Отмена» и ответ «игра только на ПК» (Wikidata). Первый замер расхода (Мастер): Постик $5.8, Бос $5.0, Дизайнер $2.8, Мастер $1.9, Сайтер $1.3.

## Архив
- Старые id чатов 22.11 (до переименований): САЙТ PS SHOP #3 = Сайтер #3 session_014Ko8ovvnMbxaBiKNTLtGF5; БОТ ПОСТИК #3 = Постик #3 session_014Ko8oxQ1ysNFRULef8kw7b; НАСТРОЙКА CLAUDE #3 = Мастер #4 session_014Ko8oxKsCXiBjYiakVSKJE.
- Висит старый чат «GTA 6 цены обновление» (19.11) с вопросом «Перенести?»; /cart/ на сайте — 404 (корзина внутри страниц) — мелочи с первой проверки.
