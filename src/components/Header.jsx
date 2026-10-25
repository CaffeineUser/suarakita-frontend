import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Home,
  LogOut,
  Menu,
  PlusCircle,
  Shield,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export function Header() {
  const { user, isAuthenticated, isAdmin, isWarga, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    setMobileMenuOpen(false);
    navigate('/');
  }

  function closeMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <header className="site-header-wrapper">
      <div className="site-header-container">
        <Link to="/" className="brand-logo" onClick={closeMenu}>
          <div className="brand-icon-badge">
            <span className="brand-symbol">🌱</span>
          </div>
          <div className="brand-text-block">
            <span className="brand-name">SuaraKita</span>
            <span className="brand-tagline">Lingkungan Warga</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="desktop-nav" aria-label="Navigasi Utama">
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
            <Home size={16} /> Beranda
          </NavLink>

          {(!isAuthenticated || isWarga) && (
            <NavLink
              to="/reports/new"
              className={({ isActive }) => `nav-link btn-nav-create ${isActive ? 'active' : ''}`}
            >
              <PlusCircle size={16} /> Buat Laporan
            </NavLink>
          )}

          {isAdmin && (
            <NavLink
              to="/dashboard"
              className={({ isActive }) => `nav-link btn-nav-admin ${isActive ? 'active' : ''}`}
            >
              <BarChart3 size={16} /> Dashboard Admin
            </NavLink>
          )}
        </nav>

        {/* User / Auth Area */}
        <div className="header-auth-area desktop-only">
          {isAuthenticated ? (
            <div className="user-profile-menu">
              <div className="user-info-chip">
                <div className="user-avatar-circle">
                  {user?.role === 'admin' ? <Shield size={16} /> : <User size={16} />}
                </div>
                <div className="user-text-info">
                  <span className="user-display-name">{user?.name}</span>
                  <span className={`user-role-badge role-${user?.role}`}>
                    {user?.role === 'admin' ? 'Administrator' : 'Warga'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn-logout"
                onClick={handleLogout}
                title="Keluar dari akun"
                aria-label="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="auth-buttons-group">
              <Link to="/login" className="btn btn-ghost">
                Masuk
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Daftar Warga
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          className="mobile-menu-toggle mobile-only"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-label="Menu navigasi"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer mobile-only">
          <nav className="mobile-nav-links">
            <NavLink
              to="/"
              className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
              onClick={closeMenu}
              end
            >
              <Home size={18} /> Beranda
            </NavLink>

            {(!isAuthenticated || isWarga) && (
              <NavLink
                to="/reports/new"
                className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
                onClick={closeMenu}
              >
                <PlusCircle size={18} /> Buat Laporan Lingkungan
              </NavLink>
            )}

            {isAdmin && (
              <NavLink
                to="/dashboard"
                className={({ isActive }) => `mobile-nav-item admin-item ${isActive ? 'active' : ''}`}
                onClick={closeMenu}
              >
                <BarChart3 size={18} /> Dashboard Administrator
              </NavLink>
            )}

            <div className="mobile-auth-divider"></div>

            {isAuthenticated ? (
              <div className="mobile-user-box">
                <div className="mobile-user-details">
                  <span className="mobile-user-name">{user?.name}</span>
                  <span className="mobile-user-email">{user?.email}</span>
                  <span className={`user-role-badge role-${user?.role}`}>
                    Peran: {user?.role === 'admin' ? 'Administrator' : 'Warga'}
                  </span>
                </div>
                <button type="button" className="btn btn-outline btn-full btn-danger" onClick={handleLogout}>
                  <LogOut size={16} /> Keluar Akun
                </button>
              </div>
            ) : (
              <div className="mobile-auth-buttons">
                <Link to="/login" className="btn btn-outline btn-full" onClick={closeMenu}>
                  Masuk ke Akun
                </Link>
                <Link to="/register" className="btn btn-primary btn-full" onClick={closeMenu}>
                  Daftar Akun Warga
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

export default Header;
