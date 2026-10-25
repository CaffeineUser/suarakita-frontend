import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReportCard, { getSupportRestrictionMessage } from '../../src/components/ReportCard.jsx';
import { api, getReportPhotoUrl } from '../../src/api/client.js';

const auth = vi.hoisted(() => ({
  value: { user: null, isAuthenticated: false, isAdmin: false, isWarga: false },
}));
vi.mock('../../src/context/AuthContext.jsx', () => ({ useAuth: () => auth.value }));
vi.mock('../../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
    getReportPhotoUrl: vi.fn(() => '/photo/1'),
  };
});

const report = {
  id: 1, user_id: 2, title: 'Jalan rusak parah',
  description: 'Kerusakan jalan yang cukup panjang dan membahayakan pengendara. '.repeat(3),
  category_name: 'Jalan Rusak', created_at: '2025-01-01T00:00:00Z', location_name: 'Jalan Merdeka',
  status: 'diajukan', urgency: 'tinggi', reporter_name: 'Budi', support_count: 3, priority_score: 56,
  is_supported_by_me: false,
};
function CurrentPath() {
  const location = useLocation();
  return <output data-testid="path">{location.pathname}</output>;
}
function renderCard(props = {}, path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<><ReportCard report={report} {...props} /><CurrentPath /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ReportCard', () => {
  beforeEach(() => {
    auth.value = { user: null, isAuthenticated: false, isAdmin: false, isWarga: false };
    vi.clearAllMocks();
    vi.stubGlobal('alert', vi.fn());
  });

  it('renders report summary, truncated description, photo and detail links', () => {
    renderCard();
    expect(screen.getByRole('heading', { name: report.title })).toBeInTheDocument();
    expect(screen.getByText('Jalan Rusak')).toBeInTheDocument();
    expect(screen.getByText(/Kerusakan jalan yang cukup panjang/)).toHaveTextContent('...');
    expect(screen.getByText('Budi')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Lihat Detail|Jalan rusak parah/ })).toHaveLength(3);
    expect(screen.getByRole('img', { name: 'Foto Jalan rusak parah' })).toHaveAttribute('src', '/photo/1');
    expect(getReportPhotoUrl).toHaveBeenCalledWith(1);
  });

  it('uses zero defaults for absent support and priority totals', () => {
    renderCard({ report: { ...report, support_count: 0, priority_score: 0 } });
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByTitle('Skor Prioritas: 0 (Prioritas Rendah)')).toBeInTheDocument();
  });

  it('falls back when photo loading fails and handles missing optional description and reporter', () => {
    renderCard({ report: { ...report, description: 'Ringkas', reporter_name: null } });
    fireEvent.error(screen.getByRole('img', { name: 'Foto Jalan rusak parah' }));
    expect(screen.getByText('Foto tidak tersedia')).toBeInTheDocument();
    expect(screen.getByText('Ringkas')).toBeInTheDocument();
    expect(screen.queryByText('Budi')).not.toBeInTheDocument();
  });

  it('requires login before support and navigates to login', () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Dukung laporan ini' }));
    expect(screen.getByTestId('path')).toHaveTextContent('/login');
  });

  it('prevents admin, owner, and terminal support attempts', () => {
    auth.value = { user: { id: 7 }, isAuthenticated: true, isAdmin: false, isWarga: false };
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Dukung laporan ini' }));
    expect(window.alert).toHaveBeenCalledWith('Hanya akun warga yang dapat memberikan dukungan laporan.');

    cleanup();
    auth.value = { user: { id: 2 }, isAuthenticated: true, isAdmin: false, isWarga: true };
    renderCard();
    const ownerButton = screen.getByRole('button', { name: 'Laporan milik Anda' });
    expect(ownerButton).toBeDisabled();

    cleanup();
    auth.value = { user: { id: 9 }, isAuthenticated: true, isAdmin: false, isWarga: true };
    renderCard({ report: { ...report, status: 'selesai' } });
    const terminalButton = screen.getByRole('button', { name: 'Dukung laporan ini' });
    expect(terminalButton).toBeDisabled();

    cleanup();
    auth.value = { user: null, isAuthenticated: true, isAdmin: true, isWarga: false };
    renderCard();
    expect(screen.queryByRole('button', { name: /Dukung/ })).not.toBeInTheDocument();
  });

  it('describes role, ownership, and terminal-status restrictions', () => {
    expect(getSupportRestrictionMessage({
      isWarga: false,
      isOwner: false,
      isTerminal: false,
      status: 'diajukan',
    })).toBe('Hanya akun warga yang dapat memberikan dukungan laporan.');
    expect(getSupportRestrictionMessage({
      isWarga: true,
      isOwner: true,
      isTerminal: false,
      status: 'diajukan',
    })).toBe('Anda tidak dapat memberikan dukungan pada laporan milik sendiri.');
    expect(getSupportRestrictionMessage({
      isWarga: true,
      isOwner: false,
      isTerminal: true,
      status: 'selesai',
    })).toBe('Laporan yang sudah selesai tidak menerima dukungan baru.');
    expect(getSupportRestrictionMessage({
      isWarga: true,
      isOwner: false,
      isTerminal: false,
      status: 'diajukan',
    })).toBe('');
  });

  it('adds and removes support, updating the parent and score count', async () => {
    auth.value = { user: { id: 8 }, isAuthenticated: true, isAdmin: false, isWarga: true };
    api.post.mockResolvedValueOnce({ data: { support_count: 4, priority_score: 60 } });
    const onSupportChange = vi.fn();
    renderCard({ onSupportChange });
    fireEvent.click(screen.getByRole('button', { name: 'Dukung laporan ini' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Batalkan dukungan laporan' })).toHaveTextContent('4'));
    expect(api.post).toHaveBeenCalledWith('/reports/1/supports');
    expect(onSupportChange).toHaveBeenCalledWith(1, { support_count: 4, priority_score: 60 });

    api.delete.mockResolvedValueOnce({ data: { support_count: 3, priority_score: 56 } });
    fireEvent.click(screen.getByRole('button', { name: 'Batalkan dukungan laporan' }));
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/reports/1/supports/me'));
  });

  it('reports API failures to the user', async () => {
    auth.value = { user: { id: 8 }, isAuthenticated: true, isAdmin: false, isWarga: true };
    api.post.mockRejectedValueOnce(new Error('API bermasalah'));
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Dukung laporan ini' }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('API bermasalah'));
  });

  it('uses the fallback support error and supports updates without a parent callback', async () => {
    auth.value = { user: { id: 8 }, isAuthenticated: true, isAdmin: false, isWarga: true };
    api.post.mockRejectedValueOnce({});
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Dukung laporan ini' }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Gagal memperbarui dukungan.'));

    api.post.mockResolvedValueOnce({ data: { support_count: 9, priority_score: 90 } });
    cleanup();
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Dukung laporan ini' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Batalkan dukungan laporan' })).toHaveTextContent('9'));

    cleanup();
    api.delete.mockResolvedValueOnce({ data: { support_count: 8, priority_score: 80 } });
    renderCard({ report: { ...report, is_supported_by_me: true } });
    fireEvent.click(screen.getByRole('button', { name: 'Batalkan dukungan laporan' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Dukung laporan ini' })).toHaveTextContent('8'));
  });
});
