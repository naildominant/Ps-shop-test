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

function orderMessage(o) {
  const items = (o.items || []).slice(0, 30).map((i, n) => `${n + 1}. ${esc(i.title)} (${esc(i.option)}) — ${money(i.price)} uzs`).join('\n');
  const contact = String(o.contact || '').trim();
  const tgUser = contact.match(/^@?([a-zA-Z][a-zA-Z0-9_]{4,31})$/);
  const phone = contact.replace(/[^\d+]/g, '');
  const link = tgUser ? `https://t.me/${tgUser[1]}` : (phone.length >= 9 ? `tel:${phone}` : '');
  const time = new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  return [
    '🛒 <b>Новая заявка с сайта</b>',
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

async function sendTelegram(env, text) {
  const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: env.CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  });
  return r.ok;
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

const ORDER_HEADER = ['Дата', 'Имя', 'Контакт', 'Консоль', 'Что заказали', 'Сумма, uzs', 'Язык сайта', 'Статус', 'Комментарий', 'Посетитель'];

async function toSheet(env, o) {
  const items = (o.items || []).slice(0, 30).map((i) => `${i.title} (${i.option}) — ${money(i.price)} uzs`).join('\n');
  await sheetPost(env, { sheet: 'Заявки', header: ORDER_HEADER, dates: [0],
    values: [Date.now(), o.name, o.contact, o.console, items, Number(o.total) || 0, o.lang || 'ru', 'Новая', '', String(o.vid || '').slice(0, 12)] });
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
  const sent = await sendTelegram(env, orderMessage({ ...o, name, contact }));
  if (ctx) ctx.waitUntil(toSheet(env, { ...o, name, contact }));
  return json({ ok: sent }, sent ? 200 : 502, h);
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
async function tg(env, method, body, token) {
  const r = await fetch(`https://api.telegram.org/bot${token || await botToken(env)}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  return r.json();
}
const kb = (rows) => ({ inline_keyboard: rows });
const ctrlKb = (post) => kb([[{ text: '✅ Опубликовать', callback_data: `go::${post}`.slice(0, 64) }], [{ text: '🕒 Отправить позже', callback_data: `later::${post}`.slice(0, 64) }], [{ text: '❌ Нужна доработка', callback_data: `no::${post}`.slice(0, 64) }]]);
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
    if (ctx) ctx.waitUntil(ownerMessage(env, m).catch((e) => tg(env, 'sendMessage', { chat_id: m.chat.id, text: `⚠️ Ошибка: ${e.message}` })));
    else await ownerMessage(env, m);
    return new Response('ok');
  }

  // Пост появился в канале (владелец переслал со скрытым отправителем) — отмечаем опубликованным
  const cp = u.channel_post;
  if (cp) {
    const channel = (env.TGPOST_CHANNEL || '@psshopgo').replace('@', '').toLowerCase();
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
  if (action === 'keep') {
    await tg(env, 'editMessageReplyMarkup', { chat_id: chat, message_id: mid, reply_markup: kb([[{ text: '👌 Оставили как есть', callback_data: 'x' }]]) });
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
    await env.STORE.put('tgpost:awaittime', post, { expirationTtl: 60 * 60 * 3 });
    await tg(env, 'sendMessage', { chat_id: chat, reply_to_message_id: mid, text: '🕒 Когда опубликовать? Выберите кнопку или напишите время (Ташкент), например: «19:30», «завтра 10:00», «25.11 18:00».', reply_markup: kb(timeOptions(post)) });
    return json({ method: 'answerCallbackQuery', callback_query_id: q.id }, 200);
  }
  if (action === 'at') {
    const r = await scheduleAt(env, chat, post, Number(idsPart));
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
const BTN_NEW_GAME = '🆕 Игра от поставщика', BTN_NEW_POST = '✍️ Новый пост', BTN_PRICES = '💰 Цены';
const MENU = { keyboard: [[{ text: BTN_NEW_GAME }], [{ text: BTN_NEW_POST }, { text: BTN_PRICES }]], resize_keyboard: true, is_persistent: true };
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

async function dispatchAgent(env, inputs) {
  const gh = env.STORE ? await env.STORE.get('tgpost:gh') : '';
  if (!gh) return 'нет доступа к GitHub';
  const clean = Object.fromEntries(Object.entries(inputs).map(([k, v]) => [k, String(v || '').slice(0, 6000)]));
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

async function ownerMessage(env, m) {
  const chat = m.chat.id;
  const t = (m.text || m.caption || '').trim();
  const ents = (m.entities || m.caption_entities || []).filter((e) => e.type === 'custom_emoji');
  const photo = m.photo?.length ? m.photo[m.photo.length - 1].file_id : (m.document?.mime_type?.startsWith('image/') ? m.document.file_id : '');

  if (t === '/start' || t === '/menu' || t.toLowerCase() === 'меню') return say(env, chat, 'Меню внизу 👇 Можно просто написать задачу своими словами или переслать пост из другого канала.');
  const waitTime = await env.STORE.get('tgpost:awaittime');
  if (waitTime && t && ![BTN_NEW_GAME, BTN_NEW_POST, BTN_PRICES].includes(t) && !t.startsWith('/')) {
    const ms = parseTime(t);
    if (!ms) return say(env, chat, 'Не понял время 🤔 Напишите, например: «19:30», «завтра 10:00» или «25.11 18:00».');
    const r = await scheduleAt(env, chat, waitTime, Math.floor(ms / 1000));
    return say(env, chat, r.text);
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

  // альбом из нескольких фото приходит отдельными сообщениями — собираем их в одну задачу
  if (m.media_group_id) {
    const key = `tgpost:mg:${m.media_group_id}`;
    const cur = JSON.parse(await env.STORE.get(key) || 'null');
    const next = { files: [...(cur?.files || []), photo].filter(Boolean), text: [cur?.text, describeMessage(m)].filter(Boolean).join('\n') };
    await env.STORE.put(key, JSON.stringify(next), { expirationTtl: 600 });
    if (cur) return;
    await new Promise((r) => setTimeout(r, 4000));
    const all = JSON.parse(await env.STORE.get(key) || 'null') || next;
    return startTask(env, chat, all.text, all.files);
  }
  if (!t && !photo) return say(env, chat, 'Напишите задачу текстом или выберите кнопку в меню 👇');
  if (t === BTN_NEW_GAME) {
    const err = await dispatchAgent(env, { mode: 'new_game', task: 'Найди у поставщика новую игру, которой нет в канале, и сделай пост.' });
    return err ? say(env, chat, `⚠️ Не получилось запустить: ${err}`) : waitMark(env, chat);
  }
  return startTask(env, chat, describeMessage(m), photo ? [photo] : []);
}

async function startTask(env, chat, text, files) {
  const waiting = await env.STORE.get('tgpost:await');
  if (waiting) {
    await setStatus(env, waiting, { feedback: [...(JSON.parse(await env.STORE.get(`tgpost:post:${waiting}`) || '{}').feedback || []), text] });
    await env.STORE.delete('tgpost:await');
    const err = await dispatchAgent(env, { mode: 'edit', post: waiting, task: text, files: files.join(',') });
    return err ? say(env, chat, `⚠️ Не получилось запустить правки: ${err}`) : waitMark(env, chat);
  }
  const err = await dispatchAgent(env, { mode: 'task', task: text, files: files.join(',') });
  return err ? say(env, chat, `⚠️ Не получилось запустить: ${err}`) : waitMark(env, chat);
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
  await env.STORE.put('tgpost:pending', JSON.stringify({ post, chat, ctrl: c.result?.message_id, ts: Date.now() }), { expirationTtl: 60 * 60 * 48 });
  await setStatus(env, post, { status: 'pending' });
  return json({ ok: true }, 200);
}

async function handleAgentSay(req, env) {
  if (!(await agentAuth(req, env))) return json({ ok: false }, 403);
  const { text } = await req.json().catch(() => ({}));
  if (!text) return json({ ok: false }, 400);
  await clearWait(env);
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
  return out;
}
function parseTime(text) {
  const s = text.toLowerCase().replace(/\s+/g, ' ').trim();
  const tm = s.match(/(\d{1,2})[:.\s-](\d{2})\s*$/) || s.match(/^(?:в\s*)?(\d{1,2})\s*$/);
  if (!tm) return null;
  const h = Number(tm[1]), mi = Number(tm[2] || 0);
  if (h > 23 || mi > 59) return null;
  const now = Date.now(), t = tashkentParts(now);
  const date = s.match(/(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?\s/);
  let ms;
  if (date) {
    const y = date[3] ? (Number(date[3]) < 100 ? 2000 + Number(date[3]) : Number(date[3])) : t.y;
    ms = fromTashkent(y, Number(date[2]) - 1, Number(date[1]), h, mi);
    if (!date[3] && ms < now) ms = fromTashkent(y + 1, Number(date[2]) - 1, Number(date[1]), h, mi);
  } else {
    const shift = /послезавтра/.test(s) ? 2 : /завтра/.test(s) ? 1 : 0;
    ms = fromTashkent(t.y, t.mo, t.d + shift, h, mi);
    if (!shift && ms < now) ms += 24 * 3600 * 1000; // время уже прошло — значит завтра
  }
  return ms;
}
async function scheduleAt(env, chat, post, sec) {
  const ms = sec * 1000;
  if (!/^[\w.-]{1,80}$/.test(post || '') || !ms) return { ok: false, text: 'Не понял, какой пост' };
  if (ms < Date.now() + 2 * 60 * 1000) return { ok: false, text: 'Это время уже прошло, выберите позже' };
  if (ms > Date.now() + 360 * 24 * 3600 * 1000) return { ok: false, text: 'Слишком далеко, максимум год' };
  const gh = await env.STORE.get('tgpost:gh');
  const at = new Date(ms).toISOString().slice(0, 16) + 'Z';
  const r = await fetch(`https://api.github.com/repos/${AUTOPOST_REPO}/actions/workflows/post.yml/dispatches`, {
    method: 'POST', headers: { ...ghHeaders(gh), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: 'main', inputs: { post, target: 'psshopgo', at } }),
  });
  if (r.status !== 204) return { ok: false, text: `Не получилось (GitHub ${r.status})` };
  await env.STORE.delete('tgpost:awaittime');
  await setStatus(env, post, { status: 'scheduled', at });
  const text = `🕒 Пост запланирован на ${fmtTashkent(ms)}. Он появится в канале сам. Изменить или отменить можно в канале: «Отложенные сообщения».`;
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
    if (req.method === 'GET' && pathname === '/tgpost/file') return handleAgentFile(req, env);
    if (req.method === 'GET' && pathname === '/tgpost/emoji-map') return handleAgentEmoji(req, env);
    if (req.method === 'GET' && (pathname === '/tgpost/setup' || pathname === '/tgpost/emoji' || pathname === '/tgpost/status')) return handleTgPostSetup(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    if (req.method === 'POST' && pathname === '/order') return handleOrder(req, env, h, ctx);
    if (req.method === 'POST' && pathname === '/event') return handleEvent(req, env, h);
    if (req.method === 'POST' && pathname === '/visit') return handleVisit(req, env, h, ctx);
    if (req.method === 'GET' && pathname === '/hits') return handleHits(env, h);
    if (req.method === 'GET' && pathname === '/') return new Response('PS SHOP worker: ok', { headers: h });
    return json({ ok: false }, 404, h);
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runCatalogUpdate(env));
  },
};
