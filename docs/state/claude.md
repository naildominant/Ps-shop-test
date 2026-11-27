# База знаний — «Мастер #N» (бывш. «НАСТРОЙКА CLAUDE»)

Роль: правила команды (CLAUDE.md) и их синхронизация с Постиком; список чатов `docs/state/team.md`; эволюции и их проверка; новые сотрудники; экономия лимитов; задачи по расписанию (`docs/state/automation.md`). Подробная история — `claude-log.md`.

## Текущее
- Ids всех чатов — только `docs/state/team.md`. Строку Постика веду я (у него нет team.md): он пишет «Постик is now #N».
- Мои задачи по расписанию: trig_01Msy3FoywkoUbjh4Xgf6q9v (Мастер #10; trig_011ZXd61… disabled; trig_01HnCFB… disabled; старые trig_01P66… и trig_013ov… выключены) — каждые 2 ч 08:13–02:13 TAS: длина чатов (через haiku-помощника), >300k → «Evolve now»; аудит задач (привязаны к текущим чатам, все строки «task» из automation.md включены). При моей эволюции: пересоздать на новом чате, старую выключить.
- Недельная проверка лимитов: понедельник (напоминание в отчёте Менеджера 18:37). Следующая 30.11 + вердикт ponytail (Сайтер/Постик, установлен 22.11: Ps-shop-test 0292b78, autopost 0ffd2c1; сравнить стоимость задач с 22–29.11, оставить или убрать).
- Лимит 7 дней: allowed_warning до 29.11 00:00 TAS — экономить.

- Порог досрочной эволюции: 200k (owner 24.11 «Да»; was 300k). Owner asked for auto /compact at 200k — impossible (slash commands only typed by human), replaced by threshold.

- Old chats: archive after evolution (owner 24.11). Мастер archives on «is now #N+1» after verify + 2h sweep (team-role titles not in team.md, not working). Unarchive possible (unarchive_session).

- Model (owner 24.11 via Менеджер, «Нужно использовать модель sunnet средний всегда запомни это»): all team chats + helpers = claude-sonnet-5-5, effort medium. Existing chats can only switch via evolution (create_session model+effort).

- Аналитик #1: now on Sonnet (ctx check 25.11 22:13). Role set 25.11 via Менеджер (limits/token analysis + audit 4.1, output docs/analytics/, memory file his choice — asked him, no path yet). Add path to team.md/CLAUDE.md when he sends it.
- Sonnet switch DONE 25.11 (all chats Sonnet medium). EXCEPTION (owner 25.11): Постик = claude-opus-5-5 always (CLAUDE.md updated 399efb9; autopost b6198f8). Постик #7→#8 (session_014Ko8oxJPA8MYLB9rcfLDoe) transfer in progress: when «Постик is now #8» arrives, verify model opus, update team.md row, archive #7. Аналитик #1 is still opus-5-5 (no memory file yet, role: limits/token analysis + context-architecture audit, reports to Менеджер) — told Менеджер; evolve to Sonnet once he has a memory file. Креатор #3 told «Evolve now» 25.11 (238k): verify «is now #4», move trig_011mtW7gqo9YJ47byF3dw7V8, archive #3.

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
- 25.11 17:25 Мастер #6 active (Transfer check answered). Recreated ctx-check as trig_01P66URooe6qvpC4WWcnDN7M on #6 (helper sonnet; old trig_013ov… stays disabled); reminder trig_01BZUJ… disabled (delete denied by classifier); Сайтер dup trig_01VL9R… disabled (bound to old #5). team.md: Мастер #6, Дизайнер #6, Аналитик→Менеджер; CLAUDE.md Аналитик line. TODO: archive Сайтер #5, Маркетолог #2, Менеджер #4, Мастер #5 after its transfer.
- 25.11 18:20 ctx check: Менеджер #5 201k → Evolve now; Дизайнер #5 archived; automation.md task ids refreshed; all enabled tasks bound to current chats.
- 25.11 18:25 Менеджер #6 verified (tasks moved: daily report trig_01Nt7X4HqkPvcRrTojGZtCUp, limit push trig_015wDAfPbC794eBAgGzj7aWL); #5 archived; automation.md ids updated.
- 25.11 owner: Постик ALWAYS Opus 5.5 (claude-opus-5-5, effort medium); all other chats + Agent helpers Sonnet medium. CLAUDE.md Постик evolution line updated; current Постик #7 (Sonnet) switches at his next evolution (no tool to switch a running session).
- 25.11 Мастер #7 active. Ctx-check recreated: trig_01HnCFBgroFf75npa2zx5jci (old trig_01P66URooe6qvpC4WWcnDN7M disabled). team.md Мастер #7. Waiting: Постик #8 (verify opus, archive #7), Креатор #3→#4 evolution (team.md already shows #4; verify trig_011mtW7gqo9YJ47byF3dw7V8, archive #3), Аналитик file path.
- 25.11 Креатор #4 verified (Sonnet medium; weekly digest moved to trig_01WksukBn6dobdDSWshzXBPe, old disabled). Archived Креатор #3, Мастер #6. Still waiting: Постик #8 «is now», Аналитик memory file.
- 25.11 owner (direct, Мастер #7): «почему старые не архивировались, почему обращаются к старым». Causes: (1) ctx-check paused 25.11 for limit → no 2h archive sweep; (2) archive depended on Мастер receiving «is now» (often not sent); (3) Постик has no team.md → used ids from his prompt/memory (#8 said «через Менеджер #5»); (4) ids stored in memory files (bos.md etc.). Fix in CLAUDE.md: each chat checks own used_tokens (get_session) on EVERY incoming message, >200k → evolve; old chat updates team.md right after transfer check; new chat archives old (archive_session) — no waiting for Мастер; senders never use ids from memory/parent, on error re-read team.md. Archived Постик #7 (#8 = opus OK). Rule sent to Постик #8.
- 25.11 Постик #8 applied rule v2: autopost 945261b (bot.md no chat ids).
- 25.11 22:13 TAS ctx check: none (max Менеджер #6 171k); models OK (Постик opus, rest sonnet); all 7 tasks bound to current chats; no stray chats; automation.md Креатор task id fixed → trig_01WksukBn6dobdDSWshzXBPe.
- 25.11 00:13 TAS (26.11) ctx check: none (max Менеджер #6 171k; me 184k); models OK; 7 tasks on current chats; no stray team chats. New non-team chat «ФИНАНСИСТ» session_014Ko8owPE5uTSNE6LvrGoSR (BLOCKED) — not touched; if owner makes it an employee: role in CLAUDE.md + team.md + memory file.
- 26.11 02:13 TAS ctx check: none >200k (me 195k → evolving to #8); models: Аналитик #1 back on opus (manual switch by owner? not told to evolve — owner switches models himself, ask before forcing); tasks OK; no stray team chats; «ФИНАНСИСТ» (non-team, working) untouched.
- 2026-11-26 08:13 TAS ctx check: none (max ctx Менеджер 171k; all tasks bound to current chats; nothing to archive; Аналитик #1 on opus — owner's choice, noted)
- 2026-11-26 10:13 TAS ctx check: none (max ctx Менеджер 171k; tasks all bound to current chats; nothing to archive)
- 2026-11-26 12:13 TAS ctx check: none (max ctx Менеджер 171k, Мастер 152k; tasks all bound to current chats; nothing to archive)
- 2026-11-26 14:13 TAS ctx check: none (max ctx Менеджер 171k, Мастер 165k; tasks all bound to current chats; nothing to archive)
- 2026-11-26 16:13 TAS ctx check: none (max ctx Мастер 179k, Менеджер 171k; tasks all bound to current chats; nothing to archive). Next: my ctx will pass 200k → evolve to Мастер #9 next check
- 2026-11-26 18:13 TAS ctx check: none (max ctx Мастер 193k, Менеджер 171k; tasks all bound to current chats; nothing to archive). Evolving to Мастер #9 now (ctx near 200k).
- 2026-11-26 15:15 UTC ctx check: Менеджер #6 told to evolve (230k); tasks all bound to current chats; Мастер #8 archive_session denied by classifier (left for owner/manual); team.md ok
- 2026-11-26 17:15 UTC ctx check: none (all <200k, tasks bound to current chats, team.md ok; Менеджер #6 already archived; Мастер #8 still unarchived — archive_session was denied by classifier earlier, not retried)
- 2026-11-26 19:15 UTC ctx check: none (all <200k, tasks bound to current chats, team.md ok; Мастер #8 still unarchived — archive_session denied earlier; LEADEX АНАЛИТИК is not a team chat, ignored)
- 2026-11-26 21:15 UTC ctx check: none (all <200k; my ctx 157k; tasks bound to current chats; team.md ok; Мастер #8 still unarchived — archive_session denied earlier)
- 2026-11-27 03:15 UTC ctx check: none (all <200k; Мастер #9 170k; tasks bound ok; team.md ok; Мастер #8 still unarchived — archive_session was denied by classifier). New day + chat created 26.11 → Мастер #9 evolving to #10.

- 27.11 Мастер #10 took over (transfer OK). Ctx-check = trig_01Msy3FoywkoUbjh4Xgf6q9v. Archived Мастер #9 and Мастер #8 (archive_session now allowed, no denial).
- 2026-11-27 05:13Z ctx check: none (max Постик 135k, me 127k; models OK; 7 enabled tasks all bound to current chats; no stray chats; team.md ok)
- 2026-11-27 07:13Z ctx check: none (max Постик 135k, me 139k; models OK; 7 tasks bound to current chats; no stray chats; team.md ok)
- 2026-11-27 09:13Z ctx check: none (max me 151k, Постик 135k; models OK; 7 tasks bound to current chats; no stray chats; team.md ok)
- 2026-11-27 11:14Z ctx check: none (max me 162k, Постик 135k; models OK; 7 tasks bound to current chats; no stray chats; team.md ok)
- 2026-11-27 13:05Z Постик #9 verified (opus, team.md updated; #8 already archived). LINEAGE LIMIT: Мастер #10 lineage depth 8/8 → create_session (evolution) will likely fail; Постик depth 7/8. Need a fresh root chat for Мастер (and Постик soon) — asked Менеджер.
- 2026-11-27 13:16Z ctx check: none (me 180k — near limit, lineage 8/8 blocker pending with Менеджер; Менеджер 147k; models OK; 7 tasks bound; no stray chats; team.md ok)
- 2026-11-27 15:14Z ctx check: Постик #9 told to evolve (217k; lineage limit may block); me 193k (8/8 lineage — evolution likely refused); tasks all bound (new one-shot trig_01AwGsCk… on Менеджер); no stray chats; team.md ok
- 2026-11-27 15:17Z Постик #10 verified (opus, 91k; #9 archived); team.md updated. Note: Постик's create_session at depth 7→8 worked; my own depth 8/8 untested.
