/* RadiologyOS — спільна логіка «Моєї заявки» (кошика).
   Підключається на index.html та price.html:
   <script src="assets/cart.js" defer></script>
   Дані зберігаються в localStorage під ключем 'radiologyCart'. */

const PHONE = '380972808899';

let cart = JSON.parse(localStorage.getItem('radiologyCart') || '[]');

const money = n => new Intl.NumberFormat('uk-UA').format(n) + ' грн';

function saveCart() {
  localStorage.setItem('radiologyCart', JSON.stringify(cart));
  renderCart();
}

function addToCart(code, name, price) {
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

function pushToStaffPanel({ name, phone, category, studies, desiredDate, comment }) {
  try {
    const apps = JSON.parse(localStorage.getItem(STAFF_STORE) || '[]');
    const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2));
    studies.forEach(study => {
      apps.push({
        id: uid(),
        name, phone, category, study,
        desiredDate: desiredDate || '',
        appointmentDate: '', appointmentTime: '',
        status: 'new',
        comment: comment || '',
        createdAt: new Date().toISOString()
      });
    });
    localStorage.setItem(STAFF_STORE, JSON.stringify(apps));
  } catch (e) { /* сховище недоступне — заявка все одно піде у WhatsApp */ }
}

/* --- Надсилання заявки --- */

const requestForm = document.getElementById('requestForm');

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
  const dateISO = document.getElementById('desiredDate').value;
  const time = document.getElementById('desiredTime').value || 'будь-який';
  const ref = document.getElementById('referral').value;
  const comment = document.getElementById('comment').value.trim() || '—';
  const channel = requestForm.querySelector('input[name="channel"]:checked').value;
  const files = [...(document.getElementById('medicalFiles')?.files || [])];
  const fileInfo = files.length ? files.map(f => f.name).join(', ') : 'не додані';

  const list = cart.map((x, i) => `${i + 1}. ${x.name} — ${money(x.price)}`).join('\n');
  const total = money(cart.reduce((s, x) => s + x.price, 0));
  const text = `Заявка на обстеження RadiologyOS\n\nПацієнт: ${name}\nТелефон: ${phone}\nБажана дата: ${dateISO || 'не вказана'}\nЗручний час: ${time}\nНаправлення: ${ref}\nПопередній висновок: ${fileInfo}\n\nОбрані послуги:\n${list}\n\nОрієнтовна сума: ${total}\nКоментар: ${comment}\n\nПрошу зв'язатися для підтвердження запису.`;

  pushToStaffPanel({
    name, phone,
    category: 'Цивільна особа',
    studies: cart.map(x => x.name),
    desiredDate: dateISO,
    comment: [ref, time !== 'будь-який' ? 'Зручний час: ' + time : '', comment !== '—' ? comment : ''].filter(Boolean).join('. ')
  });

  if (channel === 'whatsapp') {
    window.open(`https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`, '_blank');
  } else if (channel === 'viber') {
    try { navigator.clipboard?.writeText(text); } catch (err) {}
    window.open(`viber://chat?number=%2B${PHONE}`, '_blank');
  }

  showSuccess(channel, files.length > 0);
});

function showSuccess(channel, hasFiles) {
  const texts = {
    whatsapp: 'Чат WhatsApp відкрито — надішліть підготовлене повідомлення, і реєстратура зв\'яжеться з вами для підтвердження.' + (hasFiles ? ' Не забудьте вручну прикріпити файли висновку.' : ''),
    viber: 'Відкрито чат Viber. Текст заявки скопійовано — вставте його в повідомлення та надішліть.' + (hasFiles ? ' Файли висновку прикріпіть вручну.' : '')
  };
  document.getElementById('successText').textContent = texts[channel];
  requestForm.hidden = true;
  document.getElementById('successPanel').hidden = false;
  document.querySelector('.cart-total').style.display = 'none';
  cart = [];
  saveCart();
}

/* повертаємо форму при наступному відкритті заявки */
const _openCart = openCart;
openCart = function () {
  if (requestForm) {
    requestForm.hidden = false;
    requestForm.classList.remove('was-validated');
    document.getElementById('successPanel').hidden = true;
    const totalRow = document.querySelector('.cart-total');
    if (totalRow) totalRow.style.display = '';
  }
  _openCart();
};

const _dd = document.getElementById('desiredDate');
if (_dd) _dd.min = new Date().toISOString().slice(0, 10);

renderCart();
