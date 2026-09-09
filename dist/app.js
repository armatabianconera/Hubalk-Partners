'use strict';

// Public contact data stays empty until the owner supplies and confirms it.
const CONTACT = Object.freeze({ name: '', phone: '', email: '', company: '' });
const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.getElementById('navigation');
function closeMenu() {
  menuToggle.setAttribute('aria-expanded', 'false');
  navigation.classList.remove('is-open');
}
menuToggle.addEventListener('click', () => {
  const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!isOpen));
  navigation.classList.toggle('is-open', !isOpen);
});
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    menuToggle.focus();
  }
});
document.addEventListener('click', event => {
  if (!event.target.closest('.site-header')) closeMenu();
});

if (CONTACT.phone || CONTACT.email) {
  const contactDetails = document.getElementById('contact-details');
  contactDetails.querySelector('.contact-pending')?.remove();
  if (CONTACT.name || CONTACT.company) {
    const name = document.createElement('p');
    name.className = 'direct-contact-name';
    name.textContent = [CONTACT.name, CONTACT.company].filter(Boolean).join(' · ');
    contactDetails.append(name);
  }
  if (CONTACT.phone) {
    const phone = document.createElement('a');
    phone.className = 'direct-contact-link';
    phone.href = 'tel:' + CONTACT.phone.replace(/[^+\d]/g, '');
    phone.textContent = CONTACT.phone;
    contactDetails.append(phone);
  }
  if (CONTACT.email) {
    const email = document.createElement('a');
    email.className = 'direct-contact-link';
    email.href = 'mailto:' + CONTACT.email;
    email.textContent = CONTACT.email;
    contactDetails.append(email);
  }
}
document.getElementById('year').textContent = String(new Date().getFullYear());

const form = document.getElementById('inquiry-form');
const formStatus = document.getElementById('form-status');
const submitButton = form.querySelector('[type="submit"]');
const i18n = window.HubalkI18n;
const messages = {
  checking: 'Sprawdzamy dostępność formularza…',
  ready: 'Przeczytamy zapytanie i wrócimy do Ciebie z możliwymi kierunkami działania.',
  unavailable: 'Wysyłka formularza jest obecnie niedostępna. Spróbuj ponownie później.',
  sending: 'Wysyłamy Twoje zapytanie…',
  success: 'Dziękujemy! Zapytanie zostało przyjęte. Przygotujemy się do rozmowy i oddzwonimy na podany numer.',
  error: 'Nie udało się potwierdzić wysłania. Twoje odpowiedzi zostały w formularzu — spróbuj ponownie.',
  invalid: 'Sprawdź wymagane pola formularza.'
};
let status = 'checking';
let ready = false;
let submitting = false;
let configVersion = 0;
let privacyNotice = '';
let requestId = crypto.randomUUID();
let lastPayload = '';
function renderStatus(next = status) {
  status = next;
  formStatus.textContent = i18n.t(messages[status]);
  formStatus.dataset.state = ['error', 'invalid'].includes(status) ? 'error' : status === 'success' ? 'success' : '';
}
for (const link of document.querySelectorAll('[data-intent]')) {
  link.addEventListener('click', () => { form.elements.intent.value = link.dataset.intent; });
}
async function initializeForm() {
  const version = ++configVersion;
  ready = false;
  privacyNotice = '';
  document.getElementById('privacy-notice').textContent = i18n.t('Dane podane w formularzu posłużą do przeanalizowania zapytania i kontaktu w jego sprawie. Pełna informacja o administratorze będzie dostępna przed włączeniem wysyłki.');
  submitButton.disabled = true;
  try {
    const response = await fetch('/api/inquiry?lang=' + i18n.language, {headers: {'Accept': 'application/json'}, signal: AbortSignal.timeout(10000)});
    const config = await response.json();
    if (version !== configVersion) return;
    if (!response.ok || !config.ready || !config.privacyNotice) throw new Error();
    privacyNotice = config.privacyNotice;
    document.getElementById('privacy-notice').textContent = privacyNotice;
    ready = true;
    submitButton.disabled = submitting;
    if (!['success', 'sending', 'error', 'invalid'].includes(status)) renderStatus('ready');
  } catch {
    if (version !== configVersion) return;
    if (!['success', 'sending', 'error', 'invalid'].includes(status)) renderStatus('unavailable');
  }
}
function validationMessage(field) {
  if (field.required && !field.value.trim()) return 'Uzupełnij to pole.';
  if (field.name === 'need' && field.value.trim().length < 10) return 'Opisz potrzebę w co najmniej 10 znakach.';
  if (field.name === 'email' && field.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim())) return 'Podaj poprawny adres e-mail.';
  if (field.name === 'phone' && (!/^[+\d\s().-]+$/.test(field.value.trim()) || field.value.replace(/\D/g, '').length < 7 || field.value.replace(/\D/g, '').length > 15)) return 'Podaj poprawny numer telefonu (7–15 cyfr).';
  return '';
}
function validate(show = false) {
  for (const field of form.querySelectorAll('input, select, textarea')) field.setCustomValidity(i18n.t(validationMessage(field)));
  return show ? form.reportValidity() : form.checkValidity();
}
form.addEventListener('input', event => { if (event.target.setCustomValidity) event.target.setCustomValidity(''); });
document.addEventListener('hubalk:language', () => {
  renderStatus();
  for (const field of form.querySelectorAll('input, select, textarea')) field.setCustomValidity('');
  initializeForm();
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!ready || submitting) return;
  if (!validate(true)) {renderStatus('invalid'); return;}
  const fields = {...Object.fromEntries(new FormData(form)), locale: i18n.language};
  const serialized = JSON.stringify(fields);
  if (serialized !== lastPayload) { requestId = crypto.randomUUID(); lastPayload = serialized; }
  submitting = true;
  submitButton.disabled = true;
  renderStatus('sending');
  try {
    const response = await fetch('/api/inquiry', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({...fields, requestId}), signal: AbortSignal.timeout(20000)
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      renderStatus(response.status === 400 ? 'invalid' : response.status === 503 ? 'unavailable' : 'error');
      return;
    }
    form.reset();
    lastPayload = '';
    renderStatus('success');
  } catch { renderStatus('error'); }
  finally { submitting = false; submitButton.disabled = !ready; }
});
renderStatus();
initializeForm();
