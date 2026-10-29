# SuaraKita Frontend

## Konfigurasi API

Frontend mengirim request API dan memuat foto laporan melalui
`VITE_API_BASE_URL`. Nilai `/api/v1` memakai reverse proxy same-origin sehingga
browser tidak memerlukan izin CORS dari backend.

Untuk development lokal, salin `.env.example` menjadi `.env` dan sesuaikan URL
backend bila diperlukan. Contoh:

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

Untuk deployment frontend dan backend terpisah di Vercel:

1. Pertahankan `VITE_API_BASE_URL=/api/v1` pada konfigurasi frontend.
2. `vercel.json` meneruskan path tersebut ke backend dan menyisakan rewrite SPA
   untuk halaman lain. Jika domain backend berubah, perbarui tujuan rewrite.
3. Build ulang atau redeploy frontend setelah mengubah konfigurasi.

Development dan preview lokal memakai proxy Vite yang sama. Pada hosting lain,
konfigurasikan reverse proxy `/api/v1` ke backend atau gunakan URL backend
langsung dan izinkan origin frontend melalui CORS.

## Pengujian frontend dan selector automation

Jalankan `bun run test` untuk unit test dan pemeriksaan aksesibilitas axe-core.
Gunakan `data-testid` sebagai selector stabil untuk kontrol interaktif, bukan
class CSS yang dapat berubah. Selector menggunakan nama fitur, contohnya:

- `report-search-input`, `report-filter-status`, dan `category-filter-all`
- `auth-email-input`, `auth-password-input`, dan `auth-submit`
- `create-report-form`, `report-photo-input`, dan `create-report-submit`
- `report-card-{id}`, `report-support-{id}`, dan `pagination-next`
- `dashboard-refresh`, `admin-status-submit`, dan `admin-urgency-submit`

Komponen dan halaman juga menyediakan label, role, dan nama aksesibel; utamakan
locator berdasarkan role/label saat sesuai, dan gunakan `data-testid` untuk
target aksi yang tidak memiliki nama semantik unik.
