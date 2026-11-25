# База знаний — «Мастер #N» (бывш. «НАСТРОЙКА CLAUDE»)

Роль: правила команды (CLAUDE.md) и их синхронизация с Постиком; список чатов `docs/state/team.md`; эволюции и их проверка; новые сотрудники; экономия лимитов; задачи по расписанию (`docs/state/automation.md`). Подробная история — `claude-log.md`.

## Текущее
- Ids всех чатов — только `docs/state/team.md`. Строку Постика веду я (у него нет team.md): он пишет «Постик is now #N».
- Мои задачи по расписанию: trig_013ovFqEvt6KTagVm63pwc9T — каждые 2 ч 08:13–02:13 TAS: длина чатов (через haiku-помощника), >300k → «Evolve now»; аудит задач (привязаны к текущим чатам, все строки «task» из automation.md включены). При моей эволюции: пересоздать на новом чате, старую выключить.
- Недельная проверка лимитов: понедельник (напоминание в отчёте Менеджера 18:37). Следующая 30.11 + вердикт ponytail (Сайтер/Постик, установлен 22.11: Ps-shop-test 0292b78, autopost 0ffd2c1; сравнить стоимость задач с 22–29.11, оставить или убрать).
- Лимит 7 дней: allowed_warning до 29.11 00:00 TAS — экономить.

- Порог досрочной эволюции: 200k (owner 24.11 «Да»; was 300k). Owner asked for auto /compact at 200k — impossible (slash commands only typed by human), replaced by threshold.

- Old chats: archive after evolution (owner 24.11). Мастер archives on «is now #N+1» after verify + 2h sweep (team-role titles not in team.md, not working). Unarchive possible (unarchive_session).

- Model (owner 24.11 via Менеджер, «Нужно использовать модель sunnet средний всегда запомни это»): all team chats + helpers = claude-sonnet-5-5, effort medium. Existing chats can only switch via evolution (create_session model+effort).

- Аналитик #1 (session_014Ko8ovwgBcCT1ARmm18GiH): 9th employee (owner 24.11), empty chat, role unknown — asked owner «Чем будет заниматься Аналитик?», no answer yet. When answered: CLAUDE.md role + memory file + first task; evolve it to Sonnet.
- In progress 24.11 12:10: Sonnet switch — Evolve sent to Сайтер #5, Дизайнер #5, Креатор #2, Постик #7 (+rule sync, await hash); Менеджер/Маркетолог/СММщик evolving on their own. Verify each «is now» (team.md, tasks, archive old). Report «done» to Менеджер (id from team.md) when all on Sonnet.

## Открыто
- Владелец не ответил: удалить 3 выключенные задачи (trig_01LABPq3uqbEGdX1uwxTGahB старый отчёт Боса, trig_013eQidhNZQAXPemVctzKAFE, trig_01FG8Wqc5fTb7i7mVp94iWKw). Без «да» не удалять.
- Сайтер: автопроверки на ветке sayt/auto-checks (9675445: site-health.yml 09:13, worker /health + cron 10:23 зависшие заявки) ждут слов владельца «выкладывай проверки» в чате Сайтера (владельцу сказано 24.11). После выкладки — отметить в automation.md.
- Ждут ноутбук владельца: СММщик (рассылка GTA 6, ответы, метрики), Маркетолог (OLX-объявления, BIR BIR, разбор СММщика 21:30). Когда подключат — завести задачи (automation.md «Pending»).
- Идея Креатору (23.11): сжать CLAUDE.md (~20k → ~7k, протокол эволюции в отдельный файл, авто-зеркало правил в autopost через Action). Ждёт решения.

