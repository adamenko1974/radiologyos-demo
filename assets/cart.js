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

/* --- Надсилання заявки у WhatsApp --- */

document.getElementById('requestForm')?.addEventListener('submit', e => {
  e.preventDefault();
  if (!cart.length) { alert('Спочатку додайте послугу до заявки.'); return; }

  const name = document.getElementById('patientName').value.trim();
  const phone = document.getElementById('patientPhone').value.trim();
  const date = document.getElementById('desiredDate').value || 'не вказана';
  const ref = document.getElementById('referral').value;
  const comment = document.getElementById('comment').value.trim() || '—';
  const files = [...(document.getElementById('medicalFiles')?.files || [])];
  const fileInfo = files.length ? files.map(f => f.name).join(', ') : 'не додані';

  const list = cart.map((x, i) => `${i + 1}. ${x.name} — ${money(x.price)}`).join('\n');
  const total = money(cart.reduce((s, x) => s + x.price, 0));
  const text = `Заявка на обстеження RadiologyOS\n\nПацієнт: ${name}\nТелефон: ${phone}\nБажана дата: ${date}\nНаправлення: ${ref}\nПопередній висновок: ${fileInfo}\n\nОбрані послуги:\n${list}\n\nОрієнтовна сума: ${total}\nКоментар: ${comment}\n\nПрошу зв’язатися для підтвердження запису.`;

  window.open(`https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`, '_blank');
  if (files.length) {
    setTimeout(() => alert('Чат WhatsApp відкрито. Додайте фото або PDF попереднього висновку до повідомлення вручну.'), 500);
  }
});

renderCart();
