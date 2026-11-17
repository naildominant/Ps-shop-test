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

  // Сообщение владельца боту: премиум-эмодзи или ответ «что поменять» после отмены
  const m = u.message;
  if (m && String(m.from?.id) === owner) {
    const t = m.text || m.caption || '';
    const ents = (m.entities || m.caption_entities || []).filter((e) => e.type === 'custom_emoji');
    const waiting = env.STORE ? await env.STORE.get('tgpost:await') : null;
    if (waiting && t && !t.startsWith('/')) {
      const key = `tgpost:post:${waiting}`;
      const cur = JSON.parse(await env.STORE.get(key) || '{}');
      await setStatus(env, waiting, { feedback: [...(cur.feedback || []), t] });
      return json({ method: 'sendMessage', chat_id: m.chat.id, text: 'Принял ✅ Передал дизайнеру, он пришлёт новую версию.' }, 200);
    }
    let saved = 0;
    for (const e of ents) {
      const ch = t.slice(e.offset, e.offset + e.length); // в JS строки уже в UTF-16
      if (env.STORE) { await env.STORE.put(`emoji:${ch}`, e.custom_emoji_id); saved++; }
    }
    const text = saved ? `Запомнил премиум-эмодзи: ${saved} ✅` : 'Пришлите премиум-эмодзи, я их запомню для постов.';
    return json({ method: 'sendMessage', chat_id: m.chat.id, text }, 200);
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
      await tg(env, 'editMessageText', { chat_id: pend.chat, message_id: pend.ctrl, text: '✅ Пост вышел в канале', reply_markup: kb([[{ text: 'Открыть пост', url: link }]]) });
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
    await tg(env, 'sendMessage', { chat_id: chat, reply_to_message_id: mid, text: '❌ Пост отменён. Что поменять? Напишите ответом одним сообщением: картинка, текст, цены…' });
    return json({ method: 'answerCallbackQuery', callback_query_id: q.id, text: 'Отменено' }, 200);
  }
  if (action === 'go') return publishAsOwner(env, q, chat, mid, post);
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
    await tg(env, 'editMessageReplyMarkup', { chat_id: chat, message_id: mid, reply_markup: kb([[{ text: '✅ Опубликовать', callback_data: `go::${post}` }], [{ text: '❌ Нужна доработка', callback_data: `no::${post}` }]]) });
    return answer(`Не получилось запустить публикацию (GitHub ${r.status})`, true);
  }
  // pending остаётся: когда пост появится в канале, обработчик channel_post сменит кнопки на «✅ Пост вышел»
  await setStatus(env, post, { status: 'publishing' });
  return answer('Публикую, через ~30 секунд пост будет в канале');
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
