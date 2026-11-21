/* PS SHOP — поведение страниц. Без библиотек. */
(() => {
  'use strict';
  const PS = window.PS || {};
  const B = PS.base || ''; // путь сайта: '' на psshop.uz, '/Ps-shop-test' на github.io
  const UZ = document.documentElement.lang === 'uz'; // узбекская версия сайта
  const P = B + (UZ ? '' : '/ru'); // узбекский — в корне сайта, русский — в /ru/
  const T = (ru, uz) => (UZ ? uz : ru);
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => Number(n).toLocaleString('ru-RU').replace(/\s/g, ' ');
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* приватный режим */ } },
  };
  let vlog = null; // журнал визита (заполняется ниже, в блоке «посещения»)
  const track = (name, params) => { try { vlog && vlog(name, params); window.psTrack && window.psTrack(name, params); } catch { /* */ } };

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
      catalogP = fetch(`${B}/static/catalog.json`).then((r) => r.json()).then((rows) => {
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
    return { title: g.t, opt: o[0], price: o[1], cover: g.k === 'sub' ? null : `${B}/static/covers/sm/${g.id}.webp`, href: g.k === 'sub' ? `${P}/subscriptions/` : `${P}/game/${g.id}/` };
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
    } else if (b.dataset.label) b.textContent = on ? T('В корзине', 'Savatda') : b.dataset.label;
  }
  function add(id, opt, quiet) {
    if (has(id, opt)) return false;
    cart.push({ id, opt }); save();
    track('add_to_cart', { game: id, option: opt });
    visit.mark('add');
    if (PS.api) { try { fetch(`${PS.api}/event`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true, body: JSON.stringify({ type: 'add', id }) }).catch(() => {}); } catch { /* */ } }
    if (!quiet) loadCatalog().then(() => { const x = info({ id, opt }); toast(x ? T(`${x.title} в корзине`, `${x.title} savatda`) : T('Добавлено в корзину', 'Savatga qo‘shildi')); });
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
      body.innerHTML = `<div class="cart-empty"><p>${T('В корзине пока пусто', 'Savat hozircha bo‘sh')}</p><a class="btn btn-main" href="${P}/catalog/">${T('Открыть каталог', 'Katalogni ochish')}</a></div>`;
      return;
    }
    const me = store.get('ps.me', {});
    const lines = cart.map((i) => {
      const x = info(i);
      return `<div class="line"><a href="${x.href}">${x.cover ? `<img src="${x.cover}" alt="" width="54" height="72" loading="lazy">` : '<span class="ph">PS+</span>'}</a>
        <div><b>${esc(x.title)}</b><span>${esc(x.opt)}</span><br><button class="line-rm" data-rm="${esc(keyOf(i))}">${T('Убрать', 'Olib tashlash')}</button></div>
        <div class="line-price">${money(x.price)} uzs</div></div>`;
    }).join('');
    const plats = cart.map((i) => info(i).opt).filter((o) => o === 'PS4' || o === 'PS5');
    const guess = me.console || (plats.length && plats.every((o) => o === 'PS4') ? 'PS4' : plats.some((o) => o === 'PS4') ? '' : plats.length ? 'PS5' : '');
    body.innerHTML = `${lines}
      <div class="total"><span>${T('Итого', 'Jami')}</span><b class="num">${money(total())} uzs</b></div>
      <form class="form" id="order" novalidate>
        <div class="field"><label for="o-name">${T('Имя', 'Ism')}</label><input id="o-name" name="name" autocomplete="given-name" required value="${esc(me.name || '')}"></div>
        <div class="field"><label for="o-contact">${T('Телефон или Telegram', 'Telefon yoki Telegram')}</label><input id="o-contact" name="contact" autocomplete="tel" placeholder="+998 90 123 45 67 ${T('или', 'yoki')} @username" required value="${esc(me.contact || '')}"></div>
        <div class="field"><fieldset><legend>${T('Консоль', 'Konsol')}</legend><div class="seg">
          <label><input type="radio" name="console" value="PS4" ${guess === 'PS4' ? 'checked' : ''}><span>PS4</span></label>
          <label><input type="radio" name="console" value="PS5" ${guess === 'PS5' ? 'checked' : ''}><span>PS5</span></label>
        </div></fieldset></div>
        <div class="hp" aria-hidden="true"><label for="o-site">Сайт</label><input id="o-site" name="website" tabindex="-1" autocomplete="off"></div>
        <p class="err" id="o-err" hidden></p>
        <button class="btn btn-main btn-block" type="submit">${T('Оформить заказ', 'Buyurtma berish')}</button>
        <p class="hint">${T('Заявка сразу придёт нам, а наш Telegram-бот пришлёт вам подтверждение. Менеджер свяжется с вами, оплату обсудим с ним.', 'Ariza darhol bizga keladi, Telegram-botimiz esa sizga tasdiq yuboradi. Menejer siz bilan bog‘lanadi, to‘lovni u bilan kelishamiz.')}</p>
      </form>`;
    const f = $('#order');
    f.addEventListener('focusin', () => track('form_start'), { once: true });
  }

  function orderText(d) {
    const lines = cart.map((i, n) => { const x = info(i); return `${n + 1}. ${x.title} (${x.opt}) — ${money(x.price)} uzs`; });
    return [T('Здравствуйте! Хочу оформить заказ с сайта PS SHOP:', 'Assalomu alaykum! PS SHOP saytidan buyurtma bermoqchiman:'), '', ...lines, '', `${T('Итого', 'Jami')}: ${money(total())} uzs`,
      `${T('Консоль', 'Konsol')}: ${d.console}`, `${T('Имя', 'Ism')}: ${d.name}`, `${T('Контакт', 'Aloqa')}: ${d.contact}`].join('\n');
  }
  // Контакт: Telegram @username или телефон. Узбекский номер: +998 и ровно 9 цифр (можно без +998 или с 8 в начале).
  // Возвращает { ok, value, why }: value — номер в виде +998 90 123 45 67.
  function checkContact(raw) {
    const s = raw.trim();
    const tg = s.replace(/^(https?:\/\/)?(t\.me\/)/i, '');
    if (/^@?[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(tg)) return { ok: true, value: tg.startsWith('@') ? tg : `@${tg}` };
    if (/[a-zA-Zа-яА-Я]/.test(s)) return { ok: false, why: 'contact' };
    let d = s.replace(/\D/g, '');
    const plus = s.startsWith('+');
    if (!plus && d.length === 10 && d.startsWith('8')) d = d.slice(1);
    if (!plus && d.length === 9) d = `998${d}`;
    if (d.startsWith('998')) {
      if (d.length !== 12) return { ok: false, why: d.length < 12 ? 'short' : 'long' };
      return { ok: true, value: `+998 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10)}` };
    }
    if (plus && d.length >= 10 && d.length <= 15) return { ok: true, value: `+${d}` }; // номер другой страны
    return { ok: false, why: d.length < 9 ? 'short' : 'contact' };
  }
  async function submitOrder(f) {
    const d = Object.fromEntries(new FormData(f).entries());
    Object.keys(d).forEach((k) => { d[k] = String(d[k] || '').trim(); });
    const err = $('#o-err'); const bad = [];
    $$('input', f).forEach((i) => i.removeAttribute('aria-invalid'));
    if (d.name.length < 2) bad.push(['#o-name', T('Напишите имя', 'Ismingizni yozing')]);
    const c = checkContact(d.contact);
    if (c.ok) { d.contact = c.value; $('#o-contact').value = c.value; }
    else if (c.why === 'short') bad.push(['#o-contact', T('Номер неполный: после +998 нужно 9 цифр, например +998 90 123 45 67', 'Raqam to‘liq emas: +998 dan keyin 9 ta raqam kerak, masalan +998 90 123 45 67')]);
    else if (c.why === 'long') bad.push(['#o-contact', T('В номере лишние цифры: после +998 нужно 9 цифр, например +998 90 123 45 67', 'Raqamda ortiqcha raqamlar bor: +998 dan keyin 9 ta raqam kerak, masalan +998 90 123 45 67')]);
    else bad.push(['#o-contact', T('Укажите телефон (+998 90 123 45 67) или Telegram @username', 'Telefon (+998 90 123 45 67) yoki Telegram @username kiriting')]);
    if (!d.console) bad.push([null, T('Выберите консоль: PS4 или PS5', 'Konsolni tanlang: PS4 yoki PS5')]);
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
    visit.mark('order', total());
    const code = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
    let url = `${PS.manager}?text=${encodeURIComponent(text)}`;
    if (PS.api) {
      url = `${PS.bot}?start=${code}`;
      try {
        fetch(`${PS.api}/order`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
          body: JSON.stringify({ name: d.name, contact: d.contact, console: d.console, items, total: total(), page: location.pathname, lang: UZ ? 'uz' : 'ru', vid: store.get('ps.vid', ''), code, website: d.website }) })
          .catch(() => {});
      } catch { /* */ }
    }
    try { navigator.clipboard?.writeText(text).catch(() => {}); } catch { /* */ }
    $('#cart-body').innerHTML = `<div class="done"><h3>${T('Заявка принята', 'Ariza qabul qilindi')}</h3>
      <p>${T('Сейчас откроется наш Telegram-бот. Нажмите в нём «Старт»: бот пришлёт подтверждение заказа, а потом сообщит, когда заказ выполнен.', 'Hozir Telegram-botimiz ochiladi. Unda «Start» tugmasini bosing: bot buyurtma tasdig‘ini yuboradi, keyin buyurtma bajarilganini xabar qiladi.')}</p>
      <a class="btn btn-main btn-block" href="${url}" target="_blank" rel="noopener" data-track="tg_after_order">${T('Получить подтверждение', 'Tasdiqni olish')}</a>
      <p class="hint">${T('Менеджер свяжется с вами. Написать ему можно прямо из бота.', 'Menejer siz bilan bog‘lanadi. Unga botdan ham yozishingiz mumkin.')}</p></div>`;
    cart = []; save();
    track('tg_redirect');
    setTimeout(() => { location.href = url; }, 900);
  }

  /* ---------- события ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-add],[data-order],[data-rm],[data-close-cart],.opt,[data-track],[data-f]');
    if (!t) return;
    if (t.matches('[data-add]')) { e.preventDefault(); if (!add(t.dataset.add, t.dataset.opt)) openCart(); }
    else if (t.matches('[data-order]')) { add(t.dataset.order, t.dataset.opt, true); openCart(); track('order_click', { game: t.dataset.order }); }
    else if (t.matches('[data-rm]')) { const it = cart.find((i) => keyOf(i) === t.dataset.rm); cart = cart.filter((i) => keyOf(i) !== t.dataset.rm); save(); renderCart(); if (it) track('remove', { game: it.id }); }
    else if (t.matches('[data-close-cart]')) closeCart();
    else if (t.matches('.opt')) {
      $$('.opt').forEach((b) => b.setAttribute('aria-checked', String(b === t)));
      $('#buy-price').innerHTML = `${t.dataset.old ? `<s>${money(t.dataset.old)}</s>` : ''}<span class="grad-text">${money(t.dataset.price)}</span><small>uzs</small>`;
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

  /* ---------- геймпад: наклон за мышкой ---------- */
  const pad = $('#pad .pad-tilt');
  if (pad && matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches) {
    let raf = 0;
    window.addEventListener('pointermove', (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const x = e.clientX / innerWidth - 0.5; const y = e.clientY / innerHeight - 0.5;
        pad.style.transform = `rotateY(${x * 28}deg) rotateX(${-y * 22}deg) translateZ(0)`;
      });
    }, { passive: true });
  }

  /* ---------- геймпад: подбросить по нажатию ---------- */
  const padBtn = $('#pad');
  if (padBtn) {
    // Вибрация: Android — через navigator.vibrate (ритм под анимацию),
    // iPhone (iOS 18+) — лёгкий системный «тик» от скрытого переключателя.
    // iPhone (iOS 18+): нажатие на системный переключатель даёт тактильный «тик».
    // Переключатель создаём прямо в обработчике нажатия, кликаем и сразу убираем.
    const iosTick = () => {
      const label = document.createElement('label');
      label.ariaHidden = 'true';
      label.style.display = 'none';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      label.appendChild(input);
      document.head.appendChild(label);
      label.click();
      document.head.removeChild(label);
    };
    const buzz = () => {
      try {
        if (navigator.vibrate) navigator.vibrate([18, 520, 40, 120, 25]);
        else { iosTick(); }
      } catch { /* вибрация недоступна — просто анимация */ }
    };
    padBtn.addEventListener('click', () => {
      if (padBtn.classList.contains('is-flying')) return;
      buzz();
      $('#pad-hint')?.classList.add('is-gone');
      padBtn.classList.add('is-flying'); track('gamepad_toss');
      setTimeout(() => padBtn.classList.remove('is-flying'), 1300);
    });
  }

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
  const norm = (s) => String(s).toLowerCase().replace(/ё/g, 'е').replace(/[’'`‘ʻ]/g, '').replace(/[^a-z0-9а-я]+/g, ' ').trim();
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
    const plural = (n) => { if (UZ) return 'ta o‘yin'; const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? 'игра' : m >= 2 && m <= 4 && (h < 10 || h >= 20) ? 'игры' : 'игр'; };
    const card = (g) => {
      const o = g.o.reduce((b, x) => (x[1] <= b[1] ? x : b), g.o[0]);
      const tags = [g.f.includes('sale') && `<span class="tag tag-sale">${T('Акция', 'Aksiya')}</span>`, g.f.includes('pre') && `<span class="tag tag-pre">${T('Предзаказ', 'Oldindan buyurtma')}</span>`, g.f.includes('hit') && `<span class="tag tag-hit">${T('Хит', 'Xit')}</span>`,
        g.f.includes('new') && !g.f.includes('pre') && `<span class="tag tag-new">${T('Новинка', 'Yangi')}</span>`].filter(Boolean).slice(0, 2).join('');
      const multi = new Set(g.o.map((x) => x[1])).size > 1;
      const from = multi && !UZ ? '<span class="from">от</span>' : '';
      return `<article class="card"><div class="card-media"><a class="card-img" href="${P}/game/${g.id}/"><img src="${B}/static/covers/sm/${g.id}.webp" alt="${esc(g.t)}" width="300" height="400" loading="lazy" decoding="async"></a>
        <div class="card-tags">${tags}</div><button class="card-add" data-add="${g.id}" data-opt="${esc(o[0])}" aria-label="${T('В корзину', 'Savatga')}: ${esc(g.t)}"></button></div>
        <div class="card-body"><span class="card-meta">${g.pl.join(' / ')}</span><a class="card-title" href="${P}/game/${g.id}/">${esc(g.t)}</a>
        <div class="price">${from}${g.od && g.od[o[0]] ? `<s>${money(g.od[o[0]])}</s>` : ''}${money(g.m)}<small>uzs${multi && UZ ? ' dan' : ''}</small></div></div></article>`;
    };
    const FILTER = { '': () => true, ps5: (g) => g.pl.includes('PS5'), ps4: (g) => g.pl.includes('PS4') };
    function render() {
      let list = CATALOG.filter((g) => g.k !== 'sub').filter(FILTER[f] || ((g) => g.f.includes(f)));
      if (q) list = searchList(list, q);
      if (sort === 'price') list = [...list].sort((a, b) => a.m - b.m);
      else if (sort === 'price-desc') list = [...list].sort((a, b) => b.m - a.m);
      else if (sort === 'az') list = [...list].sort((a, b) => a.t.localeCompare(b.t, 'ru'));
      found.textContent = q ? T(`По запросу «${q}»: ${list.length} ${plural(list.length)}`, `«${q}» bo‘yicha: ${list.length} ${plural(list.length)}`) : `${list.length} ${plural(list.length)}`;
      grid.innerHTML = list.slice(0, limit).map(card).join('');
      empty.hidden = list.length > 0;
      if (!list.length) {
        $('#empty-tg').href = `${PS.manager}?text=${encodeURIComponent(T(`Здравствуйте! Ищу игру: ${q || ''}`, `Assalomu alaykum! O‘yin qidiryapman: ${q || ''}`))}`;
        track('not_found', { q });
      }
      more.hidden = list.length <= limit;
      $$('[data-f]').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.f === f)));
      $$('[data-add]', grid).forEach(syncBtn);
      const p = new URLSearchParams(); if (q) p.set('q', q); if (f) p.set('f', f); if (sort !== 'new') p.set('sort', sort);
      history.replaceState(null, '', `${P}/catalog/${p.toString() ? `?${p}` : ''}`);
    }
    loadCatalog().then(render);
    $('#chips').addEventListener('click', (e) => { const c = e.target.closest('[data-f]'); if (!c) return; f = c.dataset.f; limit = 48; render(); track('filter', { f: c.textContent.trim() }); });
    sortSel.addEventListener('change', () => { sort = sortSel.value; render(); track('sort', { s: sortSel.selectedOptions[0]?.textContent.trim() }); });
    more.addEventListener('click', () => { limit += 48; render(); });
    let st;
    $('#search-q').addEventListener('input', (e) => { clearTimeout(st); st = setTimeout(() => { q = e.target.value.trim(); limit = 48; render(); if (q) track('search', { q }); }, 250); });
    $('#search').addEventListener('submit', (e) => { e.preventDefault(); });
  }


  /* ---------- чат-помощник ---------- */
  const chatBox = $('#chat'); const chatFab = $('#chat-fab');
  if (chatBox && chatFab) {
    const log = $('#chat-log'); const chips = $('#chat-chips'); const input = $('#chat-input');
    const QUICK = UZ ? ['Qanday sotib olaman?', 'Qanday o‘rnataman?', 'Kafolat', 'GTA 6 qancha turadi?', 'PS Plus', 'PS5 ijarasi', 'To‘lov', 'Menejerga yozish']
      : ['Как купить?', 'Как установить?', 'Гарантия', 'Сколько стоит GTA 6?', 'PS Plus', 'Аренда PS5', 'Оплата', 'Написать менеджеру'];
    const tgLink = (text) => `${PS.manager}?text=${encodeURIComponent(text)}`;
    const tgA = (text, label) => `<a href="${tgLink(text)}" target="_blank" rel="noopener" data-track="chat_to_tg">${label}</a>`;
    let opened = false;
    const say = (html, who = 'bot') => {
      const el = document.createElement('div'); el.className = `msg msg-${who}`; el.innerHTML = html; log.appendChild(el);
      log.scrollTop = log.scrollHeight; return el;
    };
    const bot = (html, extra) => {
      const t = say('…', 'bot'); t.classList.add('msg-typing');
      setTimeout(() => {
        t.remove(); say(html);
        if (extra) { const box = document.createElement('div'); box.style.display = 'contents'; box.innerHTML = extra; log.appendChild(box); $$('[data-add]', box).forEach(syncBtn); }
        log.scrollTop = log.scrollHeight;
      }, 380);
    };
    const showChips = () => { chips.innerHTML = QUICK.map((q) => `<button type="button" data-chip="${esc(q)}">${esc(q)}</button>`).join(''); };
    const open = () => {
      chatBox.hidden = false; chatFab.hidden = true; chatFab.setAttribute('aria-expanded', 'true');
      if (!opened) { opened = true; bot(T('Привет! Я помощник PS SHOP 👋\nНапишите название игры, и я покажу цену. Или выберите вопрос ниже.', 'Salom! Men PS SHOP yordamchisiman 👋\nO‘yin nomini yozing, narxini ko‘rsataman. Yoki quyidagi savollardan birini tanlang.')); showChips(); loadCatalog(); }
      track('chat_open');
      if (matchMedia('(min-width: 761px)').matches) setTimeout(() => input.focus(), 60);
    };
    const close = () => { chatBox.hidden = true; chatFab.hidden = false; chatFab.setAttribute('aria-expanded', 'false'); };
    chatFab.addEventListener('click', open);
    $('#chat-close').addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !chatBox.hidden) close(); });
    const mini = (g) => {
      const o = g.o.reduce((b, x) => (x[1] <= b[1] ? x : b), g.o[0]);
      return `<div class="mini"><a href="${P}/game/${g.id}/"><img src="${B}/static/covers/sm/${g.id}.webp" alt="" width="46" height="61"></a>
        <div><b>${esc(g.t)}</b><span>${g.o.map((x) => `${esc(x[0])}: ${money(x[1])} uzs`).join(' · ')}</span></div>
        <button class="btn btn-main" data-add="${g.id}" data-opt="${esc(o[0])}" data-label="${T('В корзину', 'Savatga')}">${T('В корзину', 'Savatga')}</button></div>`;
    };
    const answer = async (raw) => {
      const q = norm(raw); const words = q.split(' ');
      const has = (...w) => w.some((x) => (x.length <= 3 ? words.includes(x) : q.includes(x)));
      track('chat_question', { q: raw.slice(0, 80) });
      if (has('менеджер', 'оператор', 'связат', 'позвон', 'живой', 'написать', 'наиль', 'menejer', 'yozish', 'nail', 'boglan', 'aloqa')) {
        return bot(T(`Конечно! Наиль на связи 24/7: ${tgA('Здравствуйте! Пишу с сайта PS SHOP.', 'написать в Telegram')}`, `Albatta! Nail 24/7 aloqada: ${tgA('Assalomu alaykum! PS SHOP saytidan yozyapman.', 'Telegramga yozish')}`));
      }
      if (has('установ', 'скача', 'загруз', 'как играть', 'аккаунт', 'войти', 'ornat', 'yukla', 'akkaunt', 'kirish')) {
        return bot(T(`Всё просто: после оплаты мы присылаем логин и пароль, вы добавляете нового пользователя на PlayStation, заходите в Библиотеку и устанавливаете игру. Пришлём подробную инструкцию и поможем на каждом шаге.\n<a href="${P}/install/">Как происходит установка</a>`, `Hammasi oddiy: to‘lovdan keyin login va parol yuboramiz, siz PlayStation ga yangi foydalanuvchi qo‘shasiz, Kutubxonaga kirib o‘yinni o‘rnatasiz. Batafsil yo‘riqnoma yuboramiz va har bir qadamda yordam beramiz.\n<a href="${P}/install/">O‘rnatish qanday bo‘ladi</a>`));
      }
      if (has('как купить', 'как заказ', 'как оформ', 'купить', 'заказ', 'оформ', 'sotib', 'buyurtma', 'qanday olaman', 'xarid')) {
        return bot(T('1. Добавьте игру в корзину и выберите PS4 или PS5.\n2. Нажмите «Оформить заказ» и оставьте имя и телефон или Telegram.\n3. Вы перейдёте к нам в Telegram с готовым текстом заказа, а мы подключим игру дистанционно.', '1. O‘yinni savatga qo‘shing va PS4 yoki PS5 ni tanlang.\n2. «Buyurtma berish» ni bosing, ism va telefon yoki Telegramingizni qoldiring.\n3. Tayyor buyurtma matni bilan Telegramda bizga o‘tasiz, biz o‘yinni masofadan ulab beramiz.'));
      }
      if (has('гарант', 'обман', 'безопас', 'надеж', 'вернут', 'возврат', 'отзыв', 'kafolat', 'aldash', 'xavfsiz', 'ishonch', 'qaytar', 'fikr')) {
        return bot(T(`Даём гарантию работоспособности, замены или возврата и безопасности аккаунта. Работаем более 3 лет, на связи 24/7 и после покупки.\n<a href="${P}/reviews/">Отзывы клиентов</a>`, `Ishlashi, almashtirish yoki pulni qaytarish va akkaunt xavfsizligiga kafolat beramiz. 3 yildan ortiq ishlayapmiz, xariddan keyin ham 24/7 aloqadamiz.\n<a href="${P}/reviews/">Mijozlar fikrlari</a>`));
      }
      if (has('оплат', 'карт', 'click', 'payme', 'uzcard', 'humo', 'перевод', 'налич', 'предоплат', 'tolov', 'tola', 'karta', 'naqd', 'pul')) {
        return bot(T(`Оплату обсудим в Telegram при оформлении заказа: ${tgA('Здравствуйте! Подскажите, как оплатить заказ?', 'спросить про оплату')}`, `To‘lovni buyurtma paytida Telegramda kelishamiz: ${tgA('Assalomu alaykum! Buyurtmani qanday to‘lasam bo‘ladi?', 'to‘lov haqida so‘rash')}`));
      }
      if (has('аренд', 'прокат', 'напрокат', 'арендовать', 'ijara', 'ijaraga', 'prokat')) {
        return bot(T(`Аренда PS5 в Ташкенте: от 200 000 uzs в сутки при аренде на 7 дней, сутки — 300 000 uzs. Привезём, установим и настроим.\n<a href="${P}/rent/">Все цены на аренду</a> · ${tgA('Здравствуйте! Хочу арендовать PS5.', 'забронировать')}`, `Toshkentda PS5 ijarasi: 7 kunlik ijarada sutkasiga 200 000 uzs dan, 1 sutka — 300 000 uzs. Olib kelamiz, o‘rnatib, sozlab beramiz.\n<a href="${P}/rent/">Ijaraning barcha narxlari</a> · ${tgA('Assalomu alaykum! PS5 ijaraga olmoqchiman.', 'band qilish')}`));
      }
      if (has('ps plus', 'psplus', 'пс плюс', 'плюс', 'подписк', 'ea play', 'еа плей', 'essential', 'extra', 'deluxe', 'premium', 'obuna', 'plus')) {
        return bot(T(`PS Plus на 12 месяцев: Essential — 629 000, Extra — 979 000, Deluxe (Premium) — 1 268 000 uzs. Есть варианты на 1 и 3 месяца и EA Play.\n<a href="${P}/subscriptions/">Выбрать подписку</a>`, `12 oylik PS Plus: Essential — 629 000, Extra — 979 000, Deluxe (Premium) — 1 268 000 uzs. 1 va 3 oylik variantlar hamda EA Play ham bor.\n<a href="${P}/subscriptions/">Obunani tanlash</a>`));
      }
      if (has('чистк', 'почист', 'аксессуар', 'джойстик', 'геймпад', 'гарнитур', 'tozala', 'aksessuar', 'joystik', 'geympad')) {
        return bot(T(`Чистку консоли и аксессуары подберём индивидуально: ${tgA('Здравствуйте! Интересует чистка консоли или аксессуары.', 'узнать цену в Telegram')}`, `Konsolni tozalash va aksessuarlarni alohida kelishamiz: ${tgA('Assalomu alaykum! Konsolni tozalash yoki aksessuarlar qiziqtiradi.', 'narxini Telegramda bilish')}`));
      }
      if (has('привет', 'здравств', 'салам', 'добрый', 'hello', 'assalom', 'salom') && words.length <= 3) {
        return bot(T('Привет! Какую игру ищете? Напишите название, например «FC 26» или «человек паук».', 'Salom! Qaysi o‘yinni qidiryapsiz? Nomini yozing, masalan «FC 26» yoki «spider man».'));
      }
      await loadCatalog();
      const STOP = new Set(['сколько', 'стоит', 'стоят', 'цена', 'цену', 'есть', 'ли', 'у', 'вас', 'игра', 'игру', 'игры', 'хочу', 'на', 'для', 'ps5', 'ps4', 'пс5', 'пс4', 'а', 'и', 'в', 'подскажите', 'пожалуйста', 'какая', 'наличии', 'нужна', 'нужен', 'qancha', 'turadi', 'narxi', 'narx', 'bormi', 'bor', 'uchun', 'oyin', 'kerak', 'iltimos', 'necha']);
      const w = words.filter((x) => x && !STOP.has(x));
      if (w.length) {
        const list = searchList(CATALOG.filter((g) => g.k !== 'sub'), w.join(' '));
        if (list.length) {
          const top = list.slice(0, 4);
          return bot(top.length === 1 ? T('Нашёл:', 'Topdim:') : T(`Вот что нашлось (${list.length}):`, `Mana nimalar topildi (${list.length}):`),
            top.map(mini).join('') + (list.length > 4 ? `<a class="btn btn-sm" href="${P}/catalog/?q=${encodeURIComponent(w.join(' '))}" style="align-self:flex-start">${T('Показать все', 'Hammasini ko‘rsatish')}</a>` : ''));
        }
      }
      track('chat_not_found', { q: raw.slice(0, 80) });
      return bot(T(`Не нашёл такой игры на сайте, но Наиль найдёт её за 10 минут: ${tgA(`Здравствуйте! Ищу игру: ${raw}`, 'написать в Telegram')}`, `Saytda bunday o‘yinni topmadim, lekin Nail uni 10 daqiqada topadi: ${tgA(`Assalomu alaykum! O‘yin qidiryapman: ${raw}`, 'Telegramga yozish')}`));
    };
    const ask = (text) => { text = text.trim(); if (!text) return; say(esc(text), 'me'); answer(text); };
    chips.addEventListener('click', (e) => { const b = e.target.closest('[data-chip]'); if (b) ask(b.dataset.chip); });
    $('#chat-form').addEventListener('submit', (e) => { e.preventDefault(); ask(input.value); input.value = ''; });
  }

  /* ---------- язык ---------- */
  const langBtn = $('#lang-btn');
  langBtn?.addEventListener('click', () => { store.set('ps.lang2', UZ ? 'ru' : 'uz'); track('lang_switch', { to: UZ ? 'ru' : 'uz' }); });

  /* ---------- посещения (анонимно) -> CRM-таблица ---------- */
  // Один визит = одна строка в таблице «Посетители». Без имён и телефонов: случайный номер посетителя,
  // откуда пришёл, путь по страницам, поиски, вопросы в чат, корзина, заказ.
  const visit = (() => {
    const bot = navigator.webdriver || /bot|crawl|spider|slurp|lighthouse|headless|preview/i.test(navigator.userAgent);
    if (bot || !PS.api) return { mark() {} };
    const rnd = () => Math.random().toString(36).slice(2, 10);
    const now = Date.now();
    let vid = store.get('ps.vid', null);
    if (!vid) { vid = rnd(); store.set('ps.vid', vid); }
    let s = store.get('ps.sess', null);
    if (!s || !s.ev || now - s.last > 30 * 60 * 1000) { // новый визит, если не заходил 30 минут
      const n = (store.get('ps.vnum', 0) || 0) + 1; store.set('ps.vnum', n);
      const q = new URLSearchParams(location.search);
      let ref = ''; try { ref = document.referrer ? new URL(document.referrer).hostname : ''; } catch { /* */ }
      if (ref === location.hostname) ref = '';
      s = { id: rnd(), start: now, n, isNew: n === 1, land: location.pathname, ref, utm: q.get('utm_source') || '', camp: q.get('utm_campaign') || '',
            pages: 0, games: [], adds: 0, order: false, total: 0, ev: [] };
    }
    const save = () => store.set('ps.sess', s);
    const NAMES = { home: 'Главная', catalog: 'Каталог', subs: 'Подписки', rent: 'Аренда PS5', install: 'Установка', reviews: 'Отзывы', about: 'О нас', promos: 'Акции' };
    const pg = document.body.dataset.page || '';
    const h1 = $('h1')?.textContent.trim() || '';
    const title = pg === 'game' ? h1 : (NAMES[pg] || h1 || location.pathname);
    const sec = () => Math.round((Date.now() - s.start) / 1000);
    const log = (k, v) => {
      const last = s.ev[s.ev.length - 1];
      // поиск по буквам («ф», «фи», «фифа») записываем одним словом
      if (k === 'search' && last && last.k === 'search' && (v.startsWith(last.v) || last.v.startsWith(v))) { last.v = v; return; }
      if (s.ev.length < 120) s.ev.push({ t: sec(), k, v: String(v ?? '').slice(0, 80) });
      save();
    };
    const gameTitle = (id) => {
      const el = document.querySelector(`[data-add="${CSS.escape(id)}"],[data-order="${CSS.escape(id)}"]`);
      const t = el?.closest('.card')?.querySelector('.card-title')?.textContent || (pg === 'game' ? h1 : '');
      return (t || id).trim();
    };
    vlog = (name, p = {}) => {
      const map = {
        add_to_cart: () => log('add', gameTitle(p.game) + (p.option ? ` (${p.option})` : '')),
        remove: () => log('rm', gameTitle(p.game)),
        cart_open: () => log('cart'), form_start: () => log('form'), order_submit: () => log('order', p.total),
        tg_click: () => log('tg', p.href), tg_redirect: () => log('tg', 'менеджер после заказа'),
        search: () => log('search', p.q), not_found: () => log('notfound', p.q),
        chat_open: () => log('chat_open'), chat_question: () => log('chat', p.q),
        lang_switch: () => log('lang', p.to), gamepad_toss: () => log('pad'),
        filter: () => log('filter', p.f), sort: () => log('sort', p.s), gameplay: () => log('video'),
      };
      map[name]?.();
    };
    s.pages += 1; s.last = now;
    if (pg === 'game' && h1 && !s.games.includes(h1)) s.games.push(h1);
    log('page', title);
    const pageEv = s.ev[s.ev.length - 1];
    let depth = 0;
    addEventListener('scroll', () => {
      const h = document.documentElement.scrollHeight - innerHeight;
      const d = h > 0 ? Math.min(100, Math.round(scrollY / h * 100)) : 100;
      if (d > depth) { depth = d; pageEv.d = d; }
    }, { passive: true });
    save();
    let sent = '';
    const send = () => {
      s.last = Date.now(); save();
      const ua = navigator.userAgent;
      const body = JSON.stringify({ sid: s.id, vid, n: s.n, isNew: s.isNew, start: s.start, dur: sec(),
        land: s.land, ref: s.ref, utm: s.utm, camp: s.camp, pages: s.pages, games: s.games.slice(0, 15), adds: s.adds,
        order: s.order, total: s.total, lang: UZ ? 'uz' : 'ru', mobile: matchMedia('(pointer:coarse)').matches,
        os: (/iPhone|iPad/.test(ua) && 'iOS') || (/Android/.test(ua) && 'Android') || (/Windows/.test(ua) && 'Windows') || (/Mac/.test(ua) && 'Mac') || 'другое',
        tg: /Telegram/i.test(ua) || typeof window.TelegramWebview !== 'undefined', ig: /Instagram/i.test(ua),
        scr: `${screen.width}x${screen.height}`, ev: s.ev });
      if (body === sent) return; sent = body;
      try { navigator.sendBeacon(`${PS.api}/visit`, new Blob([body], { type: 'text/plain' })); } catch { /* */ }
    };
    addEventListener('pagehide', send);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') send(); });
    return { mark(k, v) { if (k === 'add') s.adds += 1; if (k === 'order') { s.order = true; s.total = v || 0; } save(); if (k === 'order') setTimeout(send, 50); } };
  })();

  /* старт */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  if (cart.length) loadCatalog().then(save); else save();
  $$('[data-add]').forEach(syncBtn);
})();
