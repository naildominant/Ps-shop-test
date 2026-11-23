/**
 * PS SHOP — Cloudflare Worker.
 *
 * 1. POST /order  — принимает заявку с сайта и отправляет её Наилю в Telegram-бота.
 * 2. POST /event  — считает, какие игры чаще кладут в корзину (для полки «Хиты»).
 *    GET  /hits   — отдаёт эти счётчики сборщику сайта.
 *    POST /visit  — анонимная сводка визита (источник, страницы, корзина, заказ) в лист «Посетители» таблицы.
 * 3. По расписанию (каждые 10 минут) запускает в GitHub обновление каталога из канала.
 * 4. POST /tgpost — кнопки «Опубликовать / Отмена» бота публикации постов (см. раздел 4 ниже).
 *
 * Настройки (Cloudflare → Workers → psshop → Settings → Variables and Secrets):
 *   BOT_TOKEN   секрет: токен бота от @BotFather
 *   CHAT_ID     кому слать заявки (ID Наиля)
 *   GH_TOKEN    секрет: ключ GitHub с правом запускать Actions в репозитории
 *   GH_REPO     naildominant/Ps-shop-test
 *   ALLOWED     адреса сайта через запятую (https://psshop.uz,https://www.psshop.uz)
 *   SHEET_URL   адрес Google Apps Script — копия каждой заявки строкой в Google Таблицу (необязательно)
 *   SHEET_TOKEN пароль для таблицы (тот же, что в скрипте таблицы)
 *   TGPOST_BOT_TOKEN, TGPOST_SECRET, TGPOST_OWNER  секреты бота публикации постов (раздел 4)
 * Хранилище KV с именем STORE: ограничение частоты заявок и счётчики корзины.
 */

const MAX_ORDERS_PER_10_MIN = 5;
const money = (n) => Number(n || 0).toLocaleString('ru-RU').replace(/ |,/g, ' ');
const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function cors(req, env) {
  const origin = req.headers.get('Origin') || '';
  const allowed = (env.ALLOWED || '').split(',').map((s) => s.trim()).filter(Boolean);
  const ok = allowed.includes(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : (allowed[0] || '*'),
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}
const json = (data, status, headers) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...headers } });

async function tooMany(env, ip) {
  if (!env.STORE) return false;
  const key = `rl:${ip}`;
  const n = Number(await env.STORE.get(key)) || 0;
  if (n >= MAX_ORDERS_PER_10_MIN) return true;
  await env.STORE.put(key, String(n + 1), { expirationTtl: 600 });
  return false;
}

function orderMessage(o, n) {
  const items = (o.items || []).slice(0, 30).map((i, n) => `${n + 1}. ${esc(i.title)} (${esc(i.option)}) — ${money(i.price)} uzs`).join('\n');
  const contact = String(o.contact || '').trim();
  const tgUser = contact.match(/^@?([a-zA-Z][a-zA-Z0-9_]{4,31})$/);
  const phone = contact.replace(/[^\d+]/g, '');
  const link = tgUser ? `https://t.me/${tgUser[1]}` : (phone.length >= 9 ? `tel:${phone}` : '');
  const time = new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  return [
    `🛒 <b>Новая заявка с сайта${n ? ` №${ON(n)}` : ''}</b>`,
    '',
    `👤 ${esc(o.name)}`,
    `📞 ${esc(contact)}${link ? `  ${link}` : ''}`,
    `🎮 Консоль: ${esc(o.console)}`,
    '',
    items,
    '',
    `💰 <b>Итого: ${money(o.total)} uzs</b>`,
    `🕒 ${time} (Ташкент)`,
  ].join('\n');
}

async function sendTelegram(env, text, extra) {
  const r = await ordTg(env, 'sendMessage', { chat_id: env.CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: true, ...extra });
  return r.ok ? r.result.message_id : 0;
}

/* ---------- Google Таблица (CRM) ---------- */
// Скрипт таблицы универсальный: получает имя листа, заголовки и строку. Что и как писать, решает этот сервер,
// поэтому новые колонки добавляются здесь, без замены скрипта в Google.
const cell = (x) => (typeof x === 'string' && /^[=+\-@]/.test(x) ? `'${x}` : x); // защита от «формул» в тексте посетителя

async function sheetPost(env, payload) {
  if (!env.SHEET_URL) return;
  if (payload.values) payload.values = payload.values.map(cell);
  await fetch(env.SHEET_URL, {
    method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow',
    body: JSON.stringify({ token: env.SHEET_TOKEN || '', ...payload }),
  }).catch(() => {});
}

const ORDER_HEADER = ['Дата', 'Имя', 'Контакт', 'Консоль', 'Что заказали', 'Сумма, uzs', 'Язык сайта', 'Статус', 'Комментарий', 'Посетитель', '№ заявки', 'Оплачено, uzs', 'Статус изменён'];

// Номер для людей = внутренний n + 1100 (T3 23.11): KV order:<n>, кнопки ord:<n>, а в сообщениях и CRM «№ заявки» — n+1100.
const ON = (n) => Number(n) + 1100;
function orderRow(o, n) {
  const items = (o.items || []).slice(0, 30).map((i) => `${i.title} (${i.option}) — ${money(i.price)} uzs`).join('\n');
  return [Date.now(), o.name, o.contact, o.console, items, Number(o.total) || 0, o.lang || 'ru', 'Новая', '', String(o.vid || '').slice(0, 12), n ? String(ON(n)) : '', '', ''];
}

async function toSheet(env, row) {
  const n = row[10];
  await sheetPost(env, { sheet: 'Заявки', header: ORDER_HEADER, dates: [0, 12].filter((i) => row[i] !== ''), values: row, ...(n ? { key: n, keyCol: '№ заявки' } : {}) });
}

const VISIT_HEADER = ['Начало визита', 'Посетитель', 'Визит №', 'Новый', 'Источник', 'Откуда пришёл', 'Метка рекламы',
  'Первая страница', 'Страниц', 'Минут на сайте', 'Смотрел игры', 'Клал в корзину', 'Заказ', 'Сумма заказа', 'Устройство', 'Язык', 'Город', 'Код визита',
  'Путь по сайту', 'Искал', 'Спрашивал в чате', 'Положил в корзину', 'Другие действия', 'Простыми словами'];

function sourceOf(v) {
  const ref = String(v.ref || '').toLowerCase();
  const NAMES = { instagram: 'Instagram', ig: 'Instagram', telegram: 'Telegram', tg: 'Telegram', google: 'Google', yandex: 'Яндекс', youtube: 'YouTube', tiktok: 'TikTok', facebook: 'Facebook' };
  if (v.utm) return NAMES[String(v.utm).toLowerCase()] || String(v.utm);
  if (/t\.me|telegram/.test(ref) || (!ref && v.tg)) return 'Telegram';
  if (/instagram/.test(ref) || (!ref && v.ig)) return 'Instagram';
  if (!ref) return 'Прямой заход';
  if (/google/.test(ref)) return 'Google';
  if (/yandex|ya\.ru/.test(ref)) return 'Яндекс';
  if (/facebook|fb\./.test(ref)) return 'Facebook';
  if (/youtube/.test(ref)) return 'YouTube';
  if (/tiktok/.test(ref)) return 'TikTok';
  return 'Другой сайт';
}

const fmtSec = (s) => (s < 60 ? `${s} с` : `${Math.floor(s / 60)} мин${s % 60 ? ` ${s % 60} с` : ''}`);
const quote = (a) => a.map((x) => `«${x}»`).join(', ');
const uniq = (a) => [...new Set(a.filter(Boolean))];
const TG_NAMES = { gaynullin_nail: 'менеджеру', psshopgo: 'в канал', xpsshopotziv: 'в отзывы' };

function visitRow(v, cf) {
  const str = (x, n) => String(x ?? '').slice(0, n);
  const ev = (Array.isArray(v.ev) ? v.ev : []).slice(0, 120).map((e) => ({ t: Number(e.t) || 0, k: str(e.k, 12), v: str(e.v, 80), d: Number(e.d) || 0 }));
  const dur = Math.min(Number(v.dur) || 0, 86400);
  const of = (k) => ev.filter((e) => e.k === k).map((e) => e.v);
  const pages = ev.filter((e) => e.k === 'page');
  const path = pages.map((p, i) => {
    const next = pages[i + 1] ? pages[i + 1].t : dur;
    return `${p.v} (${fmtSec(Math.max(0, next - p.t))}${p.d >= 90 ? ', до конца' : p.d >= 30 ? `, долистал ${p.d}%` : ''})`;
  }).join(' → ');
  const searches = uniq(of('search')), notFound = uniq(of('notfound')), chat = uniq(of('chat'));
  const adds = uniq(of('add')), removed = uniq(of('rm'));
  const tgs = uniq(of('tg').map((h) => TG_NAMES[(h.split('t.me/')[1] || '').split(/[/?]/)[0].toLowerCase()] || h));
  const other = [];
  const cnt = (k) => ev.filter((e) => e.k === k).length;
  if (cnt('cart')) other.push(`открывал корзину${cnt('cart') > 1 ? ` (${cnt('cart')} раза)` : ''}`);
  if (cnt('form')) other.push('начал заполнять заявку');
  if (removed.length) other.push(`убрал из корзины: ${removed.join(', ')}`);
  uniq(of('filter')).forEach((f) => other.push(`фильтр «${f}»`));
  uniq(of('sort')).forEach((s) => other.push(`сортировка «${s}»`));
  if (cnt('chat_open')) other.push('открывал чат');
  if (cnt('video')) other.push('смотрел видео');
  if (cnt('pad')) other.push(`подбросил геймпад${cnt('pad') > 1 ? ` ${cnt('pad')} раза` : ''}`);
  uniq(of('lang')).forEach((l) => other.push(`сменил язык на ${l === 'uz' ? 'узбекский' : 'русский'}`));
  if (tgs.length) other.push(`перешёл в Telegram: ${tgs.join(', ')}`);

  const src = sourceOf(v);
  const device = (v.mobile ? 'телефон' : 'компьютер') + (v.os ? `, ${str(v.os, 20)}` : '');
  const city = [str(cf.city, 40), str(cf.country, 4)].filter(Boolean).join(', ');
  const n = Number(v.n) || 1;
  const order = !!v.order, total = Number(v.total) || 0;
  const story = [
    `${n === 1 ? 'Новый посетитель' : `Вернулся (${n}-й визит)`}, ${src === 'Прямой заход' ? 'зашёл напрямую' : `пришёл из: ${src}`}; ${device}${city ? `; ${str(cf.city, 40) || city}` : ''}; ${v.lang === 'uz' ? 'узбекская' : 'русская'} версия.`,
    `Был на сайте ${fmtSec(dur)}, открыл ${pages.length || Number(v.pages) || 1} стр.: ${pages.slice(0, 10).map((p) => p.v).join(' → ')}${pages.length > 10 ? ' → …' : ''}.`,
    searches.length ? `Искал: ${quote(searches)}.` : '',
    notFound.length ? `Не нашёл на сайте: ${quote(notFound)}.` : '',
    chat.length ? `Спрашивал в чате: ${quote(chat)}.` : '',
    adds.length ? `Положил в корзину: ${adds.join(', ')}.` : '',
    tgs.length ? `Перешёл в Telegram ${tgs.join(', ')}.` : '',
    order ? `✅ Оформил заказ на ${money(total)} сум.`
      : cnt('form') ? '⚠️ Начал оформлять заказ, но не отправил.'
        : adds.length ? '⚠️ Положил в корзину, но не заказал.' : 'Ушёл без заказа.',
  ].filter(Boolean).join(' ');

  return [Number(v.start) || Date.now(), v.vid, n, n === 1 ? 'новый' : 'вернулся', src, str(v.ref, 80), str(v.camp, 60),
    str(v.land, 120), Number(v.pages) || pages.length || 1, Math.round(dur / 6) / 10,
    (Array.isArray(v.games) ? v.games : []).slice(0, 15).map((g) => str(g, 80)).join('; '), Math.min(Number(v.adds) || 0, 999),
    order ? 'да' : '', order ? total : '', device, v.lang === 'uz' ? 'uz' : 'ru', city, v.sid,
    path, searches.join('; '), chat.join('; '), adds.join('; '), other.join('; '), story];
}

// Визит с сайта (анонимно) -> строка в листе «Посетители» Google Таблицы.
async function handleVisit(req, env, h, ctx) {
  const origin = req.headers.get('Origin') || '';
  const allowed = (env.ALLOWED || '').split(',').map((x) => x.trim()).filter(Boolean);
  if (!allowed.includes(origin) || !env.SHEET_URL) return new Response(null, { status: 204, headers: h });
  let v;
  try { const t = await req.text(); if (t.length > 24000) throw 0; v = JSON.parse(t); } catch { return new Response(null, { status: 400, headers: h }); }
  if (!/^[a-z0-9]{4,12}$/.test(v.sid || '') || !/^[a-z0-9]{4,12}$/.test(v.vid || '')) return new Response(null, { status: 400, headers: h });
  const send = sheetPost(env, { sheet: 'Посетители', header: VISIT_HEADER, dates: [0], key: v.sid, keyCol: 'Код визита', values: visitRow(v, req.cf || {}) });
  if (ctx) ctx.waitUntil(send); else await send;
  return new Response(null, { status: 204, headers: h });
}

async function handleOrder(req, env, h, ctx) {
  let o;
  try { o = await req.json(); } catch { return json({ ok: false, error: 'bad json' }, 400, h); }
  if (o.website) return json({ ok: true }, 200, h); // ловушка для ботов: делаем вид, что всё хорошо
  const name = String(o.name || '').trim();
  const contact = String(o.contact || '').trim();
  if (name.length < 2 || name.length > 60 || contact.length < 5 || contact.length > 60 || !['PS4', 'PS5'].includes(o.console)
      || !Array.isArray(o.items) || !o.items.length) {
    return json({ ok: false, error: 'invalid' }, 400, h);
  }
  const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
  if (await tooMany(env, ip)) return json({ ok: false, error: 'too many' }, 429, h);
  const n = await nextOrderNo(env);
  const html = orderMessage({ ...o, name, contact }, n);
  const row = orderRow({ ...o, name, contact }, n);
  const mid = await sendTelegram(env, html, n ? { reply_markup: ordKb(n) } : {});
  const code = /^[a-z0-9]{8,32}$/.test(o.code || '') ? o.code : '';
  if (n && env.STORE) {
    const keep = { expirationTtl: 60 * 60 * 24 * 180 };
    const lang = o.lang === 'uz' ? 'uz' : 'ru';
    const items = (o.items || []).slice(0, 30).map((i) => ({ title: String(i.title || '').slice(0, 120), option: String(i.option || '').slice(0, 40), price: Number(i.price) || 0 }));
    await env.STORE.put(`order:${n}`, JSON.stringify({ html, row, mid, lang, items, total: Number(o.total) || 0, console: o.console, name, contact }), keep);
    if (code) await env.STORE.put(`ordc:${code}`, String(n), keep);
  }
  if (ctx) ctx.waitUntil(toSheet(env, row));
  return json({ ok: !!mid, n }, mid ? 200 : 502, h);
}

async function handleEvent(req, env, h) {
  let e;
  try { e = await req.json(); } catch { return json({ ok: false }, 400, h); }
  if (e.type === 'add' && /^[a-z0-9-]{2,80}$/.test(e.id || '') && env.STORE) {
    const key = `add:${e.id}`;
    const n = Number(await env.STORE.get(key)) || 0;
    await env.STORE.put(key, String(n + 1));
  }
  return json({ ok: true }, 200, h);
}

async function handleHits(env, h) {
  const out = {};
  if (env.STORE) {
    let cursor;
    do {
      const page = await env.STORE.list({ prefix: 'add:', cursor });
      for (const k of page.keys) out[k.name.slice(4)] = Number(await env.STORE.get(k.name)) || 0;
      cursor = page.list_complete ? null : page.cursor;
    } while (cursor);
  }
  return json(out, 200, { ...h, 'Cache-Control': 'max-age=300' });
}

async function runCatalogUpdate(env) {
  if (!env.GH_TOKEN || !env.GH_REPO) return;
  await fetch(`https://api.github.com/repos/${env.GH_REPO}/actions/workflows/update-catalog.yml/dispatches`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.GH_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'psshop-worker', 'X-GitHub-Api-Version': '2022-11-28' },
    body: JSON.stringify({ ref: 'main' }),
  });
}

/* ---------------------------------------------------------------------------
 * 4. Бот публикации постов (@psshop_postTG_bot).
 *    Превью приходит владельцу с кнопками «✅ Опубликовать» / «❌ Отмена».
 *    POST /tgpost          — webhook Telegram (проверка заголовка секрета).
 *    GET  /tgpost/setup    — подключить webhook (?key=TGPOST_SECRET).
 *    POST /tgpost/pending  — publish.py сообщает, какой пост ждёт публикации (проверка: токен бота = сохранённому).
 *    Боту в канале Telegram заменяет премиум-эмодзи обычными, поэтому основной путь — владелец пересылает
 *    превью в канал со скрытым отправителем; сервер видит channel_post и отмечает пост опубликованным.
 *    GET  /tgpost/status   — статус поста ?post=<папка>&key=…: pending / published (+link) / cancelled (+feedback).
 *    После «Отмены» бот спрашивает «Что поменять?», ответ владельца сохраняется в feedback.
 *    GET  /tgpost/emoji    — премиум-эмодзи, присланные владельцем боту (?key=TGPOST_SECRET).
 *    POST /tgpost/register — GitHub Actions передаёт токен бота {"token": "..."}; сервер проверяет через getMe,
 *                            что это именно наш бот (TGPOST_BOT_USERNAME, по умолчанию psshop_postTG_bot),
 *                            сохраняет токен в KV и подключает webhook. Без верного токена ничего не происходит.
 *    Секреты: TGPOST_BOT_TOKEN (токен бота), TGPOST_SECRET (случайная строка), TGPOST_OWNER (chat id владельца).
 *    Необязательно: TGPOST_CHANNEL (по умолчанию @psshopgo).
 * ------------------------------------------------------------------------- */
