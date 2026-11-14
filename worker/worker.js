/**
 * PS SHOP — Cloudflare Worker.
 *
 * 1. POST /order  — принимает заявку с сайта и отправляет её Наилю в Telegram-бота.
 * 2. POST /event  — считает, какие игры чаще кладут в корзину (для полки «Хиты»).
 *    GET  /hits   — отдаёт эти счётчики сборщику сайта.
 * 3. По расписанию (каждые 10 минут) запускает в GitHub обновление каталога из канала.
 *
 * Настройки (Cloudflare → Workers → psshop → Settings → Variables and Secrets):
 *   BOT_TOKEN   секрет: токен бота от @BotFather
 *   CHAT_ID     кому слать заявки (ID Наиля)
 *   GH_TOKEN    секрет: ключ GitHub с правом запускать Actions в репозитории
 *   GH_REPO     naildominant/Ps-shop-test
 *   ALLOWED     адреса сайта через запятую (https://psshop.uz,https://www.psshop.uz)
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

async function handleOrder(req, env, h) {
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

export default {
  async fetch(req, env) {
    const h = cors(req, env);
    const { pathname } = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    if (req.method === 'POST' && pathname === '/order') return handleOrder(req, env, h);
    if (req.method === 'POST' && pathname === '/event') return handleEvent(req, env, h);
    if (req.method === 'GET' && pathname === '/hits') return handleHits(env, h);
    if (req.method === 'GET' && pathname === '/') return new Response('PS SHOP worker: ok', { headers: h });
    return json({ ok: false }, 404, h);
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runCatalogUpdate(env));
  },
};
