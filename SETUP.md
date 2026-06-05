# Aesthete Hairdressing — Setup

Admin panel i online rezervacije koriste **Supabase** povezan kroz **Vercel integraciju**.

## 1. Povezivanje Supabase preko Vercel integracije

1. Otvorite [Vercel Dashboard](https://vercel.com/dashboard) → projekt **frizertaj**
2. Idite na **Storage** ili **Integrations** → **Browse Marketplace**
3. Odaberite **Supabase** → **Add Integration**
4. Povežite s postojećim Supabase projektom ili kreirajte novi
5. Odaberite Vercel projekt **frizertaj** i potvrdite pristup

Integracija automatski postavlja env varijable:

| Varijabla | Opis |
|-----------|------|
| `SUPABASE_URL` | URL Supabase projekta |
| `SUPABASE_ANON_KEY` | Javni anon ključ (frontend) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (samo server, ne koristi se u frontendu) |

> **Napomena:** Ako integracija traži odobrenje u Vercel dashboardu, morate je ručno potvrditi. Bez toga env varijable neće biti dostupne.

### Lokalni razvoj

```bash
npx vercel env pull .env.local
```

### Inicijalna postavka baze (jednom)

Nakon povezivanja integracije, pokrenite SQL shemu i kreirajte admin korisnika:

```bash
npm install pg --no-save
node scripts/setup-supabase.js
```

Skripta čita `.env.local` i:
1. Primjenjuje `supabase/schema.sql`
2. Kreira admin korisnika `admin@aesthete.hr` / `admin`

Env varijable se na produkciji učitavaju preko serverless funkcije `/api/config`.

## 2. SQL shema

1. U Supabase Dashboardu otvorite **SQL Editor**
2. Zalijepite i pokrenite sadržaj datoteke `supabase/schema.sql`

Ovo kreira tablicu `bookings` i RLS politike:
- **Anonimni posjetitelji** (javna stranica) mogu samo **INSERT** rezervacije
- **Autentificirani admin** ima puni CRUD pristup

## 3. Admin korisnik

Supabase Auth koristi e-mail/lozinku. Kreirajte admin korisnika:

1. Supabase Dashboard → **Authentication** → **Users** → **Add user**
2. Unesite:
   - **Email:** `admin@aesthete.hr`
   - **Password:** `admin`
   - Označite **Auto Confirm User**

### Prijava u admin panel

- URL: `https://frizertaj.vercel.app/admin/` (lokalno: `/admin/`)
- Korisničko ime: `admin` (mapira se na `admin@aesthete.hr`)
- Lozinka: `admin`

> **Važno:** Promijenite lozinku nakon prvog logina u produkciji!

## 4. Deploy

Push na `main` automatski deploya na Vercel. Provjerite da su env varijable vidljive:

```bash
npx vercel env ls
```

Ručni deploy:

```bash
npx vercel --prod
```

## 5. Struktura projekta

```
frizertaj/
├── admin/index.html      # Admin panel (/admin)
├── api/config.js         # Vercel funkcija — izlaže Supabase config iz env
├── js/
│   ├── supabase-config.js
│   ├── booking-shared.js
│   ├── admin.js
│   └── main.js
├── css/admin.css
├── supabase/schema.sql
└── SETUP.md
```

## Rješavanje problema

| Problem | Rješenje |
|---------|----------|
| "Supabase nije konfiguriran" | Povežite Supabase integraciju u Vercel dashboardu |
| Rezervacija ne prolazi | Pokrenite `schema.sql`, provjerite RLS politike |
| Admin login ne radi | Kreirajte korisnika `admin@aesthete.hr` u Supabase Auth |
| Termin "zauzet" | Unique index sprječava dupli booking za isti datum/vrijeme |
| `/api/config` vraća prazno | `npx vercel env pull` i redeploy |