async function botToken(env) {
  return env.TGPOST_BOT_TOKEN || (env.STORE ? await env.STORE.get('tgpost:token') : '') || '';
}
/* ---------- Бот заявок (@psshop_zayavki_bot): статус заявки кнопками ---------- */
// Кнопки под заявкой меняют «Статус» и «Оплачено» в листе «Заявки». «Со скидкой» — бот спрашивает сумму.
// Webhook: POST /orderbot (заголовок-секрет = KV orderbot:secret). Подключение: GET /orderbot/setup?key=<секрет>&set=1
const ORD_ST = {
  buy: { label: 'Купил', icon: '✅' },
  disc: { label: 'Купил со скидкой', icon: '💸' },
  wait: { label: 'В обработке', icon: '⏳' },
  no: { label: 'Отказался', icon: '❌' },
};
async function ordTg(env, method, body) {
  const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  return r.json().catch(() => ({ ok: false }));
}
async function nextOrderNo(env) {
  if (!env.STORE) return 0;
  const n = (Number(await env.STORE.get('order:seq')) || 14) + 1;
  await env.STORE.put('order:seq', String(n));
  return n;
}
function ordKb(n, cur) {
  const b = (k) => ({ text: `${cur === k ? '• ' : ''}${ORD_ST[k].icon} ${ORD_ST[k].label}`, callback_data: `ord:${n}:${k}` });
  return { inline_keyboard: [[b('buy'), b('disc')], [b('wait'), b('no')]] };
}
const parseSum = (t) => {
  const s = String(t || '').toLowerCase().replace(/сум|uzs|so'm|сўм/g, '').trim();
  const k = /(к|k|тыс)\s*$/.test(s);
  const d = Number(s.replace(/[^\d]/g, ''));
  if (!d) return 0;
  return k || d < 10000 ? d * 1000 : d;
};
const MANAGER = 'https://t.me/Gaynullin_Nail';
const CL = {
  write: { ru: '✍️ Написать менеджеру', uz: '✍️ Menejerga yozish' },
  site: { ru: '🎮 Каталог игр', uz: '🎮 O‘yinlar katalogi' },
};
const L = (o, k) => CL[k][o.lang === 'uz' ? 'uz' : 'ru'];
const CLIENT_MSG = {
  buy: { ru: (n) => `🎉 Спасибо за покупку! Заявка №${ON(n)} выполнена. Приятной игры! 🎮`, uz: (n) => `🎉 Xaridingiz uchun rahmat! Buyurtma №${ON(n)} bajarildi. Yoqimli o‘yin! 🎮` },
  disc: { ru: (n) => `🎉 Спасибо за покупку! Заявка №${ON(n)} выполнена. Приятной игры! 🎮`, uz: (n) => `🎉 Xaridingiz uchun rahmat! Buyurtma №${ON(n)} bajarildi. Yoqimli o‘yin! 🎮` },
  wait: { ru: (n) => `⏳ Заявка №${ON(n)} в работе. Менеджер с вами свяжется.`, uz: (n) => `⏳ Buyurtma №${ON(n)} ko‘rib chiqilmoqda. Menejer siz bilan bog‘lanadi.` },
};
function ordItems(o) {
  return (o.items || []).map((i, k) => `${k + 1}. ${i.title} (${i.option}) — ${money(i.price)} uzs`).join('\n');
}
function clientConfirm(o, n) {
  const uz = o.lang === 'uz';
  return [
    uz ? `✅ Buyurtma №${ON(n)} qabul qilindi!` : `✅ Заявка №${ON(n)} принята!`,
    '',
    ordItems(o),
    '',
    `${uz ? 'Jami' : 'Итого'}: ${money(o.total)} uzs`,
    `${uz ? 'Konsol' : 'Консоль'}: ${o.console || ''}`,
    '',
    uz ? 'Menejer tez orada siz bilan bog‘lanadi. Tezroq bo‘lishi uchun pastdagi tugmani bosing va buyurtma matnini yuboring. Buyurtma holati shu yerga keladi.'
      : 'Менеджер скоро с вами свяжется. Если хотите быстрее, нажмите кнопку ниже и отправьте текст заказа. Статус заявки будет приходить сюда.',
  ].join('\n');
}
function managerText(o, n) {
  const uz = o.lang === 'uz';
  return [uz ? `Assalomu alaykum! Saytdagi buyurtma №${ON(n)}:` : `Здравствуйте! Заявка №${ON(n)} с сайта:`, '', ordItems(o), '',
    `${uz ? 'Jami' : 'Итого'}: ${money(o.total)} uzs`, `${uz ? 'Konsol' : 'Консоль'}: ${o.console || ''}`, `${uz ? 'Ism' : 'Имя'}: ${o.name || ''}`].join('\n');
}
async function ordRender(env, n, o) {
  if (!o.mid) return;
  const st = o.status && ORD_ST[o.status];
  const sum = o.row[11];
  const lines = [o.html];
  if (o.client) lines.push('', `📲 Клиент подтвердил в боте${o.clientName ? ` (${esc(o.clientName)})` : ''}, статусы ему приходят`);
  if (st) lines.push('', `<b>Статус: ${st.icon} ${st.label}</b>${sum ? ` — ${money(sum)} uzs` : ''}`);
  await ordTg(env, 'editMessageText', { chat_id: env.CHAT_ID, message_id: o.mid, text: lines.join('\n'), parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: ordKb(n, o.status) });
}
async function clientStart(env, msg, code) {
  const chat = msg.chat.id;
  const lang = /^uz/.test(msg.from?.language_code || '') ? 'uz' : 'ru';
  const n = code && /^[a-z0-9]{8,32}$/.test(code) ? await env.STORE.get(`ordc:${code}`) : null;
  const raw = n && await env.STORE.get(`order:${n}`);
  if (!raw) {
    if (!code || !/^[a-z0-9]{8,32}$/.test(code)) return clientHelp(env, chat, { lang });
    // заявка могла ещё не дойти до этого узла Cloudflare (до минуты): даём кнопку повторной проверки
    return ordTg(env, 'sendMessage', { chat_id: chat,
      text: lang === 'uz' ? '⏳ Buyurtmangiz yuklanmoqda. Bir daqiqadan so‘ng pastdagi tugmani bosing.' : '⏳ Заявка ещё загружается. Нажмите кнопку ниже через минуту.',
      reply_markup: { inline_keyboard: [[{ text: lang === 'uz' ? '🔄 Tekshirish' : '🔄 Проверить заявку', callback_data: `chk:${code}` }]] } });
  }
  const o = JSON.parse(raw);
  const first = !o.client;
  o.client = chat;
  o.clientName = msg.from?.username ? `@${msg.from.username}` : [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ');
  await env.STORE.put(`order:${n}`, JSON.stringify(o), { expirationTtl: 60 * 60 * 24 * 180 });
  await ordTg(env, 'sendMessage', { chat_id: chat, text: clientConfirm(o, n), reply_markup: { inline_keyboard: [[{ text: L(o, 'write'), url: `${MANAGER}?text=${encodeURIComponent(managerText(o, n))}` }]] } });
  if (first) await ordRender(env, n, o);
}
async function clientHelp(env, chat, o) {
  const uz = o.lang === 'uz';
  await ordTg(env, 'sendMessage', { chat_id: chat,
    text: uz ? 'Bu PS SHOP buyurtmalar boti. Bu yerga saytdagi buyurtmangiz tasdig‘i va holati keladi. Savollar bo‘lsa, menejerga yozing.'
      : 'Это бот заказов PS SHOP. Сюда приходит подтверждение и статус вашей заявки с сайта. По любым вопросам напишите менеджеру.',
    reply_markup: { inline_keyboard: [[{ text: L(o, 'write'), url: MANAGER }], [{ text: L(o, 'site'), url: uz ? 'https://psshop.uz/' : 'https://psshop.uz/ru/' }]] } });
}
async function setOrderStatus(env, n, key, paid) {
  const raw = await env.STORE.get(`order:${n}`);
  if (!raw) return { ok: false, text: `Заявка №${ON(n)} не найдена` };
  const o = JSON.parse(raw);
  const st = ORD_ST[key];
  const sum = key === 'buy' ? Number(o.row[5]) || 0 : key === 'disc' ? paid : '';
  o.row[7] = st.label; o.row[11] = sum; o.row[12] = Date.now(); o.status = key;
  await env.STORE.put(`order:${n}`, JSON.stringify(o), { expirationTtl: 60 * 60 * 24 * 180 });
  await ordRender(env, n, o);
  await toSheet(env, o.row);
  if (o.client && !o.quiet && o.notified !== key && CLIENT_MSG[key]) {
    const t = CLIENT_MSG[key][o.lang === 'uz' ? 'uz' : 'ru'](n);
    const r = await ordTg(env, 'sendMessage', { chat_id: o.client, text: t, reply_markup: { inline_keyboard: [[{ text: L(o, 'write'), url: MANAGER }]] } });
    if (r.ok) { o.notified = key; await env.STORE.put(`order:${n}`, JSON.stringify(o), { expirationTtl: 60 * 60 * 24 * 180 }); }
  }
  return { ok: true, text: `${st.icon} ${st.label}${o.client ? '' : ' (клиент не в боте, ему не пришло)'}` };
}
async function handleOrderBot(req, env, ctx) {
  const secret = env.STORE && await env.STORE.get('orderbot:secret');
  if (!secret || req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== secret) return new Response('forbidden', { status: 403 });
  const u = await req.json().catch(() => ({}));
  const owner = String(env.CHAT_ID);
  const q = u.callback_query;
  if (q) {
    const ans = (text, alert) => json({ method: 'answerCallbackQuery', callback_query_id: q.id, text, show_alert: !!alert }, 200);
    const ck = /^chk:([a-z0-9]{8,32})$/.exec(q.data || '');
    if (ck && q.message?.chat) { await clientStart(env, { chat: q.message.chat, from: q.from }, ck[1]); return ans(''); }
    if (String(q.from?.id) !== owner) return ans('Нет доступа');
    const m = /^ord:(\d+):(buy|disc|wait|no)$/.exec(q.data || '');
    if (!m) return ans('');
    const [, n, key] = m;
    if (key === 'disc') {
      await env.STORE.put('orderbot:await', n, { expirationTtl: 3600 });
      await ordTg(env, 'sendMessage', { chat_id: owner, reply_to_message_id: q.message?.message_id, text: `💸 Заявка №${ON(n)}: на какую сумму купили со скидкой? Напишите число, например 950000 или 950к.`, reply_markup: { force_reply: true, input_field_placeholder: 'Сумма, например 950000' } });
      return ans('Напишите сумму');
    }
    const r = await setOrderStatus(env, n, key);
    return ans(r.text, !r.ok);
  }
  const msg = u.message;
  if (msg && msg.chat?.type === 'private') {
    const st = /^\/start(?:\s+(\S+))?/.exec(msg.text || '');
    if (st) { await clientStart(env, msg, st[1]); return new Response('ok'); }
    if (String(msg.chat.id) !== owner) { await clientHelp(env, msg.chat.id, { lang: /^uz/.test(msg.from?.language_code || '') ? 'uz' : 'ru' }); return new Response('ok'); }
  }
  if (msg && String(msg.chat?.id) === owner && msg.text) {
    const n = await env.STORE.get('orderbot:await');
    if (n) {
      if (/^(отмена|стоп|cancel)$/i.test(msg.text.trim())) {
        await env.STORE.delete('orderbot:await');
        await ordTg(env, 'sendMessage', { chat_id: owner, text: 'Хорошо, скидку не записываю.' });
      } else {
        const sum = parseSum(msg.text);
        if (!sum) await ordTg(env, 'sendMessage', { chat_id: owner, text: `Не понял сумму. Напишите число для заявки №${ON(n)}, например 950000. Или «отмена».`, reply_markup: { force_reply: true } });
        else {
          await env.STORE.delete('orderbot:await');
          const r = await setOrderStatus(env, n, 'disc', sum);
          await ordTg(env, 'sendMessage', { chat_id: owner, text: r.ok ? `💸 Записал: заявка №${ON(n)} куплена со скидкой за ${money(sum)} сум.` : r.text });
        }
      }
    }
  }
  return new Response('ok');
}
// T2 23.11: GET /orderbot/resend?key=<секрет>&from=1&to=17 — заново шлёт владельцу старые заявки с кнопками статуса.
// Клиентам при отметке старой заявки ничего не уходит (quiet).
async function handleOrderBotResend(req, env) {
  const url = new URL(req.url);
  const secret = env.STORE && await env.STORE.get('orderbot:secret');
  if (!secret || url.searchParams.get('key') !== secret) return new Response('forbidden', { status: 403 });
  const from = Number(url.searchParams.get('from')) || 1;
  const to = Math.min(Number(url.searchParams.get('to')) || from, from + 40);
  const out = [];
  for (let n = from; n <= to; n++) {
    const raw = await env.STORE.get(`order:${n}`);
    if (!raw) { out.push(`${n}: нет`); continue; }
    const o = JSON.parse(raw);
    const st = o.status && ORD_ST[o.status];
    const head = `📂 <b>Старая заявка, отметьте: купил или нет</b>\n\n`;
    const html = head + o.html + (st ? `\n\n<b>Статус: ${st.icon} ${st.label}</b>${o.row[11] ? ` — ${money(o.row[11])} uzs` : ''}` : '');
    const mid = await sendTelegram(env, html, { reply_markup: ordKb(n, o.status) });
    if (mid) { o.mid = mid; o.quiet = 1; await env.STORE.put(`order:${n}`, JSON.stringify(o), { expirationTtl: 60 * 60 * 24 * 180 }); }
    out.push(`${n}: ${mid ? 'ok' : 'ошибка'}`);
    await new Promise((r) => setTimeout(r, 1200));
  }
  return new Response(out.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
// 24.11 (Сайтер): заявки без статуса или «В обработке» дольше суток → одно напоминание владельцу в бот заявок. Тишина, если таких нет.
async function remindStuckOrders(env) {
  if (!env.STORE || !env.BOT_TOKEN) return;
  const keys = [];
  let cursor;
  do { const r = await env.STORE.list({ prefix: 'order:', cursor }); keys.push(...r.keys.map((k) => k.name)); cursor = r.list_complete ? null : r.cursor; } while (cursor);
  const day = 24 * 3600 * 1000, now = Date.now(), stuck = [];
  for (const k of keys) {
    const m = /^order:(\d+)$/.exec(k); if (!m) continue;
    const o = JSON.parse(await env.STORE.get(k) || 'null'); if (!o || !o.row) continue;
    const t = Number(o.row[0]) || 0;
    if ((!o.status || o.status === 'wait') && t && now - t > day) stuck.push({ n: Number(m[1]), o, t });
  }
  if (!stuck.length) return;
  stuck.sort((a, b) => a.n - b.n);
  const lines = stuck.map(({ n, o, t }) => `• №${ON(n)} — ${esc(o.name || '')}, ${money(Number(o.row[5]) || 0)} uzs, ${o.status === 'wait' ? '⏳ в обработке' : '🆕 без статуса'}, ${Math.floor((now - t) / day)} дн.`);
  await ordTg(env, 'sendMessage', { chat_id: env.CHAT_ID, parse_mode: 'HTML', text: [`⏰ <b>Заявки ждут решения больше суток: ${stuck.length}</b>`, '', ...lines, '', 'Отметьте статус кнопками под заявкой (✅ Купил / ❌ Отказался).'].join('\n') });
}
// 24.11 (Сайтер): проверка здоровья для ежедневной проверки GitHub Actions. Только да/нет, без секретов.
function handleHealth(env) {
  return json({ ok: true, ai: !!env.AI, store: !!env.STORE, orderbot: !!env.BOT_TOKEN, sheet: !!env.SHEET_URL, time: new Date().toISOString() }, 200, { 'Cache-Control': 'no-store' });
}
async function handleOrderBotSetup(req, env) {
  const url = new URL(req.url);
  const secret = env.STORE && await env.STORE.get('orderbot:secret');
  if (!secret || url.searchParams.get('key') !== secret) return new Response('forbidden', { status: 403 });
  const before = await ordTg(env, 'getWebhookInfo', {});
  const me = await ordTg(env, 'getMe', {});
  let set = null;
  if (url.searchParams.get('set') === '1') {
    set = await ordTg(env, 'setWebhook', { url: `${url.origin}/orderbot`, secret_token: secret, allowed_updates: ['message', 'callback_query'], max_connections: 5 });
  }
  return json({ me: me.result?.username, before: before.result, set }, 200);
}

async function tg(env, method, body, token) {
  const r = await fetch(`https://api.telegram.org/bot${token || await botToken(env)}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  return r.json();
}
const kb = (rows) => ({ inline_keyboard: rows });
const ctrlKb = (post) => kb([[{ text: '✅ Опубликовать', callback_data: `go::${post}`.slice(0, 64) }], [{ text: '🕒 Отправить позже', callback_data: `later::${post}`.slice(0, 64) }], [{ text: '❌ Нужна доработка', callback_data: `no::${post}`.slice(0, 64) }], [{ text: '🗑 Отменить пост', callback_data: `del::${post}`.slice(0, 64) }]]);
async function setStatus(env, post, patch) {
  if (!env.STORE || !post) return;
  const key = `tgpost:post:${post}`;
  const cur = JSON.parse(await env.STORE.get(key) || '{}');
  await env.STORE.put(key, JSON.stringify({ ...cur, ...patch, post, updated: new Date().toISOString() }), { expirationTtl: 60 * 60 * 24 * 60 });
}

async function handleTgPost(req, env, ctx) {
  if (!env.TGPOST_SECRET || req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.TGPOST_SECRET) return new Response('forbidden', { status: 403 });
  const u = await req.json().catch(() => ({}));
  const owner = String(env.TGPOST_OWNER || '');

  // Сообщение владельца боту: кнопки меню, задача агенту, правки к посту, премиум-эмодзи
  const m = u.message;
  if (m && String(m.from?.id) === owner) {
    // сообщения альбома запоминаем сразу (до ответа Telegram), каждое под своим ключом
    if (m.media_group_id) {
      const photo = m.photo?.length ? m.photo[m.photo.length - 1].file_id : (m.document?.file_id || '');
      await env.STORE.put(`tgpost:mg:${m.media_group_id}:${String(m.message_id).padStart(12, '0')}`, JSON.stringify({ photo, text: describeMessage(m) }), { expirationTtl: 600 });
    }
    // один раз: Telegram шлёт обновления по одному (иначе альбом приходит параллельно)
    if (!(await env.STORE.get('tgpost:wh1'))) {
      await env.STORE.put('tgpost:wh1', '1');
      await tg(env, 'setWebhook', { url: `${new URL(req.url).origin}/tgpost?u=2`, secret_token: env.TGPOST_SECRET, allowed_updates: ['message', 'callback_query', 'channel_post'], max_connections: 1 });
    }
    if (ctx) ctx.waitUntil(ownerMessage(env, m).catch((e) => tg(env, 'sendMessage', { chat_id: m.chat.id, text: `⚠️ Ошибка: ${e.message}` })));
    else await ownerMessage(env, m);
    return new Response('ok');
  }

  // Пост появился в канале (владелец переслал со скрытым отправителем) — отмечаем опубликованным
  const cp = u.channel_post;
  if (cp) {
    const channel = (env.TGPOST_CHANNEL || '@psshopgo').replace('@', '').toLowerCase();
    if (env.STORE && String(cp.chat?.username || '').toLowerCase() === channel) await indexChannelPost(env, cp).catch(() => {});
    const pend = env.STORE ? JSON.parse(await env.STORE.get('tgpost:pending') || 'null') : null;
    if (pend && String(cp.chat?.username || '').toLowerCase() === channel && !cp.media_group_id) {
      const link = `https://t.me/${channel}/${cp.message_id}`;
      await setStatus(env, pend.post, { status: 'published', link });
      await env.STORE.delete('tgpost:pending');
      if ((await env.STORE.get('tgpost:await')) === pend.post) await env.STORE.delete('tgpost:await');
      await tg(env, 'editMessageText', { chat_id: pend.chat, message_id: pend.ctrl, text: '✅ Пост вышел в канале. Выложить его в историю канала?', reply_markup: kb([[{ text: 'Открыть пост', url: link }], [{ text: '📲 Выложить в историю', callback_data: `story:${cp.message_id}:${pend.post}`.slice(0, 64) }]]) });
    }
    return new Response('ok');
  }

  const q = u.callback_query;
  if (!q) return new Response('ok');
  if (String(q.from?.id) !== owner) return json({ method: 'answerCallbackQuery', callback_query_id: q.id, text: 'Нет доступа' }, 200);
  const chat = q.message.chat.id, mid = q.message.message_id;
  const [action, idsPart, post] = String(q.data || '').split(':');
  const said = { go: 'опубликовать', no: 'нужна доработка', del: 'отменить пост', upd: 'да, меняем пост в канале', keep: 'нет, оставить пост', fixp: 'правки к посту канала', prfix: 'есть правки к ценам', prok: 'отчёт по ценам принят', later: 'отправить позже', story: 'выложить в историю' }[action];
  if (said && env.STORE) await remember(env, { result: `владелец нажал: ${said}${post ? ' (' + post + ')' : ''}` });

  if (action === 'no') {
    await tg(env, 'editMessageReplyMarkup', { chat_id: chat, message_id: mid, reply_markup: kb([[{ text: '❌ Отменено', callback_data: 'x' }]]) });
    await setStatus(env, post, { status: 'cancelled', feedback: [] });
    if (env.STORE) await env.STORE.delete('tgpost:pending');
    if (env.STORE && post) await env.STORE.put('tgpost:await', post, { expirationTtl: 60 * 60 * 24 * 3 });
    await tg(env, 'sendMessage', { chat_id: chat, reply_to_message_id: mid, text: '❌ Что поменять? Напишите одним сообщением (картинка, текст, цены…), я переделаю и пришлю новое превью.' });
    return json({ method: 'answerCallbackQuery', callback_query_id: q.id, text: 'Отменено' }, 200);
  }
  if (action === 'go') return publishAsOwner(env, q, chat, mid, post);
  if (action === 'story') {
    const gh = await env.STORE.get('tgpost:gh');
    const lock = `story:${idsPart}`;
    if (await env.STORE.get(lock)) return json({ method: 'answerCallbackQuery', callback_query_id: q.id, text: 'Уже выкладываю' }, 200);
    await env.STORE.put(lock, '1', { expirationTtl: 60 * 60 * 24 * 7 });
    const r = await fetch(`https://api.github.com/repos/${AUTOPOST_REPO}/actions/workflows/story.yml/dispatches`, {
      method: 'POST', headers: { ...ghHeaders(gh), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: 'main', inputs: { post, msg: idsPart, target: 'psshopgo' } }),
    });
    if (r.status !== 204) { await env.STORE.delete(lock); return json({ method: 'answerCallbackQuery', callback_query_id: q.id, text: `Не получилось (GitHub ${r.status})`, show_alert: true }, 200); }
    const link = `https://t.me/${(env.TGPOST_CHANNEL || '@psshopgo').replace('@', '')}/${idsPart}`;
    await tg(env, 'editMessageText', { chat_id: chat, message_id: mid, text: '✅ Пост вышел в канале. ⏳ Выкладываю в историю…', reply_markup: kb([[{ text: 'Открыть пост', url: link }]]) });
    return json({ method: 'answerCallbackQuery', callback_query_id: q.id, text: 'Выкладываю в историю' }, 200);
  }
  if (action === 'nolater') {
    await env.STORE.delete('tgpost:awaittime');
    await tg(env, 'editMessageText', { chat_id: chat, message_id: mid, text: '↩️ Отложенную отправку отменил. Кнопки поста выше остались.' });
    return json({ method: 'answerCallbackQuery', callback_query_id: q.id }, 200);
  }
  if (action === 'del') {
    const ids = JSON.parse(await env.STORE.get(`tgpost:ids:${post}`) || '[]');
    for (const id of ids) await tg(env, 'deleteMessage', { chat_id: chat, message_id: id });
    const pend = JSON.parse(await env.STORE.get('tgpost:pending') || 'null');
    if (pend?.post === post) await env.STORE.delete('tgpost:pending');
    if ((await env.STORE.get('tgpost:await')) === post) await env.STORE.delete('tgpost:await');
    if ((await env.STORE.get('tgpost:awaittime')) === post) await env.STORE.delete('tgpost:awaittime');
    await setStatus(env, post, { status: 'deleted' });
    await tg(env, 'editMessageText', { chat_id: chat, message_id: mid, text: '🗑 Пост отменён. Ничего не публикую.' });
    return json({ method: 'answerCallbackQuery', callback_query_id: q.id, text: 'Отменено' }, 200);
  }
  if (action === 'gp') { // «🎯 Подбор по жанру»: кнопка игры → как «🔎 Найти игру» (переслать пост / сделать у поставщика / нет в наличии)
    const list = JSON.parse(await env.STORE.get(`tgpost:gp:${idsPart}`) || 'null');
    const it = list?.[Number(post)];
    if (!it) return json({ method: 'answerCallbackQuery', callback_query_id: q.id, text: 'Подборка устарела — нажмите «🎯 Подбор по жанру» ещё раз', show_alert: true }, 200);
    const r = it.id ? await tg(env, 'forwardMessage', { chat_id: chat, from_chat_id: env.TGPOST_CHANNEL || '@psshopgo', message_id: it.id }) : null;
    if (!r?.ok) await findGames(env, chat, it.t, { sure: true });
    return json({ method: 'answerCallbackQuery', callback_query_id: q.id }, 200);
  }
  if (action === 'dym' || action === 'dyn') { // «Вы имели в виду …?»
    const d = JSON.parse(await env.STORE.get(`tgpost:dym:${idsPart}`) || 'null');
    if (!d) return json({ method: 'answerCallbackQuery', callback_query_id: q.id, text: 'Уже ответили' }, 200);
    await env.STORE.delete(`tgpost:dym:${idsPart}`);
    await tg(env, 'editMessageReplyMarkup', { chat_id: chat, message_id: mid, reply_markup: kb([[{ text: action === 'dym' ? `✅ ${d.official}` : '❌ Нет', callback_data: 'x' }]]) });
    if (action === 'dym') await findGames(env, chat, d.official, { sure: true });
    else await say(env, chat, `❌ Данной игры нет в наличии: ${d.asked}`);
    return json({ method: 'answerCallbackQuery', callback_query_id: q.id }, 200);
  }
  if (action === 'prok') {
    await tg(env, 'editMessageReplyMarkup', { chat_id: chat, message_id: mid, reply_markup: kb([[{ text: '✅ Принято', callback_data: 'x' }]]) });
    return json({ method: 'answerCallbackQuery', callback_query_id: q.id, text: 'Принято' }, 200);
  }
  if (action === 'prfix') {
    await env.STORE.put('tgpost:await', 'prices', { expirationTtl: 60 * 60 * 24 * 3 });
    await tg(env, 'sendMessage', { chat_id: chat, reply_to_message_id: mid, text: '✏️ Что поправить в ценах? Напишите одним сообщением, например: «Assassin’s Creed — верни 429 000» или «NBA 2K26 PS5 — 419 000».' });
    return json({ method: 'answerCallbackQuery', callback_query_id: q.id, text: 'Жду правки' }, 200);
  }
  if (action === 'fixp') {
    if (!/^\d+$/.test(idsPart)) return json({ method: 'answerCallbackQuery', callback_query_id: q.id }, 200);
    await env.STORE.put('tgpost:await', `upd-${idsPart}`, { expirationTtl: 60 * 60 * 24 * 3 });
    await tg(env, 'editMessageReplyMarkup', { chat_id: chat, message_id: mid, reply_markup: kb([[{ text: '✏️ Жду правки', callback_data: 'x' }]]) });
    await tg(env, 'sendMessage', { chat_id: chat, reply_to_message_id: mid, text: '✏️ Что поменять в этом посте? Напишите одним сообщением, я пришлю новый вариант «было / стало».' });
    return json({ method: 'answerCallbackQuery', callback_query_id: q.id, text: 'Жду правки' }, 200);
  }
  if (action === 'keep') {
    await tg(env, 'editMessageReplyMarkup', { chat_id: chat, message_id: mid, reply_markup: kb([[{ text: '👌 Оставили как было', callback_data: 'x' }]]) });
    return json({ method: 'answerCallbackQuery', callback_query_id: q.id, text: 'Оставили' }, 200);
  }
  if (action === 'upd') {
    if (!/^\d+$/.test(idsPart)) return json({ method: 'answerCallbackQuery', callback_query_id: q.id }, 200);
    const lock = `upd:${idsPart}:${mid}`;
    if (await env.STORE.get(lock)) return json({ method: 'answerCallbackQuery', callback_query_id: q.id, text: 'Уже меняю' }, 200);
    await env.STORE.put(lock, '1', { expirationTtl: 60 * 60 * 24 });
    const gh = await env.STORE.get('tgpost:gh');
    const r = await fetch(`https://api.github.com/repos/${AUTOPOST_REPO}/actions/workflows/channel.yml/dispatches`, {
      method: 'POST', headers: { ...ghHeaders(gh), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: 'main', inputs: { cmd: 'edit', arg: idsPart } }),
    });
    if (r.status !== 204) { await env.STORE.delete(lock); return json({ method: 'answerCallbackQuery', callback_query_id: q.id, text: `Не получилось (GitHub ${r.status})`, show_alert: true }, 200); }
    await tg(env, 'editMessageReplyMarkup', { chat_id: chat, message_id: mid, reply_markup: kb([[{ text: '⏳ Меняю пост в канале…', callback_data: 'x' }]]) });
    await waitMark(env, chat);
    return json({ method: 'answerCallbackQuery', callback_query_id: q.id, text: 'Меняю, около минуты' }, 200);
  }
  if (action === 'later') {
    await env.STORE.put('tgpost:awaittime', post, { expirationTtl: 60 * 60 * 24 });
    await tg(env, 'sendMessage', { chat_id: chat, reply_to_message_id: mid, text: '🕒 Когда опубликовать? Выберите кнопку или напишите время (Ташкент), например: «19:30», «завтра 10:00», «25.11 18:00».', reply_markup: kb(timeOptions(post)) });
    return json({ method: 'answerCallbackQuery', callback_query_id: q.id }, 200);
  }
  if (action === 'odate' || action === 'cal' || action === 'cd') { // «📅 Другая дата»: календарь → время (то же сообщение); текст/голос тоже работают
    await env.STORE.put('tgpost:awaittime', post, { expirationTtl: 60 * 60 * 24 });
    await env.STORE.delete('tgpost:awaitday');
    const v = action === 'cd' ? await dayView(env, post, idsPart) : await calView(env, post, action === 'cal' ? idsPart : '');
    await tg(env, 'editMessageText', { chat_id: chat, message_id: mid, text: v.text, reply_markup: kb(v.kb) });
    return json({ method: 'answerCallbackQuery', callback_query_id: q.id }, 200);
  }
  if (action === 'ct') { // «✏️ Своё время» для выбранного дня
    await env.STORE.put('tgpost:awaittime', post, { expirationTtl: 60 * 60 * 24 });
    await env.STORE.put('tgpost:awaitday', idsPart, { expirationTtl: 60 * 60 * 24 });
    const d = idsPart;
    await tg(env, 'editMessageText', { chat_id: chat, message_id: mid, text: `✏️ Напишите время для ${d.slice(6, 8)}.${d.slice(4, 6)} (Ташкент), например: 14:30`, reply_markup: kb([[{ text: '⬅️ Назад к календарю', callback_data: `cal:${d.slice(0, 6)}:${post}`.slice(0, 64) }]]) });
    return json({ method: 'answerCallbackQuery', callback_query_id: q.id }, 200);
  }
  if (action === 'at' || action === 'atf') {
    const r = await scheduleAt(env, chat, post, Number(idsPart), action === 'atf');
    if (r.busy) { await tg(env, 'editMessageText', { chat_id: chat, message_id: mid, text: r.text, reply_markup: kb(r.kb) }); return json({ method: 'answerCallbackQuery', callback_query_id: q.id }, 200); }
    if (r.ok) await tg(env, 'editMessageText', { chat_id: chat, message_id: mid, text: r.text });
    return json({ method: 'answerCallbackQuery', callback_query_id: q.id, text: r.ok ? 'Запланировано ✅' : r.text, show_alert: !r.ok }, 200);
  }
  if (action !== 'pub') return json({ method: 'answerCallbackQuery', callback_query_id: q.id }, 200);

  const lock = `pub:${chat}:${mid}`;
  if (env.STORE && await env.STORE.get(lock)) return json({ method: 'answerCallbackQuery', callback_query_id: q.id, text: 'Уже опубликовано' }, 200);
  if (env.STORE) await env.STORE.put(lock, '1', { expirationTtl: 60 * 60 * 24 * 30 });

  // убираем кнопки с превью, чтобы они не скопировались, и копируем пост в канал
  await tg(env, 'editMessageReplyMarkup', { chat_id: chat, message_id: mid, reply_markup: kb([[{ text: '⏳ Публикую…', callback_data: 'x' }]]) });
  await tg(env, 'editMessageReplyMarkup', { chat_id: chat, message_id: mid, reply_markup: kb([]) });
  const channel = env.TGPOST_CHANNEL || '@psshopgo';
  // новый формат: pub:<id1,id2>:<пост> — id сообщений поста; старый: pub[:<photoId>] — пост = сообщение с кнопками
  const listed = String(idsPart || '').split(',').map(Number).filter(Boolean);
  const ids = post ? listed : (listed.length ? [...listed, mid] : [mid]);
  let last;
  for (const id of ids) {
    last = await tg(env, 'copyMessage', { chat_id: channel, from_chat_id: chat, message_id: id });
    if (!last.ok) break;
  }
  if (!last?.ok) {
    if (env.STORE) await env.STORE.delete(lock);
    await tg(env, 'editMessageReplyMarkup', { chat_id: chat, message_id: mid, reply_markup: kb([[{ text: '✅ Опубликовать', callback_data: q.data }], [{ text: '❌ Отмена', callback_data: `no::${post || ''}` }]]) });
    return json({ method: 'answerCallbackQuery', callback_query_id: q.id, text: `Ошибка: ${last?.description || 'не удалось'}`, show_alert: true }, 200);
  }
  const link = `https://t.me/${channel.replace('@', '')}/${last.result.message_id}`;
  if (env.STORE) await env.STORE.delete('tgpost:pending');
  await setStatus(env, post, { status: 'published', link, by: 'bot' });
  if (env.STORE && post && (await env.STORE.get('tgpost:await')) === post) await env.STORE.delete('tgpost:await');
  await tg(env, 'editMessageReplyMarkup', { chat_id: chat, message_id: mid, reply_markup: kb([[{ text: '✅ Опубликовано — открыть', url: link }]]) });
  return json({ method: 'answerCallbackQuery', callback_query_id: q.id, text: 'Опубликовано в канале ✅' }, 200);
}

// «✅ Опубликовать»: запускает публикацию от аккаунта владельца (закрытый репозиторий, премиум-эмодзи сохраняются).
const AUTOPOST_REPO = 'naildominant/ps-shop-autopost';
function ghHeaders(token) {
  return { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'psshop-worker', 'X-GitHub-Api-Version': '2022-11-28' };
}
async function publishAsOwner(env, q, chat, mid, post) {
  const answer = (text, alert) => json({ method: 'answerCallbackQuery', callback_query_id: q.id, text, show_alert: !!alert }, 200);
  const gh = env.STORE ? await env.STORE.get('tgpost:gh') : '';
  if (!gh || !/^[\w.-]{1,80}$/.test(post || '')) return answer('Публикация не настроена', true);
  const lock = `go:${post}`;
  if (await env.STORE.get(lock)) return answer('Уже публикуется');
  await env.STORE.put(lock, '1', { expirationTtl: 60 * 10 });
  await tg(env, 'editMessageReplyMarkup', { chat_id: chat, message_id: mid, reply_markup: kb([[{ text: '⏳ Публикую от вашего аккаунта…', callback_data: 'x' }]]) });
  const r = await fetch(`https://api.github.com/repos/${AUTOPOST_REPO}/actions/workflows/post.yml/dispatches`, {
    method: 'POST', headers: { ...ghHeaders(gh), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: 'main', inputs: { post, target: 'psshopgo' } }),
  });
  if (r.status !== 204) {
    await env.STORE.delete(lock);
    await tg(env, 'editMessageReplyMarkup', { chat_id: chat, message_id: mid, reply_markup: ctrlKb(post) });
    return answer(`Не получилось запустить публикацию (GitHub ${r.status})`, true);
  }
  // pending остаётся: когда пост появится в канале, обработчик channel_post сменит кнопки на «✅ Пост вышел»
  await setStatus(env, post, { status: 'publishing' });
  return answer('Публикую, через ~30 секунд пост будет в канале');
}