## Как устроено (важное)
- Закрепление чата = тег `ui:pinned`. В get_session/list_sessions его не видно — не признак ошибки.
- Задача по расписанию, привязанная к своему чату (persistent_session_id = этот чат), имеет инструменты сессий (работает). Задача «новая сессия на каждый запуск» или в чужой чат — без инструментов сессий.
- Задача остаётся привязанной к старому чату после эволюции → новый чат пересоздаёт, старую выключает (моя проверка раз в 2 ч следит).
- `/compact` через send_message не работает (приходит текстом) — замена: досрочная эволюция.
- Постик живёт только в ps-shop-autopost (свой CLAUDE.md, память bot.md). Любое изменение общих правил в CLAUDE.md → в тот же ход отправить Постику, он применяет и присылает hash.
- add_repo в цепочке от Менеджера запрещён классификатором; правки .claude/settings.json разрешений — запрещены, не пытаться.
- Сервисные файлы docs/state/* и CLAUDE.md владелец разрешил пушить в main.
- Механика (цены, каталог, отчёт о ценах, проверка постов) — GitHub Actions/воркер, бесплатно; задачи Claude — только где нужно думать.

## Решения владельца (кратко, подробно — в CLAUDE.md)
- 22.11: связь с владельцем только через Менеджера (бывш. Бос); межчатовые сообщения на английском; список team.md; ежедневная эволюция.
- 23.11: «эволюция»; без рассылки о переходах (6б: чужие эволюции — только моя забота); идея Креатору при каждой эволюции; новые роли Креатор, СММщик; Маркетолог руководит СММщиком и ведёт OLX; «Я FOUNDER (БОС). А бос станет Менеджером»; правило привязок воркера (ai); досрочная эволюция >300k, проверка каждые 2 ч 08:13–02:13.
- 24.11: «все автоматически работали» — все регулярные дела в задачах/Actions, реестр automation.md.

## Предпочтения владельца
- Пишет с телефона, по-русски, коротко; вопросы по одному, без кнопок; любит, когда всё работает само и не тратит лимиты.

## Журнал проверок
- 24.11 00:13 ctx check: Сайтер #4 449k, Маркетолог #1 450k → «Evolve now»; Мастер #4 305k → эволюционирую сам. Tasks audit OK (all bound to current chats).

## Архив
- Старое содержимое (22–23.11) — claude-log.md, запись 24.11.
- 24.11 00:15 Мастер #5 took over (transfer check OK, pinned). Ctx-check task recreated: trig_013ovFqEvt6KTagVm63pwc9T (old trig_01Pk5i1tTttcbTmvUHNhwLjG disabled).
- 24.11 00:16 Сайтер #5 verified: team.md row OK, task trig_01VL9RteYFwqNXGYLd9UyYzx bound+enabled (old disabled). Waiting: Маркетолог #2.
- 24.11 00:17 Маркетолог #2 verified: team.md row OK, tasks trig_01T9y8fG2KpiTJUSt8JXyYdb + trig_01MV4HuHdbqNWf3HNzvs9K8R bound+enabled (old disabled). Audit: all 7 enabled tasks on current chats. Постик: CLAUDE.md id change not present there (OK).
- 24.11 02:13 ctx check: none (max Дизайнер #4 285k, Постик #6 264k — near limit). Tasks audit OK.
- 24.11 08:13 ctx check: none (all ≤300k; Дизайнер #4 285k, Постик #6 264k unchanged since 02:13). Tasks audit OK.
- 24.11 10:13 ctx check: none (all ≤300k, max Дизайнер #4 285k). Tasks audit OK (7 enabled, all on current chats).
- 24.11 owner: threshold 300k→200k; trigger prompt + CLAUDE.md updated, sent to Постик.
- 24.11 10:20 threshold 200k applied: «Evolve now» → Дизайнер #4 (285k), Постик #6 (264k, + rule sync).
- 24.11 10:21 Постик #7 session_014Ko8oyXcv4fNLARtaRLEwL (rule 2e122cf in autopost); team.md updated. Постик has no Claude tasks (Actions only).
- 24.11 10:22 Дизайнер #5 session_014Ko8ozbvtUMxSSaV2NZEc2 verified in team.md (no Claude tasks).
- 24.11 10:23 Креатор #2 session_014Ko8oygTE3n5jDMAzvFPnY verified: team.md OK, digest task trig_01WETm5Vh2HfRtGSjBerRvyp on new chat (old disabled).
- 24.11 10:30 owner: auto-archive old chats. Archived 16 old chats (Креатор #1, Постик #3/#5/#6, Дизайнер #3/#4, Мастер #3/#4, Маркетолог #1, Сайтер #3/#4, Бос #3, НАСТРОЙКА CLAUDE #2, БОТ ПОСТИК, БОТ ПОСТИК #2, САЙТ PS SHOP #2). CLAUDE.md steps 4/7 + ctx-check task updated.
- 24.11 10:26 Постик synced archive rule: autopost 56fbe22.
- 24.11 10:35 owner «Архивируй все чаты кроме закрепа»: archived 6 non-team chats (GTA 6 цены обновление, Привет, MacBook закрытая крышка, Оптимизация сайта, Оценка умений, САЙТ PSSHOP). Left: 8 team chats + «Аналитик #1» (session_014Ko8ovwgBcCT1ARmm18GiH, not in team.md) — asked owner. Pinned tag not readable via API.
- 24.11 10:37 owner: «Аналитик #1» is the 9th employee → added to team.md (protects from auto-archive). Role + memory file not defined yet — asked owner.
- 24.11 12:06 Sonnet-medium rule: CLAUDE.md step 2 + Постик + helpers updated; «Evolve now (switch to Sonnet)» sent to all team chats; Мастер evolves too.
- 25.11 15:15 Мастер #6 (Sonnet) never ran: weekly Sonnet limit hit (resets 28.11 19:00 UTC = 29.11 00:00 TAS). Transfer failed → team.md back to Мастер #5 (Opus). 12 queued ctx checks (24.11 12:13 – 25.11 14:13) skipped as stale. Sonnet chats (Менеджер #5, Сайтер #6, Маркетолог #3, СММщик #2, Креатор #3, Мастер #6) blocked until reset.
- 25.11 16:13 ctx check: skipped (Sonnet limit until 29.11 00:00 TAS — evolutions impossible; awaiting owner on pausing the check).
- 25.11 16:20 owner «ты сам должен знать»: paused ctx-check trig_013ovFqEvt6KTagVm63pwc9T until limit reset; send_later 29.11 00:05 TAS re-enables it + redo transfer to Мастер #6.
- 25.11 17:25 Креатор #3 (Sonnet) running → Sonnet works again. Removed Креатор #2 row, archived #2 (old digest task disabled). Retrying transfer to Мастер #6.
- 25.11 17:30 Transfer to Мастер #6 (Sonnet) passed, pinned. Owner STANDBY (via Менеджер) until 29.11: ctx check stays paused; send_later trig_01BZUJiQ61fxkBA9DXy4FEpH fires into #5 → forward to #6.
