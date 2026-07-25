/**
 * RadiologyOS — бекенд заявок (версія 2: журнал + синхронізація з панеллю).
 *
 * Що вміє:
 *  • приймає заявки з сайту → рядок у Таблиці + лист адміністратору;
 *  • віддає список заявок панелі персоналу (з будь-якого пристрою);
 *  • приймає від панелі оновлення статусу і часу запису.
 *
 * НАЛАШТУВАННЯ (одноразово):
 * 1. sheets.new → назвіть таблицю «Заявки RadiologyOS».
 * 2. Розширення → Apps Script → вставте цей код замість наявного.
 * 3. Впишіть нижче ADMIN_EMAIL (ваша пошта) і SYNC_TOKEN
 *    (будь-який власний код-пароль, латиницею, без пробілів — 
 *    той самий впишете в assets/notify.js на сайті).
 * 4. Зберегти → Deploy → New deployment → Web app →
 *    Execute as: Me; Who has access: Anyone → Deploy → дозволити.
 * 5. URL (…/exec) вставте в assets/notify.js → NOTIFY_ENDPOINT.
 *
 * ЯКЩО ОНОВЛЮЄТЕ ІСНУЮЧИЙ СКРИПТ: Deploy → Manage deployments →
 * олівець → Version: New version → Deploy (URL залишиться той самий).
 */

var ADMIN_EMAIL = 'ВАША_ПОШТА@gmail.com';   // ← ваша адреса
var SYNC_TOKEN  = 'ЗМІНІТЬ_МЕНЕ';           // ← ваш код-пароль

var HEADERS = ['ID','Створено','Пацієнт','Телефон','Категорія',
               'Дослідження','Бажана дата','Коментар','Статус','Дата запису','Час запису'];

function sheet_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.action === 'update') return handleUpdate_(data);
    return handleSubmit_(data);
  } catch (err) {
    return ContentService.createTextOutput('error');
  }
}

function handleSubmit_(data) {
  if (!data.name || !data.phone || !data.studies) {
    return ContentService.createTextOutput('skip');
  }
  var sh = sheet_();
  sh.appendRow([
    String(data.id || Utilities.getUuid()),
    new Date(),
    String(data.name).slice(0, 200),
    String(data.phone).slice(0, 30),
    String(data.category || '').slice(0, 50),
    String(data.studies).slice(0, 500),
    String(data.desiredDate || '').slice(0, 20),
    String(data.comment || '').slice(0, 500),
    'new', '', ''
  ]);
  MailApp.sendEmail({
    to: ADMIN_EMAIL,
    subject: '🩻 Нова заявка: ' + data.name + ' — ' + String(data.studies).slice(0, 60),
    body: 'Пацієнт: ' + data.name + '\nТелефон: ' + data.phone +
          '\nКатегорія: ' + (data.category || '—') +
          '\nДослідження: ' + data.studies +
          '\nБажана дата: ' + (data.desiredDate || 'не вказана') +
          '\nКоментар: ' + (data.comment || '—') +
          '\n\nЖурнал: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl()
  });
  return ContentService.createTextOutput('ok');
}

function handleUpdate_(data) {
  if (data.token !== SYNC_TOKEN) return ContentService.createTextOutput('denied');
  var sh = sheet_();
  var values = sh.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(data.id)) {
      if (data.status)          sh.getRange(i + 1, 9).setValue(String(data.status).slice(0, 20));
      if ('appointmentDate' in data) sh.getRange(i + 1, 10).setValue(String(data.appointmentDate || ''));
      if ('appointmentTime' in data) sh.getRange(i + 1, 11).setValue(String(data.appointmentTime || ''));
      return ContentService.createTextOutput('ok');
    }
  }
  return ContentService.createTextOutput('notfound');
}

function doGet(e) {
  if (!e.parameter || e.parameter.token !== SYNC_TOKEN) {
    return ContentService.createTextOutput('denied');
  }
  var values = sheet_().getDataRange().getValues();
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    out.push({
      id: String(r[0]),
      createdAt: r[1] instanceof Date ? r[1].toISOString() : String(r[1]),
      name: String(r[2]), phone: String(r[3]), category: String(r[4]),
      study: String(r[5]),
      desiredDate: r[6] instanceof Date ? Utilities.formatDate(r[6], Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(r[6]),
      comment: String(r[7]),
      status: String(r[8] || 'new'),
      appointmentDate: r[9] instanceof Date ? Utilities.formatDate(r[9], Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(r[9]),
      appointmentTime: String(r[10])
    });
  }
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}
