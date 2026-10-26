# SuaraKita Frontend

## Konfigurasi API

Frontend mengirim request API dan memuat foto laporan langsung dari URL yang
ditentukan oleh `VITE_API_BASE_URL`.

Untuk development lokal, salin `.env.example` menjadi `.env` dan sesuaikan URL
backend bila diperlukan. Contoh:

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

Untuk deployment terpisah (frontend di Vercel dan backend persisten di Render):

1. Tambahkan environment variable `VITE_API_BASE_URL` pada pengaturan project
   frontend. Isinya harus URL lengkap backend beserta prefix API, misalnya
   `https://suarakita-backend.onrender.com/api/v1` (tanpa slash di akhir).
2. Build ulang atau redeploy frontend setelah mengubah environment variable;
   Vite menyertakan nilainya saat proses build.
3. Konfigurasikan backend untuk mengizinkan origin domain frontend melalui
   CORS. Backend juga harus mengizinkan request preflight `OPTIONS`, header
   `Authorization` dan `Content-Type`, serta metode HTTP yang digunakan API.

Jika Render menampilkan domain backend yang berbeda, gunakan domain aktual
tersebut di Environment Variables project frontend Vercel.

Jangan memasukkan URL deployment ke source code: nilai production diatur melalui
environment variable hosting. Jika `VITE_API_BASE_URL` tidak disetel saat build
production, request API akan menghasilkan pesan konfigurasi yang jelas alih-alih
mencoba menghubungi localhost.
