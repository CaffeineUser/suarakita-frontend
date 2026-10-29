import React, { lazy, Suspense } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Footer from './components/Footer.jsx';
import Header from './components/Header.jsx';
import { LoadingSpinner } from './components/Feedback.jsx';
import { GuestRoute, ProtectedRoute } from './components/RouteGuard.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import PageMetadata from './components/PageMetadata.jsx';
import HomePage from './pages/HomePage.jsx';

const AuthPage = lazy(() => import('./pages/AuthPage.jsx'));
const CreateReportPage = lazy(() => import('./pages/CreateReportPage.jsx'));
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));
const EditReportPage = lazy(() => import('./pages/EditReportPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));
const ReportDetailPage = lazy(() => import('./pages/ReportDetailPage.jsx'));

function getPageMetadata(pathname) {
  if (pathname === '/') {
    return {
      title: 'SuaraKita | Laporan Lingkungan Warga',
      description: 'Laporkan, dukung, dan pantau perbaikan masalah fasilitas umum dan lingkungan di sekitar Anda.',
    };
  }
  if (pathname === '/login' || pathname === '/register') {
    return {
      title: `${pathname === '/login' ? 'Masuk' : 'Daftar'} | SuaraKita`,
      description: 'Akses SuaraKita untuk membuat dan memantau laporan lingkungan warga.',
    };
  }
  if (pathname === '/reports/new') {
    return {
      title: 'Buat Laporan Lingkungan | SuaraKita',
      description: 'Buat laporan masalah fasilitas umum atau lingkungan dengan informasi dan bukti foto.',
    };
  }
  if (/^\/reports\/[^/]+\/edit$/.test(pathname)) {
    return {
      title: 'Edit Laporan | SuaraKita',
      description: 'Perbarui rincian laporan lingkungan yang telah Anda buat.',
    };
  }
  if (/^\/reports\/[^/]+$/.test(pathname)) {
    return {
      title: 'Detail Laporan Lingkungan | SuaraKita',
      description: 'Lihat rincian, status, dan prioritas laporan lingkungan warga.',
    };
  }
  if (pathname === '/dashboard') {
    return {
      title: 'Dashboard Admin | SuaraKita',
      description: 'Pantau statistik, prioritas, dan status penanganan laporan lingkungan.',
    };
  }
  return {
    title: 'Halaman Tidak Ditemukan | SuaraKita',
    description: 'Halaman yang Anda cari tidak ditemukan.',
  };
}

function getPageLayoutClass(pathname) {
  if (pathname === '/login' || pathname === '/register') return 'route-auth';
  if (/^\/reports\/[^/]+$/.test(pathname)) return 'route-detail';
  if (pathname === '/reports/new' || /^\/reports\/[^/]+\/edit$/.test(pathname)) {
    return 'route-form';
  }
  if (pathname === '/dashboard') return 'route-dashboard';
  return '';
}

function App() {
  const { pathname } = useLocation();
  const metadata = getPageMetadata(pathname);
  const layoutClass = getPageLayoutClass(pathname);

  return (
    <AuthProvider>
      <div className="app-shell">
        <PageMetadata {...metadata} />
        <a className="skip-link" href="#main-content" data-testid="skip-to-content">
          Lewati ke konten utama
        </a>
        <Header />
        <main
          className={`app-main-content ${layoutClass}`}
          id="main-content"
          tabIndex="-1"
        >
          <Suspense fallback={<LoadingSpinner text="Memuat halaman..." fullPage />}>
            <Routes>
            {/* Rute Publik */}
            <Route path="/" element={<HomePage />} />
            <Route path="/reports/:id" element={<ReportDetailPage />} />

            {/* Rute Tamu (Hanya jika belum login) */}
            <Route
              path="/login"
              element={
                <GuestRoute>
                  <AuthPage key="login" initialMode="login" />
                </GuestRoute>
              }
            />
            <Route
              path="/register"
              element={
                <GuestRoute>
                  <AuthPage key="register" initialMode="register" />
                </GuestRoute>
              }
            />

            {/* Rute Khusus Warga */}
            <Route
              path="/reports/new"
              element={
                <ProtectedRoute allowedRoles={['warga']}>
                  <CreateReportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/:id/edit"
              element={
                <ProtectedRoute allowedRoles={['warga']}>
                  <EditReportPage />
                </ProtectedRoute>
              }
            />

            {/* Rute Khusus Admin */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            {/* 404 Not Found */}
            <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}

export default App;
