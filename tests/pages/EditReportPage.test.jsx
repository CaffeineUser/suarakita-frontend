import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EditReportPage from '../../src/pages/EditReportPage.jsx';
import { api, apiRequest, getReportPhotoUrl } from '../../src/api/client.js';

const auth = vi.hoisted(() => ({ user: { id: 7 } }));
vi.mock('../../src/context/AuthContext.jsx', () => ({ useAuth: () => auth }));
vi.mock('../../src/api/client.js', () => ({
  api: { get: vi.fn(), patch: vi.fn() },
  apiRequest: vi.fn(),
  getReportPhotoUrl: vi.fn(() => '/photo/5'),
}));
const report = {
  id: 5, user_id: 7, title: 'Jalan Berlubang', category_id: 2, description: 'Lubang besar di tengah jalan.',
  location_name: 'Jalan Melati', urgency: 'tinggi', latitude: null, longitude: 106.2, status: 'diajukan',
};
function CurrentPath() {
  const location = useLocation();
  return <output data-testid="path">{location.pathname}{JSON.stringify(location.state || {})}</output>;
}
function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/reports/5/edit']}>
      <Routes>
        <Route path="/reports/:id/edit" element={<EditReportPage />} />
        <Route path="*" element={<CurrentPath />} />
      </Routes>
    </MemoryRouter>,
  );
}
function setupData(data = report, categories = [{ id: 2, name: 'Jalan Rusak' }, { id: 3, name: 'Drainase' }]) {
  api.get.mockImplementation((url) => Promise.resolve({ data: url === '/categories' ? categories : data }));
}

