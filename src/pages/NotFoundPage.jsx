import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="not-found-container">
      <div className="not-found-card">
        <span className="not-found-code">404</span>
        <h1 className="not-found-title">Halaman Tidak Ditemukan</h1>
        <p className="not-found-desc">
          Maaf, halaman yang Anda tuju tidak ditemukan atau mungkin tautan sudah kedaluwarsa.
        </p>
        <Link to="/" className="btn btn-primary btn-lg">
          <Home size={18} /> Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