// ── Ассистент в боте: меню и задачи агенту (закрытый репозиторий, workflow agent.yml) ──
const BTN_NEW_GAME = '🆕 Игра от поставщика', BTN_NEW_POST = '✍️ Новый пост', BTN_PRICES = '💰 Цены', BTN_CANCEL = '⛔️ Отмена', BTN_CANCEL_OLD = '🛑 Отменить всё', BTN_CANCEL_OLD2 = '🛑 Отмена', BTN_FIND = '🔎 Найти игру', BTN_NEWS = '📰 Новость', BTN_GENRE = '🎯 Подбор по жанру';
const MENU = { keyboard: [[{ text: BTN_FIND }], [{ text: BTN_GENRE }], [{ text: BTN_NEW_GAME }], [{ text: BTN_NEWS }], [{ text: BTN_CANCEL }]], resize_keyboard: true, is_persistent: true }; // «Новый пост» и «Цены» убраны (владелец 22.11)

// ── «🔎 Найти игру»: владелец пишет названия → бот пересылает посты из канала (для клиента).
// Нет в канале → проверка у поставщика: нет → «нет в наличии»; есть → агент готовит объявление (обычное превью).
// Индексы в KV: tgpost:chindex [{id,t}] (посты канала с ценой), tgpost:supindex [название] (каталог поставщика).
const ROMAN = { i: '1', ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8', ix: '9', x: '10' };
const STOP = new Set(['ea', 'sports', 'the', 'marvels', 'marvel', 'tom', 'clancys', 'sid', 'meiers', 'edition', 'standard', 'game', 'of', 'and', 'игра', 'издание']);
const gnorm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC').toLowerCase().replace(/ё/g, 'е').replace(/[’'`ʼ]/g, '').replace(/grand theft auto/g, 'gta').replace(/\bfifa\b/g, 'fc').replace(/[^a-z0-9а-я]+/g, ' ').trim()
  .split(' ').map((w) => ROMAN[w] || w).filter((w) => w && !STOP.has(w)).join(' ');
function bigrams(s) { const a = []; for (let i = 0; i < s.length - 1; i++) a.push(s.slice(i, i + 2)); return a; }
function dice(a, b) {
  const x = bigrams(a), y = bigrams(b);
  if (!x.length || !y.length) return 0;
  const m = new Map(); for (const g of y) m.set(g, (m.get(g) || 0) + 1);
  let n = 0; for (const g of x) if (m.get(g)) { n++; m.set(g, m.get(g) - 1); }
  return (2 * n) / (x.length + y.length);
}
function matchTitles(q, titles, opt = {}) {
  const qn = gnorm(q), qs = qn.replace(/ /g, '');
  if (!qn) return [];
  const words = qn.split(' ');
  const hits = [];
  titles.forEach((t, i) => {
    const tn = gnorm(t), tw = tn.split(' ');
    if ((qs.length >= 4 && tn.replace(/ /g, '').includes(qs)) || words.every((w) => tw.some((x) => x === w || (w.length >= 3 && x.startsWith(w))))) hits.push(i);
  });
  if (hits.length) return hits;
  titles.forEach((t, i) => { // название поста целиком внутри запроса: «Witcher 3» для «The Witcher 3 Wild Hunt»
    const tw = gnorm(t).split(' ').filter(Boolean);
    if (tw.length && tw.join('').length >= 4 && tw.length > words.length / 2 && tw.every((w) => words.includes(w)) && (!/\d/.test(qn) || tw.some((w) => /\d/.test(w)))) hits.push(i);
  });
  if (hits.length || opt.strict) return hits;
  const scored = titles.map((t, i) => [dice(qs, gnorm(t).replace(/ /g, '')), i]).filter(([d]) => d >= 0.62).sort((a, b) => b[0] - a[0]);
  return scored.slice(0, 3).map(([, i]) => i);
}
// Название у поставщика — это сама игра, а не слово внутри другого названия (решение Боса 22.11: «League of Legends» ≠ «Song of Nunu: A League of Legends Story»).
// Одно название должно начинаться с другого (по целым словам): «The Witcher 3» ↔ «The Witcher 3: Wild Hunt», «FC 25» ↔ «EA Sports FC 25».
function sameGame(supTitle, names) {
  const a = gnorm(supTitle);
  return names.filter(Boolean).some((n) => { const b = gnorm(n); return b && (a === b || a.startsWith(b + ' ') || b.startsWith(a + ' ')); });
}
// ── Понимание запроса: нейросеть получает запрос владельца и каталог ОБЪЯВЛЕНИЙ ИГР канала и выбирает нужные.
const LLM = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
async function llmJson(env, prompt, maxTokens = 900) {
  const r = await env.AI.run(LLM, { max_tokens: maxTokens, temperature: 0, messages: [{ role: 'user', content: prompt }] });
  const out = String(r?.choices?.[0]?.message?.content ?? r?.response ?? '');
  return JSON.parse(out.slice(out.indexOf('['), out.lastIndexOf(']') + 1));
}
const HINTS = 'Русские и разговорные названия: Ведьмак = The Witcher, Человек-паук = Spider-Man, Майлз Моралес = Spider-Man Miles Morales, ГТА = GTA (Grand Theft Auto), РДР = Red Dead Redemption, Одни из нас = The Last of Us, Бог войны = God of War, Призрак Цусимы = Ghost of Tsushima, Фифа/ФК = EA Sports FC / FIFA, Эф один/Формула 1 = F1 (гонки, НЕ FC), Призрак Ётэй/Ёотэй/Йотей = Ghost of Yōtei (НЕ Tsushima), Стеллар блейд = Stellar Blade, Год оф вар/Годофвар = God of War, Рагнарёк = Ragnarök, Элден ринг = Elden Ring, Анчартед = Uncharted, Детройт = Detroit: Become Human, Гран туризмо = Gran Turismo, Форза = Forza Horizon, Ратчет = Ratchet & Clank, Колда/Кол оф дьюти = Call of Duty, Мортал комбат = Mortal Kombat, Ассасин = Assassin\'s Creed, Хогвартс = Hogwarts Legacy, Киберпанк = Cyberpunk 2077, Резидент = Resident Evil, Ласт оф ас = The Last of Us. Числа словами = цифры («пять» = 5, «шесть» = 6, «два» = 2). Текст мог быть распознан из голоса с ошибками — угадывай по звучанию.';

// Каталог: одно объявление на название (самое свежее).
function uniqueCatalog(idx) {
  const best = new Map();
  for (const x of idx) { const k = gnorm(x.t); if (k && (!best.has(k) || x.id > best.get(k).id)) best.set(k, x); }
  return [...best.values()];
}

// «гта шесть», «фифа двадцать шесть» → число, если нейросеть его потеряла
const NUMW = { 'один': 1, 'одна': 1, 'первая': 1, 'два': 2, 'две': 2, 'вторая': 2, 'три': 3, 'третья': 3, 'четыре': 4, 'четвертая': 4, 'пять': 5, 'пятая': 5, 'шесть': 6, 'шестая': 6, 'семь': 7, 'восемь': 8, 'девять': 9, 'десять': 10, 'одиннадцать': 11, 'двенадцать': 12, 'тринадцать': 13, 'четырнадцать': 14, 'пятнадцать': 15, 'двадцать': 20, 'тридцать': 30 };
function spokenNumber(said) {
  const d = String(said).match(/\b\d{1,4}\b/); if (d) return d[0];
  const w = String(said).toLowerCase().replace(/ё/g, 'е').split(/[^а-я]+/);
  let n = 0;
  for (const x of w) if (NUMW[x]) n = n >= 20 && NUMW[x] < 10 ? n + NUMW[x] : NUMW[x];
  return n ? String(n) : '';
}
// Числа в названии (часть игры): «Resident Evil 4» не должен находить «Resident Evil 2».
function partOk(official, title) {
  const want = (gnorm(official).match(/\b\d{1,2}\b/g) || []);
  if (!want.length) return true;
  const have = gnorm(title).match(/\b\d{1,4}\b/g) || [];
  return want.every((n) => have.includes(n));
}

// Лишнее убираем: конкретная игра → только её объявление (точное название, иначе самое короткое);
// серия → по одному объявлению на каждую часть, сборники («+», bundle, trilogy) — только если части нет отдельно.
const EDITION = new Set(['ultimate', 'deluxe', 'gold', 'complete', 'remastered', 'remaster', 'definitive', 'goty', 'premium', 'digital', 'ps4', 'ps5', 'version', 'director', 'cut', 'directors', 'enhanced', 'special', 'collectors', 'launch', 'cross', 'gen', 'bundle', 'vr', 'vr2', 'remake']);
const extraWords = (q, t) => gnorm(t).split(' ').filter((w) => w && !gnorm(q).split(' ').includes(w)).length;
const isBundle = (t) => /\+|bundle|trilogy|collection|сборник|части сразу|игры сразу/i.test(t);
function pickMain(it, posts) {
  if (posts.length <= 1) return posts;
  if (!it.series && /\d/.test(gnorm(it.official))) {
    const exact = posts.filter((p) => gnorm(p.t) === gnorm(it.official) || (it.ru && gnorm(p.t) === gnorm(it.ru)));
    if (exact.length) return exact.slice(0, 1);
    const plain = posts.filter((p) => !isBundle(p.t));
    const pool = plain.length ? plain : posts;
    const min = Math.min(...pool.map((p) => extraWords(it.official, p.t)));
    return pool.filter((p) => extraWords(it.official, p.t) === min).slice(0, 1);
  }
  // серия: разные игры оставляем, издания одной игры («MK 11» и «MK 11 Ultimate») схлопываем в одно
  const words = (t) => gnorm(t).split(' ').filter(Boolean);
  const nums = (t) => (gnorm(t).match(/\b\d{1,4}\b/g) || []).join(' ');
  const sorted = [...posts].sort((a, b) => isBundle(a.t) - isBundle(b.t) || words(a.t).length - words(b.t).length || b.id - a.id);
  const out = [];
  for (const p of sorted) {
    if (out.some((q) => nums(q.t) === nums(p.t) && words(q.t).every((w) => words(p.t).includes(w)) && words(p.t).every((w) => words(q.t).includes(w) || EDITION.has(w)))) continue;
    if (isBundle(p.t) && out.length) continue;
    out.push(p);
  }
  return out;
}

async function resolveGames(env, text) {
  const idx = uniqueCatalog(JSON.parse(await env.STORE.get('tgpost:chindex') || '[]'));
  const sup = JSON.parse(await env.STORE.get('tgpost:supindex') || '[]');
  const byId = new Map(idx.map((x) => [x.id, x]));
  let items = null;
  if (env.AI) {
    try { // шаг 1: какие игры просит владелец (каждая отдельно, официальное английское название)
      const arr = await llmJson(env, `Владелец магазина игр PlayStation назвал игры (текст мог быть распознан из голоса с ошибками).
${HINTS}
Текст: «${text.slice(0, 600)}»
Перечисли КАЖДУЮ названную игру по порядку, ни одной не пропусти и не добавляй лишних. "official" — ВСЕГДА официальное английское название латиницей; номер части — цифрой, только если владелец его назвал; год и издание не выдумывай. "ru" — как игру называют по-русски (например «Ведьмак 3: Дикая Охота»), если есть. "series": true, если назвал серию без номера части.
Ответ — только JSON-массив: [{"said": "как сказал", "official": "...", "ru": "...", "series": false}]`, 600);
      if (Array.isArray(arr) && arr.length) items = arr.slice(0, 15).map((x) => ({ asked: String(x.said || x.official || ''), official: String(x.official || x.said || ''), ru: String(x.ru || ''), series: !!x.series, posts: [] }));
    } catch { items = null; }
  }
  if (!items) items = text.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean).slice(0, 15).map((q) => ({ asked: q, official: q, series: !/\d/.test(q), posts: [] }));
  for (const it of items) {
    const num = spokenNumber(it.asked);
    if (num && !/\d/.test(gnorm(it.official))) { it.official += ' ' + num; it.series = false; }
    // точное сравнение названий: английское → русское → как сказал (первое, что нашлось)
    for (const q of [it.official, it.ru, it.asked]) {
      if (it.posts.length || !q) continue;
      it.posts = matchTitles(q, idx.map((x) => x.t), { strict: true }).map((i) => idx[i].id);
    }
    if (!it.series) it.posts = it.posts.filter((id) => partOk(it.official, byId.get(id).t)); // без номера — как серия (pickMain)
    it.posts = pickMain(it, it.posts.map((id) => byId.get(id))).map((x) => x.id);
  }
  // нет в канале → каталог поставщика: кандидаты по буквам, выбор — нейросетью
  for (const it of items) {
    if (it.posts.length) continue;
    const cand = new Set();
    for (const q of [it.official, it.asked, it.official.replace(/\b(19|20)\d{2}\b/g, '')]) for (const i of matchTitles(q, sup)) cand.add(sup[i]);
    const qs = gnorm(it.official).replace(/ /g, '');
    sup.map((t) => [dice(qs, gnorm(t).replace(/ /g, '')), t]).sort((a, b) => b[0] - a[0]).slice(0, 15).forEach(([, t]) => cand.add(t));
    const list = [...cand].slice(0, 30);
    it.supplier = null;
    if (env.AI && list.length) {
      try {
        const pick = await llmJson(env, `Владелец магазина ищет игру «${it.asked}» (официально: «${it.official}»). ${HINTS}
Вот названия из каталога поставщика:
${list.map((t, i) => `${i + 1}. ${t}`).join('\n')}
Какое из них — ИМЕННО эта игра (та же часть)? Если владелец не назвал часть — самая новая часть. Если ни одно не подходит — 0.
Ответ — только JSON-массив из одного числа, например [3] или [0].`, 20);
        const n = Number(pick?.[0]);
        if (n > 0 && n <= list.length && sameGame(list[n - 1], [it.official, it.ru, it.asked])) it.supplier = list[n - 1];
      } catch { it.supplier = null; }
    } else if (list.length && matchTitles(it.official, sup).length && sameGame(sup[matchTitles(it.official, sup)[0]], [it.official, it.asked])) it.supplier = sup[matchTitles(it.official, sup)[0]];
  }
  return items.map((it) => ({ ...it, posts: it.posts.map((id) => byId.get(id)) }));
}

// Без кнопки: «скинь/отправь мне GTA 6, FIFA» — это поиск готовых объявлений, а не новый пост.
async function isFindRequest(env, text) {
  if (!env.AI || text.length > 400) return false;
  if (/(сделай|создай|напиши|подготовь|нужен|нужна)\s+(пост|новост|объявлен|картинк|истори)/i.test(text)) return false;
  try {
    const r = await env.AI.run(LLM, { max_tokens: 5, temperature: 0, messages: [{ role: 'user', content: `Владелец магазина игр пишет боту. Бот умеет: FIND — прислать УЖЕ ГОТОВЫЕ объявления игр из канала (владелец просит «отправь/скинь/пришли/покажи/есть ли» игры или просто перечисляет названия игр); POST — сделать НОВЫЙ пост/новость/картинку/правку для канала.
Сообщение: «${text}»
Ответь одним словом: FIND или POST.` }] });
    return /FIND/i.test(String(r?.choices?.[0]?.message?.content ?? r?.response ?? ''));
  } catch { return false; }
}

// Выходила ли игра на PlayStation (решение владельца 22.11, через Боса): Wikidata, свойство «платформа» (P400).
// 'ps' — есть PS4/PS5; 'pc_only' — платформы известны и это только ПК; 'other' — есть Xbox/Switch, но нет PlayStation;
// 'unknown' — не нашёл точно или не уверен (тогда отвечаем как раньше «нет в наличии»).
const WD_PS45 = new Set(['Q5014725', 'Q63184502']);
const WD_PS_ANY = new Set(['Q5014725', 'Q63184502', 'Q10683', 'Q10680', 'Q10677', 'Q188808', 'Q170323']);
const WD_PC = new Set(['Q1406', 'Q14116', 'Q388', 'Q16338', 'Q47604', 'Q11368', 'Q1052', 'Q1047', 'Q3251801']);
async function platformCheck(env, names, dbg) {
  const dbgRef = dbg;
  const wd = async (params) => {
    const url = 'https://www.wikidata.org/w/api.php?format=json&' + new URLSearchParams(params), hd = { headers: { 'User-Agent': 'psshop-bot/1.0 (Telegram bot)' } };
    let r = await fetch(url, hd);
    if (!r.ok) { await new Promise((ok) => setTimeout(ok, 800)); r = await fetch(url, hd); }
    if (!r.ok && dbgRef) dbgRef.push({ http: r.status });
    return r.ok ? r.json() : null;
  };
  try {
    for (const name of names.filter(Boolean)) {
      const want = gnorm(name);
      if (!want) continue;
      const found = await wd({ action: 'wbsearchentities', search: name, language: 'en', type: 'item', limit: '7' });
      const ids = (found?.search || []).map((x) => x.id);
      if (dbg) dbg.push({ name, ids, err: found?.error?.info });
      if (!ids.length) continue;
      const ents = (await wd({ action: 'wbgetentities', ids: ids.join('|'), props: 'claims|labels|aliases', languages: 'mul|en|ru' }))?.entities || {};
      for (const id of ids) {
        const e = ents[id];
        if (!e) continue;
        const vals = (p) => (e.claims?.[p] || []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean);
        if (!vals('P31').some((v) => v === 'Q7889')) continue; // только «видеоигра»
        const labels = [...Object.values(e.labels || {}).map((l) => l.value), ...Object.values(e.aliases || {}).flat().map((a) => a.value)];
        if (dbg) dbg.push({ id, labels: labels.slice(0, 4), plat: vals('P400') });
        if (!labels.some((l) => gnorm(l) === want)) continue; // название должно совпасть точно
        const plat = vals('P400');
        if (!plat.length) return 'unknown';
        if (plat.some((p) => WD_PS45.has(p))) return 'ps';
        if (plat.some((p) => WD_PS_ANY.has(p))) return 'unknown'; // только старые PlayStation — не говорим «только ПК»
        if (plat.every((p) => WD_PC.has(p))) return 'pc_only';
        return 'other';
      }
    }
  } catch { /* сеть/ответ — не уверены */ }
  return 'unknown';
}

// Нейросеть заметно поменяла латинское название («Dead Reset» → Red Dead Redemption) — сначала спросить владельца (Бос 22.11).
function doubtful(asked, official) {
  const a = gnorm(asked), o = gnorm(official);
  if (!a || !o || a === o || !/^[\x20-\x7E]+$/.test(asked)) return false; // русские/разговорные названия — переводит нейросеть, не спрашиваем
  const as = a.replace(/ /g, ''), os = o.replace(/ /g, '');
  if (os.includes(as) || as.includes(os)) return false;
  const initials = o.split(' ').map((w) => (/^\d+$/.test(w) ? w : w[0])).join('');
  const raw = String(official).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean).map((w) => (/^\d+$/.test(w) ? w : w[0])).join('');
  if (as === initials || as === raw) return false; // аббревиатура: rdr2, gow, lol
  return dice(as, os) < 0.5;
}
async function findGames(env, chat, text, opts = {}) {
  if (!text.trim()) return say(env, chat, '🔎 Напишите или скажите названия игр.');
  await remember(env, { task: `найти игры для клиента: ${text}`, mode: 'find' });
  const ch = env.TGPOST_CHANNEL || '@psshopgo';
  let items = await resolveGames(env, text);
  if (!items.length) return say(env, chat, 'Не понял, какие игры нужны 🤔 Скажите ещё раз.');
  if (!opts.sure) {
    const ask = items.filter((it) => doubtful(it.asked, it.official));
    for (const it of ask) {
      const id = String(Date.now()).slice(-9) + Math.floor(Math.random() * 90 + 10);
      await env.STORE.put(`tgpost:dym:${id}`, JSON.stringify({ official: it.official, asked: it.asked }), { expirationTtl: 60 * 60 * 24 });
      await tg(env, 'sendMessage', { chat_id: chat, text: `🤔 «${it.asked}» — вы имели в виду «${it.official}»?`,
        reply_markup: kb([[{ text: '✅ Да', callback_data: `dym:${id}:` }, { text: '❌ Нет', callback_data: `dyn:${id}:` }]]) });
    }
    items = items.filter((it) => !ask.includes(it));
    if (!items.length) return;
  }
  await tg(env, 'sendMessage', { chat_id: chat, text: `🔎 Понял: ${items.map((x) => x.official || x.asked).join(', ')}` });
  const none = [], make = [], sched = [];
  let sent = 0;
  for (const it of items) {
    if (it.posts.length) {
      for (const x of it.posts.sort((a, b) => b.id - a.id).slice(0, 6)) {
        if (x.s) { sched.push(`${x.t} — ${fmtTashkent(Date.parse(x.s))}`); continue; } // отложенный пост: переслать нельзя, сообщаем дату
        const r = await tg(env, 'forwardMessage', { chat_id: chat, from_chat_id: ch, message_id: x.id });
        if (r.ok) sent++;
      }
    } else if (it.supplier) make.push(it); else none.push(it);
  }
  const notes = [], pcOnly = [], absent = [];
  if (sched.length) notes.push(`🕒 Уже стоит в отложенных:\n${sched.join('\n')}`);
  for (const it of none) ((await platformCheck(env, [it.official, it.asked])) === 'pc_only' ? pcOnly : absent).push(it.official || it.asked);
  if (pcOnly.length) notes.push(`❌ Данная игра на PlayStation не выходила, она вышла только на ПК: ${pcOnly.join(', ')}`);
  if (absent.length) notes.push(`❌ Данной игры нет в наличии: ${absent.join(', ')}`);
  if (make.length) notes.push(`🛠 Нет в канале, но есть у поставщика — готовлю объявление: ${make.map((x) => x.supplier).join(', ')}. Пришлю, как будет готово.`);
  if (notes.length) await say(env, chat, notes.join('\n\n'));
  await remember(env, { result: `переслал объявлений: ${sent}${absent.length ? '; нет в наличии: ' + absent.join(', ') : ''}${pcOnly.length ? '; только ПК: ' + pcOnly.join(', ') : ''}${make.length ? '; готовлю: ' + make.map((x) => x.supplier).join(', ') : ''}` });
  if (make.length) {
    const task = 'Владелец ищет для клиента игры, которых нет в канале, но они есть у поставщика. Сделай объявление по шаблону для КАЖДОЙ игры (отдельная папка и отдельная строка в out/preview.txt). Название у поставщика указано точно.\n'
      + make.map((x) => `- ${x.supplier} (владелец сказал: «${x.asked}»)`).join('\n');
    const err = await dispatchAgent(env, { mode: 'new_game', task });
    if (err) return say(env, chat, `⚠️ Не получилось запустить подготовку объявления: ${err}`);
    await waitMark(env, chat);
  }
}
// ── «🎯 Подбор по жанру» (владелец 23.11): жанр → топ-5 игр этого жанра + похожие. Сначала то, что есть в канале (с ценой),
// потом известные игры, которых в канале нет (помечаем «есть у поставщика» / «нет в наличии»). Цены только из постов канала.
function priceOf(t) {
  const m = [...String(t || '').matchAll(/(PS ?[45])\D{0,12}?(\d{1,3}(?:[ .\u00a0]\d{3})+|\d{5,7})/g)].map((x) => [x[1].replace(' ', ''), x[2].replace(/\D/g, '').replace(/\B(?=(\d{3})+$)/g, ' ')]);
  if (!m.length) return '';
  const u = [...new Map(m).entries()];
  return (new Set(u.map((x) => x[1])).size === 1 ? `${u[0][1]}` : u.map(([k, v]) => `${k} ${v}`).join(' / ')) + ' сум';
}
async function genreSelect(env, genre) {
  const idx = uniqueCatalog(JSON.parse(await env.STORE.get('tgpost:chindex') || '[]'));
  const sup = JSON.parse(await env.STORE.get('tgpost:supindex') || '[]');
  const arr = await llmJson(env, `Ты консультант магазина игр PlayStation. Владелец просит подобрать игры по жанру (текст мог быть распознан из голоса).
Запрос: «${genre.slice(0, 200)}»
Наш каталог (номер: название):
${idx.map((x, i) => `${i}: ${x.t}`).join('\n')}
Задача: "top" — 5 лучших и самых популярных игр ИМЕННО этого жанра; "similar" — 3–5 игр соседних/похожих жанров (например для «шутер» — тактические шутеры, королевская битва). Сначала бери игры из нашего каталога (поле "n" = номер из списка); если подходящих в каталоге мало — добавь известные игры для PS4/PS5 без номера ("n": null, "title" — официальное английское название). Бери игру, только если её основной жанр ТОЧНО подходит (файтинг — не шутер, спорт — не гонки, экшен — не хоррор); лучше меньше, чем неподходящие. Похожие — близкий поджанр того же типа игр (гонки → ралли, внедорожники, аркадные гонки, но НЕ спорт; хоррор → выживание в ужасах, мрачные триллеры, но НЕ обычный экшен; шутер → тактические, королевская битва, шутеры от 3-го лица), а не любые. Игры вне каталога — только реальные отдельные игры (не серии и не «Lego Games»). Внутри списка — самые известные и лучшие первыми. Не выдумывай игры и не бери игры, которых нет на PlayStation. "g" — точный жанр игры по-русски, 1–3 слова, с маленькой буквы.
Ответ — только JSON-массив: [{"list": "top"|"similar", "n": 12, "title": "...", "g": "..."}]`, 900);
  const out = [], seen = new Set();
  for (const x of Array.isArray(arr) ? arr : []) {
    const c = Number.isInteger(x?.n) && idx[x.n] ? idx[x.n] : null;
    let t = c ? c.t : String(x?.title || '').trim();
    if (!t) continue;
    let id = c ? c.id : 0, p = c?.p || '', s = c?.s || '';
    if (!c) { const h = matchTitles(t, idx.map((y) => y.t), { strict: true }); if (h.length) ({ id, t, p = '', s = '' } = idx[h[0]]); } // нейросеть не дала номер, а игра в канале есть
    const k = gnorm(t);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push({ list: x.list === 'similar' ? 'similar' : 'top', t: t.slice(0, 100), g: String(x.g || '').slice(0, 30), id, p, s, sup: !id && sup.some((y) => sameGame(y, [t])) });
  }
  const top = out.filter((x) => x.list === 'top').sort((a, b) => !!b.id - !!a.id).slice(0, 5);
  return [...top, ...out.filter((x) => x.list === 'similar').sort((a, b) => !!b.id - !!a.id).slice(0, 5)];
}
async function genrePick(env, chat, genre) {
  if (!genre.trim()) return say(env, chat, '🎯 Напишите или скажите жанр.');
  if (!env.AI) return say(env, chat, '⚠️ Подбор сейчас недоступен.');
  await remember(env, { task: `подбор по жанру: ${genre}`, mode: 'genre' });
  let list;
  try { list = await genreSelect(env, genre); } catch (e) { return say(env, chat, '⚠️ Не получилось подобрать, попробуйте ещё раз.'); }
  if (!list.length) return say(env, chat, 'Не понял жанр 🤔 Скажите по-другому, например «гонки» или «хоррор».');
  const key = String(Date.now()).slice(-9) + Math.floor(Math.random() * 90 + 10);
  await env.STORE.put(`tgpost:gp:${key}`, JSON.stringify(list.map(({ t, id }) => ({ t, id }))), { expirationTtl: 60 * 60 * 24 * 3 });
  const line = (x, i) => `${i + 1}. ${x.t}${x.g ? ` (${x.g})` : ''} — ${x.id ? (x.s ? `🕒 в отложенных на ${fmtTashkent(Date.parse(x.s))}` : `✅ в канале${x.p ? ', ' + x.p : ''}`) : x.sup ? '🛠 нет в канале, есть у поставщика' : '❌ нет в наличии'}`;
  const top = list.filter((x) => x.list === 'top'), sim = list.filter((x) => x.list === 'similar');
  const text = [`🎯 ${genre}: топ-5`, ...top.map(line), ...(sim.length ? ['', '🔁 Похожие варианты', ...sim.map((x, i) => line(x, top.length + i))] : []),
    '', 'Нажмите игру: ✅ — пришлю пост из канала, 🛠 — сделаю объявление.'].join('\n');
  const btns = list.map((x, i) => [x, i]).filter(([x]) => (x.id && !x.s) || x.sup).map(([x, i]) => [{ text: `${x.id ? '📨' : '🛠'} ${i + 1}. ${x.t}`.slice(0, 60), callback_data: `gp:${key}:${i}` }]);
  await tg(env, 'sendMessage', { chat_id: chat, text, link_preview_options: { is_disabled: true }, ...(btns.length ? { reply_markup: kb(btns) } : {}) });
  await remember(env, { result: `подбор «${genre}»: ${list.map((x) => x.t).join(', ')}` });
}
// Проверка подбора без Telegram: GET /tgpost/findtest?key=…&genre=шутер
// Проверка поиска без отправки в Telegram: GET /tgpost/findtest?key=<KV tgpost:testkey>&q=...
async function handleFindTest(req, env) {
  const u = new URL(req.url);
  const key = await env.STORE.get('tgpost:testkey');
  if (!key || u.searchParams.get('key') !== key) return json({ ok: false }, 403);
  if (u.searchParams.get('intent')) return json({ find: await isFindRequest(env, u.searchParams.get('q') || '') }, 200);
  if (u.searchParams.get('genre')) { try { return json({ list: await genreSelect(env, u.searchParams.get('genre')) }, 200); } catch (e) { return json({ error: String(e?.stack || e) }, 200); } }
  const items = await resolveGames(env, u.searchParams.get('q') || '');
  const out = [];
  for (const x of items) out.push({ asked: x.asked, official: x.official, ask: doubtful(x.asked, x.official) || undefined, posts: x.posts.map((p) => `${p.id}: ${p.t}${p.s ? ' [отложен ' + p.s + ']' : ''}`), supplier: x.supplier ?? null,
    platform: !x.posts.length && !x.supplier ? await platformCheck(env, [x.official, x.asked], u.searchParams.get('dbg') ? (x.dbg = []) : null) : undefined, dbg: x.dbg });
  return json(out, 200);
}

async function handleAgentIndex(req, env) {
  if (!(await agentAuth(req, env))) return json({ ok: false }, 403);
  const b = await req.json().catch(() => ({}));
  if (Array.isArray(b.channel) && b.channel.length) await env.STORE.put('tgpost:chindex', JSON.stringify(b.channel.map((x) => ({ id: Number(x.id), t: String(x.t || '').slice(0, 150), ...(x.s ? { s: String(x.s).slice(0, 40) } : {}), ...(x.p ? { p: String(x.p).slice(0, 60) } : {}) })).filter((x) => x.id && x.t)));
  if (Array.isArray(b.sched)) await env.STORE.put('tgpost:schedtimes', JSON.stringify(b.sched.map((x) => ({ ms: Date.parse(x.d), t: String(x.t || '').slice(0, 80) })).filter((x) => x.ms > Date.now())));
  if (Array.isArray(b.supplier) && b.supplier.length) await env.STORE.put('tgpost:supindex', JSON.stringify(b.supplier.map((t) => String(t).slice(0, 150))));
  return json({ ok: true }, 200);
}
const NEWS_RE = /игра дня|выходит|скидк|акци|подписк|black friday|день рождени|таких цен|ps ?plus|распродаж|результат|голосовани|обновлени|релиз|осталось|в наличии|предзаказ/i;
// Объявление игры (а не новость/акция/«игра дня»): есть «ЦЕНА» и цена в сумах; название — первая строка с буквами.
function listingTitle(t) {
  if (!/ЦЕНА/i.test(t) || !/(\d{1,3}[ . ]\d{3}|\d{5,7})\s*(UZS|сум)/i.test(t)) return null;
  const title = t.split('\n').map((l) => l.replace(/[^\p{L}\p{N}_:+&.'’ -]/gu, '').trim().replace(/^-+|-+$/g, '').trim()).find((l) => /\p{L}/u.test(l) && (l.match(/[\p{L}\p{N}]/gu) || []).length >= 2);
  if (!title || /^(ЦЕНА|ИЗДАНИ|РУССК|АНГЛИЙ)/i.test(title)) return null;
  if (NEWS_RE.test(title) || /по результатам|голосовани|акция|только сегодня|успей/i.test(t)) return null;
  return title.slice(0, 150);
}
async function indexChannelPost(env, cp) {
  const title = listingTitle(cp.text || cp.caption || '');
  const idx = JSON.parse(await env.STORE.get('tgpost:chindex') || '[]').filter((x) => x.id !== cp.message_id);
  if (!title) { await env.STORE.put('tgpost:chindex', JSON.stringify(idx)); return; }
  const p = priceOf(cp.text || cp.caption || '');
  idx.unshift({ id: cp.message_id, t: title, ...(p ? { p } : {}) });
  await env.STORE.put('tgpost:chindex', JSON.stringify(idx));
}
const PRICE_TABLE = 'https://claude.ai/artifact/1HecKDQKSoeNU2APs897rk';
const say = (env, chat, text, extra) => tg(env, 'sendMessage', { chat_id: chat, text, reply_markup: MENU, link_preview_options: { is_disabled: true }, ...extra });

// Пока агент работает, в чате висит только любимый эмоджи владельца; с ответом агента он удаляется.
async function waitMark(env, chat) {
  const fav = JSON.parse(await env.STORE.get('tgpost:fav') || 'null') || { text: '⏳' };
  const body = { chat_id: chat, text: fav.text };
  if (fav.id) body.entities = [{ type: 'custom_emoji', offset: 0, length: fav.text.length, custom_emoji_id: fav.id }];
  let r = await tg(env, 'sendMessage', body);
  if (!r.ok && fav.id) r = await tg(env, 'sendMessage', { chat_id: chat, text: fav.text });
  if (!r.ok) return;
  const list = JSON.parse(await env.STORE.get('tgpost:waitmsgs') || '[]');
  list.push([chat, r.result.message_id]);
  await env.STORE.put('tgpost:waitmsgs', JSON.stringify(list.slice(-20)), { expirationTtl: 60 * 60 * 24 * 2 });
}
async function clearWait(env) {
  const list = JSON.parse(await env.STORE.get('tgpost:waitmsgs') || '[]');
  if (!list.length) return;
  await env.STORE.delete('tgpost:waitmsgs');
  for (const [chat, id] of list) await tg(env, 'deleteMessage', { chat_id: chat, message_id: id });
  await sendDone(env, list[list.length - 1][0]);
}
async function sendDone(env, chat) {
  const done = JSON.parse(await env.STORE.get('tgpost:donemsg') || 'null');
  if (!done?.text) return;
  const r = await tg(env, 'sendMessage', { chat_id: chat, text: done.text, entities: done.entities });
  if (!r.ok) await tg(env, 'sendMessage', { chat_id: chat, text: done.text });
}

// Память бота: последние 5 задач владельца и что бот ответил/прислал
async function remember(env, patch) {
  const h = JSON.parse(await env.STORE.get('tgpost:history') || '[]');
  if (patch.task !== undefined) h.push({ at: new Date().toISOString().slice(0, 16), task: String(patch.task).slice(0, 400), mode: patch.mode || '', post: patch.post || '' });
  else if (h.length) { const last = h[h.length - 1]; last.result = [last.result, String(patch.result).slice(0, 400)].filter(Boolean).join(' | '); }
  await env.STORE.put('tgpost:history', JSON.stringify(h.slice(-5)));
}

async function dispatchAgent(env, inputs) {
  const gh = env.STORE ? await env.STORE.get('tgpost:gh') : '';
  if (!gh) return 'нет доступа к GitHub';
  const history = await env.STORE.get('tgpost:history') || '[]';
  await remember(env, { task: inputs.task, mode: inputs.mode, post: inputs.post });
  const clean = Object.fromEntries(Object.entries({ ...inputs, history }).map(([k, v]) => [k, String(v || '').slice(0, 6000)]));
  const r = await fetch(`https://api.github.com/repos/${AUTOPOST_REPO}/actions/workflows/agent.yml/dispatches`, {
    method: 'POST', headers: { ...ghHeaders(gh), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: 'main', inputs: clean }),
  });
  return r.status === 204 ? '' : `GitHub ${r.status}`;
}

