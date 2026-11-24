# Журнал по дням

_Новые записи сверху._

## 2026-11-22 — САЙТ PS SHOP #2
- Обсудили и записали 9 задач по сайту (`docs/site-tasks.md`), правило «по одной задаче».
- Бот заявок: аватар «PS SHOP BOT», имя «PSSHOP BOT»; кнопки статуса (Купил / Со скидкой с суммой / В обработке / Отказался), номера заявок, колонки и выручка в таблице; подтверждение клиенту через бота и уведомления о статусе.
- Сайт: проверка телефона +998; сервис-воркер для быстрого повторного захода. PR #34, #35, #36.
- Разобрали «странные города» (VPN) и что платный хостинг не нужен.
- Остановились: задача 4Б — перенос psshop.uz на Cloudflare, ждём от владельца регистратора домена и входа в Cloudflare.


## 2026-11-22 — САЙТ PS SHOP #3
- No site code changes. Waited for owner on 4B (registrar of psshop.uz) — not answered.
- Team set up: I am Сайтер; Бос supervises; all owner contact via Бос; agent messages in English; Дизайнер for graphics. Recorded in sayt.md.
- 23.11 00:29 Бос #4 sent tasks T1–T3 → transferred to «Сайтер #4».


## 2026-11-24 — Сайтер #4
- 23.11: T1 GTA VI Ultimate default (PR #37, live); T2 17 old orders resent to owner bot (/orderbot/resend), owner marked all (5 купил, 2 скидка, 3 в обработке, 7 отказ, 7 964 000 paid); T3 visible order № = n+1100 (old 1–17 → 1101–1117, next 1118).
- 23.11: my T2/T3 worker deploys dropped AI binding (keep_bindings only secret_text) → fixed deploy_worker.py keep ['secret_text','ai'].
- 23.11: «Офис PS SHOP» private artifact v1 2D → v3 3D (three.js) → v4 animated → v5 Менеджер home spot; tools/office/. Workout page artifact (tools/workout/), db+user capabilities, rest timers.
- 23.11: rename owner = Founder, «Бос» chat = «Менеджер». Prompt for owner's brother (own AI office, 10 questions) given in chat.
- 24.11: auto checks built on branch sayt/auto-checks (site-health Action + worker /health + stuck-orders cron), deploy blocked by safety check → waiting owner's own «выкладывай проверки».
- Moved from sayt.md:
## Сделано (21–22.11)
- Аватар бота заявок (файл в scratchpad, установлен владельцем), бот переименован в «PSSHOP BOT».
- Задача 1: кнопки статуса + скидка + номера + колонки/выпадающий список/цвета + выручка в «Сводке», колонки «Заявок» расширены. PR #34.
- Задача 2: подтверждение клиенту через бота, PR #34.
- Задача 3: проверка телефона, подсказка под кнопкой заказа про бота. PR #35.
- Задача 4, часть А: сервис-воркер `/sw.js` (кэш psshop-v1: static/ из памяти + фоновое обновление, страницы из сети с запасной копией через 3 с, catalog.json из сети). PR #36. Повторный заход ~0,05 с.

- (old) 23.11 T2: worker route GET /orderbot/resend?key=<orderbot:secret>&from=&to= (resends order:n to owner with status kb, sets quiet=1 → no client msgs). KV order:1..14 created from CRM. SENT 1–17 at 19:48Z after owner OK; waiting owner taps; check trigger trig_01N5nXnwXTiZPUwUsb1cc3mD (30 min, re-schedule until all 17 marked), then summary to Бос, then T3 (owner OK before publish).

## 2026-11-24 — Сайтер #5
- Short chat: took over from #4, created weekly CRM trigger trig_01VL9RteYFwqNXGYLd9UyYzx, recorded Sonnet/medium rule. Evolved to #6 on Мастер's «Evolve now» (Sonnet rule). No site/worker changes. Auto-checks (sayt/auto-checks, 9675445) still wait owner's «выкладывай проверки».
