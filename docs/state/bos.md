# База знаний — «Менеджер #N» (до 23.11 — «Бос #N»; владелец = Founder (Бос))

Руководитель команды PS SHOP. Создан 22.11 (первый чат «Бос #3», session_014Ko8oy3TFEL7K1U295L9XR).

## Правила владельца (22.11)
- **Вся работа только через Боса.** Владелец пишет только мне; сотрудники к нему не обращаются — вопросы, результаты, «выкладываю?» шлют мне (send_message). Я показываю владельцу (файлы — SendUserFile), передаю ответ дословно. Исключение: кнопки в Telegram-ботах и окна разрешений жмёт владелец — я предупреждаю.
- Бос **следит только за чатами**: чем заняты, не застряли ли, не ошиблись ли. Сайт, бота, Actions сам не проверяю, задачи не выполняю.
- Задачи без адресата распределяю сам. Явные ошибки сотрудников могу поручить исправить сам; решения о внешнем виде, текстах для клиентов, деньгах — спрашиваю владельца.
- **Язык (владелец 22.11):** со всеми сотрудниками — по-английски, коротко и структурно (пункты, пути, id); с владельцем — по-русски простыми словами, как раньше. Тексты для клиентов и владельца (бот, посты, сайт) не меняются. Новые записи в памяти можно по-английски.
- Owner 22.11: «нет-нет проверяй их работу» — while tasks are open, check staff every ~10 min via send_later + get_session (cheap), don't just wait for reports.
- **24.11 owner: «Нужно использовать модель sunnet средний всегда запомни это»** → all staff chats (me too) = Sonnet, effort medium. Evolution create_session: model "sonnet", effort "medium". Sent to all + Мастер (updates CLAUDE.md, applies to existing chats).
- 23.11 owner approved early evolution (>300k context; Мастер trig_01Pk5i1tTttcbTmvUHNhwLjG checks every 2h).
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
| Креатор | «Креатор #N» | kreator.md | собирает идеи всех чатов, предлагает мне улучшения процесса (дешевле, креативнее); ничего не внедряет без «да» владельца через меня (с 23.11) |
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
- Team now: Сайтер #4 session_014Ko8oxakuJuMavdiYmLwLk; Постик #6 session_014Ko8oy9qymjNriuRe39cCm (repo ps-shop-autopost only; memory there); Мастер #4 session_014Ko8oxKsCXiBjYiakVSKJE; Дизайнер #4 session_014Ko8owBDWyasHngmZMRm7v; Маркетолог #1 session_014Ko8ow3Pj9znwGG17DRV1X (briefed 22.11, waiting OLX/BIR BIR links from owner). Archived: Постик #4. Постик #3 unpinned.
- Owner 23.11: 3 Saiter tasks sent to Сайтер #3 (one at a time, report to me): T1 GTA 6 default Ultimate (catalog "+" too); T2 resend all past orders via @psshop_zayavki_bot with bought/not-bought buttons → CRM status; T3 order number offset +1100 (17→1117). T1 DONE live (PR #37). T2 DONE (17 marked; 7 bought, 7 964 000 uzs). T3 DONE live (next order №1118, old №1101–1117). All 3 closed; ask owner for next Saiter task.
- Master: ponytail skill installed for Saiter+Postik (pinned ebd8654c), trial result in 30.11 token review. Weekly token review 29–30.11.
- Postik done 22.11: ⛔️ Отмена, «только ПК», «Вы имели в виду», 📰 Новость, reschedule 9 posts 10–31 Dec 14:00 (BG3 dup removed), scheduled posts in index, «📅 Другая дата» + calendar with 📌.
- 23.11 owner: «Передай маркетологу что он проделал шикарную работу! Дальше с ним я сам» → owner works with Маркетолог directly; I only route designer briefs + log milestones. OLX strategy v1 delivered.
- 23.11 owner: «нам нужен новый сотрудник сммщик он будет отвечать за общение с клиентами»; Маркетолог → strategy/global. Asked Мастер to create «СММщик #1». First task: personal msg (owner's text) to GTA 6 buyers (~50–100, only in owner's TG chats) via laptop: search «GTA» → list → owner OK → send ~10–15/h. Blocker: laptop not connected (owner 23.11: «Ноутбука пока нет» → chose wait for laptop; ping СММщик when connected). Don't take account passwords. СММщик #1 created by Мастер (id in team.md).
- 23.11 owner personal: workout checklist page (private artifact) → Сайтер. Plan: warm-up push-ups/dips/archer 2×20, handstand 2×10s; dumbbell circuit 2 rounds × (hammer, behind-back raise, front raise, single bicep) ×20; bench 20/20/max.
- 23.11 office v4 animated live (same link, currently 'anyone with link' — owner shared to friend).
- 23.11 owner: «Я FOUNDER (БОС). А бос станет Менеджером» → owner = Founder (Бос); this chat role renamed «Менеджер #N» (title set «Менеджер #4»); Мастер applying across rules/team.md/structure/office site.
- 23.11 owner: internal «virtual office» site (owner-only, private Artifact) → Сайтер. Structure doc docs/team-structure.md + PNGs designer/output/team/ sent to owner.
- 23.11 owner: «Обязанности Маркетолога следить за смм специалистами и самому куррировать Olx» → Маркетолог supervises СММщик + owns OLX; СММщик reports to Маркетолог; owner approvals via me. Мастер updating rules.
- 23.11 Постик: «🎯 Подбор по жанру» live. Сайтер's T3 deploy dropped worker AI binding (fixed, rule added).
- 23.11 Master: transfer renamed «эволюция»; no broadcast (team.md only); step 6а: at each evolution every chat (me too) sends 1 idea to Креатор.
- [STARTED 23.11 ~11:00, owner «Да креатор пусть запишет»; all 5 asked → Креатор, shortlist to me by 18:00] Owner 23.11: «нужно что бы ты каждому задачу дал придумать неимоверно хорошую идею как улучшить их работу» → send each staff (Сайтер, Постик, Мастер, Дизайнер, Маркетолог) task: propose 1 outstanding idea to improve their own work (problem, idea, effect for shop, effort); collect → show owner.
- Owner 23.11: notify him (PushNotification) as soon as Маркетолог sends DONE or NEED OWNER.
- **Questions to owner (queue):** 1) [answered 23.11: «На декабрь» → sent to Постик] 2) domain psshop.uz registrar (Saiter task 4Б); 3) 2 test news previews in bot — publish/cancel; 4) 2–3 trusted Telegram news channels; 5) Xbox/Switch reply wording; 6) brandbook cheatsheet OK?; 7) Shrek 2 post-check example OK?; 8) OLX claims to confirm (Маркетолог audit 23.11): «Гарантия 5 лет», «без залога», rental PS5 300k/1d 750k/3d 1.1M/5d 1.4M/7d, PS4 150k/375k/550k/700k, «24/7», «с выездом»; 9) BIR BIR link for Маркетолог
- Triggers of Бос: daily report trig_013WZ2BgBM8CHVSHsjq9tLmQ (18:37, bound to Бос #4) — new Бос must recreate on itself (same prompt via get_trigger) and disable old.

## Журнал
- 24.11 evolution → Менеджер #5 (Sonnet medium). Open at handover: (a) Сайтер #5 auto-checks ready on branch sayt/auto-checks (9675445): daily 09:13 site health + 10:23 stuck-orders reminder; BLOCKED — owner must write «выкладывай проверки» in Сайтер's chat; I asked owner «Включаем?» — no answer yet. (b) Owner choice on Креатор top-3 ideas pending. (c) СММщик task waits laptop. (d) 23.11 evening: praise + team results sent to all. (e) Мастер collects recurring actions → scheduled tasks (mine: only 18:37 report). New staff: Аналитик #1 (team.md).
- 23.11 18:37 report #2: Сайтер T1–T3 done + office site (3D in progress); Постик genre picker live; Маркетолог OLX visuals done, owner posting; Дизайнер 5 OLX briefs + structure v2; Мастер roles rename, СММщик & Креатор created; СММщик blocked (laptop); Креатор waits owner choice on 5 ideas. Limit: weekly warning, reset 29.11 00:00 (push scheduled).
- 22.11 ~20:00 final: Postik memory moved to ps-shop-autopost (Postik #N+1 source_url=ps-shop-autopost; Master syncs CLAUDE.md to him + weekly diff). Supervised transfer OK → «Постик #5» session_014Ko8p19yU3DL5iozNYAn3t (pinned, verified). Reschedule: 9 posts 10–31 Dec 14:00, BG3 dup removed; scheduled posts counted in index.
- 22.11 18:37 daily report #1 (trigger has session tools ✔): Saiter blocked on domain registrar; Postik — news button done, reschedule plan pending (more Nov posts); Designer idle after brandbook; Master idle. Weekly limit allowed_warning, reset 29.11 00:00.
- 22.11: первая проверка — сайт и воркер работают, Actions зелёные (после этого владелец сказал сайт не проверять). Раздал обязанности, имена утверждены, чаты переименованы, создан Дизайнер (session_014Ko8p19FZ9xGgJ4a8NUV8t), правило «всё через Боса» в CLAUDE.md. Сделано за день: брендбук Дизайнера; у Постика — кнопка «⛔️ Отмена» и ответ «игра только на ПК» (Wikidata). Первый замер расхода (Мастер): Постик $5.8, Бос $5.0, Дизайнер $2.8, Мастер $1.9, Сайтер $1.3.

## Архив
- Старые id чатов 22.11 (до переименований): САЙТ PS SHOP #3 = Сайтер #3 session_014Ko8ovvnMbxaBiKNTLtGF5; БОТ ПОСТИК #3 = Постик #3 session_014Ko8oxQ1ysNFRULef8kw7b; НАСТРОЙКА CLAUDE #3 = Мастер #4 session_014Ko8oxKsCXiBjYiakVSKJE.
- Висит старый чат «GTA 6 цены обновление» (19.11) с вопросом «Перенести?»; /cart/ на сайте — 404 (корзина внутри страниц) — мелочи с первой проверки.
