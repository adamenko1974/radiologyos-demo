/* RadiologyOS — вибір вільного часу пацієнтом.
   Показує на тиждень уперед вільні слоти обраного апарата
   (КТ — крок 30 хв, рентген — 15 хв). Зайнятість тягнеться з Google
   Таблиці через безпечний endpoint (без персональних даних).
   Якщо зв'язку немає — показує графік за замовчуванням із позначкою,
   що час орієнтовний.

   Використання:
     initSlotPicker({
       container: HTMLElement,
       apparatus: 'ct' | 'xray',
       onPick: ({date, time}) => {}
     })
   Потребує: assets/department.js (APPARATUS, slotTimesFor, getWorkHours),
             assets/notify.js (syncFetchBusy). */

async function initSlotPicker({ container, apparatus, onPick }) {
  container.innerHTML = '<div class="sp-loading">Шукаю вільний час…</div>';

  let hours = (typeof getWorkHours === 'function') ? getWorkHours()
            : { start: '08:00', end: '17:00', days: [1, 2, 3, 4, 5, 6] };
  let busy = [];
  let live = false;
  let avail = null; /* доступність апаратів: {ct:{active,days:[...]}, ...} */

  if (typeof syncFetchBusy === 'function') {
    const data = await syncFetchBusy();
    if (data && data.hours) {
      hours = data.hours; busy = data.busy || []; live = true;
      avail = data.availability || null;
    }
  }
  if (!avail && typeof apparatusAvailabilityPublic === 'function') {
    avail = apparatusAvailabilityPublic(); /* локальний стан (той самий пристрій) */
  }

  /* апарат вимкнено повністю */
  if (avail && avail[apparatus] && avail[apparatus].active === false) {
    container.innerHTML = '<div class="sp-head">Вільний час — ' + apparatusById(apparatus).name + '</div>' +
      '<div class="sp-empty">На жаль, апарат тимчасово не працює. Залиште заявку з бажаною датою — реєстратура запропонує варіанти, або зателефонуйте.</div>';
    if (onPick) onPick({ date: '', time: '' });
    return;
  }

  const busySet = new Set(busy
    .filter(b => (b.apparatus || 'xray') === apparatus)
    .map(b => b.date + ' ' + b.time));

  const pad = n => String(n).padStart(2, '0');
  const todayISO = new Date().toISOString().slice(0, 10);
  const dayNames = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const times = slotTimesFor(apparatus, hours);

  /* 7 днів уперед, лише робочі */
  const appDays = (avail && avail[apparatus] && Array.isArray(avail[apparatus].days))
    ? avail[apparatus].days : [0, 1, 2, 3, 4, 5, 6];
  const days = [];
  for (let i = 0; i < 14 && days.length < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    if (!hours.days.includes(d.getDay())) continue;
    if (!appDays.includes(d.getDay())) continue; /* зміни немає */
    const iso = d.toISOString().slice(0, 10);
    days.push({ iso, label: dayNames[d.getDay()] + ' ' + pad(d.getDate()) + '.' + pad(d.getMonth() + 1) });
  }

  function freeTimesFor(iso) {
    const now = new Date();
    return times.filter(t => {
      if (busySet.has(iso + ' ' + t)) return false;
      if (iso === todayISO) {
        const [h, m] = t.split(':').map(Number);
        const c = new Date(); c.setHours(h, m, 0, 0);
        if (c <= now) return false;
      }
      return true;
    });
  }

  let selDay = days.find(d => freeTimesFor(d.iso).length) || days[0];
  let selTime = null;

  function render() {
    const appName = apparatusById(apparatus).name;
    container.innerHTML = `
      <div class="sp-head">Вільний час — ${appName}${live ? '' : ' <span class="sp-note">(орієнтовно, підтвердить реєстратура)</span>'}</div>
      <div class="sp-days">${days.map(d =>
        `<button type="button" class="sp-day ${d.iso === selDay.iso ? 'on' : ''}" data-day="${d.iso}">${d.label}</button>`).join('')}
      </div>
      <div class="sp-times">${(function () {
        const free = freeTimesFor(selDay.iso);
        if (!free.length) return '<div class="sp-empty">На цей день вільних слотів немає</div>';
        return free.map(t =>
          `<button type="button" class="sp-time ${t === selTime ? 'on' : ''}" data-time="${t}">${t}</button>`).join('');
      })()}
      </div>
      ${selTime ? `<div class="sp-picked">✓ Обрано: <strong>${selDay.label} о ${selTime}</strong></div>` : ''}`;

    container.querySelectorAll('.sp-day').forEach(b => b.addEventListener('click', () => {
      selDay = days.find(d => d.iso === b.dataset.day); selTime = null; render();
      if (onPick) onPick({ date: '', time: '' });
    }));
    container.querySelectorAll('.sp-time').forEach(b => b.addEventListener('click', () => {
      selTime = b.dataset.time; render();
      if (onPick) onPick({ date: selDay.iso, time: selTime });
    }));
  }
  render();
}
