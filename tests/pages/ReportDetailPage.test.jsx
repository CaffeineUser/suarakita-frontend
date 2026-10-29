import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReportDetailPage from '../../src/pages/ReportDetailPage.jsx';
import { api, getReportPhotoUrl } from '../../src/api/client.js';
import { STATUS_MAP } from '../../src/utils/formatters.js';

const auth = vi.hoisted(() => ({
  value: { user: null, isAuthenticated: false, isAdmin: false, isWarga: false },
}));
vi.mock('../../src/context/AuthContext.jsx', () => ({ useAuth: () => auth.value }));
vi.mock('../../src/api/client.js', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  getReportPhotoUrl: vi.fn(() => '/photo/8'),
}));

const report = {
  id: 8, user_id: 4, title: 'Saluran drainase tersumbat', description: 'Air menggenang setelah hujan.',
  category_name: 'Drainase', status: 'diajukan', urgency: 'sedang', created_at: '2025-02-01T12:00:00Z',
  reporter_name: 'Rina', location_name: 'Jalan Kenanga', latitude: -6.2, longitude: 106.8,
  support_count: 5, priority_score: 62, is_supported_by_me: false, history: [],
};
function Path() {
  const location = useLocation();
  return <output data-testid="path">{location.pathname}{JSON.stringify(location.state || {})}</output>;
}
function renderPage(data, path = '/reports/8') {
  if (data !== undefined) api.get.mockResolvedValue({ data });
  const initialEntry = Array.isArray(path) ? path : [path];
  return render(
    <MemoryRouter initialEntries={initialEntry}>
      <Path />
      <Routes><Route path="/reports/:id" element={<ReportDetailPage />} /><Route path="*" element={<p>Fallback</p>} /></Routes>
    </MemoryRouter>,
  );
}

