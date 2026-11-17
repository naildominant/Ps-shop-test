// PS SHOP — мост «сайт -> Google Таблица «PS SHOP CRM»».
// Скрипт универсальный: сервер сайта присылает имя листа, заголовки и строку, скрипт её записывает.
// Новые колонки добавляются на сервере (worker/worker.js), этот код менять не нужно.
// Установка: script.google.com -> вставить код -> «Начать развертывание» -> «Управление развертываниями» -> новая версия.
const TOKEN = '6cf56a2fe67752fb190caa88';
const SHEET_ID = '17MKwvBfqCoRMtiqSskPOet4wRO1ewuvyEGjeSPIFCZc';

function setup() {
  Logger.log('Таблица: ' + SpreadsheetApp.openById(SHEET_ID).getName());
}

function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  if (d.token !== TOKEN) return ContentService.createTextOutput('forbidden');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const book = SpreadsheetApp.openById(SHEET_ID);
    const sh = book.getSheetByName(d.sheet) || book.insertSheet(d.sheet);
    if (sh.getLastRow() === 0 || sh.getLastColumn() < d.header.length) {
      sh.getRange(1, 1, 1, d.header.length).setValues([d.header]).setFontWeight('bold').setBackground('#ece8ff');
      sh.setFrozenRows(1);
    }
    const values = d.values.map((x, i) => ((d.dates || []).indexOf(i) >= 0 ? new Date(x) : x));
    const cache = CacheService.getScriptCache();
    let row = 0;
    if (d.key) {
      const col = d.header.indexOf(d.keyCol) + 1;
      row = Number(cache.get(d.key)) || 0;
      if (row && sh.getRange(row, col).getValue() !== d.key) row = 0;
      if (!row) {
        const f = sh.getRange(1, col, sh.getMaxRows(), 1).createTextFinder(d.key).matchEntireCell(true).findNext();
        row = f ? f.getRow() : 0;
      }
    }
    if (row) sh.getRange(row, 1, 1, values.length).setValues([values]);
    else { sh.appendRow(values); row = sh.getLastRow(); }
    if (d.key) cache.put(d.key, String(row), 21600);
  } finally {
    lock.releaseLock();
  }
  return ContentService.createTextOutput('ok');
}
