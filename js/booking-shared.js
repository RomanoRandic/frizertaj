/** Shared booking constants and helpers */
const BOOKING_SERVICES = {
  'musko-sisanje': 'Muško šišanje klasično — 25 €',
  fade: 'Muško šišanje moderno (fade) — 30 €',
  brada: 'Muško šišanje i brada — 35 €',
  'zensko-kratka': 'Šišanje + frizura (kratka) — 45 €',
  'zensko-poluduga': 'Šišanje + frizura (poluduga) — 50 €',
  'zensko-duga': 'Šišanje + frizura (duga) — 60 €',
  pramenovi: 'Pramenovi — od 40 €',
  bojanje: 'Bojanje izrasta — od 50 €',
};

const BOOKING_TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30',
];

const STATUS_LABELS = {
  pending: 'Na čekanju',
  confirmed: 'Potvrđeno',
  completed: 'Završeno',
  cancelled: 'Otkazano',
};

const ADMIN_EMAIL = 'admin@aesthete.hr';

function normalizePhone(phone) {
  return (phone || '').replace(/\s+/g, '').trim();
}

function clientKey(booking) {
  const email = (booking.email || '').trim().toLowerCase();
  if (email) return `email:${email}`;
  return `phone:${normalizePhone(booking.phone)}`;
}

function formatDateHR(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}.`;
}

function formatDateTimeHR(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('hr-HR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function resolveAdminEmail(usernameOrEmail) {
  const value = (usernameOrEmail || '').trim();
  if (!value) return '';
  if (value.includes('@')) return value;
  if (value.toLowerCase() === 'admin') return ADMIN_EMAIL;
  return `${value}@aesthete.hr`;
}

async function fetchBookedTimes(date) {
  const sb = window.AestheteSupabase;
  if (!sb.ready || !date) return [];

  const { data, error } = await sb.client
    .from('bookings')
    .select('booking_time')
    .eq('booking_date', date)
    .not('status', 'eq', 'cancelled');

  if (error) {
    console.error('Greška pri učitavanju termina:', error.message);
    return [];
  }

  return (data || []).map(row => row.booking_time);
}

async function createBooking(payload) {
  const sb = window.AestheteSupabase;
  if (!sb.ready) {
    throw new Error('Supabase nije konfiguriran. Pogledajte SETUP.md.');
  }

  const record = {
    client_name: payload.client_name.trim(),
    phone: normalizePhone(payload.phone),
    email: payload.email?.trim() || null,
    service: payload.service,
    service_label: BOOKING_SERVICES[payload.service] || payload.service,
    booking_date: payload.booking_date,
    booking_time: payload.booking_time,
    status: payload.status || 'pending',
    notes: payload.notes?.trim() || null,
  };

  const { data, error } = await sb.client
    .from('bookings')
    .insert(record)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function fetchAllBookings() {
  const sb = window.AestheteSupabase;
  if (!sb.ready) throw new Error('Supabase nije konfiguriran.');

  const { data, error } = await sb.client
    .from('bookings')
    .select('*')
    .order('booking_date', { ascending: false })
    .order('booking_time', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function updateBooking(id, updates) {
  const sb = window.AestheteSupabase;
  const { data, error } = await sb.client
    .from('bookings')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function deleteBooking(id) {
  const sb = window.AestheteSupabase;
  const { error } = await sb.client.from('bookings').delete().eq('id', id);
  if (error) throw error;
}

function computeClientStats(bookings) {
  const map = new Map();

  bookings
    .filter(b => b.status !== 'cancelled')
    .forEach(b => {
      const key = clientKey(b);
      const existing = map.get(key) || {
        client_name: b.client_name,
        phone: b.phone,
        email: b.email,
        total_bookings: 0,
        first_visit: b.created_at,
        last_visit: b.created_at,
      };
      existing.total_bookings += 1;
      if (new Date(b.created_at) < new Date(existing.first_visit)) {
        existing.first_visit = b.created_at;
      }
      if (new Date(b.created_at) > new Date(existing.last_visit)) {
        existing.last_visit = b.created_at;
      }
      map.set(key, existing);
    });

  return Array.from(map.values()).sort((a, b) => b.total_bookings - a.total_bookings);
}

function countNewVsReturning(bookings) {
  const seen = new Set();
  let newClients = 0;
  let returning = 0;

  [...bookings]
    .filter(b => b.status !== 'cancelled')
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .forEach(b => {
      const key = clientKey(b);
      if (seen.has(key)) {
        returning += 1;
      } else {
        seen.add(key);
        newClients += 1;
      }
    });

  return { newClients, returning };
}
