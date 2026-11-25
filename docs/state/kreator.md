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

## Evolution settings
- Owner rule 24.11 (via Менеджер #4): all staff model Sonnet, effort medium. create_session model "claude-sonnet-5-5", effort "medium" (CLAUDE.md step 2). Applied 24.11: Креатор #2 → #3 on Sonnet (Мастер «Evolve now»).

## Scheduled tasks
- CURRENT: trig_01WksukBn6dobdDSWshzXBPe (Креатор #4, created 25.11, bound to #4; trig_011mtW7gqo9YJ47byF3dw7V8 disabled). Below is the old description.
- trig_011mtW7gqo9YJ47byF3dw7V8 (Креатор #3, created 24.11; moving to #4 on 25.11 evolution — see below if replaced; old trig_01WETm5Vh2HfRtGSjBerRvyp and trig_01CNd5jJyAgPRi7i5G66jLjR disabled) — weekly ideas digest to Менеджер, Sun 19:41 Tashkent, bound to this chat (skip if <2 new ideas; also trim kreator.md). Created by Мастер 23.11. On evolution: recreate in new chat, disable old (step 4).

## Входящие идеи
- 23.11 Креатор (own): problem: daily evolution of every chat costs ~10–15 tool calls each (memory, create_session, check, pin, triggers) even for quiet chats / idea: evolve by need — only if chat is from an earlier day AND had real work or long context; idle chats stay / effect: fewer tokens, less risk of lost tasks in transfer / effort: 1 rule edit by Мастер.

- 23.11 Сайтер: refusals 7/17 in CRM, reasons unknown → on ❌ bot asks 1-tap reason → CRM «Причина»; «В обработке» >24h → one reminder; weekly top reasons in «Сводка». Worker only, ~1–2 h.
- 23.11 Постик: searches in bot ending «нет в наличии» are lost → worker logs searches in KV; Monday message to owner «Top-5 searched games without a post» + ✅ button. ~30 lines, 1 evening.
- 23.11 Мастер: CLAUDE.md ~6k tokens in every call, ~8k bytes = evolution protocol → slim to core, protocol to docs/rules/evolution.md; GitHub Action mirrors rules to ps-shop-autopost (needs repo token from owner). ~1 session.
- 23.11 Дизайнер: every routine image goes full loop via Менеджер/owner → 5–6 brand-locked templates (psfx) from 1-line brief, Постик/Сайтер call directly; owner approves set once. ~1 day.
- 23.11 Маркетолог: no ad→call data → weekly OLX snapshot (views + search position for 7 queries) to CRM «Реклама»; owner logs calls/day. ~1–2 h + weekly task.

- 23.11 Мастер (evolution idea): `scripts/evolve.sh <role>` does git part (log, team.md row, commit/push) in 1 call + prompt template per role → ~3 tool calls instead of ~10, nothing forgotten. Pairs with my «evolve by need» + Мастер's slim CLAUDE.md → one package for weekly digest.

- 23.11 Сайтер (evolution idea): `scripts/deploy_worker.py` guard for all chats — auto-download live worker, refuse deploy if live has code missing locally, keep bindings + verify after. Cause: 23.11 lost `ai` binding + near-overwrite of Постик code. High priority (prevents outages), pairs with Сайтер+Постик worker ideas #1/#2.

- 23.11 Маркетолог (evolution idea): deliverables owner must save/post (images, banners, post texts) → send as files in chat (SendUserFile), numbered in posting order, not GitHub links (owner: links slow on phone). Caveat: owner reads Менеджер chat → staff passes repo paths to Менеджер, Менеджер sends files. Cheap rule change, quick win.

- 24.11 Постик (evolution idea): KV `deploy:lock` (who/what/time, 15-min TTL) checked before any psshop deploy + marked worker sections per owner chat (`// ── tgpost`, `// ── orderbot`). ~10 lines. MERGE with Сайтер's deploy_worker.py guard → one «safe worker deploy» package (guard script + lock + sections).
- 24.11 Креатор #1 (own, at evolution): receive-only chats with small context (Креатор, maybe СММщик) skip daily calendar evolution; evolve only on Мастер's «Evolve now» length check (trig_013ovFqEvt6KTagVm63pwc9T already exists). Saves ~10–15 tool calls/day per idle chat. Fits evolution package (my evolve-by-need + Мастер evolve.sh + slim CLAUDE.md).
- 24.11 Дизайнер (evolution idea): owner source photos/screenshots → one fixed folder on main (e.g. reklama/inbox/<topic>/) + 3-line brief.md; Дизайнер regenerates from scripts in 1 call. Fewer tokens, faster OLX turnaround. Fits package C (owner↔team file flow: files in, files out).
- 24.11 Менеджер #4: every new chat on Sonnet medium; keep chats <~300k context (one oversized coordinator chat cost more than several staff chats). Sonnet part already owner rule 24.11; open part = context cap → overlaps Мастер length check (200k evolve). Package A (token cost).
- 24.11 СММщик #1: owner-approved client message templates (ru+uz: thank-you, review request, new-game reminder) once in smm.md with {имя} slots → campaigns need only list approval, no new text round via Менеджер. Saves owner time + tokens. Package C (fewer owner rounds).
- 24.11 Мастер #5: evolution checks = biggest repeated cost → scripts/evolve_check.py (git pull + team.md diff + trigger bindings): Мастер verifies a transfer in 1 Bash call instead of 4–5. Package B (cheaper evolution; pairs with evolve.sh).
- 25.11 Креатор #2 (own, evolution idea): transfer check took >1 day because old chat's send_later fired while worker was down → evolution should finish in one turn: new chat sends its check reply unprompted right after reading memory (no ask/wait round). Package B.

- 25.11 Дизайнер #5: team.md conflicts (every evolution edits same table → 4 rebase conflicts) → one file per role docs/state/team/<role>.md, 1 line each. Package B (cheaper evolution).
- 25.11 Менеджер #5: owner wants less chatter → one-line status file docs/state/status/<role>.md (open tasks, blocked-on, next step) updated at each step end; Менеджер reads by grep instead of get_session/list_events, staff skip routine reports. Pairs with Дизайнер #5 per-role team files (docs/state/team/<role>.md) → no shared-file push collisions. Package B/C.
- 25.11 Постик #7: owner-facing bot menu now one row of 5 emoji (🔎🎯🆕📰⛔️) → shorter chat, fewer taps; same pattern (emoji-only buttons + one-line status) for other owner-facing menus/reports. Package C (fewer owner rounds); pairs with Менеджер #5 status files.
- 25.11 Креатор #3 (own, at evolution): team.md + status files + digest are all 'pull before write' chores → one `scripts/team.py` (list/set row/status) used by every chat; avoids shared-table push collisions (4 retries needed today). Package B.

## State 25.11
- Digest A/B/C sent to Менеджер 25.11 (no owner decision yet). Since then logged (not yet in a digest): Дизайнер #5 team/<role>.md, Менеджер #5 status/<role>.md, Постик #7 emoji menus, own team.py → add to Sun 29.11 digest. STANDBY lifted 25.11.

## Digest plan (next Sunday)
Packages: A) safe worker deploy (+ token cost: Менеджер #4 context cap ~300k) (Сайтер guard + Постик lock) — high, prevents outages; B) cheaper evolution (evolve.sh + evolve-by-need + slim CLAUDE.md); C) files not links to owner (Маркетолог) — quick win. Plus status of 23.11 top-5 (no owner decision yet).

## Предложения (отправлены Менеджеру)
- 25.11 digest A/B/C (ranked A, C, B + 4 old shortlist items 1 line) sent to Менеджер #5 on STANDBY-OFF (limits restored). Waiting owner choice.
- 23.11 ranking: 1 Сайтер refusal reasons · 2 Постик demand top-5 · 3 Мастер slim CLAUDE.md (+ my evolve-by-need) · 4 Дизайнер templates · 5 Маркетолог OLX snapshot. Note: 1+2 both in worker → one deploy. Status: waiting owner via Менеджер.

## Архив
- 25.11 Мастер #6: add «model audit» line (title | model | ctx) to the 2h ctx check using configured_model from get_session → wrong model (e.g. Аналитик on opus) caught automatically; 0 extra calls. For 29.11 digest.
