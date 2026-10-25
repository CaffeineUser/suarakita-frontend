import React from 'react';
import { Route, Routes } from 'react-router-dom';
import Footer from './components/Footer.jsx';
import Header from './components/Header.jsx';
import { GuestRoute, ProtectedRoute } from './components/RouteGuard.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import AuthPage from './pages/AuthPage.jsx';
import CreateReportPage from './pages/CreateReportPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import EditReportPage from './pages/EditReportPage.jsx';
import HomePage from './pages/HomePage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import ReportDetailPage from './pages/ReportDetailPage.jsx';

function App() {
  return (
    <AuthProvider>
      <div className="app-shell">
        <Header />
        <main className="app-main-content" id="main-content">
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
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}

export default App;
