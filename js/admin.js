/** Aesthete Admin Panel */
let allBookings = [];
let charts = {};

const PANEL_TITLES = {
  dashboard: 'Pregled',
  bookings: 'Rezervacije',
  clients: 'Klijenti',
  analytics: 'Analitika',
};

document.addEventListener('DOMContentLoaded', initAdmin);

async function initAdmin() {
  showLoading(true);

  try {
    await window.AestheteSupabase.init();

    if (!window.AestheteSupabase.configured) {
      showConfigError();
      return;
    }

    const { data: { session } } = await window.AestheteSupabase.client.auth.getSession();

    if (session) {
      showDashboard(session.user);
      await loadData();
    } else {
      showLogin();
    }

    bindEvents();
  } catch (err) {
    console.error(err);
    showConfigError(err.message);
  } finally {
    showLoading(false);
  }

  window.AestheteSupabase.client.auth.onAuthStateChange((_event, session) => {
    if (session) {
      showDashboard(session.user);
      loadData();
    } else {
      showLogin();
    }
  });
}

function showConfigError(msg) {
  showLoading(false);
  const login = document.getElementById('login-screen');
  login.classList.remove('hidden');
  document.getElementById('login-form').classList.add('hidden');
  const err = document.getElementById('login-error');
  err.classList.remove('hidden');
  err.innerHTML = msg || 'Supabase nije konfiguriran. Povežite Supabase integraciju u Vercel dashboardu i pokrenite SQL shemu. Pogledajte <a href="../SETUP.md" style="color:var(--accent)">SETUP.md</a>.';
}

function bindEvents() {
  document.getElementById('login-form')?.addEventListener('submit', handleLogin);
  document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
  document.getElementById('menu-toggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchPanel(btn.dataset.panel));
  });

  document.getElementById('add-booking-btn')?.addEventListener('click', () => openBookingModal());
  document.getElementById('modal-close')?.addEventListener('click', closeBookingModal);
  document.getElementById('modal-cancel')?.addEventListener('click', closeBookingModal);
  document.getElementById('booking-form')?.addEventListener('submit', handleBookingSave);

  document.getElementById('bookings-search')?.addEventListener('input', renderBookingsTable);
  document.getElementById('bookings-status-filter')?.addEventListener('change', renderBookingsTable);
  document.getElementById('bookings-date-filter')?.addEventListener('change', renderBookingsTable);

  populateServiceSelect(document.getElementById('bf-service'));
  populateTimeSelect(document.getElementById('bf-time'));
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');
  errEl.classList.add('hidden');

  const email = resolveAdminEmail(document.getElementById('username').value);
  const password = document.getElementById('password').value;

  btn.disabled = true;
  btn.textContent = 'Prijava…';

  const { error } = await window.AestheteSupabase.client.auth.signInWithPassword({ email, password });

  btn.disabled = false;
  btn.textContent = 'Prijava';

  if (error) {
    errEl.textContent = 'Pogrešno korisničko ime ili lozinka.';
    errEl.classList.remove('hidden');
  }
}

async function handleLogout() {
  await window.AestheteSupabase.client.auth.signOut();
  allBookings = [];
  destroyCharts();
}

function showLoading(show) {
  document.getElementById('loading').classList.toggle('hidden', !show);
}

function showLogin() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('admin-app').classList.add('hidden');
}

function showDashboard(user) {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('admin-app').classList.remove('hidden');
  document.getElementById('user-email').textContent = user.email || '';
}

function switchPanel(panel) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.panel === panel));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === `panel-${panel}`));
  document.getElementById('page-title').textContent = PANEL_TITLES[panel] || panel;
  document.getElementById('sidebar').classList.remove('open');

  if (panel === 'analytics') {
    renderAnalyticsCharts();
  }
}

async function loadData() {
  showLoading(true);
  try {
    allBookings = await fetchAllBookings();
    renderStats();
    renderDashboardCharts();
    renderBookingsTable();
    renderClientsTable();
  } catch (err) {
    console.error(err);
    alert('Greška pri učitavanju podataka: ' + err.message);
  } finally {
    showLoading(false);
  }
}

function renderStats() {
  const active = allBookings.filter(b => b.status !== 'cancelled');
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = active.filter(b => b.booking_date === today).length;
  const pending = allBookings.filter(b => b.status === 'pending').length;
  const clients = computeClientStats(allBookings);
  const returning = clients.filter(c => c.total_bookings > 1).length;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekCount = active.filter(b => new Date(b.created_at) >= weekAgo).length;

  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card"><div class="label">Ukupno rezervacija</div><div class="value">${active.length}</div></div>
    <div class="stat-card"><div class="label">Danas</div><div class="value">${todayCount}</div><div class="sub">Termini za danas</div></div>
    <div class="stat-card"><div class="label">Na čekanju</div><div class="value">${pending}</div></div>
    <div class="stat-card"><div class="label">Klijenti</div><div class="value">${clients.length}</div><div class="sub">${returning} povratnih</div></div>
    <div class="stat-card"><div class="label">Ovaj tjedan</div><div class="value">${weekCount}</div><div class="sub">Nove rezervacije</div></div>
  `;
}

function getFilteredBookings() {
  const search = (document.getElementById('bookings-search')?.value || '').toLowerCase();
  const status = document.getElementById('bookings-status-filter')?.value || '';
  const date = document.getElementById('bookings-date-filter')?.value || '';

  return allBookings.filter(b => {
    if (status && b.status !== status) return false;
    if (date && b.booking_date !== date) return false;
    if (search) {
      const hay = `${b.client_name} ${b.phone} ${b.email || ''} ${b.service_label || b.service}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
}