function describeMessage(m) {
  let t = m.text || m.caption || '';
  const fo = m.forward_origin;
  if (fo) {
    const from = fo.chat ? `${fo.chat.title || ''}${fo.chat.username ? ' @' + fo.chat.username : ''}` : (fo.sender_user?.first_name || fo.sender_user_name || 'неизвестно');
    const link = fo.chat?.username && fo.message_id ? ` https://t.me/${fo.chat.username}/${fo.message_id}` : '';
    t = `[Переслано из: ${from}${link}]\n${t}`;
  }
  return t;
}

// Голосовое владельца → текст (Workers AI Whisper), дальше как обычное сообщение.
async function transcribe(env, fileId) {
  const f = await tg(env, 'getFile', { file_id: fileId });
  if (!f.ok) throw new Error('не смог скачать голосовое');
  const buf = new Uint8Array(await (await fetch(`https://api.telegram.org/file/bot${await botToken(env)}/${f.result.file_path}`)).arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  const r = await env.AI.run('@cf/openai/whisper-large-v3-turbo', { audio: btoa(bin), language: 'ru' });
  return String(r?.text || '').trim();
}

async function ownerMessage(env, m) {
  const chat = m.chat.id;
  const voice = m.voice || m.audio || m.video_note;
  if (voice && env.AI) {
    let text = '';
    try { text = await transcribe(env, voice.file_id); } catch (e) { return say(env, chat, `⚠️ Не получилось разобрать голосовое: ${e.message}. Попробуйте ещё раз или напишите текстом.`); }
    if (!text) return say(env, chat, '🎤 Не расслышал 🤔 Скажите ещё раз или напишите текстом.');
    if (!(await env.STORE.get('tgpost:find')) && !(await env.STORE.get('tgpost:genre'))) await tg(env, 'sendMessage', { chat_id: chat, reply_to_message_id: m.message_id, text: `🎤 ${text}` });
    return ownerMessage(env, { ...m, voice: undefined, audio: undefined, video_note: undefined, text, caption: undefined, entities: [] });
  }
  const t = (m.text || m.caption || '').trim();
  const ents = (m.entities || m.caption_entities || []).filter((e) => e.type === 'custom_emoji');
  const photo = m.photo?.length ? m.photo[m.photo.length - 1].file_id : (m.document?.mime_type?.startsWith('image/') ? m.document.file_id : '');

  if (t === '/start' || t === '/menu' || t.toLowerCase() === 'меню') return say(env, chat, 'Меню внизу 👇 Можно просто написать задачу своими словами или переслать пост из другого канала.');
  if (t === BTN_CANCEL || t === BTN_CANCEL_OLD || t === BTN_CANCEL_OLD2 || t === '⛔ Отмена' || /^(отмена|стоп|отмени(ть)?( всё| все)?)[.!]*$/i.test(t)) return cancelAll(env, chat);
  if (t === BTN_NEWS) { // «📰 Новость» (владелец 22.11): агент ищет свежую новость PlayStation и присылает превью
    await env.STORE.delete('tgpost:find');
    const err = await dispatchAgent(env, { mode: 'news', task: 'Кнопка «📰 Новость»: найди одну свежую интересную новость PlayStation и сделай пост с картинкой (AGENT.md, режим news).' });
    return err ? say(env, chat, `⚠️ Не получилось запустить: ${err}`) : waitMark(env, chat);
  }
  if (t === BTN_GENRE) {
    await env.STORE.delete('tgpost:find');
    await env.STORE.put('tgpost:genre', '1', { expirationTtl: 60 * 30 });
    return say(env, chat, '🎯 Напишите или скажите жанр. Например: «шутер», «гонки», «хоррор», «на двоих», «как GTA».');
  }
  if (t && ![BTN_NEW_GAME, BTN_NEW_POST, BTN_PRICES, BTN_CANCEL, BTN_FIND, BTN_NEWS].includes(t) && !t.startsWith('/') && !photo && !m.forward_origin && await env.STORE.get('tgpost:genre')) {
    await env.STORE.delete('tgpost:genre');
    return genrePick(env, chat, t);
  }
  if (t === BTN_FIND) {
    await env.STORE.delete('tgpost:genre');
    await env.STORE.put('tgpost:find', '1', { expirationTtl: 60 * 30 });
    return say(env, chat, '🔎 Напишите названия игр — через запятую или каждую с новой строки. Например: «Spider-Man, FC 26, GTA 5».');
  }
  if (t && ![BTN_NEW_GAME, BTN_NEW_POST, BTN_PRICES, BTN_CANCEL].includes(t) && !t.startsWith('/') && !photo && !m.forward_origin && await env.STORE.get('tgpost:find')) {
    await env.STORE.delete('tgpost:find');
    return findGames(env, chat, t);
  }
  const waitTime = await env.STORE.get('tgpost:awaittime');
  if (waitTime && t && ![BTN_NEW_GAME, BTN_NEW_POST, BTN_PRICES, BTN_CANCEL, BTN_FIND].includes(t) && !t.startsWith('/')) {
    const day = await env.STORE.get('tgpost:awaitday'), hm = t.match(/^(?:в\s*)?(\d{1,2})[:.\s-]?(\d{2})?$/);
    const ms = day && hm && Number(hm[1]) < 24 && Number(hm[2] || 0) < 60 ? fromTashkent(Number(day.slice(0, 4)), Number(day.slice(4, 6)) - 1, Number(day.slice(6, 8)), Number(hm[1]), Number(hm[2] || 0)) : parseTime(t);
    if (ms) await env.STORE.delete('tgpost:awaitday');
    if (!ms) return say(env, chat, 'Не понял дату и время 🤔 Напишите ещё раз, например: «12.12 14:00», «12 декабря 14:00» или «завтра 10:00».');
    const r = await scheduleAt(env, chat, waitTime, Math.floor(ms / 1000));
    if (r.busy) return tg(env, 'sendMessage', { chat_id: chat, text: r.text, reply_markup: kb(r.kb) });
    return say(env, chat, r.ok ? r.text : `${r.text}. Напишите другую дату и время, например: «12.12 14:00».`);
  }
  // «поставь в отложенные на 12.12 14:00» без кнопки — про последний пост, ждущий решения
  if (t && t.length <= 60 && /^(?:пожалуйста\s+)?(?:постав|отлож|запланир)/i.test(t) && parseTime(t)) {
    const pend = JSON.parse(await env.STORE.get('tgpost:pending') || 'null');
    if (pend?.post) {
      await env.STORE.put('tgpost:awaittime', pend.post, { expirationTtl: 60 * 60 * 24 });
      const r = await scheduleAt(env, chat, pend.post, Math.floor(parseTime(t) / 1000));
      if (r.busy) return tg(env, 'sendMessage', { chat_id: chat, text: r.text, reply_markup: kb(r.kb) });
      return say(env, chat, r.ok ? r.text : `${r.text}. Напишите другую дату и время, например: «12.12 14:00».`);
    }
  }
  if (t === BTN_PRICES) return say(env, chat, `💰 Таблица сверки цен канала с поставщиком:\n${PRICE_TABLE}\n\nЦены поставщика обновляются каждый день. Чтобы поменять цены в канале, напишите сюда, например: «меняй всё из „Цена меняется“».`);
  if (t === BTN_NEW_POST) return say(env, chat, '✍️ Напишите одним сообщением, какой пост нужен. Например: «пост про игру Hogwarts Legacy» или «новость: скидки на PS Plus до конца недели». Можно приложить фото или переслать пост из другого канала.');

  // сообщение, которое выходит вместо эмоджи ожидания, когда работа готова
  if (await env.STORE.get('tgpost:askdone') && /[\p{L}\p{N}]/u.test(t)) {
    await env.STORE.put('tgpost:donemsg', JSON.stringify({ text: m.text || m.caption, entities: m.entities || m.caption_entities || [] }));
    await env.STORE.delete('tgpost:askdone');
    await tg(env, 'sendMessage', { chat_id: chat, text: 'Запомнил ✅ Так будет выглядеть ответ, когда работа готова:', reply_markup: MENU });
    return sendDone(env, chat);
  }

  // ответ на вопрос «какой ваш любимый эмоджи?»
  if (await env.STORE.get('tgpost:askfav')) {
    const onlyEmoji = t && t.length <= 16 && !/[\p{L}\p{N}]/u.test(t);
    if (onlyEmoji) {
      const e = ents[0];
      const fav = e ? { text: t.slice(e.offset, e.offset + e.length), id: e.custom_emoji_id } : { text: t };
      await env.STORE.put('tgpost:fav', JSON.stringify(fav));
      await env.STORE.delete('tgpost:askfav');
      const body = { chat_id: chat, text: `Запомнил ${fav.text} Теперь, пока я работаю над задачей, в чате будет только он, а с ответом он исчезнет.`, reply_markup: MENU };
      if (fav.id) body.entities = [{ type: 'custom_emoji', offset: 9, length: fav.text.length, custom_emoji_id: fav.id }];
      return tg(env, 'sendMessage', body);
    }
  }

  // «🇺🇸 -> [премиум]»: какой премиум-эмоджи ставить вместо обычного
  const arrow = t.match(/^(\S{1,8})\s*(?:->|→|=>|=|—>|–>|-)\s*(\S{1,8})$/u);
  if (arrow && ents.length) {
    const e = ents[ents.length - 1];
    const left = arrow[1];
    if (!ents.some((x) => x.offset === 0)) {
      await env.STORE.put(`emoji:${left}`, e.custom_emoji_id);
      const head = `Запомнил: ${left} → `, prem = t.slice(e.offset, e.offset + e.length);
      return tg(env, 'sendMessage', { chat_id: chat, text: `${head}${prem} ✅ Теперь в постах вместо ${left} будет этот премиум.`, entities: [{ type: 'custom_emoji', offset: head.length, length: e.length, custom_emoji_id: e.custom_emoji_id }], reply_markup: MENU });
    }
  }

  // только премиум-эмодзи без текста — запоминаем для постов
  if (ents.length && !photo) {
    let rest = t;
    for (const e of [...ents].sort((a, b) => b.offset - a.offset)) rest = rest.slice(0, e.offset) + rest.slice(e.offset + e.length);
    if (!rest.trim()) {
      for (const e of ents) await env.STORE.put(`emoji:${t.slice(e.offset, e.offset + e.length)}`, e.custom_emoji_id);
      return say(env, chat, `Запомнил премиум-эмодзи: ${ents.length} ✅`);
    }
  }

  // альбом: задачу запускает только первое сообщение альбома, собрав все фото и подписи
  if (m.media_group_id) {
    await new Promise((r) => setTimeout(r, 6000));
    const prefix = `tgpost:mg:${m.media_group_id}:`;
    const keys = (await env.STORE.list({ prefix })).keys.map((k) => k.name).filter((k) => !k.endsWith('done')).sort();
    if (!keys.length || keys[0] !== prefix + String(m.message_id).padStart(12, '0')) return;
    if (await env.STORE.get(`${prefix}done`)) return;
    await env.STORE.put(`${prefix}done`, '1', { expirationTtl: 600 });
    const parts = (await Promise.all(keys.map((k) => env.STORE.get(k)))).map((v) => JSON.parse(v || '{}'));
    const text = [...new Set(parts.map((x) => x.text).filter(Boolean))].join('\n');
    return startTask(env, chat, text || '[Альбом без подписи]', parts.map((x) => x.photo).filter(Boolean));
  }
  if (!t && !photo) return say(env, chat, 'Напишите задачу текстом или выберите кнопку в меню 👇');
  if (t === BTN_NEW_GAME) {
    const err = await dispatchAgent(env, { mode: 'new_game', task: 'Найди у поставщика новую игру, которой нет в канале, и сделай пост.' });
    return err ? say(env, chat, `⚠️ Не получилось запустить: ${err}`) : waitMark(env, chat);
  }
  // текст сразу после пересланного поста/фото — это комментарий к нему
  const pend = !photo && !m.forward_origin ? JSON.parse(await env.STORE.get('tgpost:pendtask') || 'null') : null;
  if (pend) {
    pend.text += `\n[Комментарий владельца к этому посту]: ${t}`;
    await env.STORE.put('tgpost:pendtask', JSON.stringify(pend), { expirationTtl: 300 });
    return;
  }
  return startTask(env, chat, describeMessage(m), photo ? [photo] : []);
}

// «🛑 Отменить всё»: останавливает работу агента и сбрасывает ожидания (правки, время)
// «⛔️ Отмена» (владелец 22.11): останавливает то, что идёт прямо сейчас по задачам владельца.
// Агент, публикация, история, правка поста канала, сообщения контактам — отменяются (в очереди и в работе);
// ожидания (поиск, комментарий, правки, время, пересланный пост) сбрасываются. Расписание (цены, проверка постов) не выключается,
// опубликованное в канале не трогается.
async function cancelAll(env, chat) {
  const gh = await env.STORE.get('tgpost:gh');
  let stopped = 0;
  for (const wf of ['agent.yml', 'post.yml', 'story.yml', 'channel.yml', 'dm.yml']) {
    for (const st of ['in_progress', 'queued', 'waiting', 'pending']) {
      const r = await fetch(`https://api.github.com/repos/${AUTOPOST_REPO}/actions/workflows/${wf}/runs?status=${st}&per_page=20`, { headers: ghHeaders(gh) });
      const runs = r.ok ? (await r.json()).workflow_runs || [] : [];
      for (const run of runs) {
        if (wf === 'channel.yml' && run.event === 'schedule') continue; // ежедневный индекс канала не трогаем
        const c = await fetch(`https://api.github.com/repos/${AUTOPOST_REPO}/actions/runs/${run.id}/cancel`, { method: 'POST', headers: ghHeaders(gh) });
        if (c.status === 202) stopped++;
      }
    }
  }
  for (const k of ['tgpost:await', 'tgpost:awaittime', 'tgpost:find', 'tgpost:genre', 'tgpost:pendtask', 'tgpost:pending']) await env.STORE.delete(k);
  const list = JSON.parse(await env.STORE.get('tgpost:waitmsgs') || '[]');
  await env.STORE.delete('tgpost:waitmsgs');
  for (const [c, id] of list) await tg(env, 'deleteMessage', { chat_id: c, message_id: id });
  return say(env, chat, stopped ? `⛔️ Всё остановил (задач: ${stopped}). Ничего не публикую.` : '⛔️ Всё остановил. Сейчас ничего не делается.');
}

// Пересланный пост / фото ждут ~15 с: следующее текстовое сообщение владельца — комментарий к ним (одна задача).
async function startTask(env, chat, text, files, opts = {}) {
  if (!opts.now && (files.length || text.startsWith('[Переслано'))) {
    const id = String(Date.now());
    await env.STORE.put('tgpost:pendtask', JSON.stringify({ id, text, files }), { expirationTtl: 300 });
    await waitMark(env, chat);
    await new Promise((r) => setTimeout(r, 15000));
    const p = JSON.parse(await env.STORE.get('tgpost:pendtask') || 'null');
    if (!p || p.id !== id) return;
    await env.STORE.delete('tgpost:pendtask');
    return startTask(env, chat, p.text, p.files, { now: true, marked: true });
  }
  const mark = () => (opts.marked ? null : waitMark(env, chat));
  const waiting = await env.STORE.get('tgpost:await');
  if (waiting) {
    await setStatus(env, waiting, { feedback: [...(JSON.parse(await env.STORE.get(`tgpost:post:${waiting}`) || '{}').feedback || []), text] });
    await env.STORE.delete('tgpost:await');
    const err = await dispatchAgent(env, { mode: 'edit', post: waiting, task: text, files: files.join(',') });
    return err ? say(env, chat, `⚠️ Не получилось запустить правки: ${err}`) : mark();
  }
  if (!files.length && !text.startsWith('[Переслано') && await isFindRequest(env, text)) return findGames(env, chat, text);
  const err = await dispatchAgent(env, { mode: 'task', task: text, files: files.join(',') });
  return err ? say(env, chat, `⚠️ Не получилось запустить: ${err}`) : mark();
}

// Агент (GitHub Actions закрытого репозитория) входит по тому же токену GitHub, что сохранён в KV.
async function agentAuth(req, env) {
  const saved = env.STORE ? await env.STORE.get('tgpost:gh') : '';
  const got = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  return !!saved && got.length === saved.length && got === saved;
}

function visibleLen(html) {
  return html.replace(/<[^>]+>/g, '').replace(/&(lt|gt|amp|quot|#\d+);/g, 'x').length;
}

async function tgForm(env, method, form) {
  const r = await fetch(`https://api.telegram.org/bot${await botToken(env)}/${method}`, { method: 'POST', body: form });
  return r.json();
}

// Утренний отчёт по ценам: бот-обход (6:00) кладёт текст в KV, ровно в 7:00 Ташкент (cron 0 2 * * *) он уходит владельцу.
async function handleAgentReport(req, env) {
  if (!(await agentAuth(req, env))) return json({ ok: false }, 403);
  const b = await req.json().catch(() => ({}));
  const text = String(b.text || '').slice(0, 20000), day = String(b.day || '');
  if (!text) return json({ ok: false, error: 'bad input' }, 400);
  await env.STORE.put('tgpost:report', JSON.stringify({ text, day, ts: Date.now() }), { expirationTtl: 60 * 60 * 24 * 3 });
  const sent = b.now ? await sendPriceReport(env, true, { text, day }) : null;
  return json({ ok: true, sent }, 200);
}
async function sendPriceReport(env, force, given) {
  const chat = env.TGPOST_OWNER;
  const rep = given ? { ...given, ts: Date.now() } : JSON.parse(await env.STORE.get('tgpost:report') || 'null');
  const fresh = rep && Date.now() - rep.ts < 1000 * 60 * 60 * 20;
  if (!fresh && !force) return tg(env, 'sendMessage', { chat_id: chat, text: '⚠️ Утренняя проверка цен ещё не закончилась или не сработала — посмотрю.' });
  if (!rep) return 'нет отчёта';
  const parts = [];
  let cur = '';
  for (const block of rep.text.split('\n\n')) {
    if (cur && (cur + '\n\n' + block).length > 3800) { parts.push(cur); cur = block; } else cur = cur ? cur + '\n\n' + block : block;
  }
  if (cur) parts.push(cur);
  for (let i = 0; i < parts.length; i++) {
    const last = i === parts.length - 1;
    const r = await tg(env, 'sendMessage', { chat_id: chat, text: parts[i], link_preview_options: { is_disabled: true }, ...(last ? { reply_markup: kb([[{ text: '✅ Принято', callback_data: 'prok::' }, { text: '✏️ Есть правки', callback_data: 'prfix::' }]]) } : {}) });
    if (!r.ok) return `telegram: ${r.description}`;
  }
  await env.STORE.delete('tgpost:report');
  await remember(env, { result: `утренний отчёт по ценам ${rep.day} отправлен` });
  return 'отправлен';
}

// «БЫЛО» (пересланный пост канала) → «СТАЛО» (тот же пост с новым текстом) → кнопки Да / Нет / Правки.
async function handleAgentReview(req, env) {
  if (!(await agentAuth(req, env))) return json({ ok: false }, 403);
  const b = await req.json().catch(() => ({}));
  const id = Number(String(b.msg || '').replace(/\D/g, '')), html = String(b.html || ''), note = String(b.note || '').slice(0, 600);
  if (!id || !html) return json({ ok: false, error: 'bad input' }, 400);
  const chat = env.TGPOST_OWNER, ch = env.TGPOST_CHANNEL || '@psshopgo';
  const link = `https://t.me/${ch.replace('@', '')}/${id}`;
  const strip = (x) => x.replace(/<tg-emoji[^>]*>(.*?)<\/tg-emoji>/g, '$1');
  await clearWait(env);
  const btns = kb([[{ text: '✅ Да', callback_data: `upd:${id}:` }], [{ text: '❌ Нет', callback_data: `keep:${id}:` }], [{ text: '✏️ Правки', callback_data: `fixp:${id}:` }]]);
  if (b.short) { // цены: одно короткое сообщение «игра: было → стало» без постов
    const r = await tg(env, 'sendMessage', { chat_id: chat, text: `${note}\n\nПост: ${link}`, link_preview_options: { is_disabled: true }, reply_markup: btns });
    if (!r.ok) return json({ ok: false, error: r.description }, 502);
    await remember(env, { result: `прислал изменение цены поста канала ${id}: ${note}` });
    return json({ ok: true }, 200);
  }
  await tg(env, 'sendMessage', { chat_id: chat, text: '⬇️ БЫЛО' });
  const fw = await tg(env, 'forwardMessage', { chat_id: chat, from_chat_id: ch, message_id: id });
  if (!fw.ok) await tg(env, 'sendMessage', { chat_id: chat, text: `(не смог показать пост: ${link})` });
  await tg(env, 'sendMessage', { chat_id: chat, text: '⬇️ СТАЛО' });
  let r = null;
  const media = fw.ok && (fw.result.photo || fw.result.video || fw.result.animation || fw.result.document);
  if (b.img) { // новая обложка (ежедневная проверка поста)
    const bytes = Uint8Array.from(atob(String(b.img)), (c) => c.charCodeAt(0));
    const sendImg = async (cap) => {
      const f = new FormData();
      f.append('chat_id', chat); f.append('photo', new Blob([bytes], { type: 'image/jpeg' }), 'image.jpg');
      if (cap) { f.append('caption', cap); f.append('parse_mode', 'HTML'); }
      return tgForm(env, 'sendPhoto', f);
    };
    if (visibleLen(html) <= 1024) { r = await sendImg(html); if (!r.ok) r = await sendImg(strip(html)); }
    else await sendImg('');
  }
  if (!r?.ok && !b.img && media && visibleLen(html) <= 1024) {
    r = await tg(env, 'copyMessage', { chat_id: chat, from_chat_id: ch, message_id: id, caption: html, parse_mode: 'HTML' });
    if (!r.ok) r = await tg(env, 'copyMessage', { chat_id: chat, from_chat_id: ch, message_id: id, caption: strip(html), parse_mode: 'HTML' });
  }
  if (!r?.ok) {
    r = await tg(env, 'sendMessage', { chat_id: chat, text: html, parse_mode: 'HTML', link_preview_options: { is_disabled: true } });
    if (!r.ok) r = await tg(env, 'sendMessage', { chat_id: chat, text: strip(html), parse_mode: 'HTML', link_preview_options: { is_disabled: true } });
  }
  if (!r.ok) return json({ ok: false, error: r.description }, 502);
  await tg(env, 'sendMessage', {
    chat_id: chat, reply_to_message_id: r.result.message_id, link_preview_options: { is_disabled: true },
    text: `${note ? '💡 ' + note + '\n\n' : ''}Пост в канале: ${link}\nМеняем?`,
    reply_markup: kb([[{ text: '✅ Да', callback_data: `upd:${id}:` }], [{ text: '❌ Нет', callback_data: `keep:${id}:` }], [{ text: '✏️ Правки', callback_data: `fixp:${id}:` }]]),
  });
  await remember(env, { result: `прислал «было / стало» для поста канала ${id}${note ? ': ' + note : ''}` });
  return json({ ok: true }, 200);
}

async function handleAgentPreview(req, env) {
  if (!(await agentAuth(req, env))) return json({ ok: false }, 403);
  const fd = await req.formData();
  const post = String(fd.get('post') || ''), html = String(fd.get('html') || ''), image = fd.get('image'), plain = String(fd.get('plain') || '').slice(0, 100), update = String(fd.get('update') || '').replace(/\D/g, '');
  if (!/^[\w.-]{1,80}$/.test(post) || !html) return json({ ok: false, error: 'bad input' }, 400);
  const chat = env.TGPOST_OWNER;
  await clearWait(env);
  const send = async (body) => {
    const ids = [];
    const short = visibleLen(body) <= 1024;
    if (image && typeof image !== 'string') {
      const f = new FormData();
      f.append('chat_id', chat); f.append('photo', image, image.name || 'image.jpg');
      if (short) { f.append('caption', body); f.append('parse_mode', 'HTML'); }
      const r = await tgForm(env, 'sendPhoto', f);
      if (!r.ok) return { r };
      ids.push(r.result.message_id);
      if (short) return { r, ids };
    }
    const r = await tg(env, 'sendMessage', { chat_id: chat, text: body, parse_mode: 'HTML', link_preview_options: { is_disabled: true } });
    if (r.ok) ids.push(r.result.message_id);
    return { r, ids };
  };
  let res = await send(html);
  if (!res.r.ok) res = await send(html.replace(/<tg-emoji[^>]*>(.*?)<\/tg-emoji>/g, '$1')); // запасной вариант: обычные эмодзи
  if (!res.r.ok) return json({ ok: false, error: res.r.description }, 502);
  const plainNote = plain ? `\n\nОбычные (не премиум) эмоджи: ${plain}\nЧтобы заменить, пришлите: ${[...plain.matchAll(/\S+/gu)][0]?.[0] || ''} -> премиум-эмоджи` : '';
  if (update) {
    await remember(env, { result: `предложил обновить пост канала ${update}` });
    const link = `https://t.me/${(env.TGPOST_CHANNEL || '@psshopgo').replace('@', '')}/${update}`;
    await tg(env, 'sendMessage', {
      chat_id: chat, reply_to_message_id: res.ids[0], link_preview_options: { is_disabled: true },
      text: `👆 Так станет пост в канале (картинка останется прежней):\n${link}\n\nМеняем?${plainNote}`,
      reply_markup: kb([[{ text: '✅ Да, меняем', callback_data: `upd:${update}:` }], [{ text: '❌ Нет, оставь', callback_data: `keep:${update}:` }]]),
    });
    return json({ ok: true }, 200);
  }
  const c = await tg(env, 'sendMessage', {
    chat_id: chat, reply_to_message_id: res.ids[0], text: '👆 Пост готов. Опубликовать в канал?' + plainNote,
    reply_markup: ctrlKb(post),
  });
  await env.STORE.put('tgpost:pending', JSON.stringify({ post, chat, ctrl: c.result?.message_id, ids: res.ids, ts: Date.now() }), { expirationTtl: 60 * 60 * 48 });
  await env.STORE.put(`tgpost:ids:${post}`, JSON.stringify(res.ids), { expirationTtl: 60 * 60 * 24 * 7 });
  await remember(env, { result: `прислал превью поста ${post}` });
  await setStatus(env, post, { status: 'pending' });
  return json({ ok: true }, 200);
}

async function handleAgentSay(req, env) {
  if (!(await agentAuth(req, env))) return json({ ok: false }, 403);
  const { text } = await req.json().catch(() => ({}));
  if (!text) return json({ ok: false }, 400);
  await clearWait(env);
  await remember(env, { result: `ответил: ${text}` });
  const r = await say(env, env.TGPOST_OWNER, String(text).slice(0, 4000));
  return json({ ok: !!r.ok }, 200);
}

async function handleAgentEmoji(req, env) {
  if (!(await agentAuth(req, env))) return json({ ok: false }, 403);
  const out = {};
  let cursor;
  do {
    const page = await env.STORE.list({ prefix: 'emoji:', cursor });
    for (const k of page.keys) out[k.name.slice(6)] = await env.STORE.get(k.name);
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  return json(out, 200);
}

// Картинки премиум-эмоджи по их id (для проверки, что значок совпадает со смыслом)
async function handleAgentEmojiInfo(req, env) {
  if (!(await agentAuth(req, env))) return json({ ok: false }, 403);
  const { ids } = await req.json().catch(() => ({}));
  const list = (ids || []).map(String).filter((x) => /^\d+$/.test(x)).slice(0, 200);
  const out = {};
  for (let i = 0; i < list.length; i += 50) {
    const r = await tg(env, 'getCustomEmojiStickers', { custom_emoji_ids: list.slice(i, i + 50) });
    for (const st of r.result || []) {
      const f = st.thumbnail?.file_id || (!st.is_animated && !st.is_video ? st.file_id : '');
      let path = '';
      if (f) { const g = await tg(env, 'getFile', { file_id: f }); path = g.result?.file_path || ''; }
      out[st.custom_emoji_id] = { emoji: st.emoji, set: st.set_name, animated: st.is_animated, video: st.is_video, file: path ? `/tgpost/file-path?p=${encodeURIComponent(path)}` : '' };
    }
  }
  return json(out, 200);
}

async function handleAgentFile(req, env) {
  if (!(await agentAuth(req, env))) return json({ ok: false }, 403);
  const id = new URL(req.url).searchParams.get('id') || '';
  const f = await tg(env, 'getFile', { file_id: id });
  if (!f.ok) return json({ ok: false, error: f.description }, 404);
  return fetch(`https://api.telegram.org/file/bot${await botToken(env)}/${f.result.file_path}`);
}

// ── Отложенная публикация: пост уходит в «Отложенные» канала от аккаунта владельца (Telethon schedule) ──
const TZ_SHIFT = 5 * 3600 * 1000; // Ташкент UTC+5
function tashkentParts(ms) { const d = new Date(ms + TZ_SHIFT); return { y: d.getUTCFullYear(), mo: d.getUTCMonth(), d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes() }; }
function fromTashkent(y, mo, d, h, mi) { return Date.UTC(y, mo, d, h, mi) - TZ_SHIFT; }
function fmtTashkent(ms) { const p = tashkentParts(ms); const z = (n) => String(n).padStart(2, '0'); return `${z(p.d)}.${z(p.mo + 1)} в ${z(p.h)}:${z(p.mi)}`; }
function timeOptions(post) {
  const now = Date.now(), t = tashkentParts(now), rows = [];
  const add = (dayShift, h, label) => {
    const ms = fromTashkent(t.y, t.mo, t.d + dayShift, h, 0);
    if (ms > now + 10 * 60 * 1000) rows.push({ text: `${label} ${h}:00`, callback_data: `at:${Math.floor(ms / 1000)}:${post}`.slice(0, 64) });
  };
  for (const h of [12, 15, 18, 20, 22]) add(0, h, 'Сегодня');
  for (const h of [10, 12, 18, 20]) add(1, h, 'Завтра');
  const out = [];
  for (let i = 0; i < rows.length; i += 2) out.push(rows.slice(i, i + 2));
  out.push([{ text: '📅 Другая дата', callback_data: `odate::${post}`.slice(0, 64) }]);
  out.push([{ text: '↩️ Не откладывать', callback_data: `nolater::${post}`.slice(0, 64) }]);
  return out;
}
function parseTime(text) {
  const s = text.toLowerCase().replace(/\s+/g, ' ').trim();
  const tm = s.match(/(\d{1,2})[:.\s-](\d{2})\s*$/) || s.match(/^(?:в\s*)?(\d{1,2})\s*$/);
  if (!tm) return null;
  const h = Number(tm[1]), mi = Number(tm[2] || 0);
  if (h > 23 || mi > 59) return null;
  const now = Date.now(), t = tashkentParts(now);
  const MON = ['янв', 'фев', 'мар', 'апр', 'мая|май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  let date = s.match(/(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\s/);
  if (!date) {
    const w = s.match(/(\d{1,2})\s*([а-яё]+)(?:\s+(\d{4}))?\s/);
    const mo = w ? MON.findIndex((x) => new RegExp(`^(${x})`).test(w[2])) : -1;
    if (mo >= 0) date = [w[0], w[1], String(mo + 1), w[3]];
  }
  let ms;
  if (date) {
    const d = Number(date[1]), mo = Number(date[2]) - 1;
    if (d < 1 || d > 31 || mo < 0 || mo > 11) return null;
    const y = date[3] ? (Number(date[3]) < 100 ? 2000 + Number(date[3]) : Number(date[3])) : t.y;
    ms = fromTashkent(y, mo, d, h, mi);
    if (tashkentParts(ms).d !== d) return null; // 31.11 и т. п.
    if (!date[3] && mo < t.mo) ms = fromTashkent(y + 1, mo, d, h, mi); // январь в декабре — следующий год; прошедший день этого месяца → «уже прошло»
  } else {
    const shift = /послезавтра/.test(s) ? 2 : /завтра/.test(s) ? 1 : 0;
    ms = fromTashkent(t.y, t.mo, t.d + shift, h, mi);
    if (!shift && ms < now) ms += 24 * 3600 * 1000; // время уже прошло — значит завтра
  }
  return ms;
}
// Календарь для «📅 Другая дата»: callback cal:YYYYMM:post, cd:YYYYMMDD:post, ct:YYYYMMDD:post, at:<sec>:post
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MON_S = ['Янв', 'Фев', 'Март', 'Апр', 'Май', 'Июнь', 'Июль', 'Авг', 'Сен', 'Окт', 'Нояб', 'Дек'];
async function busyByDay(env) { // {'YYYYMMDD': [ 'HH:MM', ... ]} по Ташкенту
  const out = {}, z = (n) => String(n).padStart(2, '0');
  for (const x of JSON.parse(await env.STORE.get('tgpost:schedtimes') || '[]')) {
    if (!(x.ms > Date.now())) continue;
    const p = tashkentParts(x.ms), k = `${p.y}${z(p.mo + 1)}${z(p.d)}`;
    (out[k] = out[k] || []).push(`${z(p.h)}:${z(p.mi)}`);
  }
  return out;
}
async function calView(env, post, ym) {
  const now = tashkentParts(Date.now()), z = (n) => String(n).padStart(2, '0');
  let y = Number(ym.slice(0, 4)) || now.y, mo = ym ? Number(ym.slice(4, 6)) - 1 : now.mo;
  const idx = (yy, mm) => yy * 12 + mm, first = idx(now.y, now.mo);
  if (idx(y, mo) < first || idx(y, mo) > first + 11) { y = now.y; mo = now.mo; }
  const busy = await busyByDay(env), cb = (a, x) => `${a}:${x}:${post}`.slice(0, 64), rows = [];
  const pm = new Date(Date.UTC(y, mo - 1, 1)), nm = new Date(Date.UTC(y, mo + 1, 1));
  rows.push([
    idx(y, mo) > first ? { text: `◀️ ${MON_S[pm.getUTCMonth()]}`, callback_data: cb('cal', `${pm.getUTCFullYear()}${z(pm.getUTCMonth() + 1)}`) } : { text: ' ', callback_data: 'x' },
    { text: `${MONTHS[mo]} ${y}`, callback_data: 'x' },
    idx(y, mo) < first + 11 ? { text: `${MON_S[nm.getUTCMonth()]} ▶️`, callback_data: cb('cal', `${nm.getUTCFullYear()}${z(nm.getUTCMonth() + 1)}`) } : { text: ' ', callback_data: 'x' },
  ]);
  rows.push(['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => ({ text: d, callback_data: 'x' })));
  const days = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate(), lead = (new Date(Date.UTC(y, mo, 1)).getUTCDay() + 6) % 7;
  let row = Array.from({ length: lead }, () => ({ text: ' ', callback_data: 'x' }));
  for (let d = 1; d <= days; d++) {
    const key = `${y}${z(mo + 1)}${z(d)}`, n = (busy[key] || []).length;
    const past = idx(y, mo) === first && d < now.d;
    row.push(past ? { text: '·', callback_data: 'x' } : { text: `${d}${n ? '📌' + (n > 1 ? n : '') : ''}`, callback_data: cb('cd', key) });
    if (row.length === 7) { if (row.some((b) => b.callback_data !== 'x')) rows.push(row); row = []; } // целиком прошедшие недели не показываем
  }
  if (row.length) { while (row.length < 7) row.push({ text: ' ', callback_data: 'x' }); rows.push(row); }
  rows.push([{ text: '↩️ Не откладывать', callback_data: `nolater::${post}`.slice(0, 64) }]);
  return { text: '📅 Выберите день (время Ташкента). 📌 — в этот день уже есть отложенный пост.\nИли напишите дату и время, например: 12.12 14:00', kb: rows };
}
async function dayView(env, post, key) {
  const y = Number(key.slice(0, 4)), mo = Number(key.slice(4, 6)) - 1, d = Number(key.slice(6, 8));
  const taken = (await busyByDay(env))[key] || [], now = Date.now(), btns = [];
  for (const h of [10, 12, 14, 16, 18, 20]) {
    const ms = fromTashkent(y, mo, d, h, 0), hh = `${h}:00`;
    if (ms > now + 10 * 60 * 1000) btns.push({ text: `${hh}${taken.includes(hh) ? '📌' : ''}`, callback_data: `at:${Math.floor(ms / 1000)}:${post}`.slice(0, 64) });
  }
  const rows = [];
  for (let i = 0; i < btns.length; i += 3) rows.push(btns.slice(i, i + 3));
  rows.push([{ text: '✏️ Своё время', callback_data: `ct:${key}:${post}`.slice(0, 64) }]);
  rows.push([{ text: '⬅️ Назад к календарю', callback_data: `cal:${key.slice(0, 6)}:${post}`.slice(0, 64) }]);
  const note = taken.length ? `\n📌 Уже занято: ${taken.sort().join(', ')}` : '';
  return { text: `🕒 ${String(d).padStart(2, '0')}.${String(mo + 1).padStart(2, '0')} — во сколько опубликовать? (Ташкент)${note}`, kb: rows };
}
async function scheduleAt(env, chat, post, sec, force = false) {
  const ms = sec * 1000;
  if (!/^[\w.-]{1,80}$/.test(post || '') || !ms) return { ok: false, text: 'Не понял, какой пост' };
  if (ms < Date.now() + 2 * 60 * 1000) return { ok: false, text: `Это время уже прошло (${fmtTashkent(ms)})` };
  if (ms > Date.now() + 360 * 24 * 3600 * 1000) return { ok: false, text: 'Слишком далеко, максимум год' };
  const busy = JSON.parse(await env.STORE.get('tgpost:schedtimes') || '[]');
  const same = busy.find((x) => Math.abs(x.ms - ms) < 60 * 1000);
  if (same && !force) {
    let alt = ms + 30 * 60 * 1000;
    while (busy.some((x) => Math.abs(x.ms - alt) < 60 * 1000)) alt += 30 * 60 * 1000;
    return { ok: false, busy: true, text: `⚠️ На ${fmtTashkent(ms)} уже стоит пост${same.t ? ` «${same.t}»` : ''}. Поставить на ${fmtTashkent(alt).split(' в ')[1]}?`,
      kb: [[{ text: `✅ На ${fmtTashkent(alt)}`, callback_data: `at:${Math.floor(alt / 1000)}:${post}`.slice(0, 64) }], [{ text: `Всё равно на ${fmtTashkent(ms)}`, callback_data: `atf:${sec}:${post}`.slice(0, 64) }], [{ text: '📅 Другая дата', callback_data: `odate::${post}`.slice(0, 64) }]] };
  }
  const gh = await env.STORE.get('tgpost:gh');
  const at = new Date(ms).toISOString().slice(0, 16) + 'Z';
  const r = await fetch(`https://api.github.com/repos/${AUTOPOST_REPO}/actions/workflows/post.yml/dispatches`, {
    method: 'POST', headers: { ...ghHeaders(gh), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: 'main', inputs: { post, target: 'psshopgo', at } }),
  });
  if (r.status !== 204) return { ok: false, text: `Не получилось (GitHub ${r.status})` };
  await env.STORE.delete('tgpost:awaittime');
  await setStatus(env, post, { status: 'scheduled', at });
  busy.push({ ms, t: post }); await env.STORE.put('tgpost:schedtimes', JSON.stringify(busy.filter((x) => x.ms > Date.now())));
  const text = `🕒 Поставил в отложенные на ${fmtTashkent(ms)}`;
  const pend = JSON.parse(await env.STORE.get('tgpost:pending') || 'null');
  if (pend?.post === post && pend.ctrl) await tg(env, 'editMessageReplyMarkup', { chat_id: pend.chat, message_id: pend.ctrl, reply_markup: kb([[{ text: `🕒 Запланирован на ${fmtTashkent(ms)}`, callback_data: 'x' }]]) });
  return { ok: true, text };
}

// Токен GitHub для запуска публикации передаётся из закрытого репозитория; принимаем только токен с доступом к нему.
async function handleTgPostRegisterGh(req, env) {
  if (!env.STORE) return json({ ok: false }, 500);
  const { token } = await req.json().catch(() => ({}));
  if (!/^[\w]{20,255}$/.test(token || '')) return json({ ok: false }, 400);
  const r = await fetch(`https://api.github.com/repos/${AUTOPOST_REPO}`, { headers: ghHeaders(token) });
  const repo = r.ok ? await r.json() : null;
  if (!repo || !repo.private || repo.full_name?.toLowerCase() !== AUTOPOST_REPO) return json({ ok: false, error: 'no access' }, 403);
  await env.STORE.put('tgpost:gh', token);
  return json({ ok: true }, 200);
}

async function handleTgPostPending(req, env) {
  const b = await req.json().catch(() => ({}));
  const saved = env.STORE ? await env.STORE.get('tgpost:token') : '';
  if (!saved || b.token !== saved || !b.post) return json({ ok: false }, 403);
  await env.STORE.put('tgpost:pending', JSON.stringify({ post: b.post, chat: b.chat, ctrl: b.ctrl, ts: Date.now() }), { expirationTtl: 60 * 60 * 48 });
  await setStatus(env, b.post, { status: 'pending' });
  return json({ ok: true }, 200);
}

async function handleTgPostRegister(req, env) {
  if (!env.TGPOST_SECRET || !env.STORE) return json({ ok: false, error: 'not configured' }, 500);
  const { token } = await req.json().catch(() => ({}));
  if (!/^\d+:[\w-]{30,}$/.test(token || '')) return json({ ok: false }, 400);
  const me = await tg(env, 'getMe', {}, token);
  const want = (env.TGPOST_BOT_USERNAME || 'psshop_postTG_bot').toLowerCase();
  if (!me.ok || String(me.result?.username || '').toLowerCase() !== want) return json({ ok: false, error: 'wrong bot' }, 403);
  await env.STORE.put('tgpost:token', token);
  const origin = new URL(req.url).origin;
  const r = await tg(env, 'setWebhook', { url: `${origin}/tgpost?u=2`, secret_token: env.TGPOST_SECRET, allowed_updates: ['message', 'callback_query', 'channel_post'] }, token);
  return json({ ok: !!r.ok, webhook: r.description || r.ok }, 200);
}

async function handleTgPostSetup(req, env) {
  const url = new URL(req.url);
  if (!env.TGPOST_SECRET || url.searchParams.get('key') !== env.TGPOST_SECRET) return new Response('forbidden', { status: 403 });
  if (url.pathname.endsWith('/status')) {
    const post = url.searchParams.get('post') || '';
    const st = env.STORE ? JSON.parse(await env.STORE.get(`tgpost:post:${post}`) || 'null') : null;
    return json(st || { post, status: 'pending' }, 200);
  }
  if (url.pathname.endsWith('/emoji')) {
    const out = {};
    if (env.STORE) {
      let cursor;
      do {
        const page = await env.STORE.list({ prefix: 'emoji:', cursor });
        for (const k of page.keys) out[k.name.slice(6)] = await env.STORE.get(k.name);
        cursor = page.list_complete ? null : page.cursor;
      } while (cursor);
    }
    return json(out, 200);
  }
  const r = await tg(env, 'setWebhook', {
    url: `${url.origin}/tgpost?u=2`, secret_token: env.TGPOST_SECRET,
    allowed_updates: ['message', 'callback_query', 'channel_post'], drop_pending_updates: false,
  });
  return json(r, 200);
}

export default {
  async fetch(req, env, ctx) {
    const h = cors(req, env);
    const { pathname } = new URL(req.url);
    if (req.method === 'POST' && pathname === '/tgpost') return handleTgPost(req, env, ctx);
    if (req.method === 'POST' && pathname === '/tgpost/pending') return handleTgPostPending(req, env);
    if (req.method === 'POST' && pathname === '/tgpost/register') return handleTgPostRegister(req, env);
    if (req.method === 'POST' && pathname === '/tgpost/register-gh') return handleTgPostRegisterGh(req, env);
    if (req.method === 'POST' && pathname === '/tgpost/preview') return handleAgentPreview(req, env);
    if (req.method === 'POST' && pathname === '/tgpost/say') return handleAgentSay(req, env);
    if (req.method === 'POST' && pathname === '/tgpost/review') return handleAgentReview(req, env);
    if (req.method === 'POST' && pathname === '/tgpost/report') return handleAgentReport(req, env);
    if (req.method === 'POST' && pathname === '/tgpost/index') return handleAgentIndex(req, env);
    if (req.method === 'GET' && pathname === '/tgpost/findtest') return handleFindTest(req, env);
    if (req.method === 'GET' && pathname === '/tgpost/file') return handleAgentFile(req, env);
    if (req.method === 'GET' && pathname === '/tgpost/file-path') {
      if (!(await agentAuth(req, env))) return json({ ok: false }, 403);
      const fp = new URL(req.url).searchParams.get('p') || '';
      if (!/^[\w./-]{3,200}$/.test(fp)) return json({ ok: false }, 400);
      return fetch(`https://api.telegram.org/file/bot${await botToken(env)}/${fp}`);
    }
    if (req.method === 'GET' && pathname === '/tgpost/emoji-map') return handleAgentEmoji(req, env);
    if (req.method === 'POST' && pathname === '/tgpost/emoji-info') return handleAgentEmojiInfo(req, env);
    if (req.method === 'GET' && (pathname === '/tgpost/setup' || pathname === '/tgpost/emoji' || pathname === '/tgpost/status')) return handleTgPostSetup(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    if (req.method === 'POST' && pathname === '/orderbot') return handleOrderBot(req, env, ctx);
    if (req.method === 'GET' && pathname === '/orderbot/setup') return handleOrderBotSetup(req, env);
    if (req.method === 'GET' && pathname === '/orderbot/resend') return handleOrderBotResend(req, env);
    if (req.method === 'GET' && pathname === '/health') return handleHealth(env);
    if (req.method === 'POST' && pathname === '/order') return handleOrder(req, env, h, ctx);
    if (req.method === 'POST' && pathname === '/event') return handleEvent(req, env, h);
    if (req.method === 'POST' && pathname === '/visit') return handleVisit(req, env, h, ctx);
    if (req.method === 'GET' && pathname === '/hits') return handleHits(env, h);
    if (req.method === 'GET' && pathname === '/') return new Response('PS SHOP worker: ok', { headers: h });
    return json({ ok: false }, 404, h);
  },
  async scheduled(event, env, ctx) {
    if (event.cron === '0 2 * * *') return ctx.waitUntil(sendPriceReport(env)); // 7:00 Ташкент — отчёт по ценам
    if (event.cron === '23 5 * * *') return ctx.waitUntil(remindStuckOrders(env)); // 10:23 Ташкент — зависшие заявки (Сайтер)
    ctx.waitUntil(runCatalogUpdate(env));
  },
};
