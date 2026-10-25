import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuthPage from '../../src/pages/AuthPage.jsx';

const auth = vi.hoisted(() => ({ login: vi.fn(), register: vi.fn() }));
vi.mock('../../src/context/AuthContext.jsx', () => ({ useAuth: () => auth }));

function Path() {
  return <output data-testid="path">{useLocation().pathname}</output>;
}

function renderAuth(initialEntries = ['/login'], initialMode = 'login') {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Path />
      <Routes>
        <Route path="*" element={<AuthPage initialMode={initialMode} />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AuthPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('authenticates with trimmed credentials and returns to the originating route', async () => {
    const user = userEvent.setup();
    auth.login.mockResolvedValueOnce({});
    renderAuth([{ pathname: '/login', state: { from: { pathname: '/dashboard' } } }]);
    await user.type(screen.getByLabelText(/Alamat Email/), '  warga@example.test  ');
    await user.type(screen.getByLabelText(/Kata Sandi/), 'password123');
    await user.click(screen.getByRole('button', { name: 'Masuk ke Aplikasi' }));
    await waitFor(() => expect(auth.login).toHaveBeenCalledWith('warga@example.test', 'password123'));
    expect(screen.getByTestId('path')).toHaveTextContent('/dashboard');
  });

  it('shows authentication failures, clears them on tab changes, and toggles password visibility', async () => {
    const user = userEvent.setup();
    auth.login.mockRejectedValueOnce(new Error('Kredensial tidak cocok'));
    renderAuth();
    await user.type(screen.getByLabelText(/Alamat Email/), 'bad@example.test');
    await user.type(screen.getByLabelText(/Kata Sandi/), 'password123');
    await user.click(screen.getByRole('button', { name: 'Masuk ke Aplikasi' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Kredensial tidak cocok');
    await user.click(screen.getByRole('tab', { name: 'Daftar Warga' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Nama Lengkap/)).toBeRequired();
    const password = screen.getByLabelText(/Kata Sandi/);
    expect(password).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Tampilkan kata sandi' }));
    expect(password).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: 'Sembunyikan kata sandi' }));
    expect(password).toHaveAttribute('type', 'password');
  });

  it('registers a trimmed name and email, supports demo credentials, and navigates on success', async () => {
    const user = userEvent.setup();
    auth.register.mockResolvedValueOnce({});
    renderAuth(['/register'], 'register');
    await user.type(screen.getByLabelText(/Nama Lengkap/), '  Siti Aminah  ');
    await user.type(screen.getByLabelText(/Alamat Email/), ' siti@example.test ');
    await user.type(screen.getByLabelText(/Kata Sandi/), 'password123');
    await user.click(screen.getByRole('button', { name: 'Daftar Sekarang' }));
    await waitFor(() => expect(auth.register).toHaveBeenCalledWith('Siti Aminah', 'siti@example.test', 'password123'));

    cleanup();
    renderAuth();
    await user.click(screen.getByRole('button', { name: 'Demo Admin' }));
    expect(screen.getByLabelText(/Alamat Email/)).toHaveValue('admin@example.com');
    expect(screen.getByLabelText(/Kata Sandi/)).toHaveValue('AdminDemo123!');
  }, 15000);

  it('honors query mode over the initial mode and provides a fallback error message', async () => {
    const user = userEvent.setup();
    auth.register.mockRejectedValueOnce({});
    renderAuth(['/register?mode=register'], 'login');
    expect(screen.getByRole('heading', { name: 'Pendaftaran Akun Warga' })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Nama Lengkap/), 'Budi Santoso');
    await user.type(screen.getByLabelText(/Alamat Email/), 'budi@example.test');
    await user.type(screen.getByLabelText(/Kata Sandi/), 'password123');
    await user.click(screen.getByRole('button', { name: 'Daftar Sekarang' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Gagal memproses autentikasi');
  });

  it('shows and disables the submit control while the request is pending', async () => {
    const user = userEvent.setup();
    let resolve;
    auth.login.mockImplementationOnce(() => new Promise((r) => { resolve = r; }));
    renderAuth();
    await user.type(screen.getByLabelText(/Alamat Email/), 'a@example.test');
    await user.type(screen.getByLabelText(/Kata Sandi/), 'password123');
    await user.click(screen.getByRole('button', { name: 'Masuk ke Aplikasi' }));
    expect(await screen.findByRole('button', { name: 'Memproses...' })).toBeDisabled();
    resolve({});
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/'));
  });

  it('supports initial register mode, switching back to login, and the warga demo shortcut', async () => {
    const user = userEvent.setup();
    renderAuth(['/auth'], 'register');
    expect(screen.getByRole('heading', { name: 'Pendaftaran Akun Warga' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Masuk Akun' }));
    expect(screen.getByRole('heading', { name: 'Selamat Datang Kembali' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Demo Admin' }));
    expect(screen.getByLabelText(/Alamat Email/)).toHaveValue('admin@example.com');
    expect(screen.getByLabelText(/Kata Sandi/)).toHaveValue('AdminDemo123!');
    await user.click(screen.getByRole('button', { name: 'Demo Warga' }));
    expect(screen.getByLabelText(/Alamat Email/)).toHaveValue('warga@example.com');
    expect(screen.getByLabelText(/Kata Sandi/)).toHaveValue('WargaDemo123!');
  });
});
