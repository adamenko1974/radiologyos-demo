/* RadiologyOS — зв'язок сайту з Google Apps Script.
   NOTIFY_ENDPOINT — URL веб-додатка (…/exec), інструкція в apps-script.gs.
   SYNC_TOKEN — той самий код-пароль, що і в apps-script.gs.
   Поки NOTIFY_ENDPOINT порожній — усе працює локально, як раніше. */

const NOTIFY_ENDPOINT = '';
const SYNC_TOKEN = '';

/* Email реєстратури для кнопки «Email» на екрані заявки.
   Порожньо — кнопка не показується. */
const REGISTRY_EMAIL = '';

function notifyAdmin(payload) {
  if (!NOTIFY_ENDPOINT) return;
  try {
    fetch(NOTIFY_ENDPOINT, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });
  } catch (e) {}
}

function syncPushUpdate(app) {
  if (!NOTIFY_ENDPOINT) return;
  try {
    fetch(NOTIFY_ENDPOINT, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'update', token: SYNC_TOKEN, id: app.sid || app.id,
        status: app.status,
        appointmentDate: app.appointmentDate || '',
        appointmentTime: app.appointmentTime || '',
        apparatus: (typeof appOf === 'function') ? appOf(app) : (app.apparatus || '')
      })
    });
  } catch (e) {}
}

async function syncFetchList() {
  if (!NOTIFY_ENDPOINT) return null;
  try {
    const r = await fetch(NOTIFY_ENDPOINT + '?token=' + encodeURIComponent(SYNC_TOKEN));
    const data = await r.json();
    return Array.isArray(data) ? data : null;
  } catch (e) { return null; }
}

async function syncGetAdmins() {
  if (!NOTIFY_ENDPOINT) return null;
  try {
    const r = await fetch(NOTIFY_ENDPOINT + '?action=admins&token=' + encodeURIComponent(SYNC_TOKEN));
    return await r.json();
  } catch (e) { return null; }
}

function syncSetAdmin(email) {
  if (!NOTIFY_ENDPOINT) return;
  try {
    fetch(NOTIFY_ENDPOINT, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'setAdmin', token: SYNC_TOKEN, email })
    });
  } catch (e) {}
}

async function syncFetchBusy() {
  if (!NOTIFY_ENDPOINT) return null;
  try {
    const r = await fetch(NOTIFY_ENDPOINT + '?action=busy&token=' + encodeURIComponent(SYNC_TOKEN));
    return await r.json();
  } catch (e) { return null; }
}

function syncSetHours(hours) {
  if (!NOTIFY_ENDPOINT) return;
  try {
    fetch(NOTIFY_ENDPOINT, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'setHours', token: SYNC_TOKEN, hours })
    });
  } catch (e) {}
}

function syncSetApparatus(availability) {
  if (!NOTIFY_ENDPOINT) return;
  try {
    fetch(NOTIFY_ENDPOINT, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'setApparatus', token: SYNC_TOKEN, availability })
    });
  } catch (e) {}
}

function sendFeedback(payload) {
  if (!NOTIFY_ENDPOINT) return false;
  try {
    fetch(NOTIFY_ENDPOINT, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(Object.assign({ action: 'feedback' }, payload))
    });
    return true;
  } catch (e) { return false; }
}
