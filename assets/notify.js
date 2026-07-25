/* RadiologyOS — зв'язок сайту з Google Apps Script.
   NOTIFY_ENDPOINT — URL веб-додатка (…/exec), інструкція в apps-script.gs.
   SYNC_TOKEN — той самий код-пароль, що і в apps-script.gs.
   Поки NOTIFY_ENDPOINT порожній — усе працює локально, як раніше. */

const NOTIFY_ENDPOINT = '';
const SYNC_TOKEN = '';

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
        appointmentTime: app.appointmentTime || ''
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
