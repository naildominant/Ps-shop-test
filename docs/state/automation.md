# Automation registry — all recurring work (owner 24.11: «все автоматически работали»)

Type: **task** = Claude scheduled task (shows in app «Запланированные задачи», costs limits; bound to the role's CURRENT chat, moved on evolution);
**action** = GitHub Action / Cloudflare worker cron (free, no Claude). Мастер audits this list every 2h (trig_01Msy3FoywkoUbjh4Xgf6q9v).

| Role | What | When (Tashkent) | Type | id / file |
|---|---|---|---|---|
| Менеджер | Daily report to owner | daily 18:37 | task | trig_01Nt7X4HqkPvcRrTojGZtCUp |
| Мастер | Chat-length check (>200k → evolve) + tasks audit — PAUSED until 29.11 00:05 (Sonnet limit; reminder set) | every 2h 08:13–02:13 | task | trig_01Msy3FoywkoUbjh4Xgf6q9v |
| Постик | Supplier prices, auto-raise | daily 05:30 | action | autopost morning.yml |
| Постик | Price report to owner | daily 07:00 | action | worker cron 0 2 * * * |
| Постик | Check 3 old posts | daily 07:05 | action | autopost post-check.yml |
| Постик | Supplier catalog refresh | daily 08:17 | action | autopost supplier-catalog.yml |
| Постик | Channel reindex for search | daily 08:41 | action | autopost channel.yml |
| Постик | «Новинка дня» draft | daily 13:03 | action | autopost daily-game.yml |
| Сайтер | Channel → site catalog | every 10 min | action | worker cron */10 |
| Сайтер | Full catalog rebuild | hourly :07 | action | update-catalog.yml |

| Креатор | Weekly ideas digest → Менеджер | Sun 19:41 | task | trig_01WksukBn6dobdDSWshzXBPe |
| Сайтер | Weekly CRM/site summary → Менеджер | Mon 11:07 | task | trig_016gAJVyfbUY1Qcy7ndUvUeq |
| Маркетолог | OLX stats snapshot → Менеджер | Mon 10:40 | task | trig_01YbnmtgnVi1JsTvDudSUvoi |
| Маркетолог | Weekly marketing report | Sun 20:40 | task | trig_018xKbkm19e2LMAkvmyxxb8M |
| Менеджер | Limit-reset push (one-shot) | 29.11 00:01 | task | trig_015wDAfPbC794eBAgGzj7aWL |
| Мастер | Weekly token review | Mon (reminder in Менеджер's report) | task | via trig_01Nt7X4HqkPvcRrTojGZtCUp |
| Сайтер | Site + worker health (bindings ai) → owner bot on failure | daily 09:13 | action | TODO Сайтер (asked 24.11) |
| Сайтер | Stuck orders >24h → owner bot reminder | daily 10:23 | action | TODO Сайтер worker cron (asked 24.11) |

## Pending (blocked)
- СММщик: send batches 11:00–21:00, replies check 13:00/19:00, metrics 20:45 — campaign only; blocker: owner laptop + Telegram Desktop.
- Маркетолог: OLX posting 3–4/day 11–19, СММщик check-in 21:30, BIR BIR stats — blocker: laptop / СММщик not started.
- Дизайнер: weekly site screenshots refresh (optional, not needed now).
- Evolution itself is event-driven (first message of day / «Evolve now» from Мастер), not a task.
