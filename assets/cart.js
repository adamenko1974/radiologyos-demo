/* RadiologyOS — спільна логіка «Моєї заявки» (кошика).
   Підключається на index.html та price.html:
   <script src="assets/cart.js" defer></script>
   Дані зберігаються в localStorage під ключем 'radiologyCart'. */

const PHONE = '380972808899';

let cart = JSON.parse(localStorage.getItem('radiologyCart') || '[]');

const humanDate = iso => iso ? iso.split('-').reverse().join('.') : '';
const money = n => new Intl.NumberFormat('uk-UA').format(n) + ' грн';

function saveCart() {
  localStorage.setItem('radiologyCart', JSON.stringify(cart));
  renderCart();
}

function addToCart(code, name, price) {
  _lastPickerApp = null;
  if (!cart.some(x => x.code === String(code))) {
    cart.push({ code: String(code), name, price: Number(price) });
    saveCart();
  }
  openCart();
}

function removeFromCart(code) {
  cart = cart.filter(x => x.code !== String(code));
  saveCart();
}

function renderCart() {
  document.querySelectorAll('[data-cart-count]').forEach(x => { x.textContent = cart.length; });
  const box = document.getElementById('cartItems');
  if (!box) return;
  box.innerHTML = cart.length
    ? cart.map(x => `<div class="cart-item"><div><strong>${x.name}</strong><small>Код ${x.code}</small></div><div style="text-align:right"><strong>${money(x.price)}</strong><br><button class="remove-item" onclick="removeFromCart('${x.code}')">Видалити</button></div></div>`).join('')
    : '<div class="cart-empty">Ви ще не додали жодної послуги.</div>';
  document.getElementById('cartTotal').textContent = money(cart.reduce((s, x) => s + x.price, 0));
}

