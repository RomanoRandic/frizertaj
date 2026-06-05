const SERVICES = {
  muskarci: [
    { name: 'Muško šišanje klasično', duration: '30 min', price: '25 €', note: 'Uključuje pranje kose' },
    { name: 'Muško šišanje moderno (fade)', duration: '30 min', price: '30 €' },
    { name: 'Muško šišanje i uređivanje brade', duration: '45 min', price: '35 €' },
    { name: 'Uređivanje brade', duration: '15 min', price: '10 €' },
    { name: 'Dječje šišanje do 7 godina', duration: '30 min', price: '20 €' },
    { name: 'Muško šišanje + boja COVER5', duration: '45 min', price: '50 €' },
  ],
  zenske: [
    { name: 'Šišanje + frizura — kratka kosa', duration: '60 min', price: '45 €' },
    { name: 'Šišanje + frizura — poluduga kosa', duration: '60 min', price: '50 €' },
    { name: 'Šišanje + frizura — duga kosa', duration: '75 min', price: '60 €' },
    { name: 'Pramenovi — površinski', duration: '30 min', price: 'od 40 €' },
    { name: 'Pramenovi — cijela glava', duration: '45 min', price: 'od 60 €' },
    { name: 'Bojanje izrasta', duration: '30 min', price: '50 €' },
    { name: 'Svečano stiliziranje', duration: '60 min', price: 'od 50 €' },
  ],
  njega: [
    { name: 'Naturaltech Tailoring tretman — Davines', duration: '15 min', price: '25 €' },
    { name: 'Čišćenje vlasišta Sea Salt Scrub', duration: '15 min', price: '15 €' },
    { name: 'Njega kose — maska', duration: '15 min', price: '10 €' },
    { name: 'Izrada pletenica', duration: '90 min', price: 'od 50 €' },
  ],
};

const TIME_SLOTS = BOOKING_TIME_SLOTS;

let selectedTime = null;
let bookedTimes = [];

const SLIDES = [
  { src: 'images/barber.jpg', alt: 'Unutrašnjost salona', caption: 'Opustite se u našem salonu — profesionalna usluga u ugodnom ambijentu ✨', type: 'photo' },
  { src: 'images/style.jpg', alt: 'Stiliziranje u salonu', caption: 'Svaki detalj na svom mjestu — vaš savršen izgled 💫', type: 'photo' },
  { src: 'images/salon-1.jpg', alt: 'Rad u salonu', caption: 'Preciznost u svakom rez-u 💇‍♀️', type: 'photo' },
  { src: 'images/hero.jpg', alt: 'Balayage frizura', caption: 'Balayage i stiliziranje duge kose ✨', type: 'photo' },
  { src: 'images/color.jpg', alt: 'Bojanje kose', caption: 'Savršeni preljev i bojanje 🎨', type: 'reel' },
  { src: 'images/salon-2.jpg', alt: 'Salon Aesthete', caption: 'Dobrodošli — Šime Devčića 1, Zagreb 🏠', type: 'photo' },
  { src: 'images/exterior.jpg', alt: 'Salon vanjski prikaz', caption: 'Posjetite nas u centru Zagreba 📍', type: 'photo' },
];

const IG_URL = 'https://www.instagram.com/aesthete.hairdressing/';

function renderMarqueeItem(slide) {
  const isReel = slide.type === 'reel';
  const play = isReel ? `
    <div class="ig-marquee-play" aria-hidden="true">
      <span><svg viewBox="0 0 24 24" fill="currentColor"><polygon points="8 5 19 12 8 19"/></svg></span>
    </div>` : '';

  return `
    <a href="${IG_URL}" target="_blank" rel="noopener" class="ig-marquee-card">
      <div class="ig-marquee-card-header">
        <img src="images/logo.jpg" alt="">
        aesthete.hairdressing
      </div>
      <div class="ig-marquee-media">
        <img src="${slide.src}" alt="${slide.alt}" loading="lazy">
        ${play}
      </div>
      <p class="ig-marquee-caption"><strong>aesthete.hairdressing</strong> ${slide.caption}</p>
    </a>`;
}

function initMarquee() {
  const track = document.getElementById('ig-marquee-track');
  const marquee = document.getElementById('ig-marquee');
  if (!track || !SLIDES.length) return;

  const items = SLIDES.map(renderMarqueeItem).join('');
  track.innerHTML = items + items;

  marquee?.addEventListener('mouseenter', () => marquee.classList.add('is-paused'));
  marquee?.addEventListener('mouseleave', () => {
    if (!marquee.classList.contains('is-dragging')) {
      marquee.classList.remove('is-paused');
    }
  });

  let isDown = false;
  let startX = 0;
  let offsetX = 0;

  marquee?.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    isDown = true;
    marquee.classList.add('is-dragging', 'is-paused');
    startX = e.pageX;
    const transform = getComputedStyle(track).transform;
    offsetX = transform !== 'none' ? new DOMMatrix(transform).m41 : 0;
    track.style.animation = 'none';
  });

  window.addEventListener('mouseup', () => {
    if (!isDown) return;
    isDown = false;
    marquee?.classList.remove('is-dragging', 'is-paused');
    track.style.animation = '';
    track.style.transform = '';
  });

  marquee?.addEventListener('mousemove', e => {
    if (!isDown) return;
    e.preventDefault();
    track.style.transform = `translateX(${offsetX + (e.pageX - startX)}px)`;
  });
}

