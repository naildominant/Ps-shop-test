# База знаний — «Маркетолог #N»

Created 22.11 by owner (Founder). Chats: #1 session_014Ko8ow3Pj9znwGG17DRV1X; #2 session_014Ko8ozYq81Hjs6Fxgu1vTL; #3 (24.11). Details/history: reklama-log.md.

## Role (owner decisions 23.11)
- Promotion strategy & global tasks: OLX (I personally own), BIR BIR, other platforms.
- Supervise СММщик (docs/state/smm.md): plans, texts, quality, pace; he reports to me. Quote: «Обязанности Маркетолога следить за смм специалистами и самому куррировать Olx».
- Client communication = СММщик, not me. Owner may work with me directly in my chat («Дальше с ним я сам»). Designer briefs + milestone notes → Менеджер (ex-«Бос», same id; owner = Founder). Ids only from team.md.

## Shop facts for ads
- Prices only from psshop.uz / channel. Rental PS5 (site /ru/rent/): 1d 300 000, 3d 750 000, 5d 1 100 000, 7d 1 400 000; extension 270k/675k/990k/1 260k; booking prepay 50 000. PS5 Slim AND standard PS5; 2 pads; black/purple pads selectable. Delivery: OPEN QUESTION (owner removed «доставка» from cover 23.11 — ask before using).
- PS Plus (1/3/12 mo): Essential 269k/429k/629k; Extra 309k/629k/979k; Deluxe 389k/699k/1 268k; EA Play 179k/659k(12).
- Guarantee: channel «Гарантия 5 лет и поддержка 24/7»; site «работоспособность, замена или возврат», remote setup, 24/7. Games «навсегда». 3+ years.
- Owner is sole person in business; phone +998 90 712 31 09; answers OLX himself. CTA = call first.
- Owner decisions (final, don't reopen): games price field «50 000 сум» (= install fee, stated in text) as filter; old bait ads (PS4 rent, «без залога») stay. My line: I don't write false claims myself; owner may add.
- Telegram channel 591 subs (23.11); reviews group «ОТЗЫВЫ • PS SHOP» (211 members).

## OLX rules learned
- NO phone / contacts / Telegram in description → phone only in field. CTA line: «Звоните — кнопка «Позвонить» в объявлении».
- Rental category «Прокат электроники» has no price field. Check currency = сум (GTA 6 ru was posted as «100 у.е.» → asked owner to fix, UNCONFIRMED).
- Promo: Быстрая 17 200 (TOP 7d + 3 bumps); Турбо 46 500 (TOP 30d + 9 bumps + VIP 7d); cheapest ~7 800. Budget ≥500 000/mo.
- ru/uz versions = possible duplicates → different title/text/first photo, post 30–40 min apart. Max 8 photos. Pace 3–4 ads/day.
- My access: Playwright public pages OK; OLX internal API calls are blocked by auto-mode — don't. BIR BIR = Cloudflare bot check, don't bypass → via owner laptop.

## Strategy v1 (approved 23.11) — https://claude.ai/artifact/1KAsvPxfeLLcchKdwRgvU6
- Goal: calls 2–8/day → 10–15/day in a month. KPI = calls + Telegram messages.
- 3 flagships × ru/uz (PS5 rental, PS Plus, GTA 6) with TOP; then 3–4 per-game ads/day (half uz) = 120/mo; rework ~18 duplicate ads (don't delete); keyword titles (arenda/prokat/ijara). Positioning (owner): premium, service, A-to-Z hand-holding, community, reviews, any games, lifetime, guarantee 5y.
- Analysis: https://claude.ai/artifact/UxwuvedA3GJpQFpHZCGhD7. Texts: https://claude.ai/artifact/DySLMZoRG5msJo14mHxzBP (reports/*.html on branch claude/intelligent-clarke-juo1gm).
- Visuals by Дизайнер: designer/output/olx/ — covers olx_{rent,plus,gta}_{ru,uz}[_v2].jpg (rent v2 = owner's «без залога», no «доставка»; gta v2 bigger); sets rent/, plus/, gta/, fun/. Owner photos input: reklama/photos/ (branch). Send images to owner as FILES (SendUserFile), not links.

## State (23.11 evening)
- POSTED: Аренда PS5 ru (no promo — all PS5 rented now; promo when free), PS Plus ru (Турбо 46 500), GTA 6 ru (Турбо, till 23.12; price fix to 50 000 сум unconfirmed).
- PENDING owner tonight: uz versions of rent/PS Plus/GTA 6 (texts + photo files already sent).
- Open questions to owner: delivery still offered?; GTA 6 ru price fixed?
- Stats 23.11: 43 ads, 5 273 views; best pos аренда ps5 17 (was 41), ps plus 11 (absent), gta 6 ps5 12 (47), установка 2 (5). Script reklama/scripts/olx_stats.js → reklama/stats/.
- Next: owner laptop → I post 3–4/day + read OLX.uz rules first; BIR BIR audit via laptop; СММщик task 1 (GTA 6 buyers message) waits laptop — I approved plan with: day1 ≤20–25 msgs, 11–21h, exclusions, 1 msg/client, daily metrics to me, my sign-off before first send.
- Cancelled by owner 23.11: follow-up/review messages task (don't revive).

## Rules from Менеджер
- 24.11 owner: all staff model Sonnet, effort medium — create_session model "sonnet", effort "medium" at each evolution.

## Scheduled tasks (mine)
- OLX stats Mon 10:40 Tashkent; weekly marketing report Sun 20:40 (#2 ids: trig_01T9y8fG2KpiTJUSt8JXyYdb stats, trig_01MV4HuHdbqNWf3HNzvs9K8R report; old #1 ones disabled; move at each evolution). Pending/blocked: daily posting, СММщик check-in 21:30, BIR BIR stats.