function openCart() {
  document.getElementById('cartOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  renderCart();
}

function closeCart() {
  document.getElementById('cartOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* --- Меню «Вхід» у шапці (є лише на головній; код безпечний для інших сторінок) --- */

const headerLoginButton = document.getElementById('headerLoginButton');
const loginMenu = document.getElementById('loginMenu');

function toggleLoginMenu() {
  if (!loginMenu) return;
  const open = !loginMenu.classList.contains('open');
  loginMenu.classList.toggle('open', open);
  headerLoginButton.setAttribute('aria-expanded', String(open));
}

function closeLoginMenu() {
  if (!loginMenu) return;
  loginMenu.classList.remove('open');
  headerLoginButton.setAttribute('aria-expanded', 'false');
}

function openPatientAccess() {
  closeLoginMenu();
  openCart();
}

headerLoginButton?.addEventListener('click', e => { e.stopPropagation(); toggleLoginMenu(); });
document.addEventListener('click', e => { if (!e.target.closest('.login-menu-wrap')) closeLoginMenu(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLoginMenu(); });
document.getElementById('cartOverlay')?.addEventListener('click', e => { if (e.target.id === 'cartOverlay') closeCart(); });

/* --- Прикріплення попереднього висновку --- */

const medicalFiles = document.getElementById('medicalFiles');
const fileSummary = document.getElementById('fileSummary');
medicalFiles?.addEventListener('change', () => {
  const files = [...medicalFiles.files];
  fileSummary.textContent = files.length
    ? `Вибрано файлів: ${files.length} — ${files.map(f => f.name).join(', ')}`
    : 'Файли не вибрано';
});


/* --- Синхронізація з панеллю персоналу (staff.html) ---
   Заявка зберігається в тому ж сховищі, яке читає панель.
   Працює в межах одного браузера/пристрою (localStorage). */

const STAFF_STORE = 'radiologyos_applications_v1';

function pushToStaffPanel({ name, phone, category, studies, desiredDate, desiredTime, apparatus, comment, sid }) {
  try {
    const apps = JSON.parse(localStorage.getItem(STAFF_STORE) || '[]');
    const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2));
    studies.forEach(st => {
      const study = typeof st === 'string' ? st : st.name;
      const code = typeof st === 'string' ? '' : st.code;
      apps.push({
        id: uid(),
        name, phone, category, study,
        desiredDate: desiredDate || '',
        appointmentDate: '', appointmentTime: '',
        status: 'new',
        comment: comment || '',
        createdAt: new Date().toISOString(),
        sid: sid || '',
        desiredTime: desiredTime || '',
        apparatus: (code && typeof apparatusForCode === 'function') ? apparatusForCode(code)
                 : (apparatus || (typeof apparatusForStudyTitle === 'function' ? apparatusForStudyTitle(study) : 'xray'))
      });
    });
    localStorage.setItem(STAFF_STORE, JSON.stringify(apps));
  } catch (e) { /* сховище недоступне — заявка все одно піде у WhatsApp */ }
}

/* --- Формування заявки --- */

const requestForm = document.getElementById('requestForm');
let lastRequestText = '';
let pickedSlot = { date: '', time: '' };

/* Апарат за вмістом кошика: якщо є хоч одне КТ — КТ, інакше рентген */
function cartApparatus() {
  if (typeof apparatusForCode !== 'function') return 'xray';
  return cart.some(x => apparatusForCode(x.code) === 'ct') ? 'ct' : 'xray';
}

let _lastPickerApp = null;
function refreshSlotPicker() {
  const box = document.getElementById('slotPicker');
  if (!box || typeof initSlotPicker !== 'function') return;
  if (!cart.length) {
    box.innerHTML = '<div class="sp-loading">Оберіть послугу — і тут з’явиться вільний час</div>';
    _lastPickerApp = null;
    return;
  }
  const app = cartApparatus();
  if (app === _lastPickerApp) return;
  _lastPickerApp = app;
  pickedSlot = { date: '', time: '' };
  initSlotPicker({
    container: box,
    apparatus: app,
    onPick: s => {
      pickedSlot = s;
      const dd = document.getElementById('desiredDate');
      if (dd && s.date) dd.value = s.date;
    }
  });
}

requestForm?.addEventListener('submit', e => {
  e.preventDefault();
  if (!cart.length) { alert('Спочатку додайте послугу до заявки.'); return; }

  if (!requestForm.checkValidity()) {
    requestForm.classList.add('was-validated');
    requestForm.querySelector(':invalid')?.focus();
    return;
  }

  const name = document.getElementById('patientName').value.trim();
  const phone = '+380' + document.getElementById('patientPhone').value.replace(/\D/g, '');
  const dateISO = pickedSlot.date || document.getElementById('desiredDate').value;
  const time = pickedSlot.time || document.getElementById('desiredTime').value || 'будь-який';
  const ref = document.getElementById('referral').value;
  const comment = document.getElementById('comment').value.trim() || '—';
  const files = [...(document.getElementById('medicalFiles')?.files || [])];
  const fileInfo = files.length ? files.map(f => f.name).join(', ') : 'не додані';

  const list = cart.map((x, i) => `${i + 1}. ${x.name} — ${money(x.price)}`).join('\n');
  const total = money(cart.reduce((s, x) => s + x.price, 0));
  lastRequestText = `Заявка на обстеження\n\nПацієнт: ${name}\nТелефон: ${phone}\nБажана дата: ${humanDate(dateISO) || 'не вказана'}\nЗручний час: ${pickedSlot.time ? pickedSlot.time + ' (обрано з розкладу)' : time}\nНаправлення: ${ref}\nПопередній висновок: ${fileInfo}\n\nОбрані послуги:\n${list}\n\nОрієнтовна сума: ${total}\nКоментар: ${comment}\n\nПрошу зв'язатися для підтвердження запису.`;

  const sid = (crypto.randomUUID ? crypto.randomUUID() : 'sid-' + Date.now());
  const commentFull = [ref, time !== 'будь-який' ? 'Зручний час: ' + time : '', comment !== '—' ? comment : ''].filter(Boolean).join('. ');

  pushToStaffPanel({
    name, phone,
    category: 'Цивільна особа',
    studies: cart.map(x => ({ name: x.name, code: x.code })),
    desiredDate: dateISO,
    desiredTime: pickedSlot.time || '',
    comment: commentFull,
    sid
  });

  if (typeof notifyAdmin === 'function') notifyAdmin({
    id: sid, name, phone,
    category: 'Цивільна особа',
    studies: cart.map(x => x.name).join('; '),
    desiredDate: dateISO,
    apparatus: cartApparatus(),
    comment: [pickedSlot.time ? 'Обраний час: ' + pickedSlot.time : '', commentFull].filter(Boolean).join('. ')
  });

  showSuccess(files.length > 0);
});

function showSuccess(hasFiles) {
  document.getElementById('requestText').textContent = lastRequestText;
  const enc = encodeURIComponent(lastRequestText);
  document.getElementById('waLink').href = `https://wa.me/${PHONE}?text=${enc}`;
  document.getElementById('vbLink').href = `viber://chat?number=%2B${PHONE}`;
  const em = document.getElementById('emLink');
  if (em && typeof REGISTRY_EMAIL !== 'undefined' && REGISTRY_EMAIL) {
    em.hidden = false;
    em.href = `mailto:${REGISTRY_EMAIL}?subject=${encodeURIComponent('Заявка на обстеження')}&body=${enc}`;
  }
  document.getElementById('filesReminder').hidden = !hasFiles;
  requestForm.hidden = true;
  document.getElementById('successPanel').hidden = false;
  document.querySelector('.cart-total').style.display = 'none';
  document.getElementById('cartItems').style.display = 'none';
  cart = [];
  saveCart();
}

function copyRequestText() {
  const done = () => {
    const b = document.getElementById('copyBtn');
    b.textContent = '✓ Скопійовано';
    setTimeout(() => { b.textContent = 'Скопіювати текст'; }, 2000);
  };
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(lastRequestText).then(done).catch(() => fallbackCopy(done));
  } else fallbackCopy(done);
}

function fallbackCopy(done) {
  const ta = document.createElement('textarea');
  ta.value = lastRequestText;
  ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); done(); } catch (e) { alert('Виділіть текст заявки і скопіюйте вручну.'); }
  document.body.removeChild(ta);
}

/* Viber не передає текст у чат — копіюємо перед відкриттям */
document.getElementById('vbLink')?.addEventListener('click', () => {
  try { navigator.clipboard?.writeText(lastRequestText); } catch (e) {}
});

/* повертаємо форму при наступному відкритті заявки */
const _openCart = openCart;
openCart = function () {
  if (requestForm) {
    requestForm.hidden = false;
    requestForm.classList.remove('was-validated');
    document.getElementById('successPanel').hidden = true;
    const totalRow = document.querySelector('.cart-total');
    if (totalRow) totalRow.style.display = '';
    const items = document.getElementById('cartItems');
    if (items) items.style.display = '';
  }
  _openCart();
  refreshSlotPicker();
};

const _dd = document.getElementById('desiredDate');
if (_dd) _dd.min = new Date().toISOString().slice(0, 10);

renderCart();
