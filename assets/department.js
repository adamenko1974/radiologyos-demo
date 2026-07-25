/* RadiologyOS — дані про відділення: персонал та обладнання.
   Стандартні значення нижче — демонстраційні приклади; персонал може
   змінити їх у панелі (вкладка «Відділення»). Зміни зберігаються
   в localStorage і мають пріоритет. */

const STAFFLIST_STORE = 'radiologyos_staff_v1';
const EQUIPMENT_STORE = 'radiologyos_equipment_v1';

/* З міркувань безпеки військового об'єкта за замовчуванням публікуються
   лише посади, без ПІБ. Рішення про публікацію імен ухвалює керівництво;
   якщо воно погоджене — ПІБ додаються в панелі (вкладка «Відділення»). */
const DEFAULT_STAFFLIST = [
  { name: '', role: 'Завідувач відділення, лікар-рентгенолог', schedule: 'Пн–Пт 8:00–15:00', phone: '', email: '' },
  { name: '', role: 'Лікар-рентгенолог', schedule: 'Пн–Сб 9:00–17:00', phone: '', email: '' },
  { name: '', role: 'Рентгенлаборант', schedule: 'Пн–Сб 8:00–17:00', phone: '', email: '' }
];

const DEFAULT_EQUIPMENT = [
  { name: 'Комп\'ютерний томограф', desc: 'Багатозрізова КТ-система для досліджень голови, грудної клітки, черевної порожнини та КТ-ангіографії, з внутрішньовенним контрастуванням і без.' },
  { name: 'Цифровий рентгенографічний комплекс', desc: 'Рентгенографія всіх анатомічних ділянок у стандартних проекціях з цифровою обробкою зображень.' },
  { name: 'Цифровий флюорограф', desc: 'Скринінгові дослідження органів грудної клітки з мінімальним дозовим навантаженням.' }
];

function _getList(key, def) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (Array.isArray(saved) && saved.length) return saved;
  } catch (e) {}
  return JSON.parse(JSON.stringify(def));
}

function getStaffList() { return _getList(STAFFLIST_STORE, DEFAULT_STAFFLIST); }
function saveStaffList(list) { localStorage.setItem(STAFFLIST_STORE, JSON.stringify(list)); }
function resetStaffList() { localStorage.removeItem(STAFFLIST_STORE); }

function getEquipment() { return _getList(EQUIPMENT_STORE, DEFAULT_EQUIPMENT); }
function saveEquipment(list) { localStorage.setItem(EQUIPMENT_STORE, JSON.stringify(list)); }
function resetEquipment() { localStorage.removeItem(EQUIPMENT_STORE); }

/* Графік роботи відділення (той самий ключ, що в панелі) */
function getWorkHours() {
  try {
    const wh = JSON.parse(localStorage.getItem('radiologyos_workhours_v1') || 'null');
    if (wh && wh.start && wh.end && Array.isArray(wh.days)) return wh;
  } catch (e) {}
  return { start: '08:00', end: '17:00', days: [1, 2, 3, 4, 5, 6] };
}

function formatWorkDays(days) {
  const names = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const order = [1, 2, 3, 4, 5, 6, 0].filter(d => days.includes(d));
  if (!order.length) return '—';
  /* згортаємо послідовні дні у діапазони: Пн–Сб */
  const idx = d => [1, 2, 3, 4, 5, 6, 0].indexOf(d);
  const parts = [];
  let start = order[0], prev = order[0];
  for (let i = 1; i <= order.length; i++) {
    const d = order[i];
    if (d !== undefined && idx(d) === idx(prev) + 1) { prev = d; continue; }
    parts.push(start === prev ? names[start] : names[start] + '–' + names[prev]);
    start = prev = d;
  }
  return parts.join(', ');
}

/* --- Вміст головної сторінки (редагується в панелі: Відділення → Головна сторінка) --- */
const SITECONTENT_STORE = 'radiologyos_sitecontent_v1';

const DEFAULT_SITECONTENT = {
  brandTitle: 'Чернігівський військовий госпіталь',
  brandSubtitle: 'Відділення променевої діагностики',
  milTitle: 'Військовослужбовцям',
  milSub: 'Безоплатні дослідження за направленням',
  civTitle: 'Цивільним особам',
  civSub: 'Платні дослідження — повний прайс і запис',
  phone: '+380 97 280 88 99',
  address: 'м. Чернігів, вул. Полуботка, 40',
  /* сторінка цін */
  pricePageTitle: 'Платні дослідження',
  pricePageSub: 'Вартість указана відповідно до чинних тарифів.',
  priceIntro: 'Цивільним особам — платні послуги. Оберіть потрібне дослідження, натисніть «Записатися» та введіть свої дані. Після опрацювання заявки з вами зв\u2019яжуться і повідомлять дату та час проведення дослідження.',
  priceListTitle: 'Тарифи на платні медичні послуги',
  priceLead: 'Відділення променевої діагностики Чернігівського військового госпіталю військової частини А3120.',
  /* сторінка військових */
  milPageTitle: 'Дослідження для військовослужбовців',
  milPageSub: 'За направленням лікаря та відповідно до чинного законодавства України.',
  milNotice: 'Оберіть потрібний розділ. Для військовослужбовців дослідження виконуються безоплатно за направленням та відповідно до законодавства України.',
  milLead: 'Відділення променевої діагностики Чернігівського військового госпіталю військової частини А3120.'
};

function getSiteContent() {
  try {
    const saved = JSON.parse(localStorage.getItem(SITECONTENT_STORE) || 'null');
    if (saved && typeof saved === 'object') return Object.assign({}, DEFAULT_SITECONTENT, saved);
  } catch (e) {}
  return Object.assign({}, DEFAULT_SITECONTENT);
}
function saveSiteContent(c) { localStorage.setItem(SITECONTENT_STORE, JSON.stringify(c)); }
function resetSiteContent() { localStorage.removeItem(SITECONTENT_STORE); }
