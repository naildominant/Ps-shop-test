# Automation registry — all recurring work (owner 24.11: «все автоматически работали»)

Type: **task** = Claude scheduled task (shows in app «Запланированные задачи», costs limits; bound to the role's CURRENT chat, moved on evolution);
**action** = GitHub Action / Cloudflare worker cron (free, no Claude). Мастер audits this list every 2h (trig_01Pk5i1tTttcbTmvUHNhwLjG).

| Role | What | When (Tashkent) | Type | id / file |
|---|---|---|---|---|
| Менеджер | Daily report to owner | daily 18:37 | task | trig_013WZ2BgBM8CHVSHsjq9tLmQ |
| Мастер | Chat-length check + tasks audit | every 2h 08:13–02:13 | task | trig_01Pk5i1tTttcbTmvUHNhwLjG |
| Постик | Supplier prices, auto-raise | daily 05:30 | action | autopost morning.yml |
| Постик | Price report to owner | daily 07:00 | action | worker cron 0 2 * * * |
| Постик | Check 3 old posts | daily 07:05 | action | autopost post-check.yml |
| Постик | Supplier catalog refresh | daily 08:17 | action | autopost supplier-catalog.yml |
| Постик | Channel reindex for search | daily 08:41 | action | autopost channel.yml |
| Постик | «Новинка дня» draft | daily 13:03 | action | autopost daily-game.yml |
| Сайтер | Channel → site catalog | every 10 min | action | worker cron */10 |
| Сайтер | Full catalog rebuild | hourly :07 | action | update-catalog.yml |

Pending (collecting from staff 24.11): Сайтер, Постик, Дизайнер, Маркетолог, СММщик, Креатор, Менеджер — manual recurring actions.
