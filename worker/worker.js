/**
 * PS SHOP — Cloudflare Worker.
 *
 * 1. POST /order  — принимает заявку с сайта и отправляет её Наилю в Telegram-бота.
 * 2. POST /event  — считает, какие игры чаще кладут в корзину (для полки «Хиты»).
 *    GET  /hits   — отдаёт эти счётчики сборщику сайта.
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

async function toSheet(env, o) {
  if (!env.SHEET_URL) return;
  const items = (o.items || []).slice(0, 30).map((i) => `${i.title} (${i.option}) — ${money(i.price)} uzs`).join('\n');
  await fetch(env.SHEET_URL, {
    method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow',
    body: JSON.stringify({ token: env.SHEET_TOKEN || '', name: o.name, contact: o.contact, console: o.console, items, total: o.total, lang: o.lang || 'ru' }),
  }).catch(() => {});
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

  const q = u.callback_query;
  if (!q) return new Response('ok');
  if (String(q.from?.id) !== owner) return json({ method: 'answerCallbackQuery', callback_query_id: q.id, text: 'Нет доступа' }, 200);
  const chat = q.message.chat.id, mid = q.message.message_id;
  const [action, photoId, post] = String(q.data || '').split(':');

  if (action === 'no') {
    await tg(env, 'editMessageReplyMarkup', { chat_id: chat, message_id: mid, reply_markup: kb([[{ text: '❌ Отменено', callback_data: 'x' }]]) });
    await setStatus(env, post, { status: 'cancelled', feedback: [] });
    if (env.STORE && post) await env.STORE.put('tgpost:await', post, { expirationTtl: 60 * 60 * 24 * 3 });
    await tg(env, 'sendMessage', { chat_id: chat, reply_to_message_id: mid, text: '❌ Пост отменён. Что поменять? Напишите ответом одним сообщением: картинка, текст, цены…' });
    return json({ method: 'answerCallbackQuery', callback_query_id: q.id, text: 'Отменено' }, 200);
  }
  if (action !== 'pub') return json({ method: 'answerCallbackQuery', callback_query_id: q.id }, 200);

  const lock = `pub:${chat}:${mid}`;
  if (env.STORE && await env.STORE.get(lock)) return json({ method: 'answerCallbackQuery', callback_query_id: q.id, text: 'Уже опубликовано' }, 200);
  if (env.STORE) await env.STORE.put(lock, '1', { expirationTtl: 60 * 60 * 24 * 30 });

  // убираем кнопки с превью, чтобы они не скопировались, и копируем пост в канал
  await tg(env, 'editMessageReplyMarkup', { chat_id: chat, message_id: mid, reply_markup: kb([[{ text: '⏳ Публикую…', callback_data: 'x' }]]) });
  await tg(env, 'editMessageReplyMarkup', { chat_id: chat, message_id: mid, reply_markup: kb([]) });
  const channel = env.TGPOST_CHANNEL || '@psshopgo';
  const ids = photoId ? [Number(photoId), mid] : [mid];
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
  await setStatus(env, post, { status: 'published', link });
  if (env.STORE && post && (await env.STORE.get('tgpost:await')) === post) await env.STORE.delete('tgpost:await');
  await tg(env, 'editMessageReplyMarkup', { chat_id: chat, message_id: mid, reply_markup: kb([[{ text: '✅ Опубликовано — открыть', url: link }]]) });
  return json({ method: 'answerCallbackQuery', callback_query_id: q.id, text: 'Опубликовано в канале ✅' }, 200);
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
  const r = await tg(env, 'setWebhook', { url: `${origin}/tgpost`, secret_token: env.TGPOST_SECRET, allowed_updates: ['message', 'callback_query'] }, token);
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
    url: `${url.origin}/tgpost`, secret_token: env.TGPOST_SECRET,
    allowed_updates: ['message', 'callback_query'], drop_pending_updates: false,
  });
  return json(r, 200);
}

export default {
  async fetch(req, env, ctx) {
    const h = cors(req, env);
    const { pathname } = new URL(req.url);
    if (req.method === 'POST' && pathname === '/tgpost') return handleTgPost(req, env, ctx);
    if (req.method === 'POST' && pathname === '/tgpost/register') return handleTgPostRegister(req, env);
    if (req.method === 'GET' && (pathname === '/tgpost/setup' || pathname === '/tgpost/emoji' || pathname === '/tgpost/status')) return handleTgPostSetup(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    if (req.method === 'POST' && pathname === '/order') return handleOrder(req, env, h, ctx);
    if (req.method === 'POST' && pathname === '/event') return handleEvent(req, env, h);
    if (req.method === 'GET' && pathname === '/hits') return handleHits(env, h);
    if (req.method === 'GET' && pathname === '/') return new Response('PS SHOP worker: ok', { headers: h });
    return json({ ok: false }, 404, h);
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runCatalogUpdate(env));
  },
};