describe('ReportDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.value = { user: null, isAuthenticated: false, isAdmin: false, isWarga: false };
    api.get.mockResolvedValue({ data: report });
    vi.stubGlobal('alert', vi.fn());
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  it('loads detail, displays coordinates, history and success notices', async () => {
    const item = {
      ...report,
      history: [
        { id: 1, new_status: 'diverifikasi', created_at: '2025-02-02T12:00:00Z', changed_by_name: 'Tono', changed_by_role: 'admin', note: 'Sudah dicek' },
        { id: 2, new_status: 'diproses', created_at: '2025-02-03T12:00:00Z', changed_by_role: 'warga' },
        { new_status: 'asing', created_at: '2025-02-03T12:00:00Z' },
      ],
    };
    renderPage(item, { pathname: '/reports/8', state: { successMessage: 'Laporan berhasil disimpan.' } });
    expect(await screen.findByRole('heading', { name: report.title })).toBeInTheDocument();
    expect(screen.getByText('Laporan berhasil disimpan.')).toBeInTheDocument();
    expect(screen.getByText(/Lat: -6.2, Lng: 106.8/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Buka di Google Maps/ })).toHaveAttribute('target', '_blank');
    expect(screen.getByText('Tono')).toBeInTheDocument();
    expect(screen.getByText('Petugas')).toBeInTheDocument();
    expect(screen.getByText('Warga')).toBeInTheDocument();
    expect(screen.getByText('Sudah dicek')).toBeInTheDocument();
    expect(screen.getAllByText('Sistem / Pelapor')).toHaveLength(2);
    expect(getReportPhotoUrl).toHaveBeenCalledWith(8);
    fireEvent.click(screen.getByTestId('report-success-dismiss'));
    expect(screen.queryByText('Laporan berhasil disimpan.')).not.toBeInTheDocument();
  });

  it('renders the no-coordinate, default reporter and empty timeline states and photo fallback', async () => {
    const item = { ...report, latitude: null, longitude: null, reporter_name: null };
    renderPage(item);
    expect(await screen.findByRole('heading', { name: report.title })).toBeInTheDocument();
    expect(screen.getByText(/Pelapor:/).parentElement).toHaveTextContent('Pelapor: Warga');
    expect(screen.getByText('Belum ada riwayat perubahan status.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Buka di Google Maps/ })).not.toBeInTheDocument();
    const photo = screen.getByRole('img', { name: `Foto masalah ${report.title}` });
    fireEvent.error(photo);
    expect(photo).toHaveStyle({ display: 'none' });
    expect(screen.getByText('Foto tidak dapat dimuat atau telah diperbarui.')).toBeInTheDocument();
  });

  it('shows the terminal support note for a non-owner warga', async () => {
    auth.value = { user: { id: 12 }, isAuthenticated: true, isAdmin: false, isWarga: true };
    renderPage({ ...report, status: 'ditolak' });
    expect(await screen.findByRole('heading', { name: report.title })).toBeInTheDocument();
    expect(screen.getByText(/Laporan dengan status ditolak tidak lagi menerima dukungan baru/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dukung Laporan Ini' })).toBeDisabled();
  });

  it('shows loading and recoverable fetch errors with retry and home navigation', async () => {
    let resolve;
    api.get.mockImplementationOnce(() => new Promise((r) => { resolve = r; }));
    renderPage();
    expect(screen.getByText('Memuat detail laporan...')).toBeInTheDocument();
    resolve({ data: report });
    expect(await screen.findByRole('heading', { name: report.title })).toBeInTheDocument();

    api.get.mockRejectedValueOnce(new Error('Tidak ditemukan'));
    renderPage();
    expect(await screen.findByText('Tidak ditemukan')).toBeInTheDocument();
    api.get.mockResolvedValueOnce({ data: report });
    fireEvent.click(screen.getByRole('button', { name: 'Coba Lagi' }));
    expect(await screen.findByRole('heading', { name: report.title })).toBeInTheDocument();
  });

  it('shows fallback fetch errors and allows returning home', async () => {
    api.get.mockRejectedValueOnce({});
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Laporan tidak ditemukan atau gagal dimuat.');
    fireEvent.click(screen.getByRole('button', { name: 'Kembali ke Beranda' }));
    expect(screen.getByTestId('path')).toHaveTextContent('/');
  });

  it('shows the not-found fallback when the API returns no report', async () => {
    renderPage(null);
    expect(await screen.findByRole('alert')).toHaveTextContent('Laporan yang Anda cari tidak tersedia.');
  });

  it('supports the detail-page back navigation control', async () => {
    renderPage();
    await screen.findByRole('heading', { name: report.title });
    fireEvent.click(screen.getByRole('button', { name: 'Kembali ke Beranda' }));
    expect(screen.getByTestId('path')).toHaveTextContent('/');
  });

  it('lets guests navigate to login and prevents non-warga support', async () => {
    renderPage();
    await screen.findByRole('heading', { name: report.title });
    fireEvent.click(screen.getByRole('button', { name: 'Dukung Laporan Ini' }));
    expect(screen.getByTestId('path')).toHaveTextContent('/login');

    auth.value = { user: { id: 12 }, isAuthenticated: true, isAdmin: false, isWarga: false };
    renderPage();
    await screen.findByRole('heading', { name: report.title });
    fireEvent.click(screen.getByRole('button', { name: 'Dukung Laporan Ini' }));
    expect(window.alert).toHaveBeenCalledWith('Hanya akun warga yang dapat memberikan dukungan laporan.');
  });

  it('adds and removes warga support, and alerts on API errors', async () => {
    auth.value = { user: { id: 12 }, isAuthenticated: true, isAdmin: false, isWarga: true };
    api.post.mockResolvedValueOnce({ data: { support_count: 6, priority_score: 70 } });
    renderPage();
    await screen.findByRole('heading', { name: report.title });
    fireEvent.click(screen.getByRole('button', { name: 'Dukung Laporan Ini' }));
    await waitFor(() => expect(screen.getByText('6 Warga')).toBeInTheDocument());
    expect(api.post).toHaveBeenCalledWith('/reports/8/supports');

    api.delete.mockResolvedValueOnce({ data: { support_count: 5, priority_score: 62 } });
    fireEvent.click(screen.getByRole('button', { name: 'Dukungan Diberikan (Klik Batalkan)' }));
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/reports/8/supports/me'));

    api.post.mockRejectedValueOnce(new Error('support failure'));
    fireEvent.click(screen.getByRole('button', { name: 'Dukung Laporan Ini' }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('support failure'));
    api.post.mockRejectedValueOnce({});
    fireEvent.click(screen.getByRole('button', { name: 'Dukung Laporan Ini' }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Gagal mengubah dukungan.'));
  });

  it('shows owner edit/delete actions and honors delete confirmation and API errors', async () => {
    auth.value = { user: { id: 4 }, isAuthenticated: true, isAdmin: false, isWarga: true };
    renderPage();
    await screen.findByRole('heading', { name: report.title });
    expect(screen.getByRole('link', { name: /Edit Laporan/ })).toHaveAttribute('href', '/reports/8/edit');
    vi.stubGlobal('confirm', vi.fn(() => false));
    fireEvent.click(screen.getByRole('button', { name: 'Hapus Laporan' }));
    expect(api.delete).not.toHaveBeenCalled();

    vi.stubGlobal('confirm', vi.fn(() => true));
    api.delete.mockRejectedValueOnce(new Error('delete failed'));
    fireEvent.click(screen.getByRole('button', { name: 'Hapus Laporan' }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('delete failed'));
    expect(screen.getByRole('button', { name: 'Hapus Laporan' })).toBeEnabled();
    api.delete.mockRejectedValueOnce({});
    fireEvent.click(screen.getByRole('button', { name: 'Hapus Laporan' }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Gagal menghapus laporan.'));
  });

  it('deletes a report after confirmation and navigates home', async () => {
    auth.value = { user: { id: 4 }, isAuthenticated: true, isAdmin: false, isWarga: true };
    api.delete.mockResolvedValueOnce({});
    renderPage();
    await screen.findByRole('heading', { name: report.title });
    fireEvent.click(screen.getByRole('button', { name: 'Hapus Laporan' }));
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/'));
    expect(api.delete).toHaveBeenCalledWith('/reports/8');
  });

  it('renders admin status and urgency update flows including failures', async () => {
    const user = userEvent.setup();
    auth.value = { user: { id: 99 }, isAuthenticated: true, isAdmin: true, isWarga: false };
    renderPage();
    await screen.findByRole('heading', { name: report.title });
    expect(screen.getByText('Panel Pengelolaan Petugas')).toBeInTheDocument();
    const statusSelect = document.getElementById('admin-select-status');
    fireEvent.change(statusSelect, { target: { value: '' } });
    fireEvent.submit(statusSelect.closest('form'));
    expect(api.patch).not.toHaveBeenCalled();
    await user.selectOptions(statusSelect, 'diverifikasi');
    await user.type(screen.getByLabelText(/Catatan Petugas/), 'Tim segera dikirim');
    api.patch.mockResolvedValueOnce({ data: { ...report, status: 'diverifikasi' } });
    await user.click(screen.getByRole('button', { name: 'Perbarui Status' }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/reports/8/status', { status: 'diverifikasi', note: 'Tim segera dikirim' }));
    expect(screen.getByText(/Status berhasil diperbarui/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Catatan Petugas/)).toHaveValue('');

    await user.selectOptions(screen.getByLabelText(/Status Lanjutan yang Sah/), 'diproses');
    api.patch.mockRejectedValueOnce(new Error('status error'));
    await user.click(screen.getByRole('button', { name: 'Perbarui Status' }));
    expect(await screen.findByText('status error')).toBeInTheDocument();
    api.patch.mockRejectedValueOnce({});
    await user.click(screen.getByRole('button', { name: 'Perbarui Status' }));
    expect(await screen.findByText('Gagal memperbarui status.')).toBeInTheDocument();

    await user.selectOptions(document.getElementById('admin-select-urgency'), 'tinggi');
    api.patch.mockResolvedValueOnce({ data: { ...report, urgency: 'tinggi', priority_score: 73 } });
    await user.click(screen.getByRole('button', { name: 'Perbarui Urgensi & Skor' }));
    expect(await screen.findByText('Pembaruan berhasil')).toBeInTheDocument();
    expect(document.querySelector('.urgency-success-notice')).toHaveTextContent('73.0');
    await user.selectOptions(document.getElementById('admin-select-urgency'), 'kritis');
    expect(document.querySelector('.urgency-success-notice')).not.toBeInTheDocument();

    api.patch.mockRejectedValueOnce({});
    await user.click(screen.getByRole('button', { name: 'Perbarui Urgensi & Skor' }));
    expect(await screen.findByText('Gagal memperbarui urgensi.')).toBeInTheDocument();

    await user.selectOptions(document.getElementById('admin-select-urgency'), 'sedang');
    api.patch.mockResolvedValueOnce({ data: { ...report, urgency: 'sedang', priority_score: null } });
    await user.click(screen.getByRole('button', { name: 'Perbarui Urgensi & Skor' }));
    expect(await screen.findByText('Pembaruan berhasil')).toBeInTheDocument();
    expect(document.querySelector('.urgency-success-notice')).toHaveTextContent('Skor prioritas: -');
  }, 15000);

  it('hides support/edit for terminal reports and provides a terminal admin state', async () => {
    auth.value = { user: { id: 99 }, isAuthenticated: true, isAdmin: true, isWarga: false };
    renderPage({ ...report, status: 'selesai', history: undefined });
    expect(await screen.findByRole('heading', { name: report.title })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Dukung/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Edit Laporan/ })).not.toBeInTheDocument();
    expect(document.querySelector('.admin-terminal-note')).toHaveTextContent('status terminal (selesai)');
  });

  it('handles terminal status updates and urgency priority scores returned as strings or null', async () => {
    const user = userEvent.setup();
    auth.value = { user: { id: 99 }, isAuthenticated: true, isAdmin: true, isWarga: false };
    renderPage();
    await screen.findByRole('heading', { name: report.title });
    api.patch.mockResolvedValueOnce({ data: { ...report, status: 'selesai', priority_score: '73' } });
    await user.selectOptions(document.getElementById('admin-select-status'), 'selesai');
    await user.click(screen.getByRole('button', { name: 'Perbarui Status' }));
    expect(await screen.findByText(/Status berhasil diperbarui/)).toBeInTheDocument();
    expect(document.querySelector('.admin-terminal-note')).toHaveTextContent('status terminal (selesai)');

    cleanup();
    api.get.mockResolvedValue({ data: report });
    renderPage();
    await screen.findByRole('heading', { name: report.title });
    await user.selectOptions(document.getElementById('admin-select-urgency'), 'kritis');
    api.patch.mockResolvedValueOnce({ data: { ...report, urgency: 'kritis', priority_score: '73' } });
    await user.click(screen.getByRole('button', { name: 'Perbarui Urgensi & Skor' }));
    expect(await screen.findByText('73')).toBeInTheDocument();
  }, 15000);

  it('uses an empty transition list for unrecognized report statuses', async () => {
    auth.value = { user: { id: 99 }, isAuthenticated: true, isAdmin: true, isWarga: false };
    renderPage({ ...report, status: 'unknown-status' });
    expect(await screen.findByRole('heading', { name: report.title })).toBeInTheDocument();
    expect(document.querySelector('.admin-terminal-note')).toHaveTextContent('unknown-status');
    expect(screen.queryByLabelText(/Status Lanjutan yang Sah/)).not.toBeInTheDocument();
  });

  it('falls back to the raw status when its display label is unavailable', async () => {
    const verifiedStatus = STATUS_MAP.diverifikasi;
    delete STATUS_MAP.diverifikasi;
    try {
      auth.value = { user: { id: 99 }, isAuthenticated: true, isAdmin: true, isWarga: false };
      renderPage();
      expect(await screen.findByRole('heading', { name: report.title })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'diverifikasi' })).toBeInTheDocument();
    } finally {
      STATUS_MAP.diverifikasi = verifiedStatus;
    }
  });

  it('falls back to an empty set of next statuses after an unrecognized status update', async () => {
    const user = userEvent.setup();
    auth.value = { user: { id: 99 }, isAuthenticated: true, isAdmin: true, isWarga: false };
    renderPage();
    await screen.findByRole('heading', { name: report.title });
    await user.selectOptions(document.getElementById('admin-select-status'), 'ditolak');
    api.patch.mockResolvedValueOnce({ data: { ...report, status: 'unknown-status' } });
    await user.click(screen.getByRole('button', { name: 'Perbarui Status' }));
    expect(await screen.findByText(/Status berhasil diperbarui/)).toBeInTheDocument();
    expect(document.querySelector('.admin-terminal-note')).toHaveTextContent('unknown-status');
  }, 15000);
});
