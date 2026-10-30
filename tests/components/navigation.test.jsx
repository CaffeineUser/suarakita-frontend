import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Header from '../../src/components/Header.jsx';
import { GuestRoute, ProtectedRoute } from '../../src/components/RouteGuard.jsx';

const auth = vi.hoisted(() => ({
  value: { user: null, isAuthenticated: false, isAdmin: false, isWarga: false, isLoading: false, logout: vi.fn() },
}));
vi.mock('../../src/context/AuthContext.jsx', () => ({ useAuth: () => auth.value }));

function CurrentPath() {
  const location = useLocation();
  return <output data-testid="path">{location.pathname}</output>;
}

function renderAt(ui, path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <CurrentPath />
      <Routes>
        <Route path="*" element={ui} />
        <Route path="/login" element={<p>Login route</p>} />
        <Route path="/dashboard" element={<p>Dashboard route</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Header', () => {
  beforeEach(() => {
    auth.value = { user: null, isAuthenticated: false, isAdmin: false, isWarga: false, isLoading: false, logout: vi.fn() };
  });

  it('shows guest actions and mobile menu links that close after navigation', () => {
    renderAt(<Header />);
    expect(screen.getByRole('link', { name: /Masuk/ })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: /Daftar Warga/ })).toHaveAttribute('href', '/register');
    expect(screen.getAllByRole('link', { name: /Buat Laporan/ })).toHaveLength(1);
    const toggle = screen.getByTestId('mobile-menu-toggle');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Daftar Akun Warga' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Masuk ke Akun' }));
    expect(screen.getByTestId('path')).toHaveTextContent('/login');
    expect(screen.queryByText('Daftar Akun Warga')).not.toBeInTheDocument();
  });

  it('shows warga identity and supports asynchronous logout navigation', async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    auth.value = {
      user: { id: 7, name: 'Dina', email: 'dina@example.test', role: 'warga' },
      isAuthenticated: true, isAdmin: false, isWarga: true, isLoading: false, logout,
    };
    renderAt(<Header />, '/profile');
    expect(screen.getByText('Dina')).toBeInTheDocument();
    expect(screen.getByText('Warga')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/'));
    expect(logout).toHaveBeenCalledOnce();
  });

  it('shows admin navigation and hides report creation for admins', () => {
    auth.value = {
      user: { id: 1, name: 'Admin', email: 'admin@example.test', role: 'admin' },
      isAuthenticated: true, isAdmin: true, isWarga: false, isLoading: false, logout: vi.fn(),
    };
    renderAt(<Header />);
    expect(screen.getAllByRole('link', { name: /Dashboard Admin/ })).toHaveLength(1);
    expect(screen.queryByRole('link', { name: /Buat Laporan/ })).not.toBeInTheDocument();
    expect(screen.getByText('Administrator')).toBeInTheDocument();
  });

  it('supports mobile admin navigation and authenticated logout', async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    auth.value = {
      user: { id: 1, name: 'Admin', email: 'admin@example.test', role: 'admin' },
      isAuthenticated: true, isAdmin: true, isWarga: false, isLoading: false, logout,
    };
    renderAt(<Header />);
    fireEvent.click(screen.getByTestId('mobile-menu-toggle'));
    expect(screen.getByRole('link', { name: 'Dashboard Administrator' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Dashboard Administrator' }));
    expect(screen.getByTestId('path')).toHaveTextContent('/dashboard');

    cleanup();
    renderAt(<Header />);
    fireEvent.click(screen.getByTestId('mobile-menu-toggle'));
    fireEvent.click(screen.getByRole('button', { name: 'Keluar Akun' }));
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/'));
    expect(logout).toHaveBeenCalledOnce();
  });

  it('styles active create and dashboard links in desktop and mobile navigation', () => {
    auth.value = {
      user: { id: 1, name: 'Admin', email: 'admin@example.test', role: 'admin' },
      isAuthenticated: true, isAdmin: true, isWarga: false, isLoading: false, logout: vi.fn(),
    };
    const { unmount } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Header />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /Dashboard Admin/ })).toHaveClass('active');
    fireEvent.click(screen.getByTestId('mobile-menu-toggle'));
    expect(screen.getByRole('link', { name: 'Dashboard Administrator' })).toHaveClass('active');
    unmount();

    auth.value = { user: null, isAuthenticated: false, isAdmin: false, isWarga: false, isLoading: false, logout: vi.fn() };
    render(
      <MemoryRouter initialEntries={['/reports/new']}>
        <Header />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /Buat Laporan$/ })).toHaveClass('active');
    fireEvent.click(screen.getByTestId('mobile-menu-toggle'));
    expect(screen.getByRole('link', { name: 'Buat Laporan Lingkungan' })).toHaveClass('active');

    cleanup();
    auth.value = {
      user: { id: 4, name: 'Warga', email: 'warga@example.test', role: 'warga' },
      isAuthenticated: true, isAdmin: false, isWarga: true, isLoading: false, logout: vi.fn(),
    };
    render(<MemoryRouter><Header /></MemoryRouter>);
    fireEvent.click(screen.getByTestId('mobile-menu-toggle'));
    expect(screen.getByText('Peran: Warga')).toBeInTheDocument();
  });
});

