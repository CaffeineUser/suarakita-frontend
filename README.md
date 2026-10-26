# SuaraKita Frontend

## Konfigurasi API

Frontend mengirim request API dan memuat foto laporan langsung dari URL yang
ditentukan oleh `VITE_API_BASE_URL`.

Untuk development lokal, salin `.env.example` menjadi `.env` dan sesuaikan URL
backend bila diperlukan. Contoh:

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

Untuk deployment frontend dan backend terpisah di Vercel:

1. Tambahkan environment variable `VITE_API_BASE_URL` pada pengaturan project
   frontend. Isinya harus URL lengkap backend beserta prefix API, misalnya
   `https://suarakita-backend.vercel.app/api/v1` (tanpa slash di akhir).
2. Build ulang atau redeploy frontend setelah mengubah environment variable;
   Vite menyertakan nilainya saat proses build.
3. Konfigurasikan backend untuk mengizinkan origin domain frontend melalui
   CORS. Backend juga harus mengizinkan request preflight `OPTIONS`, header
   `Authorization` dan `Content-Type`, serta metode HTTP yang digunakan API.

Jangan memasukkan URL deployment ke source code: nilai production diatur melalui
environment variable hosting. Jika `VITE_API_BASE_URL` tidak disetel saat build
production, request API akan menghasilkan pesan konfigurasi yang jelas alih-alih
mencoba menghubungi localhost.
