// PS SHOP — заявки и посещения сайта в Google Таблицу.
// Вставляется в Google Таблице: Расширения -> Apps Script. Подробности: README, раздел «Заявки в Google Таблицу».
// Листы создаются сами: «Заявки», «Посетители» (каждый визит на сайт, анонимно), «Сводка» (цифры для анализа).
const TOKEN = '6cf56a2fe67752fb190caa88'; // должен совпадать с SHEET_TOKEN в настройках Cloudflare
// Таблица «PS SHOP CRM». Скрипт можно создать отдельно на script.google.com: он сам откроет таблицу по этому номеру.
const SHEET_ID = '17MKwvBfqCoRMtiqSskPOet4wRO1ewuvyEGjeSPIFCZc';
const book_ = () => (SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet());

function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  if (d.token !== TOKEN) return ContentService.createTextOutput('forbidden');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (d.type === 'visit') saveVisit(d); else saveOrder(d);
  } finally {
    lock.releaseLock();
  }
  return ContentService.createTextOutput('ok');
}

function sheetWithHeader(name, header) {
  const book = book_();
  const sheet = book.getSheetByName(name) || book.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(header);
    sheet.getRange(1, 1, 1, header.length).setFontWeight('bold').setBackground('#ece8ff');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/* ---------- заявки ---------- */
function saveOrder(d) {
  const sheet = sheetWithHeader('Заявки', ['Дата', 'Имя', 'Контакт', 'Консоль', 'Что заказали', 'Сумма, uzs', 'Язык сайта', 'Статус', 'Комментарий', 'Посетитель']);
  sheet.appendRow([new Date(), d.name, d.contact, d.console, d.items, d.total, d.lang, 'Новая', '', d.vid || '']);
  const row = sheet.getLastRow();
  sheet.getRange(row, 8).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['Новая', 'Написал', 'Оплатил', 'Выдано', 'Отказ'], true).build());
}

/* ---------- посещения ---------- */
const VISIT_HEADER = ['Начало визита', 'Посетитель', 'Визит №', 'Новый', 'Источник', 'Откуда пришёл', 'Метка рекламы',
  'Первая страница', 'Страниц', 'Минут на сайте', 'Смотрел игры', 'Клал в корзину', 'Заказ', 'Сумма заказа', 'Устройство', 'Язык', 'Город', 'Код визита'];

function sourceOf(d) {
  const ref = String(d.ref || '').toLowerCase();
  if (d.utm) return String(d.utm);
  if (!ref) return 'Прямой заход';
  if (/t\.me|telegram/.test(ref)) return 'Telegram';
  if (/instagram/.test(ref)) return 'Instagram';
  if (/google/.test(ref)) return 'Google';
  if (/yandex|ya\.ru/.test(ref)) return 'Яндекс';
  if (/facebook|fb\./.test(ref)) return 'Facebook';
  if (/youtube/.test(ref)) return 'YouTube';
  if (/tiktok/.test(ref)) return 'TikTok';
  return 'Другой сайт';
}

function saveVisit(d) {
  const sheet = sheetWithHeader('Посетители', VISIT_HEADER);
  const values = [new Date(Number(d.start) || Date.now()), d.vid, d.n, d.isNew ? 'новый' : 'вернулся', sourceOf(d), d.ref || '', d.camp || '',
    d.land, d.pages, Math.round((Number(d.dur) || 0) / 6) / 10, d.games || '', d.adds || 0, d.order ? 'да' : '', d.order ? d.total : '',
    (d.mobile ? 'телефон' : 'компьютер') + (d.os ? ', ' + d.os : ''), d.lang, [d.city, d.country].filter(String).join(', '), d.sid];
  // один визит — одна строка: если строка этого визита уже есть, обновляем её
  const cache = CacheService.getScriptCache();
  let row = Number(cache.get('v:' + d.sid)) || 0;
  if (row && sheet.getRange(row, VISIT_HEADER.length).getValue() !== d.sid) row = 0;
  if (!row) {
    const found = sheet.getRange('R:R').createTextFinder(d.sid).matchEntireCell(true).findNext();
    row = found ? found.getRow() : 0;
  }
  if (row) sheet.getRange(row, 1, 1, values.length).setValues([values]);
  else { sheet.appendRow(values); row = sheet.getLastRow(); }
  cache.put('v:' + d.sid, String(row), 21600);
  if (!book_().getSheetByName('Сводка')) makeSummary();
}