function renderBookingsTable() {
  const tbody = document.getElementById('bookings-tbody');
  const filtered = getFilteredBookings();

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Nema rezervacija</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(b => `
    <tr>
      <td>${formatDateHR(b.booking_date)}</td>
      <td>${b.booking_time}</td>
      <td>${escapeHtml(b.client_name)}</td>
      <td>${escapeHtml(b.phone)}</td>
      <td>${escapeHtml(b.service_label || b.service)}</td>
      <td><span class="status-badge status-${b.status}">${STATUS_LABELS[b.status] || b.status}</span></td>
      <td>
        <div class="table-actions">
          <button type="button" class="btn btn-outline btn-sm" data-edit="${b.id}">Uredi</button>
          <button type="button" class="btn btn-danger btn-sm" data-delete="${b.id}">Obriši</button>
        </div>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const booking = allBookings.find(b => b.id === btn.dataset.edit);
      if (booking) openBookingModal(booking);
    });
  });

  tbody.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => handleDelete(btn.dataset.delete));
  });
}

function renderClientsTable() {
  const tbody = document.getElementById('clients-tbody');
  const clients = computeClientStats(allBookings);

  if (!clients.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Nema klijenata</td></tr>';
    return;
  }

  tbody.innerHTML = clients.map(c => `
    <tr>
      <td>${escapeHtml(c.client_name)}</td>
      <td>${escapeHtml(c.phone)}</td>
      <td>${escapeHtml(c.email || '—')}</td>
      <td>${c.total_bookings} ${c.total_bookings > 1 ? '<span class="client-returning">↩ povratni</span>' : '<span class="client-new">★ novi</span>'}</td>
      <td>${formatDateTimeHR(c.first_visit)}</td>
      <td>${formatDateTimeHR(c.last_visit)}</td>
    </tr>
  `).join('');
}

function chartDefaults() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: 'rgba(232,228,223,0.7)' } },
    },
    scales: {
      x: { ticks: { color: 'rgba(232,228,223,0.5)' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { ticks: { color: 'rgba(232,228,223,0.5)' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true },
    },
  };
}

function destroyCharts() {
  Object.values(charts).forEach(c => c?.destroy());
  charts = {};
}

function renderDashboardCharts() {
  destroyCharts();
  const active = allBookings.filter(b => b.status !== 'cancelled');

  const days = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days[key] = 0;
  }
  active.forEach(b => {
    const key = b.created_at.slice(0, 10);
    if (days[key] !== undefined) days[key]++;
  });

  const trendCtx = document.getElementById('chart-bookings-trend');
  if (trendCtx) {
    charts.trend = new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: Object.keys(days).map(k => formatDateHR(k)),
        datasets: [{
          label: 'Rezervacije',
          data: Object.values(days),
          borderColor: '#c4a574',
          backgroundColor: 'rgba(196,165,116,0.15)',
          fill: true,
          tension: 0.3,
        }],
      },
      options: chartDefaults(),
    });
  }

  const serviceCounts = {};
  active.forEach(b => {
    const label = b.service_label || b.service;
    serviceCounts[label] = (serviceCounts[label] || 0) + 1;
  });

  const svcCtx = document.getElementById('chart-services');
  if (svcCtx) {
    charts.services = new Chart(svcCtx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(serviceCounts),
        datasets: [{
          data: Object.values(serviceCounts),
          backgroundColor: ['#c4a574', '#6b9e78', '#8b7355', '#d4b888', '#a08050', '#5a8a66', '#9e8560', '#7a6540'],
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: 'rgba(232,228,223,0.7)', boxWidth: 12 } } },
      },
    });
  }
}

function renderAnalyticsCharts() {
  const active = allBookings.filter(b => b.status !== 'cancelled');
  const dayNames = ['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub'];
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];

  active.forEach(b => {
    const d = new Date(b.booking_date + 'T12:00:00');
    dayCounts[d.getDay()]++;
  });

  upsertChart('busyDays', 'chart-busy-days', 'bar', {
    labels: dayNames,
    datasets: [{ label: 'Termini', data: dayCounts, backgroundColor: '#c4a574' }],
  });

  const timeCounts = {};
  BOOKING_TIME_SLOTS.forEach(t => { timeCounts[t] = 0; });
  active.forEach(b => { if (timeCounts[b.booking_time] !== undefined) timeCounts[b.booking_time]++; });

  upsertChart('busyTimes', 'chart-busy-times', 'bar', {
    labels: Object.keys(timeCounts),
    datasets: [{ label: 'Termini', data: Object.values(timeCounts), backgroundColor: '#6b9e78' }],
  });

  const { newClients, returning } = countNewVsReturning(allBookings);
  upsertChart('clientTypes', 'chart-client-types', 'doughnut', {
    labels: ['Novi klijenti', 'Povratne posjete'],
    datasets: [{ data: [newClients, returning], backgroundColor: ['#c4a574', '#6b9e78'] }],
  }, { plugins: { legend: { position: 'bottom', labels: { color: 'rgba(232,228,223,0.7)' } } } });

  const statusCounts = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
  allBookings.forEach(b => { statusCounts[b.status] = (statusCounts[b.status] || 0) + 1; });

  upsertChart('status', 'chart-status', 'pie', {
    labels: Object.keys(statusCounts).map(s => STATUS_LABELS[s]),
    datasets: [{ data: Object.values(statusCounts), backgroundColor: ['#c4a574', '#6b9e78', '#9fd4ab', '#c45c5c'] }],
  }, { plugins: { legend: { position: 'bottom', labels: { color: 'rgba(232,228,223,0.7)' } } } });
}

function upsertChart(key, canvasId, type, data, extraOptions = {}) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  if (charts[key]) charts[key].destroy();
  charts[key] = new Chart(ctx, {
    type,
    data,
    options: { ...chartDefaults(), ...extraOptions },
  });
}

function populateServiceSelect(select) {
  if (!select) return;
  select.innerHTML = '<option value="">Odaberite uslugu…</option>' +
    Object.entries(BOOKING_SERVICES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
}

function populateTimeSelect(select) {
  if (!select) return;
  select.innerHTML = BOOKING_TIME_SLOTS.map(t => `<option value="${t}">${t}</option>`).join('');
}

function openBookingModal(booking) {
  const modal = document.getElementById('booking-modal');
  const isEdit = !!booking;

  document.getElementById('modal-title').textContent = isEdit ? 'Uredi rezervaciju' : 'Nova rezervacija';
  document.getElementById('booking-id').value = booking?.id || '';
  document.getElementById('bf-name').value = booking?.client_name || '';
  document.getElementById('bf-phone').value = booking?.phone || '';
  document.getElementById('bf-email').value = booking?.email || '';
  document.getElementById('bf-service').value = booking?.service || '';
  document.getElementById('bf-date').value = booking?.booking_date || '';
  document.getElementById('bf-time').value = booking?.booking_time || '09:00';
  document.getElementById('bf-status').value = booking?.status || 'pending';
  document.getElementById('bf-notes').value = booking?.notes || '';
  document.getElementById('modal-error').classList.add('hidden');

  modal.classList.remove('hidden');
}

function closeBookingModal() {
  document.getElementById('booking-modal').classList.add('hidden');
  document.getElementById('booking-form').reset();
}

async function handleBookingSave(e) {
  e.preventDefault();
  const id = document.getElementById('booking-id').value;
  const errEl = document.getElementById('modal-error');
  const saveBtn = document.getElementById('modal-save');

  const payload = {
    client_name: document.getElementById('bf-name').value,
    phone: document.getElementById('bf-phone').value,
    email: document.getElementById('bf-email').value,
    service: document.getElementById('bf-service').value,
    booking_date: document.getElementById('bf-date').value,
    booking_time: document.getElementById('bf-time').value,
    status: document.getElementById('bf-status').value,
    notes: document.getElementById('bf-notes').value,
  };

  saveBtn.disabled = true;
  errEl.classList.add('hidden');

  try {
    if (id) {
      await updateBooking(id, {
        client_name: payload.client_name.trim(),
        phone: normalizePhone(payload.phone),
        email: payload.email?.trim() || null,
        service: payload.service,
        service_label: BOOKING_SERVICES[payload.service] || payload.service,
        booking_date: payload.booking_date,
        booking_time: payload.booking_time,
        status: payload.status,
        notes: payload.notes?.trim() || null,
      });
    } else {
      await createBooking(payload);
    }
    closeBookingModal();
    await loadData();
  } catch (err) {
    errEl.textContent = err.message.includes('unique') || err.code === '23505'
      ? 'Termin je već zauzet.'
      : 'Greška: ' + err.message;
    errEl.classList.remove('hidden');
  } finally {
    saveBtn.disabled = false;
  }
}

async function handleDelete(id) {
  const booking = allBookings.find(b => b.id === id);
  if (!booking) return;
  if (!confirm(`Obrisati rezervaciju za ${booking.client_name} (${formatDateHR(booking.booking_date)} ${booking.booking_time})?`)) return;

  try {
    await deleteBooking(id);
    await loadData();
  } catch (err) {
    alert('Greška pri brisanju: ' + err.message);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
