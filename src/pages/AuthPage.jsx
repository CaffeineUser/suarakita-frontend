import React, { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export function AuthPage({ initialMode = 'login' }) {
  const [searchParams] = useSearchParams();
  const modeParam = searchParams.get('mode');
  const [isLoginMode, setIsLoginMode] = useState(
    modeParam ? modeParam === 'login' : initialMode === 'login',
  );

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTarget = location.state?.from?.pathname || '/';

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      if (isLoginMode) {
        await login(email.trim(), password);
      } else {
        await register(name.trim(), email.trim(), password);
      }
      navigate(redirectTarget, { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Gagal memproses autentikasi. Silakan periksa data Anda.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleFillDemo(demoEmail, demoPass) {
    setIsLoginMode(true);
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage('');
  }

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card">
        {/* Auth Tabs */}
        <div className="auth-tabs-header" role="tablist">
          <button
            type="button"
            className={`auth-tab-btn ${isLoginMode ? 'active' : ''}`}
            onClick={() => {
              setIsLoginMode(true);
              setErrorMessage('');
            }}
            role="tab"
            aria-selected={isLoginMode}
          >
            Masuk Akun
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${!isLoginMode ? 'active' : ''}`}
            onClick={() => {
              setIsLoginMode(false);
              setErrorMessage('');
            }}
            role="tab"
            aria-selected={!isLoginMode}
          >
            Daftar Warga
          </button>
        </div>

        <div className="auth-card-body">
          <div className="auth-title-block">
            <h1 className="auth-title">
              {isLoginMode ? 'Selamat Datang Kembali' : 'Pendaftaran Akun Warga'}
            </h1>
            <p className="auth-subtitle">
              {isLoginMode
                ? 'Masuk untuk mengelola laporan dan mendukung aspirasi lingkungan Anda.'
                : 'Daftar sebagai warga untuk membuat laporan dan memantau perbaikan lingkungan.'}
            </p>
          </div>

          {errorMessage && (
            <div className="alert-box alert-error" role="alert">
              <AlertCircle size={18} className="alert-icon" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            {!isLoginMode && (
              <div className="form-group">
                <label htmlFor="auth-name" className="form-label">
                  Nama Lengkap <span className="required">*</span>
                </label>
                <div className="input-with-icon">
                  <User size={18} className="field-icon" />
                  <input
                    id="auth-name"
                    type="text"
                    required
                    minLength={3}
                    maxLength={100}
                    placeholder="Contoh: Budi Santoso"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="auth-email" className="form-label">
                Alamat Email <span className="required">*</span>
              </label>
              <div className="input-with-icon">
                <Mail size={18} className="field-icon" />
                <input
                  id="auth-email"
                  type="email"
                  required
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="auth-password" className="form-label">
                Kata Sandi <span className="required">*</span>
              </label>
              <div className="input-with-icon">
                <Lock size={18} className="field-icon" />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  placeholder={isLoginMode ? 'Masukkan kata sandi' : 'Minimal 8 karakter'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {!isLoginMode && (
                <span className="input-help-text">Minimal 8 karakter untuk keamanan akun.</span>
              )}
            </div>

            <button type="submit" className="btn btn-primary btn-full btn-auth-submit" disabled={isLoading}>
              {isLoading
                ? 'Memproses...'
                : isLoginMode
                ? 'Masuk ke Aplikasi'
                : 'Daftar Sekarang'}
            </button>
          </form>

          {/* Quick Demo Fill Buttons */}
          <div className="demo-credentials-box">
            <span className="demo-box-label">Gunakan Akun Demo Pengujian Cepat:</span>
            <div className="demo-buttons-row">
              <button
                type="button"
                className="btn-demo-quick warga"
                onClick={() => handleFillDemo('warga@example.com', 'WargaDemo123!')}
              >
                <Users size={14} /> Demo Warga
              </button>
              <button
                type="button"
                className="btn-demo-quick admin"
                onClick={() => handleFillDemo('admin@example.com', 'AdminDemo123!')}
              >
                <ShieldCheck size={14} /> Demo Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
