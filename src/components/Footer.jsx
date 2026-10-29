import React from 'react';
import { Heart, ShieldCheck, Users } from 'lucide-react';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-container">
        <div className="footer-top-grid">
          <div className="footer-col brand-col">
            <div className="brand-logo footer-brand">
              <span className="brand-symbol" aria-hidden="true">🌱</span>
              <span className="brand-name">SuaraKita</span>
            </div>
            <p className="footer-desc">
              Platform aspirasi warga untuk melaporkan dan memantau masalah fasilitas umum dan
              kebersihan lingkungan secara transparan, akuntabel, dan berbasis prioritas nyata.
            </p>
          </div>

          <div className="footer-col demo-accounts-col">
            <h2 className="footer-heading">Akun Demo Lokal</h2>
            <ul className="demo-accounts-list">
              <li>
                <div className="demo-item">
                  <span className="demo-badge warga">
                    <Users size={12} aria-hidden="true" /> Warga
                  </span>
                  <code>warga@example.com</code> / <code>WargaDemo123!</code>
                </div>
              </li>
              <li>
                <div className="demo-item">
                  <span className="demo-badge admin">
                    <ShieldCheck size={12} aria-hidden="true" /> Admin
                  </span>
                  <code>admin@example.com</code> / <code>AdminDemo123!</code>
                </div>
              </li>
            </ul>
          </div>

          <div className="footer-col categories-col">
            <h2 className="footer-heading">Kategori Laporan</h2>
            <p className="footer-cat-tags">
              <span>Jalan Rusak</span>
              <span>Sampah Menumpuk</span>
              <span>Drainase Tersumbat</span>
              <span>Lampu Jalan Mati</span>
            </p>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <p className="copyright-text">
            &copy; {new Date().getFullYear()} SuaraKita. Proyek Aplikasi Pelaporan Lingkungan Masyarakat.
          </p>
          <p className="made-with-text">
            Dibangun dengan rasa peduli untuk lingkungan yang lebih baik             <Heart size={14} className="heart-text-icon" aria-hidden="true" />
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