describe('route guards', () => {
  beforeEach(() => {
    auth.value = { user: null, isAuthenticated: false, isAdmin: false, isWarga: false, isLoading: false, logout: vi.fn() };
  });

  it('shows loading feedback while auth is unresolved', () => {
    auth.value.isLoading = true;
    renderAt(<ProtectedRoute><p>Private</p></ProtectedRoute>, '/private');
    expect(screen.getByText('Memeriksa sesi pengguna...')).toBeInTheDocument();
  });

  it('redirects guests to login, preserving the originating route', () => {
    renderAt(<ProtectedRoute><p>Private</p></ProtectedRoute>, '/private');
    expect(screen.getByText('Login route')).toBeInTheDocument();
  });

  it('renders a guest preview when a protected route allows one', () => {
    function Preview({ isGuestPreview }) {
      return <p>{isGuestPreview ? 'Read-only preview' : 'Private content'}</p>;
    }

    renderAt(
      <ProtectedRoute allowGuestPreview>
        <Preview />
      </ProtectedRoute>,
      '/reports/new',
    );

    expect(screen.getByText('Read-only preview')).toBeInTheDocument();
  });

  it('allows permitted users and redirects disallowed roles home', () => {
    auth.value = { user: { role: 'warga' }, isAuthenticated: true, isAdmin: false, isWarga: true, isLoading: false, logout: vi.fn() };
    const allowed = renderAt(<ProtectedRoute allowedRoles={['warga']}><p>Private content</p></ProtectedRoute>);
    expect(screen.getByText('Private content')).toBeInTheDocument();
    allowed.unmount();

    auth.value = { user: { role: 'warga' }, isAuthenticated: true, isAdmin: false, isWarga: true, isLoading: false, logout: vi.fn() };
    renderAt(<ProtectedRoute allowedRoles={['admin']}><p>Private content</p></ProtectedRoute>, '/private');
    expect(screen.getAllByTestId('path').at(-1)).toHaveTextContent('/');
  });

  it('shows guest loading feedback, permits guests, and redirects authenticated users', () => {
    auth.value.isLoading = true;
    const loading = renderAt(<GuestRoute><p>Guest page</p></GuestRoute>);
    expect(screen.getByText('Memuat...')).toBeInTheDocument();
    loading.unmount();

    auth.value = { user: null, isAuthenticated: false, isAdmin: false, isWarga: false, isLoading: false, logout: vi.fn() };
    const guest = renderAt(<GuestRoute><p>Guest page</p></GuestRoute>);
    expect(screen.getByText('Guest page')).toBeInTheDocument();
    guest.unmount();

    auth.value = { user: {}, isAuthenticated: true, isAdmin: false, isWarga: false, isLoading: false, logout: vi.fn() };
    renderAt(<GuestRoute><p>Guest page</p></GuestRoute>, '/register');
    expect(screen.getAllByTestId('path').at(-1)).toHaveTextContent('/');
  });
});
