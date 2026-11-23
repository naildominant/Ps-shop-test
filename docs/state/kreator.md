# База знаний — «Креатор #N»

Роль: улучшать процесс работы команды PS SHOP. Создан владельцем 23.11 (через Мастера).
Задача владельца (дословно): «в момент перехода отправил одну идею новому сотруднику … Креатору он эту идею принимает и обдумывает как улучшить процесс работы всех этих уменьшить затраты и увеличить креативность и четкость работы».

## Как работает
- Каждый чат при эволюции (переходе в новый чат) присылает Креатору 1 идею (send_message, English, 1–3 lines).
- Креатор: записывает идею в «Входящие идеи» ниже (дата, от кого, суть), обдумывает, группирует похожие.
- Цели: меньше затрат (токены, вызовы, повторная работа), больше креативности, чёткость работы.
- Предложения — Менеджеру (send_message, English, коротко): что поменять, кому, ожидаемая польза. Менеджер показывает владельцу. Без одобрения владельца ничего не внедрять.
- Одобренное изменение правил (CLAUDE.md, процесс) делает Мастер — Креатор пишет ему через Менеджера или напрямую с пометкой «owner approved via Менеджер».
- Сам код/сайт/посты не трогает. Память держать короткой (до ~10 тыс. знаков), старое — в «Архив».

## Ideas round (Менеджер, owner OK 23.11 ~13:30 Tashkent)
- All 5 received 23.11 13:30 Tashkent; shortlist sent to Менеджер same time. Deadline trigger trig_01DgsfPrvL3wMPDzD7tycnQ2 deleted.
- Deadline: all 5 in or 18:00 Tashkent (13:00Z) → ranked shortlist to Менеджер (top 3 + rest one line each, plain words for owner). Fallback send_later set.

## Ожидается (от Менеджера 23.11, done → round started)
- After Маркетолог finishes OLX/BIR BIR, Менеджер triggers staff: each proposes 1 idea to improve own work → routed to me. I consolidate (problem / idea / effect for shop / effort) → ranked shortlist to Менеджер for owner.
- Until then: collect evolution ideas; report to Менеджер only when worth owner's time.

- 23.11 evening Founder (via Менеджер): praise for shortlist, «keep collecting», keep tokens lean until 29.11. No decision yet on which ideas to implement.

## Входящие идеи
- 23.11 Креатор (own): problem: daily evolution of every chat costs ~10–15 tool calls each (memory, create_session, check, pin, triggers) even for quiet chats / idea: evolve by need — only if chat is from an earlier day AND had real work or long context; idle chats stay / effect: fewer tokens, less risk of lost tasks in transfer / effort: 1 rule edit by Мастер.

- 23.11 Сайтер: refusals 7/17 in CRM, reasons unknown → on ❌ bot asks 1-tap reason → CRM «Причина»; «В обработке» >24h → one reminder; weekly top reasons in «Сводка». Worker only, ~1–2 h.
- 23.11 Постик: searches in bot ending «нет в наличии» are lost → worker logs searches in KV; Monday message to owner «Top-5 searched games without a post» + ✅ button. ~30 lines, 1 evening.
- 23.11 Мастер: CLAUDE.md ~6k tokens in every call, ~8k bytes = evolution protocol → slim to core, protocol to docs/rules/evolution.md; GitHub Action mirrors rules to ps-shop-autopost (needs repo token from owner). ~1 session.
- 23.11 Дизайнер: every routine image goes full loop via Менеджер/owner → 5–6 brand-locked templates (psfx) from 1-line brief, Постик/Сайтер call directly; owner approves set once. ~1 day.
- 23.11 Маркетолог: no ad→call data → weekly OLX snapshot (views + search position for 7 queries) to CRM «Реклама»; owner logs calls/day. ~1–2 h + weekly task.

## Предложения (отправлены Менеджеру)
- 23.11 ranking: 1 Сайтер refusal reasons · 2 Постик demand top-5 · 3 Мастер slim CLAUDE.md (+ my evolve-by-need) · 4 Дизайнер templates · 5 Маркетолог OLX snapshot. Note: 1+2 both in worker → one deploy. Status: waiting owner via Менеджер.

## Архив
