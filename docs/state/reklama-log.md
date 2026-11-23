# Журнал «Маркетолог #N»

## 2026-11-22 — Маркетолог #1: OLX audit
Profile: https://www.olx.uz/list/user/6lj3A/ (user id 93736162) «PS SHOP МАГАЗИН ЦИФРОВЫХ ИГР - Наиль Гайнуллин», on OLX since 04.2022, last online 07.11.2026.
Access: Playwright page browsing works (www.olx.uz allowed); OLX internal API calls denied by auto-mode classifier — don't use. Raw dump was in scratchpad (/tmp/claude-0/olx/ads.json, ephemeral).
40 ads: 33 «Игры для приставок»/«Игровые приставки», 7 «Прокат электроники».
Findings:
- All ads Russian only; 0 in Uzbek. No psshop.uz link; Telegram only in 1/40 ad.
- ~30 near-identical «игры на PS4/PS5 + установка» ads (titles: «гарантия 5 лет», «звони», «пиши») — duplicate risk, compete with each other.
- Price: 50 000 сум «Договорная» in ~30 ads = install fee, not game price → confusing; rental ads mostly no price.
- Seller type mixed: «Бизнес» vs «Частное лицо» (9 ads private).
- Claims in ads not confirmed in team docs: «Гарантия 5 лет» (28 ads), «без залога», rental tariffs PS5 300k/day…1.4M/7d, PS4 150k/day…700k/7d (ad ID4wL0b), «Поддержка 24/7», «установим с выездом». Need owner confirm before reuse.
- Old/odd items: «CoD Modern Warfare 4», «подписка на PS4 распродажа остатков», б/у discs 180 000 (1 photo).
- Positive: 8 photos in most ads, long structured descriptions, niche ads (sport, kids, co-op, RE, CoD, FC 27, PS Plus, unlock/restore) — good keyword coverage.

## 2026-11-22 — Маркетолог #1: OLX views analysis
Report: https://claude.ai/artifact/UxwuvedA3GJpQFpHZCGhD7 (source reports/olx-razbor.html, not committed).
Views (cumulative since creation; «Опубликовано» = last refresh): total 5 155, median 56; #1 б/у диски 180 000 = 2 410 (47%).
Specific title (game/offer/service) median 78 vs generic «игры на PS4/PS5…» median 31 (18 ads).
Same-age (≈2 wks) newest: rental 101 & 56, CoD MW4 57, generic 44 & 11.
No ads in TOP (no paid promo). PS Plus ad only 25 views.
Hosts added: production-graphql.eu-sharedservices.olxcdn.com (view counter), app.birbir.uz. BIR BIR: Cloudflare bot check — not bypassing; need screenshots or owner's laptop.

## 2026-11-23 — Маркетолог #1: OLX competitors
Positions p1 (~50 cards): аренда ps5 41/57 total; аренда playstation 42; ps plus — absent; gta 6 ps5 47; игры на ps5 18; o'yinlar ps5 12; установка игр 5 (15 of 50 slots ours).
Cause: freshness — 10–15 of top20 refreshed 20–23.11; ours 2–7.11.
Leaders: rental ID2SygH 37 824 views, ID3cOOU 25 903 (keyword-stuffed titles RU+latin: arenda/prokat/ijara/пракат); discs ID3bdWc 55 337 @50 000. GTA 6 used as rental hook (350 000). PS Plus competitors show prices 99 000–899 000. No paid TOP ads in results.
Section added to report artifact v2.
