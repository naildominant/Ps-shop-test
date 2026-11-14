/* PS SHOP — поведение страниц. Без библиотек. */
(() => {
  'use strict';
  const PS = window.PS || {};
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => Number(n).toLocaleString('ru-RU').replace(/\s/g, ' ');
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* приватный режим */ } },
  };
  const track = (name, params) => { try { window.psTrack && window.psTrack(name, params); } catch { /* */ } };

  /* ---------- уведомление ---------- */
  let toastT;
  function toast(msg) {
    const t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('is-on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('is-on'), 2200);
  }

  /* ---------- каталог (данные) ---------- */
  let CATALOG = null;
  let catalogP = null;
  function loadCatalog() {
    if (!catalogP) {
      catalogP = fetch('/static/catalog.json').then((r) => r.json()).then((rows) => {
        CATALOG = rows; CATALOG.byId = Object.fromEntries(rows.map((r) => [r.id, r])); return CATALOG;
      });
    }
    return catalogP;
  }

  /* ---------- корзина ---------- */
  let cart = store.get('ps.cart', []);
  const keyOf = (i) => `${i.id}|${i.opt}`;
  const has = (id, opt) => cart.some((i) => i.id === id && i.opt === opt);
  function info(i) {
    const g = CATALOG && CATALOG.byId[i.id];
    if (!g) return null;
    const o = g.o.find((x) => x[0] === i.opt) || g.o[0];
    return { title: g.t, opt: o[0], price: o[1], cover: g.k === 'sub' ? null : `/static/covers/sm/${g.id}.webp`, href: g.k === 'sub' ? '/subscriptions/' : `/game/${g.id}/` };
  }
  function save() {
    if (CATALOG) cart = cart.filter((i) => info(i));
    store.set('ps.cart', cart);
    const c = $('#cart-count');
    if (c) { c.textContent = cart.length; c.hidden = !cart.length; }
    $$('[data-add]').forEach(syncBtn);
  }
  function syncBtn(b) {
    const on = has(b.dataset.add, b.dataset.opt);
    b.classList.toggle('is-in', on);
    if (b.classList.contains('card-add')) {
      b.innerHTML = on ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
    } else if (b.dataset.label) b.textContent = on ? 'В корзине' : b.dataset.label;
  }
  function add(id, opt, quiet) {
    if (has(id, opt)) return false;
    cart.push({ id, opt }); save();
    track('add_to_cart', { game: id, option: opt });
    if (!quiet) loadCatalog().then(() => { const x = info({ id, opt }); toast(x ? `${x.title} в корзине` : 'Добавлено в корзину'); });
    return true;
  }

  const drawer = $('#cart'); const scrim = $('#scrim');
  function openCart() {
    loadCatalog().then(() => { save(); renderCart(); });
    drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false'); drawer.removeAttribute('inert');
    scrim.hidden = false; document.body.style.overflow = 'hidden';
    track('cart_open');
    setTimeout(() => drawer.querySelector('[data-close-cart]').focus(), 50);
  }
  function closeCart() {
    drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true'); drawer.setAttribute('inert', '');
    scrim.hidden = true; document.body.style.overflow = '';
  }
  const total = () => cart.reduce((s, i) => s + (info(i)?.price || 0), 0);

  function renderCart() {
    const body = $('#cart-body');
    if (!cart.length) {
      body.innerHTML = `<div class="cart-empty"><p>В корзине пока пусто</p><a class="btn btn-main" href="/catalog/">Открыть каталог</a></div>`;
      return;
    }
    const me = store.get('ps.me', {});
    const lines = cart.map((i) => {
      const x = info(i);
      return `<div class="line"><a href="${x.href}">${x.cover ? `<img src="${x.cover}" alt="" width="54" height="72" loading="lazy">` : '<span class="ph">PS+</span>'}</a>
        <div><b>${esc(x.title)}</b><span>${esc(x.opt)}</span><br><button class="line-rm" data-rm="${esc(keyOf(i))}">Убрать</button></div>
        <div class="line-price">${money(x.price)} uzs</div></div>`;
    }).join('');
    const plats = cart.map((i) => info(i).opt).filter((o) => o === 'PS4' || o === 'PS5');
    const guess = me.console || (plats.length && plats.every((o) => o === 'PS4') ? 'PS4' : plats.some((o) => o === 'PS4') ? '' : plats.length ? 'PS5' : '');
    body.innerHTML = `${lines}
      <div class="total"><span>Итого</span><b class="num">${money(total())} uzs</b></div>
      <form class="form" id="order" novalidate>
        <div class="field"><label for="o-name">Имя</label><input id="o-name" name="name" autocomplete="given-name" required value="${esc(me.name || '')}"></div>
        <div class="field"><label for="o-contact">Телефон или Telegram</label><input id="o-contact" name="contact" autocomplete="tel" placeholder="+998 90 123 45 67 или @username" required value="${esc(me.contact || '')}"></div>
        <div class="field"><fieldset><legend>Консоль</legend><div class="seg">
          <label><input type="radio" name="console" value="PS4" ${guess === 'PS4' ? 'checked' : ''}><span>PS4</span></label>
          <label><input type="radio" name="console" value="PS5" ${guess === 'PS5' ? 'checked' : ''}><span>PS5</span></label>
        </div></fieldset></div>
        <div class="hp" aria-hidden="true"><label for="o-site">Сайт</label><input id="o-site" name="website" tabindex="-1" autocomplete="off"></div>
        <p class="err" id="o-err" hidden></p>
        <button class="btn btn-main btn-block" type="submit">Оформить заказ</button>
        <p class="hint">Заявка сразу придёт нам, а вы перейдёте в Telegram к менеджеру с готовым текстом заказа. Оплату обсудим там.</p>
      </form>`;
    const f = $('#order');
    f.addEventListener('focusin', () => track('form_start'), { once: true });
  }

  function orderText(d) {
    const lines = cart.map((i, n) => { const x = info(i); return `${n + 1}. ${x.title} (${x.opt}) — ${money(x.price)} uzs`; });
    return ['Здравствуйте! Хочу оформить заказ с сайта PS SHOP:', '', ...lines, '', `Итого: ${money(total())} uzs`,
      `Консоль: ${d.console}`, `Имя: ${d.name}`, `Контакт: ${d.contact}`].join('\n');
  }
  function validContact(s) {
    const digits = s.replace(/\D/g, '');
    return /^@?[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(s.trim()) || digits.length >= 9;
  }
  async function submitOrder(f) {
    const d = Object.fromEntries(new FormData(f).entries());
    Object.keys(d).forEach((k) => { d[k] = String(d[k] || '').trim(); });
    const err = $('#o-err'); const bad = [];
    $$('input', f).forEach((i) => i.removeAttribute('aria-invalid'));
    if (d.name.length < 2) bad.push(['#o-name', 'Напишите имя']);
    if (!validContact(d.contact)) bad.push(['#o-contact', 'Укажите телефон или Telegram @username']);
    if (!d.console) bad.push([null, 'Выберите консоль: PS4 или PS5']);
    if (bad.length) {
      bad.forEach(([s]) => s && $(s).setAttribute('aria-invalid', 'true'));
      err.textContent = bad.map((b) => b[1]).join('. '); err.hidden = false;
      (bad[0][0] ? $(bad[0][0]) : $('input[name=console]', f)).focus();
      return;
    }
    err.hidden = true;
    if (d.website) return; // ловушка для ботов
    store.set('ps.me', { name: d.name, contact: d.contact, console: d.console });
    const text = orderText(d);
    const items = cart.map((i) => { const x = info(i); return { id: i.id, title: x.title, option: x.opt, price: x.price }; });
    track('order_submit', { total: total(), items: items.length });
    if (PS.orderApi) {
      try {
        fetch(PS.orderApi, { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
          body: JSON.stringify({ name: d.name, contact: d.contact, console: d.console, items, total: total(), page: location.pathname, website: d.website }) })
          .catch(() => {});
      } catch { /* заявка всё равно уйдёт текстом в Telegram */ }
    }
    try { navigator.clipboard?.writeText(text).catch(() => {}); } catch { /* */ }
    const url = `${PS.manager}?text=${encodeURIComponent(text)}`;
    $('#cart-body').innerHTML = `<div class="done"><h3>Заявка принята</h3>
      <p>Сейчас откроется Telegram с текстом заказа. Отправьте его менеджеру, и мы сразу ответим.</p>
      <a class="btn btn-main btn-block" href="${url}" target="_blank" rel="noopener" data-track="tg_after_order">Открыть Telegram</a>
      <p class="hint">Текст заказа мы скопировали. Если он не подставился, вставьте его в чат.</p></div>`;
    cart = []; save();
    track('tg_redirect');
    setTimeout(() => { location.href = url; }, 700);
  }

  /* ---------- события ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-add],[data-order],[data-rm],[data-close-cart],.opt,[data-track],[data-f]');
    if (!t) return;
    if (t.matches('[data-add]')) { e.preventDefault(); if (!add(t.dataset.add, t.dataset.opt)) openCart(); }
    else if (t.matches('[data-order]')) { add(t.dataset.order, t.dataset.opt, true); openCart(); track('order_click', { game: t.dataset.order }); }
    else if (t.matches('[data-rm]')) { cart = cart.filter((i) => keyOf(i) !== t.dataset.rm); save(); renderCart(); }
    else if (t.matches('[data-close-cart]')) closeCart();
    else if (t.matches('.opt')) {
      $$('.opt').forEach((b) => b.setAttribute('aria-checked', String(b === t)));
      $('#buy-price').innerHTML = `${money(t.dataset.price)}<small>uzs</small>`;
      $$('.buy [data-opt]').forEach((b) => { b.dataset.opt = t.dataset.key; if (b.dataset.add) syncBtn(b); });
    } else if (t.matches('[data-track]')) track(t.dataset.track);
  });
  $('#cart-open')?.addEventListener('click', openCart);
  scrim?.addEventListener('click', closeCart);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawer.classList.contains('is-open')) closeCart(); });
  $('#cart-body')?.addEventListener('submit', (e) => { if (e.target.id === 'order') { e.preventDefault(); submitOrder(e.target); } });
  document.addEventListener('click', (e) => { const a = e.target.closest('a[href^="https://t.me/"]'); if (a) track('tg_click', { href: a.getAttribute('href').split('?')[0] }); });

  /* поиск в шапке (на телефоне раскрывается) */
  const so = $('#search-open');
  so?.addEventListener('click', () => {
    const s = $('#search'); const open = !s.classList.contains('is-open');
    s.classList.toggle('is-open', open); so.setAttribute('aria-expanded', String(open)); if (open) $('#search-q').focus();
  });

  /* ---------- таймер GTA 6 ---------- */
  const timer = $('#timer');
  if (timer) {
    const to = new Date(timer.dataset.to).getTime();
    const cells = Object.fromEntries($$('[data-u]', timer).map((b) => [b.dataset.u, b]));
    const pad = (n) => String(n).padStart(2, '0');
    const tick = () => {
      let s = Math.max(0, Math.floor((to - Date.now()) / 1000));
      if (s === 0) { timer.hidden = true; $('#timer-done').hidden = false; return false; }
      const d = Math.floor(s / 86400); s -= d * 86400; const h = Math.floor(s / 3600); s -= h * 3600; const m = Math.floor(s / 60); s -= m * 60;
      cells.d.textContent = d; cells.h.textContent = pad(h); cells.m.textContent = pad(m); cells.s.textContent = pad(s);
      return true;
    };
    if (tick()) { const iv = setInterval(() => { if (!tick()) clearInterval(iv); }, 1000); }
  }

  /* ---------- поиск: алиасы + опечатки ---------- */
  const norm = (s) => String(s).toLowerCase().replace(/ё/g, 'е').replace(/[’'`]/g, '').replace(/[^a-z0-9а-я]+/g, ' ').trim();
  function dist(a, b, max) { // расстояние Дамерау-Левенштейна с ранним выходом
    if (Math.abs(a.length - b.length) > max) return max + 1;
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      let rowMin = Infinity;
      for (let j = 1; j <= b.length; j++) {
        const c = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        rowMin = Math.min(rowMin, d[i][j]);
      }
      if (rowMin > max) return max + 1;
    }
    return d[a.length][b.length];
  }
  const typo = (t, w) => { const max = w.length >= 7 ? 2 : w.length >= 4 ? 1 : 0; return max > 0 && (dist(t.slice(0, w.length), w, max) <= max || dist(t, w, max) <= max); };
  function matcher(q, fuzzy) {
    const words = norm(q).split(' ').filter(Boolean);
    return (g) => {
      if (!g._tok) g._tok = norm(g.s).split(' ');
      return words.every((w) => g._tok.some((t) => t.startsWith(w) || (fuzzy && typo(t, w))));
    };
  }
  // Сначала точные совпадения; исправление опечаток — только если точных нет
  const searchList = (list, q) => { const exact = list.filter(matcher(q, false)); return exact.length ? exact : list.filter(matcher(q, true)); };

  /* ---------- страница каталога ---------- */
  if (document.body.dataset.page === 'catalog') {
    const grid = $('#grid'); const found = $('#found'); const empty = $('#empty'); const more = $('#more'); const sortSel = $('#sort');
    const params = new URLSearchParams(location.search);
    let f = params.get('f') || ''; let sort = params.get('sort') || 'new'; let q = params.get('q') || ''; let limit = 48;
    sortSel.value = sort; $('#search-q').value = q;
    const plural = (n) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? 'игра' : m >= 2 && m <= 4 && (h < 10 || h >= 20) ? 'игры' : 'игр'; };
    const card = (g) => {
      const o = g.o.reduce((b, x) => (x[1] <= b[1] ? x : b), g.o[0]);
      const tags = [g.f.includes('pre') && '<span class="tag tag-pre">Предзаказ</span>', g.f.includes('hit') && '<span class="tag tag-hit">Хит</span>',
        g.f.includes('new') && !g.f.includes('pre') && '<span class="tag tag-new">Новинка</span>'].filter(Boolean).slice(0, 2).join('');
      const from = new Set(g.o.map((x) => x[1])).size > 1 ? '<span class="from">от</span>' : '';
      return `<article class="card"><div class="card-media"><a class="card-img" href="/game/${g.id}/"><img src="/static/covers/sm/${g.id}.webp" alt="${esc(g.t)}" width="300" height="400" loading="lazy" decoding="async"></a>
        <div class="card-tags">${tags}</div><button class="card-add" data-add="${g.id}" data-opt="${esc(o[0])}" aria-label="В корзину: ${esc(g.t)}"></button></div>
        <div class="card-body"><span class="card-meta">${g.pl.join(' / ')}</span><a class="card-title" href="/game/${g.id}/">${esc(g.t)}</a>
        <div class="price">${from}${money(g.m)}<small>uzs</small></div></div></article>`;
    };
    const FILTER = { '': () => true, ps5: (g) => g.pl.includes('PS5'), ps4: (g) => g.pl.includes('PS4') };
    function render() {
      let list = CATALOG.filter((g) => g.k !== 'sub').filter(FILTER[f] || ((g) => g.f.includes(f)));
      if (q) list = searchList(list, q);
      if (sort === 'price') list = [...list].sort((a, b) => a.m - b.m);
      else if (sort === 'price-desc') list = [...list].sort((a, b) => b.m - a.m);
      else if (sort === 'az') list = [...list].sort((a, b) => a.t.localeCompare(b.t, 'ru'));
      found.textContent = q ? `По запросу «${q}»: ${list.length} ${plural(list.length)}` : `${list.length} ${plural(list.length)}`;
      grid.innerHTML = list.slice(0, limit).map(card).join('');
      empty.hidden = list.length > 0;
      if (!list.length) {
        $('#empty-tg').href = `${PS.manager}?text=${encodeURIComponent(`Здравствуйте! Ищу игру: ${q || ''}`)}`;
        track('not_found', { q });
      }
      more.hidden = list.length <= limit;
      $$('[data-f]').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.f === f)));
      $$('[data-add]', grid).forEach(syncBtn);
      const p = new URLSearchParams(); if (q) p.set('q', q); if (f) p.set('f', f); if (sort !== 'new') p.set('sort', sort);
      history.replaceState(null, '', `/catalog/${p.toString() ? `?${p}` : ''}`);
    }
    loadCatalog().then(render);
    $('#chips').addEventListener('click', (e) => { const c = e.target.closest('[data-f]'); if (!c) return; f = c.dataset.f; limit = 48; render(); });
    sortSel.addEventListener('change', () => { sort = sortSel.value; render(); });
    more.addEventListener('click', () => { limit += 48; render(); });
    let st;
    $('#search-q').addEventListener('input', (e) => { clearTimeout(st); st = setTimeout(() => { q = e.target.value.trim(); limit = 48; render(); if (q) track('search', { q }); }, 250); });
    $('#search').addEventListener('submit', (e) => { e.preventDefault(); });
  }

  /* старт */
  if (cart.length) loadCatalog().then(save); else save();
  $$('[data-add]').forEach(syncBtn);
})();