describe('EditReportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.user = { id: 7 };
    vi.stubGlobal('alert', vi.fn());
    setupData();
  });

  it('loads report/category details and displays nullable coordinate fields and photo', async () => {
    renderPage();
    expect(screen.getByText('Memuat data formulir edit...')).toBeInTheDocument();
    expect(await screen.findByDisplayValue('Jalan Berlubang')).toBeInTheDocument();
    expect(screen.getByLabelText('Latitude')).toHaveValue(null);
    expect(screen.getByLabelText('Longitude')).toHaveValue(106.2);
    expect(screen.getByRole('img', { name: 'Foto Laporan Saat Ini' })).toHaveAttribute('src', '/photo/5');
    expect(getReportPhotoUrl).toHaveBeenCalledWith('5');
  });

  it('allows edits without an auth user and defaults missing categories and coordinates', async () => {
    auth.user = null;
    setupData({ ...report, longitude: null }, null);
    renderPage();
    expect(await screen.findByDisplayValue('Jalan Berlubang')).toBeInTheDocument();
    expect(screen.getByLabelText('Latitude')).toHaveValue(null);
    expect(screen.getByLabelText('Longitude')).toHaveValue(null);
    expect(screen.getByRole('combobox', { name: /Kategori Masalah/ }).children).toHaveLength(0);
  });

  it('loads and displays a present latitude coordinate', async () => {
    setupData({ ...report, latitude: -6.2 });
    renderPage();
    expect(await screen.findByDisplayValue('Jalan Berlubang')).toBeInTheDocument();
    expect(screen.getByLabelText('Latitude')).toHaveValue(-6.2);
  });

  it('blocks edits by another user and reports terminal reports', async () => {
    auth.user = { id: 99 };
    renderPage();
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Anda tidak memiliki izin untuk mengedit laporan ini.'));
    expect(screen.queryByRole('heading', { name: 'Edit Laporan Lingkungan' })).not.toBeInTheDocument();

    auth.user = { id: 7 };
    setupData({ ...report, status: 'diproses' });
    renderPage();
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Laporan hanya dapat diedit ketika masih dalam status "diajukan".'));
  });

  it('handles load errors with the fallback message', async () => {
    api.get.mockRejectedValueOnce({});
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Gagal memuat data laporan.');
  });

  it('saves edited data, converts coordinates and navigates on success', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByDisplayValue('Jalan Berlubang');
    await user.clear(screen.getByLabelText(/Judul Laporan/));
    await user.type(screen.getByLabelText(/Judul Laporan/), 'Jalan diperbaiki');
    await user.selectOptions(screen.getByLabelText(/Kategori Masalah/), '3');
    await user.selectOptions(screen.getByLabelText(/Tingkat Urgensi/), 'kritis');
    await user.clear(screen.getByLabelText(/Deskripsi Masalah/));
    await user.type(screen.getByLabelText(/Deskripsi Masalah/), 'Drainase sudah diperbaiki.');
    await user.clear(screen.getByLabelText(/Nama.*Alamat Lokasi/));
    await user.type(screen.getByLabelText(/Nama.*Alamat Lokasi/), 'Jalan Anggrek');
    await user.clear(screen.getByLabelText('Latitude'));
    await user.type(screen.getByLabelText('Latitude'), '-6.1');
    await user.clear(screen.getByLabelText('Longitude'));
    await user.type(screen.getByLabelText('Longitude'), '107.1');
    api.patch.mockResolvedValueOnce({});
    await user.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/reports/5', {
      title: 'Jalan diperbaiki', category_id: 3, description: 'Drainase sudah diperbaiki.',
      location_name: 'Jalan Anggrek', urgency: 'kritis', latitude: -6.1, longitude: 107.1,
    }));
    expect(screen.getByTestId('path')).toHaveTextContent('/reports/5');
    expect(screen.getByTestId('path')).toHaveTextContent('berhasil diperbarui');
  }, 15000);

  it('submits null coordinates and reports update failures', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByDisplayValue('Jalan Berlubang');
    await user.clear(screen.getByLabelText('Longitude'));
    api.patch.mockRejectedValueOnce({});
    await user.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Gagal menyimpan perubahan laporan.');
    expect(api.patch.mock.calls[0][1]).toMatchObject({ latitude: null, longitude: null });
  }, 15000);

  it('rejects invalid photos and uploads valid replacements', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByDisplayValue('Jalan Berlubang');
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const input = document.querySelector('input[type="file"]');
    const bad = new File(['x'], 'bad.gif', { type: 'image/gif' });
    fireEvent.change(input, { target: { files: Object.assign([bad], { item(index) { return this[index]; } }) } });
    expect(window.alert).toHaveBeenCalledWith('Format foto harus berupa JPG, PNG, atau WebP.');
    const hugeFile = new File([new Uint8Array(3 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: Object.assign([hugeFile], { item(index) { return this[index]; } }) } });
    expect(window.alert).toHaveBeenCalledWith('Ukuran file foto maksimal 3 MB.');
    apiRequest.mockResolvedValueOnce({});
    await user.upload(input, new File(['image'], 'new.png', { type: 'image/png' }));
    expect(await screen.findByRole('img', { name: 'Pratinjau foto pengganti yang dipilih' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Unggah Foto Baru' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/reports/5/photo', expect.objectContaining({ method: 'PATCH' })));
    expect(await screen.findByText('Foto laporan berhasil diperbarui di server.')).toBeInTheDocument();
    const expiration = timeoutSpy.mock.calls.find(([, delay]) => delay === 4000);
    act(() => expiration[0]());
    clearTimeout(timeoutSpy.mock.results[timeoutSpy.mock.results.length - 1].value);
    expect(screen.queryByText('Foto laporan berhasil diperbarui di server.')).not.toBeInTheDocument();
    timeoutSpy.mockRestore();

    apiRequest.mockRejectedValueOnce({});
    await user.upload(input, new File(['image'], 'again.png', { type: 'image/png' }));
    await user.click(await screen.findByRole('button', { name: 'Unggah Foto Baru' }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Gagal memperbarui foto laporan.'));
  });

  it('alerts when photo upload fails and navigates back to details', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByDisplayValue('Jalan Berlubang');
    apiRequest.mockRejectedValueOnce(new Error('upload error'));
    const input = document.querySelector('input[type="file"]');
    await user.upload(input, new File(['image'], 'new.png', { type: 'image/png' }));
    await user.click(await screen.findByRole('button', { name: 'Unggah Foto Baru' }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('upload error'));
  });

  it('handles an empty file selection and supports cancelling back to the report', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByDisplayValue('Jalan Berlubang');
    const input = document.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: Object.assign([], { item() { return null; } }) } });
    expect(screen.queryByRole('img', { name: 'Pratinjau foto pengganti yang dipilih' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Kembali ke Detail' }));
    expect(screen.getByTestId('path')).toHaveTextContent('/reports/5');
  });

  it('returns to the report from the cancel control', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByDisplayValue('Jalan Berlubang');
    await user.click(screen.getByRole('button', { name: 'Batal' }));
    expect(screen.getByTestId('path')).toHaveTextContent('/reports/5');
  });
});
