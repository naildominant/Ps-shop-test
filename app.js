/* PS SHOP — витрина игр. Чистый JS, без сборки. Данные: games.js (window.GAMES). */
(() => {
  'use strict';

  const MANAGER = 'Gaynullin_Nail';
  const CHANNEL = 'psshopgo';
  const TG_MANAGER = `https://t.me/${MANAGER}`;
  const TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);

  const SUBS = [
    { id: 'ps-plus-essential', title: 'PS Plus Essential · 12 мес', price: 629000, group: 'PS Plus',
      perks: ['Онлайн-игра с друзьями', 'Ежемесячные игры', 'Облачные сохранения'] },
    { id: 'ps-plus-extra', title: 'PS Plus Extra · 12 мес', price: 979000, group: 'PS Plus', featured: true,
      perks: ['Всё из Essential', 'Каталог сотен игр PS4 и PS5', 'Больше 500 игр по подписке'] },
    { id: 'ps-plus-deluxe', title: 'PS Plus Deluxe (Premium) · 12 мес', price: 1268000, group: 'PS Plus',
      perks: ['Всё из Extra', 'Классические игры', 'Пробные версии новинок'] },
    { id: 'ea-play-1', title: 'EA Play · 1 мес', price: 179000, group: 'EA Play',
      perks: ['EA SPORTS FC, NHL, F1, UFC', 'Need for Speed, Battlefield', 'It Takes Two, Star Wars и др.'] },
    { id: 'ea-play-12', title: 'EA Play · 12 мес', price: 659000, group: 'EA Play', featured: true,
      perks: ['Вся коллекция EA на год', 'Выгоднее помесячной оплаты', 'Скидки на игры EA'] },
  ];
  const RENT = { id: 'ps5-rent', title: 'Аренда PlayStation 5 · сутки', price: 250000 };
  const EA_GAMES = ['EA SPORTS FC 26', 'Madden NFL 26', 'College Football 26', 'EA SPORTS FC 25', 'NHL 25', 'NHL 24', 'F1 25', 'F1 24',
    'Need for Speed Unbound', 'Need for Speed Heat', 'Need for Speed Payback', 'NFS Hot Pursuit Remastered', 'GRID Legends',
    'Burnout Paradise Remastered', 'Star Wars Jedi: Survivor', 'Star Wars Jedi: Fallen Order', 'Battlefield 2042', 'Battlefield V',
    'Battlefield 1', 'Battlefield 4', 'Titanfall 2', 'Star Wars Battlefront II', 'Star Wars Squadrons', 'UFC 4',
    'Mass Effect Legendary Edition', 'Dragon Age: Inquisition', 'It Takes Two', 'A Way Out', 'Unravel Two', 'The Sims 4',
    'Plants vs. Zombies: Garden Warfare 2', 'Lost in Random'];

  /* ---------- Data ---------- */
  const parseDate = (s) => { if (!s) return null; const [d, m, y] = s.split('.').map(Number); return new Date(y, m - 1, d); };
  const GAMES = (window.GAMES || []).map((g) => {
    const rel = parseDate(g.release);
    const options = g.editions
      ? g.editions.map((e) => ({ key: e.name, label: e.name, sub: 'PS5', price: e.price }))
      : [g.ps4 && { key: 'PS4', label: 'PS4', sub: 'PlayStation 4', price: g.ps4 }, g.ps5 && { key: 'PS5', label: 'PS5', sub: 'PlayStation 5', price: g.ps5 }].filter(Boolean);
    const platforms = g.editions ? ['PS5'] : options.map((o) => o.key);
    const text = `${g.title} ${g.notes ? g.notes.join(' ') : ''}`;
    return {
      ...g,
      options,
      platforms,
      min: Math.min(...options.map((o) => o.price)),
      preorder: !!(g.preorder && (!rel || rel > TODAY)),
      upcoming: rel && rel > TODAY ? rel : null,
      vr: /\bVR2?\b|VR\)/i.test(text),
      coop: !!(g.players && /[–-]\s*\d/.test(g.players)),
      voice: g.lang === 'Русская озвучка',
      ru: /Русск/.test(g.lang || ''),
      search: norm(`${g.title} ${aliases(g.title)}`),
      tokens: norm(`${g.title} ${aliases(g.title)}`).split(' '),
    };
  });
  const byId = Object.fromEntries(GAMES.map((g) => [g.id, g]));

  function matchWord(g, w) { return g.tokens.some((t) => t.startsWith(w)); }
  function bestOpt(g) { return g.options.reduce((b, o) => (o.price <= b.price ? o : b), g.options[0]); }
  function norm(s) { return String(s).toLowerCase().replace(/ё/g, 'е').replace(/[’'`]/g, '').replace(/[^a-z0-9а-я]+/g, ' ').trim(); }
  function aliases(t) {
    const a = [];
    if (/GRAND THEFT AUTO|GTA/i.test(t)) a.push('гта gta grand theft auto');
    if (/\bVI\b/.test(t)) a.push('6');
    if (/CALL OF DUTY/i.test(t)) a.push('cod колда кол оф дьюти');
    if (/SPIDER/i.test(t)) a.push('человек паук спайдер');
    if (/\bFC \d|FIFA/i.test(t)) a.push('фифа fifa фк');
    if (/MORTAL KOMBAT/i.test(t)) a.push('мортал комбат mk');
    if (/RESIDENT EVIL/i.test(t)) a.push('резидент ивел re');
    if (/GOD OF WAR/i.test(t)) a.push('год оф вар бог войны gow');
    if (/MINECRAFT/i.test(t)) a.push('майнкрафт');
    if (/RED DEAD/i.test(t)) a.push('рдр rdr ред дед');
    if (/LAST OF US/i.test(t)) a.push('одни из нас тлоу tlou');
    if (/ВЕДЬМАК/i.test(t)) a.push('witcher ведьмак');
    if (/CYBERPUNK/i.test(t)) a.push('киберпанк');
    if (/ASSASSIN/i.test(t)) a.push('ассасин ac');
    if (/NEED FOR SPEED/i.test(t)) a.push('нфс nfs');
    if (/UFC/i.test(t)) a.push('юфс');
    if (/HOGWARTS/i.test(t)) a.push('хогвартс гарри поттер');
    if (/NBA/i.test(t)) a.push('нба баскетбол');
    if (/TEKKEN/i.test(t)) a.push('теккен');
    if (/ELDEN/i.test(t)) a.push('элден');
    if (/GRAN TURISMO/i.test(t)) a.push('гран туризмо gt');
    return a.join(' ');
  }

  /* ---------- Utils ---------- */
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => `${Number(n).toLocaleString('ru-RU').replace(/,/g, ' ')} сум`;
  const fmtDate = (d) => d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
  };
  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('is-on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('is-on'), 2200);
  }

  /* ---------- Cart ---------- */
  let cart = store.get('psshop.cart', []);
  const itemKey = (i) => `${i.id}|${i.opt || ''}`;
  function cartItemInfo(i) {
    if (byId[i.id]) {
      const g = byId[i.id]; const o = g.options.find((x) => x.key === i.opt) || g.options[0];
      return { title: g.title, sub: g.editions ? `PS5 · ${o.label}` : o.label, price: o.price, cover: g.cover, href: `#/game/${g.id}` };
    }
    const s = SUBS.find((x) => x.id === i.id) || (i.id === RENT.id ? RENT : null);
    if (s) return { title: s.title, sub: i.id === RENT.id ? `${i.qty || 1} сут.` : 'Подписка', price: s.price * (i.qty || 1), cover: null, href: '#/subs' };
    return null;
  }
  function inCart(id, opt) { return cart.some((i) => i.id === id && (opt === undefined || i.opt === opt)); }
  function addToCart(id, opt) {
    const it = { id, opt: opt || '' };
    if (cart.some((i) => itemKey(i) === itemKey(it))) { toast('Уже в корзине'); openCart(); return; }
    cart.push(it); saveCart();
    const info = cartItemInfo(it);
    toast(`Добавлено: ${info ? info.title : 'товар'}`);
    const b = $('#cartCount'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
  }
  function removeFromCart(key) { cart = cart.filter((i) => itemKey(i) !== key); saveCart(); renderCart(); }
  function saveCart() {
    cart = cart.filter((i) => cartItemInfo(i));
    store.set('psshop.cart', cart);
    const n = cart.length, b = $('#cartCount');
    b.textContent = n; b.hidden = n === 0;
    document.querySelectorAll('[data-add]').forEach(syncAddBtn);
  }
  function syncAddBtn(btn) {
    const on = inCart(btn.dataset.add, btn.dataset.opt);
    btn.classList.toggle('is-added', on);
    if (btn.classList.contains('card__add')) btn.textContent = on ? '✓' : '+';
    else if (btn.dataset.label) btn.textContent = on ? 'В корзине ✓' : btn.dataset.label;
  }
  const cartTotal = () => cart.reduce((s, i) => s + (cartItemInfo(i)?.price || 0), 0);

  function openCart() {
    renderCart();
    $('#cart').classList.add('is-open'); $('#cart').setAttribute('aria-hidden', 'false'); $('#scrim').hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeCart() {
    $('#cart').classList.remove('is-open'); $('#cart').setAttribute('aria-hidden', 'true'); $('#scrim').hidden = true;
    document.body.style.overflow = '';
  }
  function renderCart() {
    const body = $('#cartBody');
    if (!cart.length) {
      body.innerHTML = `<div class="cart-empty"><div>🛒</div><p>Корзина пока пуста</p><a class="btn btn--primary" href="#/catalog" data-close-cart>Перейти в каталог</a></div>`;
      return;
    }
    const saved = store.get('psshop.contact', {});
    body.innerHTML = `
      ${cart.map((i) => { const x = cartItemInfo(i); return `
        <div class="citem">
          ${x.cover ? `<a href="${x.href}" data-close-cart><img src="${x.cover}" alt="" loading="lazy"></a>` : `<div class="logo__mark" style="width:64px;height:84px;border-radius:10px">PS</div>`}
          <div><b>${esc(x.title)}</b><span>${esc(x.sub)}</span><br><button class="citem__rm" data-rm="${esc(itemKey(i))}">Удалить</button></div>
          <div class="citem__price">${money(x.price)}</div>
        </div>`; }).join('')}
      <div class="total"><span>Итого</span><b>${money(cartTotal())}</b></div>
      <form class="form" id="checkoutForm" novalidate>
        <div class="field"><label for="cName">Имя</label><input id="cName" name="name" required value="${esc(saved.name || '')}" placeholder="Как к вам обращаться"></div>
        <div class="field"><label for="cPhone">Телефон</label><input id="cPhone" name="phone" type="tel" required value="${esc(saved.phone || '')}" placeholder="+998 __ ___ __ __"></div>
        <div class="field"><label for="cTg">Telegram (необязательно)</label><input id="cTg" name="tg" value="${esc(saved.tg || '')}" placeholder="@username"></div>
        <div class="field"><label for="cNote">Комментарий</label><textarea id="cNote" name="note" placeholder="Например: какая у вас консоль, удобное время для подключения"></textarea></div>
        <button class="btn btn--primary btn--block" type="submit">Оформить заказ</button>
        <p class="hint">Заказ отправится менеджеру PS SHOP в Telegram. Он подтвердит наличие, цену и способ оплаты, а затем подключит игру дистанционно.</p>
      </form>`;
  }
  function orderText(f) {
    const lines = cart.map((i, n) => { const x = cartItemInfo(i); return `${n + 1}. ${x.title} (${x.sub}) — ${money(x.price)}`; });
    return [
      'Здравствуйте! Хочу оформить заказ с сайта PS SHOP:', '', ...lines, '', `Итого: ${money(cartTotal())}`, '',
      `Имя: ${f.name}`, `Телефон: ${f.phone}`, f.tg ? `Telegram: ${f.tg}` : '', f.note ? `Комментарий: ${f.note}` : '',
    ].filter((l, idx, arr) => l !== '' || (arr[idx - 1] !== '' && idx < arr.length - 1)).join('\n').trim();
  }
  function submitOrder(form) {
    const f = Object.fromEntries(new FormData(form).entries());
    Object.keys(f).forEach((k) => { f[k] = String(f[k]).trim(); });
    const errs = [];
    if (f.name.length < 2) errs.push('#cName');
    if (f.phone.replace(/\D/g, '').length < 7) errs.push('#cPhone');
    form.querySelectorAll('input').forEach((i) => i.style.borderColor = '');
    if (errs.length) { errs.forEach((s) => { $(s).style.borderColor = 'var(--sale)'; }); $(errs[0]).focus(); toast('Укажите имя и телефон'); return; }
    store.set('psshop.contact', { name: f.name, phone: f.phone, tg: f.tg });
    const text = orderText(f);
    copy(text);
    const url = `${TG_MANAGER}?text=${encodeURIComponent(text)}`;
    openModal(`
      <h2>Почти готово! 🎮</h2>
      <p class="muted">Мы скопировали текст заказа. Откройте Telegram и отправьте его менеджеру. Если текст не подставился сам, вставьте его из буфера обмена.</p>
      <div class="order-text">${esc(text)}</div>
      <div class="modal__actions">
        <a class="btn btn--primary" href="${url}" target="_blank" rel="noopener" id="tgGo">Отправить в Telegram</a>
        <button class="btn" data-copy>Скопировать ещё раз</button>
        <button class="btn btn--ghost" data-close-modal>Закрыть</button>
      </div>`, { text });
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch { /* */ }
      ta.remove(); return ok;
    }
  }

  /* ---------- Modal ---------- */
  let modalCtx = {};
  function openModal(html, ctx = {}) { modalCtx = ctx; $('#modalCard').innerHTML = html; $('#modal').hidden = false; }
  function closeModal() { $('#modal').hidden = true; }

  /* ---------- Rendering helpers ---------- */
  function tags(g, max = 2) {
    const t = [];
    if (g.preorder) t.push('<span class="tag tag--pre">Предзаказ</span>');
    if (g.hit) t.push('<span class="tag tag--hit">Хит</span>');
    if (!g.preorder && isNew(g)) t.push('<span class="tag tag--new">Новинка</span>');
    return t.slice(0, max).join('');
  }
  function isNew(g) { return g.date && (TODAY - new Date(g.date)) / 864e5 < 45; }
  function platLabel(g) { return g.platforms.join(' · '); }
  function card(g) {
    const opt = bestOpt(g).key;
    return `<article class="card">
      <div class="card__media">
        <a class="card__img" href="#/game/${g.id}" aria-label="${esc(g.title)}">
          <img src="${g.cover}" alt="" loading="lazy" decoding="async">
          <div class="card__tags">${tags(g)}</div>
        </a>
        <button class="card__add" data-add="${g.id}" data-opt="${esc(opt)}" aria-label="В корзину: ${esc(g.title)}">+</button>
      </div>
      <div>
        <div class="card__meta">${platLabel(g)}${g.voice ? ' · Рус. озвучка' : ''}</div>
        <a href="#/game/${g.id}" class="card__title">${esc(g.title)}</a>
      </div>
      <div class="card__price">${g.options.length > 1 ? '<small>от</small>' : ''}${money(g.min)}</div>
    </article>`;
  }
  function shelf(title, list, href) {
    if (!list.length) return '';
    return `<section class="shelf wrap">
      <div class="shelf__head"><h2>${title}</h2>${href ? `<a href="${href}">Смотреть все →</a>` : ''}</div>
      <div class="shelf__row">${list.map(card).join('')}</div>
    </section>`;
  }

  /* ---------- Pages ---------- */
  let heroTimer;
  function pageHome() {
    const gta = byId['grand-theft-auto-vi'];
    const pre = GAMES.filter((g) => g.preorder);
    const heroIds = ['grand-theft-auto-vi', 'ea-sports-fc-27', 'call-of-duty-modern-warfare-4', 'marvel-s-wolverine-deluxe', 'ghost-of-yotei'];
    const slides = heroIds.map((id) => byId[id]).filter(Boolean);
    const blurbs = {
      'grand-theft-auto-vi': 'Самая ожидаемая игра десятилетия. Джейсон, Люсия и Вайс-Сити ждут вас. Все, кто купил у нас, начнут играть 18 ноября в 23:30.',
      'ea-sports-fc-27': 'Новый сезон главного футбольного симулятора. Играйте с друзьями на одной консоли или онлайн.',
      'call-of-duty-modern-warfare-4': 'Легендарная серия возвращается. Русские субтитры, кампания и мультиплеер.',
      'marvel-s-wolverine-deluxe': 'Росомаха в полном расцвете сил. Русская озвучка, издание Deluxe.',
      'ghost-of-yotei': 'Новое приключение от создателей Ghost of Tsushima. Русская озвучка.',
    };
    const hits = GAMES.filter((g) => g.hit && !g.preorder);
    const fresh = GAMES.filter((g) => !g.preorder && g.id !== 'grand-theft-auto-vi').slice(0, 18);
    const cheap = GAMES.filter((g) => g.min <= 200000).sort((a, b) => a.min - b.min).slice(0, 18);
    const vr = GAMES.filter((g) => g.vr);
    const coop = GAMES.filter((g) => g.coop && g.hit);
    return `
      <section class="hero" id="hero">
        ${slides.map((g, i) => `
          <div class="hero__slide ${i === 0 ? 'is-active' : ''}">
            <div class="hero__bg" style="background-image:url('${g.cover}')"></div>
            <div class="hero__shade"></div>
            <div class="hero__inner">
              <div>
                <div class="hero__kicker">${g.preorder ? '<span class="tag tag--pre">Предзаказ</span>' : ''}${g.upcoming ? `<span class="tag">Выход: ${fmtDate(g.upcoming)}</span>` : ''}<span class="tag tag--plat">${platLabel(g)}</span></div>
                <h1>${esc(g.title)}</h1>
                <p>${esc(blurbs[g.id] || '')}</p>
                <div class="hero__price">${g.options.length > 1 ? '<small>от</small>' : ''}${money(g.min)}</div>
                <div class="hero__actions">
                  <a class="btn btn--primary" href="#/game/${g.id}">${g.preorder ? 'Оформить предзаказ' : 'Купить'}</a>
                  <button class="btn btn--ghost" data-add="${g.id}" data-opt="${esc(g.options[0].key)}" data-label="В корзину">В корзину</button>
                </div>
              </div>
              <a class="hero__art" href="#/game/${g.id}"><img src="${g.cover}" alt="${esc(g.title)}"></a>
            </div>
          </div>`).join('')}
        <div class="hero__dots">${slides.map((_, i) => `<button data-slide="${i}" class="${i === 0 ? 'is-active' : ''}" aria-label="Слайд ${i + 1}"></button>`).join('')}</div>
      </section>

      <div class="wrap">
        <div class="perks">
          <div class="perk"><div class="perk__ic">⚡</div><div><b>Подключим дистанционно</b><span>Привозить консоль не нужно</span></div></div>
          <div class="perk"><div class="perk__ic">🛡️</div><div><b>Гарантия</b><span>Поддержка после покупки</span></div></div>
          <div class="perk"><div class="perk__ic">💬</div><div><b>Работаем 24/7</b><span>Ответим в чате и Telegram</span></div></div>
          <div class="perk"><div class="perk__ic">🎮</div><div><b>${GAMES.length}+ игр</b><span>PS4 и PS5 в одном месте</span></div></div>
        </div>
      </div>

      ${shelf('Предзаказы', pre, '#/catalog?f=preorder')}
      ${shelf('Хиты продаж', hits, '#/catalog?f=hit')}
      ${shelf('Новое в магазине', fresh, '#/catalog')}

      <div class="wrap promo">
        <a href="#/subs" class="promo__plus"><h3>PS Plus и EA Play</h3><p>Сотни игр по подписке, от ${money(179000)}</p></a>
        <a href="#/subs" class="promo__rent"><h3>Аренда PlayStation 5</h3><p>Привезём и настроим в Ташкенте, от ${money(RENT.price)} в сутки</p></a>
      </div>

      ${shelf('Играть вместе', coop, '#/catalog?f=coop')}
      ${shelf('До 200 000 сум', cheap, '#/catalog?sort=price')}
      ${shelf('Для PS VR / VR2', vr, '#/catalog?f=vr')}

      <section class="wrap">
        <h2 class="section-title">Как купить игру</h2>
        <div class="steps">
          <div class="step"><div class="step__n">1</div><h3>Выберите игры</h3><p>Добавьте игры в корзину и выберите платформу: PS4 или PS5.</p></div>
          <div class="step"><div class="step__n">2</div><h3>Оформите заказ</h3><p>Оставьте имя и телефон, и заказ уйдёт менеджеру в Telegram. Он подтвердит цену и способ оплаты.</p></div>
          <div class="step"><div class="step__n">3</div><h3>Играйте</h3><p>Подключим игру дистанционно, за пару минут. Просто включите PlayStation и играйте.</p></div>
        </div>
      </section>`;
  }
  function startHero() {
    clearInterval(heroTimer);
    const hero = $('#hero'); if (!hero) return;
    const slides = hero.querySelectorAll('.hero__slide'), dots = hero.querySelectorAll('.hero__dots button');
    let i = 0;
    const go = (n) => { slides[i].classList.remove('is-active'); dots[i].classList.remove('is-active'); i = (n + slides.length) % slides.length; slides[i].classList.add('is-active'); dots[i].classList.add('is-active'); };
    dots.forEach((d) => d.addEventListener('click', () => { go(+d.dataset.slide); clearInterval(heroTimer); }));
    if (slides.length > 1 && !matchMedia('(prefers-reduced-motion: reduce)').matches) heroTimer = setInterval(() => go(i + 1), 6500);
  }

  const FILTERS = [
    ['all', 'Все игры'], ['ps5', 'PS5'], ['ps4', 'PS4'], ['preorder', 'Предзаказ'], ['hit', 'Хиты'], ['voice', 'Русская озвучка'],
    ['ru', 'На русском'], ['coop', 'Для компании'], ['vr', 'VR'], ['new', 'Новинки'],
  ];
  const FILTER_FN = {
    all: () => true, ps5: (g) => g.platforms.includes('PS5'), ps4: (g) => g.platforms.includes('PS4'), preorder: (g) => g.preorder,
    hit: (g) => g.hit, voice: (g) => g.voice, ru: (g) => g.ru, coop: (g) => g.coop, vr: (g) => g.vr, new: (g) => isNew(g),
  };
  const PAGE = 48;
  function pageCatalog(params) {
    const f = FILTER_FN[params.get('f')] ? params.get('f') : 'all';
    const sort = params.get('sort') || 'new';
    const q = params.get('q') || '';
    const nq = norm(q);
    let list = GAMES.filter(FILTER_FN[f]);
    if (nq) list = list.filter((g) => nq.split(' ').every((w) => matchWord(g, w)));
    if (sort === 'price') list = [...list].sort((a, b) => a.min - b.min);
    if (sort === 'price-desc') list = [...list].sort((a, b) => b.min - a.min);
    if (sort === 'az') list = [...list].sort((a, b) => a.title.localeCompare(b.title, 'ru'));
    const limit = +(params.get('n') || PAGE);
    const title = q ? `Поиск: «${esc(q)}»` : (FILTERS.find((x) => x[0] === f)[1]);
    const link = (over) => { const p = new URLSearchParams(params); Object.entries(over).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k))); p.delete('n'); const s = p.toString(); return `#/catalog${s ? `?${s}` : ''}`; };
    return `<div class="wrap">
      <div class="page-head"><h1>${title}</h1><div class="count">${list.length} ${plural(list.length, 'игра', 'игры', 'игр')}</div></div>
      <div class="toolbar">
        <div class="chips">${FILTERS.map(([k, l]) => `<a class="chip ${k === f ? 'is-on' : ''}" href="${link({ f: k === 'all' ? '' : k })}">${l}</a>`).join('')}</div>
        <select class="select" id="sortSel" aria-label="Сортировка">
          ${[['new', 'Сначала новые'], ['price', 'Сначала дешевле'], ['price-desc', 'Сначала дороже'], ['az', 'По алфавиту']].map(([k, l]) => `<option value="${k}" ${k === sort ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>
      ${list.length ? `<div class="grid">${list.slice(0, limit).map(card).join('')}</div>` : `<div class="empty"><p>Ничего не нашли 😔</p><p>Возможно, игра есть, но её ещё нет на сайте. Спросите в чате!</p><button class="btn btn--primary" data-open-chat="${esc(q)}">Спросить в чате</button></div>`}
      ${list.length > limit ? `<div class="more"><a class="btn" href="${link({}).replace(/$/, '')}${link({}).includes('?') ? '&' : '?'}n=${limit + PAGE}" data-keep-scroll>Показать ещё</a></div>` : ''}
    </div>`;
  }
  function plural(n, a, b, c) { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 10 || h >= 20) ? b : c; }

  function pageGame(id) {
    const g = byId[id];
    if (!g) return `<div class="wrap empty"><h1>Игра не найдена</h1><a class="btn btn--primary" href="#/catalog">В каталог</a></div>`;
    const sel = bestOpt(g);
    const similar = GAMES.filter((x) => x.id !== g.id && simKey(x) === simKey(g)).slice(0, 12);
    const more = similar.length >= 4 ? similar : [...similar, ...GAMES.filter((x) => x.hit && x.id !== g.id && !similar.includes(x))].slice(0, 12);
    return `
      <section class="product">
        <div class="product__bg" style="background-image:url('${g.cover}')"></div>
        <div class="product__shade"></div>
        <div class="wrap product__inner">
          <div class="product__cover"><img src="${g.cover}" alt="${esc(g.title)}"></div>
          <div>
            <div class="crumbs"><a href="#/">Главная</a> / <a href="#/catalog">Каталог</a></div>
            <div class="hero__kicker">${tags(g, 3)}<span class="tag tag--plat">${platLabel(g)}</span></div>
            <h1>${esc(g.title)}</h1>
            <div class="opts" role="radiogroup" aria-label="${g.editions ? 'Издание' : 'Платформа'}">
              ${g.options.map((o) => `<button class="opt ${o === sel ? 'is-on' : ''}" role="radio" aria-checked="${o === sel}" data-opt-pick="${esc(o.key)}"><b>${esc(o.label)}</b><span>${money(o.price)}</span></button>`).join('')}
            </div>
            <div class="buybox">
              <div class="buybox__price" id="pPrice">${money(sel.price)}</div>
              <div class="buybox__sub">${g.preorder ? 'Предзаказ: игра станет доступна в день выхода' : 'Цифровая версия · подключение дистанционно'}</div>
              <div class="buybox__actions">
                <button class="btn btn--primary" data-buy="${g.id}" data-opt="${esc(sel.key)}">${g.preorder ? 'Предзаказать' : 'Купить сейчас'}</button>
                <button class="btn" data-add="${g.id}" data-opt="${esc(sel.key)}" data-label="В корзину">В корзину</button>
              </div>
            </div>
            <div class="specs">
              <div class="spec"><span>Язык</span><b>${esc(g.lang || 'Уточняйте')}</b></div>
              <div class="spec"><span>Издание</span><b>${esc(g.editions ? g.editions.map((e) => e.name).join(' / ') : (g.edition || 'Standard'))}</b></div>
              <div class="spec"><span>Игроков</span><b>${esc(g.players || '1')}</b></div>
              <div class="spec"><span>${g.upcoming ? 'Дата выхода' : 'Платформа'}</span><b>${g.upcoming ? fmtDate(g.upcoming) : platLabel(g)}</b></div>
            </div>
            ${g.notes && g.notes.length ? `<ul class="notes">${g.notes.map((n) => `<li>❗ ${esc(n)}</li>`).join('')}</ul>` : ''}
            <a class="srclink" href="https://t.me/${CHANNEL}/${g.post}" target="_blank" rel="noopener">Пост об игре в Telegram-канале →</a>
          </div>
        </div>
      </section>
      ${shelf('Вам может понравиться', more)}`;
  }
  function simKey(g) { return norm(g.title).split(' ').filter((w) => w.length > 2 && !['the', 'and', 'edition', 'deluxe', 'remastered'].includes(w))[0]; }

  function pageSubs() {
    const plan = (s) => `<div class="plan ${s.featured ? 'plan--featured' : ''}" style="--plan:${s.group === 'EA Play' ? '#ff4d6d' : '#ffc400'}">
        <span class="tag">${s.group}</span><h3>${esc(s.title.split(' · ')[0])}</h3>
        <div class="plan__price">${money(s.price)} <small>/ ${esc(s.title.split(' · ')[1])}</small></div>
        <ul>${s.perks.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
        <button class="btn ${s.featured ? 'btn--primary' : ''} btn--block" data-add="${s.id}" data-opt="" data-label="В корзину">В корзину</button>
      </div>`;
    return `<div class="wrap">
      <div class="page-head"><h1>Подписки и аренда</h1><p class="muted">PS Plus открывает больше 500 игр на PlayStation 4/5. EA Play даёт доступ к большой коллекции игр EA.</p></div>
      <h2 class="section-title">PS Plus · 12 месяцев</h2>
      <div class="plans">${SUBS.filter((s) => s.group === 'PS Plus').map(plan).join('')}</div>
      <h2 class="section-title">EA Play</h2>
      <div class="plans">${SUBS.filter((s) => s.group === 'EA Play').map(plan).join('')}
        <div class="plan" style="--plan:#ff4d6d"><span class="tag">Что входит</span><h3>Игры в EA Play</h3><ul class="ea-list" style="columns:1">${EA_GAMES.slice(0, 12).map((x) => `<li>${esc(x)}</li>`).join('')}<li>…и многие другие</li></ul></div>
      </div>
      <h2 class="section-title">Аренда PlayStation 5</h2>
      <div class="rent">
        <div>
          <p>Давно хотели поиграть с друзьями или устроить игровой вечер? Покупать свою консоль не обязательно: привезём официальную PlayStation 5 прямо к вам домой и всё подготовим для игры.</p>
          <ul><li>PlayStation 5 и 2 джойстика: играйте вдвоём</li><li>Доступ к играм по подписке PS Plus</li><li>Доставка по Ташкенту</li><li>Полная установка и настройка на дому</li><li>Подберём игры под ваши пожелания: FC, Mortal Kombat, гонки…</li></ul>
        </div>
        <div>
          <div class="muted">Стоимость за сутки</div>
          <div class="rent__price">${money(RENT.price)}</div>
          <p class="muted">Тарифы на 3, 7 и 10 дней ещё выгоднее, уточняйте у менеджера.</p>
          <button class="btn btn--primary btn--block" data-add="${RENT.id}" data-opt="" data-label="Арендовать на сутки">Арендовать на сутки</button>
        </div>
      </div>
    </div>`;
  }

  /* ---------- Router ---------- */
  function route() {
    const hash = location.hash.slice(1) || '/';
    const [path, qs] = hash.split('?');
    const params = new URLSearchParams(qs || '');
    const parts = path.split('/').filter(Boolean);
    let html, nav = 'home', title = 'PS SHOP — игры для PS4 и PS5';
    if (!parts.length) html = pageHome();
    else if (parts[0] === 'catalog') { html = pageCatalog(params); nav = params.get('f') === 'preorder' ? 'preorder' : 'catalog'; title = 'Каталог игр — PS SHOP'; }
    else if (parts[0] === 'game') { html = pageGame(decodeURIComponent(parts[1] || '')); nav = ''; const g = byId[parts[1]]; if (g) title = `${g.title} — купить для ${platLabel(g)} | PS SHOP`; }
    else if (parts[0] === 'subs') { html = pageSubs(); nav = 'subs'; title = 'Подписки PS Plus, EA Play и аренда PS5 — PS SHOP'; }
    else html = pageHome();
    const app = $('#app');
    const keep = route.keepScroll; route.keepScroll = false;
    const y = scrollY;
    app.innerHTML = html;
    document.title = title;
    document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('is-active', a.dataset.nav === nav));
    $('#searchInput').value = parts[0] === 'catalog' ? (params.get('q') || '') : '';
    document.querySelectorAll('[data-add]').forEach(syncAddBtn);
    window.scrollTo(0, keep ? y : 0);
    startHero();
    const sortSel = $('#sortSel');
    if (sortSel) sortSel.addEventListener('change', () => { params.set('sort', sortSel.value); params.delete('n'); location.hash = `#/catalog?${params}`; });
  }

  /* ---------- Chat ---------- */
  const chat = { opened: false, log: [] };
  const QUICK = ['Как купить?', 'Сколько стоит GTA 6?', 'Подписка PS Plus', 'Аренда PS5', 'Предзаказы', 'Связаться с менеджером'];
  function openChat(prefill) {
    $('#chat').hidden = false; $('#chatFab').hidden = true;
    if (!chat.opened) {
      chat.opened = true;
      botSay('Привет! 👋 Я помощник PS SHOP.\nНапишите название игры, и я скажу цену. Или выберите вопрос ниже.');
      renderChips(QUICK);
    }
    if (prefill) { $('#chatInput').value = prefill; }
    setTimeout(() => $('#chatInput').focus(), 50);
  }
  function closeChat() { $('#chat').hidden = true; $('#chatFab').hidden = false; }
  function renderChips(list) { $('#chatChips').innerHTML = list.map((c) => `<button type="button" data-chip="${esc(c)}">${esc(c)}</button>`).join(''); }
  function pushMsg(html, who) {
    const log = $('#chatLog'); const el = document.createElement('div');
    el.className = who === 'me' ? 'msg msg--me' : who === 'raw' ? '' : 'msg msg--bot';
    if (who === 'raw') el.style.display = 'contents';
    el.innerHTML = html; log.appendChild(el); log.scrollTop = log.scrollHeight; return el;
  }
  function botSay(html, extra) {
    const typing = pushMsg('<span>●</span><span>●</span><span>●</span>', 'bot'); typing.classList.add('msg--typing');
    setTimeout(() => {
      typing.remove(); pushMsg(html, 'bot');
      if (extra) pushMsg(extra, 'raw');
      document.querySelectorAll('#chatLog [data-add]').forEach(syncAddBtn);
    }, 450);
  }
  const tgLink = (text) => `${TG_MANAGER}?text=${encodeURIComponent(text)}`;
  function mini(g) {
    const o = bestOpt(g);
    return `<div class="mini"><a href="#/game/${g.id}"><img src="${g.cover}" alt=""></a><div><b>${esc(g.title)}</b><span>${g.options.map((x) => `${x.label}: ${money(x.price)}`).join(' · ')}</span></div><button class="btn btn--primary" data-add="${g.id}" data-opt="${esc(o.key)}" data-label="В корзину">В корзину</button></div>`;
  }
  function answer(raw) {
    const q = norm(raw);
    const qw = q.split(' ');
    const has = (...w) => w.some((x) => (x.length <= 3 ? qw.includes(x) : q.includes(x)));
    if (has('менеджер', 'оператор', 'связат', 'позвон', 'живой')) {
      return botSay(`Конечно! Менеджер на связи 24/7 в Telegram: <a href="${tgLink('Здравствуйте! Пишу с сайта PS SHOP.')}" target="_blank" rel="noopener">@${MANAGER}</a>`);
    }
    if (has('как купить', 'как заказ', 'как оформ', 'как работает', 'как получ', 'процесс')) {
      return botSay('Всё просто:\n1️⃣ Добавьте игры в корзину и выберите PS4 или PS5\n2️⃣ Нажмите «Оформить заказ» и оставьте имя и телефон\n3️⃣ Менеджер подтвердит заказ в Telegram и подключит игру дистанционно. Привозить консоль не нужно!');
    }
    if (has('оплат', 'карт', 'click', 'payme', 'uzcard', 'humo', 'перевод', 'наличн')) {
      return botSay(`Способ оплаты подтвердит менеджер при оформлении заказа. Напишите ему: <a href="${tgLink('Здравствуйте! Подскажите, какие есть способы оплаты?')}" target="_blank" rel="noopener">@${MANAGER}</a>`);
    }
    if (has('гарант', 'безопас', 'обман', 'надеж', 'отзыв')) {
      return botSay(`Мы работаем с 2024 года, и в канале <a href="https://t.me/${CHANNEL}" target="_blank" rel="noopener">@${CHANNEL}</a> много отзывов покупателей. На покупки действует гарантия, а поддержка работает 24/7: если что-то пойдёт не так, поможем.`);
    }
    if (has('аренд', 'прокат', 'напрокат')) {
      return botSay(`Сдаём PlayStation 5 в аренду: 2 джойстика, игры по PS Plus, доставка и настройка по Ташкенту.\n💰 ${money(RENT.price)} в сутки, на 3, 7 и 10 дней выгоднее.`, `<div class="mini"><div class="logo__mark" style="width:44px;height:58px;border-radius:8px">PS5</div><div><b>Аренда PS5 · сутки</b><span>${money(RENT.price)}</span></div><button class="btn btn--primary" data-add="${RENT.id}" data-opt="" data-label="В корзину">В корзину</button></div>`);
    }
    if (has('ps plus', 'psplus', 'пс плюс', 'плюс', 'подписк', 'ea play', 'еа плей')) {
      return botSay(`Подписки на 12 месяцев:\n➕ PS Plus Essential: ${money(629000)}\n➕ PS Plus Extra: ${money(979000)}\n➕ PS Plus Deluxe: ${money(1268000)}\n\nEA Play: ${money(179000)} за месяц или ${money(659000)} за год.\n<a href="#/subs">Подробнее о подписках →</a>`);
    }
    if (has('предзаказ', 'скоро выйд', 'новинк')) {
      const pre = GAMES.filter((g) => g.preorder);
      return botSay(pre.length ? 'Сейчас открыты предзаказы:' : 'Сейчас открытых предзаказов нет, но новинки появляются постоянно!', pre.slice(0, 4).map(mini).join(''));
    }
    if (has('дешев', 'недорог', 'бюджет')) {
      const c = [...GAMES].sort((a, b) => a.min - b.min).slice(0, 4);
      return botSay('Самые доступные игры сейчас:', c.map(mini).join('') + `<a class="btn btn--sm" href="#/catalog?sort=price" style="align-self:flex-start">Весь список по цене →</a>`);
    }
    if (has('привет', 'здравств', 'салам', 'добрый', 'hello') && qw.length <= 3) {
      return botSay('Привет! Какую игру ищете? Напишите название, например «FC 26» или «Человек-паук».');
    }
    // game search
    const STOP = new Set(['сколько', 'стоит', 'стоят', 'цена', 'цену', 'есть', 'ли', 'у', 'вас', 'игра', 'игру', 'игры', 'купить', 'хочу', 'на', 'для', 'ps5', 'ps4', 'пс5', 'пс4', 'а', 'и', 'подскажите', 'пожалуйста', 'какая', 'а', 'в', 'наличии', 'нужна', 'нужен']);
    const words = qw.filter((w) => w && !STOP.has(w));
    if (words.length) {
      const scored = GAMES.map((g) => ({ g, s: words.filter((w) => matchWord(g, w)).length / words.length }))
        .filter((x) => x.s >= 0.5).sort((a, b) => b.s - a.s || (b.g.hit ? 1 : 0) - (a.g.hit ? 1 : 0) || b.g.post - a.g.post);
      if (scored.length) {
        const top = scored.slice(0, 4).map((x) => x.g);
        return botSay(top.length === 1 ? 'Нашёл! 🎮' : `Вот что нашлось (${scored.length}):`, top.map(mini).join('') + (scored.length > 4 ? `<a class="btn btn--sm" href="#/catalog?q=${encodeURIComponent(words.join(' '))}" style="align-self:flex-start">Показать все →</a>` : ''));
      }
    }
    return botSay(`Не нашёл ответа на сайте 🤔 Но менеджер точно поможет: проверит наличие игры и ответит на любой вопрос.\n<a href="${tgLink(`Здравствуйте! Вопрос с сайта PS SHOP: ${raw}`)}" target="_blank" rel="noopener">Написать @${MANAGER} →</a>`);
  }
  function ask(text) {
    text = text.trim(); if (!text) return;
    pushMsg(esc(text), 'me');
    answer(text);
  }

  /* ---------- Events ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-add],[data-buy],[data-rm],[data-close-cart],[data-opt-pick],[data-close-modal],[data-copy],[data-chip],[data-open-chat],[data-keep-scroll]');
    if (!t) return;
    if (t.matches('[data-add]')) { e.preventDefault(); inCart(t.dataset.add, t.dataset.opt) ? openCart() : addToCart(t.dataset.add, t.dataset.opt); }
    else if (t.matches('[data-buy]')) { if (!inCart(t.dataset.buy, t.dataset.opt)) { cart.push({ id: t.dataset.buy, opt: t.dataset.opt }); saveCart(); } openCart(); }
    else if (t.matches('[data-rm]')) removeFromCart(t.dataset.rm);
    else if (t.matches('[data-close-cart]')) closeCart();
    else if (t.matches('[data-opt-pick]')) {
      const id = location.hash.split('/')[2]; const g = byId[id]; const o = g && g.options.find((x) => x.key === t.dataset.optPick);
      if (!o) return;
      document.querySelectorAll('[data-opt-pick]').forEach((b) => { const on = b === t; b.classList.toggle('is-on', on); b.setAttribute('aria-checked', on); });
      $('#pPrice').textContent = money(o.price);
      document.querySelectorAll('.buybox [data-opt]').forEach((b) => { b.dataset.opt = o.key; if (b.dataset.add) syncAddBtn(b); });
    }
    else if (t.matches('[data-close-modal]')) closeModal();
    else if (t.matches('[data-copy]')) copy(modalCtx.text || '').then(() => toast('Скопировано'));
    else if (t.matches('[data-chip]')) ask(t.dataset.chip);
    else if (t.matches('[data-open-chat]')) openChat(t.dataset.openChat);
    else if (t.matches('[data-keep-scroll]')) route.keepScroll = true;
  });
  $('#cartBtn').addEventListener('click', openCart);
  $('#scrim').addEventListener('click', closeCart);
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
  $('#cartBody').addEventListener('submit', (e) => { if (e.target.id === 'checkoutForm') { e.preventDefault(); submitOrder(e.target); } });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); closeCart(); if (!$('#chat').hidden) closeChat(); } });

  let searchT;
  $('#searchInput').addEventListener('input', (e) => {
    clearTimeout(searchT);
    const v = e.target.value.trim();
    searchT = setTimeout(() => { location.hash = v ? `#/catalog?q=${encodeURIComponent(v)}` : '#/catalog'; setTimeout(() => $('#searchInput').focus(), 0); }, 300);
  });
  $('#searchForm').addEventListener('submit', (e) => { e.preventDefault(); $('#searchInput').blur(); });

  $('#chatFab').addEventListener('click', () => openChat());
  $('#chatClose').addEventListener('click', closeChat);
  $('#chatForm').addEventListener('submit', (e) => { e.preventDefault(); const i = $('#chatInput'); ask(i.value); i.value = ''; });

  window.addEventListener('hashchange', () => { closeCart(); route(); });
  saveCart();
  route();
})();