function renderServices(tab) {
  const grid = document.getElementById('services-grid');
  const items = SERVICES[tab] || [];
  grid.innerHTML = items.map(s => `
    <article class="service-card">
      <h4>${s.name}</h4>
      ${s.note ? `<p style="font-size:0.8rem;color:rgba(232,228,223,0.45);margin-bottom:0.5rem">${s.note}</p>` : ''}
      <div class="service-meta">
        <span>${s.duration}</span>
        <span class="service-price">${s.price}</span>
      </div>
    </article>
  `).join('');
}

function renderTimeSlots() {
  const container = document.getElementById('time-slots');
  if (!container) return;

  container.innerHTML = TIME_SLOTS.map(time => {
    const disabled = bookedTimes.includes(time);
    const selected = selectedTime === time;
    return `<button type="button" class="time-slot${disabled ? ' disabled' : ''}${selected ? ' selected' : ''}" data-time="${time}"${disabled ? ' disabled' : ''}>${time}</button>`;
  }).join('');

  container.querySelectorAll('.time-slot:not(.disabled)').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedTime = btn.dataset.time;
      renderTimeSlots();
    });
  });
}

async function refreshBookedTimes() {
  const dateInput = document.getElementById('date');
  if (!dateInput?.value || !window.AestheteSupabase?.ready) {
    bookedTimes = [];
    return;
  }
  bookedTimes = await fetchBookedTimes(dateInput.value);
  if (selectedTime && bookedTimes.includes(selectedTime)) {
    selectedTime = null;
  }
  renderTimeSlots();
}

function setMinDate() {
  const dateInput = document.getElementById('date');
  if (!dateInput) return;

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  dateInput.min = `${yyyy}-${mm}-${dd}`;

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  dateInput.value = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
}

function initHeader() {
  const header = document.getElementById('header');
  const nav = document.querySelector('.nav');
  const toggle = document.querySelector('.nav-toggle');

  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 60);
  });

  toggle?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });

  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => nav.classList.remove('open'));
  });
}

function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderServices(btn.dataset.tab);
    });
  });
  renderServices('muskarci');
}

function initBookingForm() {
  const form = document.getElementById('booking-form');
  const success = document.getElementById('booking-success');
  const resetBtn = document.getElementById('reset-booking');
  const dateInput = document.getElementById('date');
  const errorEl = document.getElementById('booking-error');
  const submitBtn = document.getElementById('booking-submit');

  dateInput?.addEventListener('change', () => {
    selectedTime = null;
    refreshBookedTimes();
  });

  form?.addEventListener('submit', async e => {
    e.preventDefault();
    errorEl?.classList.add('hidden');

    if (!selectedTime) {
      document.getElementById('time-slots')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!window.AestheteSupabase?.ready) {
      errorEl.textContent = 'Sustav rezervacija trenutno nije dostupan. Nazovite nas na +385 98 617 888.';
      errorEl.classList.remove('hidden');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Spremanje…';

    try {
      await createBooking({
        client_name: document.getElementById('name').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        service: document.getElementById('service').value,
        booking_date: document.getElementById('date').value,
        booking_time: selectedTime,
      });
      form.hidden = true;
      success.hidden = false;
    } catch (err) {
      const msg = err.message?.includes('unique') || err.code === '23505'
        ? 'Odabrani termin je već zauzet. Molimo odaberite drugo vrijeme.'
        : 'Greška pri rezervaciji. Pokušajte ponovo ili nas nazovite.';
      errorEl.textContent = msg;
      errorEl.classList.remove('hidden');
      await refreshBookedTimes();
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Potvrdi rezervaciju';
    }
  });

  resetBtn?.addEventListener('click', () => {
    form.reset();
    selectedTime = null;
    setMinDate();
    refreshBookedTimes();
    form.hidden = false;
    success.hidden = true;
    errorEl?.classList.add('hidden');
  });
}

function initReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.service-card, .about-text, .booking-form, .ig-marquee-zone, .review-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  initHeader();
  initTabs();
  initMarquee();
  setMinDate();
  renderTimeSlots();

  await window.AestheteSupabase?.init();
  if (window.AestheteSupabase?.configured) {
    await refreshBookedTimes();
  }

  initBookingForm();
  initReveal();
});
