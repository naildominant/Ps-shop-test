// PS SHOP — заявки с сайта в Google Таблицу.
// Вставляется в Google Таблице: Расширения -> Apps Script. Подробности: README, раздел «Заявки в Google Таблицу».
const TOKEN = '6cf56a2fe67752fb190caa88'; // должен совпадать с SHEET_TOKEN в настройках Cloudflare

function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  if (d.token !== TOKEN) return ContentService.createTextOutput('forbidden');
  const book = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = book.getSheetByName('Заявки') || book.insertSheet('Заявки');
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Дата', 'Имя', 'Контакт', 'Консоль', 'Что заказали', 'Сумма, uzs', 'Язык сайта', 'Статус', 'Комментарий']);
    sheet.getRange('A1:I1').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  sheet.appendRow([new Date(), d.name, d.contact, d.console, d.items, d.total, d.lang, 'Новая', '']);
  const row = sheet.getLastRow();
  sheet.getRange(row, 8).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['Новая', 'Написал', 'Оплатил', 'Выдано', 'Отказ'], true).build());
  return ContentService.createTextOutput('ok');
}