/* ---------- сводка для анализа ---------- */
function makeSummary() {
  const book = book_();
  const s = book.getSheetByName('Сводка') || book.insertSheet('Сводка');
  s.clear();
  const V = "'Посетители'";
  const rows = [
    ['Показатель', 'Значение'],
    ['Визитов сегодня', `=COUNTIFS(${V}!A2:A,">="&TODAY())`],
    ['Визитов за 7 дней', `=COUNTIFS(${V}!A2:A,">="&TODAY()-6)`],
    ['Визитов за 30 дней', `=COUNTIFS(${V}!A2:A,">="&TODAY()-29)`],
    ['Разных посетителей за 30 дней', `=IFERROR(COUNTUNIQUE(FILTER(${V}!B2:B,${V}!A2:A>=TODAY()-29)),0)`],
    ['Новых посетителей за 30 дней', `=COUNTIFS(${V}!A2:A,">="&TODAY()-29,${V}!D2:D,"новый")`],
    ['Визитов с корзиной за 30 дней', `=COUNTIFS(${V}!A2:A,">="&TODAY()-29,${V}!L2:L,">0")`],
    ['Визитов с заказом за 30 дней', `=COUNTIFS(${V}!A2:A,">="&TODAY()-29,${V}!M2:M,"да")`],
    ['Конверсия в заказ, 30 дней', '=IFERROR(B8/B4,0)'],
    ['Средне страниц за визит', `=IFERROR(AVERAGE(${V}!I2:I),0)`],
    ['Средне минут на сайте', `=IFERROR(AVERAGE(${V}!J2:J),0)`],
  ];
  s.getRange(1, 1, rows.length, 2).setValues(rows);
  s.getRange('B9').setNumberFormat('0.0%');
  s.getRange('B10:B11').setNumberFormat('0.0');
  s.getRange('A1:B1').setFontWeight('bold').setBackground('#ece8ff');

  s.getRange('D1').setValue('Откуда приходят (30 дней)').setFontWeight('bold');
  s.getRange('D2').setFormula(`=IFERROR(QUERY(FILTER(${V}!E2:E,${V}!A2:A>=TODAY()-29),"select Col1, count(Col1) group by Col1 order by count(Col1) desc label Col1 'Источник', count(Col1) 'Визитов'",0),"пока нет данных")`);

  s.getRange('G1').setValue('Визиты по дням').setFontWeight('bold');
  s.getRange('G2').setFormula(`=IFERROR(QUERY({ARRAYFORMULA(IF(${V}!A2:A="",,INT(${V}!A2:A))),${V}!B2:B},"select Col1, count(Col2) where Col2 is not null group by Col1 order by Col1 desc limit 60 label Col1 'День', count(Col2) 'Визитов'",0),"пока нет данных")`);
  s.getRange('G3:G62').setNumberFormat('dd.mm.yyyy');

  s.getRange('J1').setValue('Город (30 дней)').setFontWeight('bold');
  s.getRange('J2').setFormula(`=IFERROR(QUERY(FILTER(${V}!Q2:Q,${V}!A2:A>=TODAY()-29),"select Col1, count(Col1) group by Col1 order by count(Col1) desc limit 15 label Col1 'Город', count(Col1) 'Визитов'",0),"пока нет данных")`);

  s.getRange('M1').setValue('Устройство (30 дней)').setFontWeight('bold');
  s.getRange('M2').setFormula(`=IFERROR(QUERY(FILTER(${V}!O2:O,${V}!A2:A>=TODAY()-29),"select Col1, count(Col1) group by Col1 order by count(Col1) desc label Col1 'Устройство', count(Col1) 'Визитов'",0),"пока нет данных")`);

  s.setColumnWidth(1, 260);
  s.insertChart(s.newChart().setChartType(Charts.ChartType.COLUMN).addRange(s.getRange('G2:H62'))
    .setPosition(14, 1, 0, 0).setOption('title', 'Визиты по дням').setOption('legend', { position: 'none' }).build());
  book.setActiveSheet(s);
  book.moveActiveSheet(1);
}
