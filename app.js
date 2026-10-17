const nav = document.querySelector('.primary-nav');
const menuToggle = document.querySelector('.menu-toggle');
const bookingForm = document.querySelector('#booking-form');
const treatmentSelect = document.querySelector('#treatment-select');
const bookingDate = document.querySelector('#booking-date');
const timeValue = document.querySelector('#time-value');
const formStatus = document.querySelector('#form-status');

// Mobile navigation
menuToggle?.addEventListener('click', () => {
  const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Open menu' : 'Close menu');
  nav?.classList.toggle('open', !isOpen);
  document.body.classList.toggle('menu-open', !isOpen);
});

document.querySelectorAll('.primary-nav a').forEach((link) => {
  link.addEventListener('click', () => {
    nav?.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuToggle?.setAttribute('aria-label', 'Open menu');
    document.body.classList.remove('menu-open');
  });
});

// Set the first bookable day to today in the visitor's local timezone.
if (bookingDate) {
  const today = new Date();
  const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
    .toISOString()
    .split('T')[0];
  bookingDate.min = localToday;
}

// Treatment cards pre-fill the booking form and move the visitor to it.
document.querySelectorAll('.choose-treatment').forEach((button) => {
  button.addEventListener('click', () => {
    if (treatmentSelect) treatmentSelect.value = button.dataset.treatment || '';
    document.querySelector('#book')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => document.querySelector('[name="name"]')?.focus(), 650);
  });
});

// Time preference buttons behave like a compact radio group.
document.querySelectorAll('.time-option').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.time-option').forEach((option) => {
      option.classList.remove('active');
      option.setAttribute('aria-pressed', 'false');
    });
    button.classList.add('active');
    button.setAttribute('aria-pressed', 'true');
    if (timeValue) timeValue.value = button.dataset.time || '';
    formStatus.textContent = '';
  });
});

// Friendly demo submission — keeps the experience useful without a backend.
bookingForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(bookingForm);
  const name = String(formData.get('name') || '').trim();
  const selectedTime = String(formData.get('time') || '').trim();

  if (!selectedTime) {
    formStatus.textContent = 'Choose a preferred time and we will take it from there.';
    document.querySelector('.time-option')?.focus();
    return;
  }

  formStatus.textContent = `Cảm ơn${name ? ` ${name}` : ''} — your request is noted. We will call or message you shortly.`;
  bookingForm.classList.add('submitted');
  bookingForm.querySelector('.form-submit')?.setAttribute('aria-label', 'Appointment request sent');
});

// Reveal content as it enters the viewport.
const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries, revealObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -35px' });
  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}
