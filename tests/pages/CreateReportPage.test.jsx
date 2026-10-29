import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreateReportPage from '../../src/pages/CreateReportPage.jsx';
import { api, apiRequest } from '../../src/api/client.js';

vi.mock('../../src/api/client.js', () => ({
  api: { get: vi.fn() },
  apiRequest: vi.fn(),
}));

function Path() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{JSON.stringify(location.state || {})}</output>;
}
function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/reports/new']}>
      <Path />
      <Routes><Route path="*" element={<CreateReportPage />} /></Routes>
    </MemoryRouter>,
  );
}
async function loadedPage() {
  renderPage();
  await screen.findByRole('heading', { name: 'Buat Laporan Lingkungan Baru' });
}
async function fillRequired(user) {
  await user.type(screen.getByLabelText(/Judul Laporan/), 'Jalan rusak');
  await user.type(screen.getByLabelText(/Deskripsi Masalah/), 'Jalan berlubang sangat membahayakan.');
  await user.type(screen.getByLabelText(/Nama.*Alamat Lokasi/), 'Jalan Merdeka');
}

describe('CreateReportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('scrollTo', vi.fn());
    api.get.mockResolvedValue({ data: [{ id: 4, name: 'Jalan Rusak' }, { id: 5, name: 'Drainase' }] });
  });

  it('loads categories, shows loading feedback and navigates back', async () => {
    let resolve;
    api.get.mockImplementationOnce(() => new Promise((r) => { resolve = r; }));
    renderPage();
    expect(screen.getByText('Mempersiapkan formulir laporan...')).toBeInTheDocument();
    resolve({ data: [{ id: 3, name: 'Sampah' }] });
    expect(await screen.findByRole('option', { name: 'Sampah' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Kembali' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });

  it('reports category load errors and required frontend validation failures', async () => {
    api.get.mockRejectedValueOnce(new Error('offline'));
    await loadedPage();
    expect(screen.getAllByText('Gagal memuat daftar kategori laporan.')).toHaveLength(2);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Kirim Laporan' }));
    expect(screen.getAllByText('Judul laporan minimal harus 5 karakter.')).toHaveLength(2);
    expect(window.scrollTo).toHaveBeenCalled();
  });

  it('validates category, description, location, and required evidence sequentially', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValueOnce({ data: [] });
    await loadedPage();
    await user.type(screen.getByLabelText(/Judul Laporan/), 'Judul lengkap');
    await user.click(screen.getByRole('button', { name: 'Kirim Laporan' }));
    expect(screen.getAllByText('Silakan pilih kategori laporan.')).toHaveLength(2);

  });

  it('validates description and location lengths and requires a photo', async () => {
    const user = userEvent.setup();
    await loadedPage();
    await user.type(screen.getByLabelText(/Judul Laporan/), 'Jalan rusak');
    await user.type(screen.getByLabelText(/Deskripsi Masalah/), 'Pendek');
    await user.type(screen.getByLabelText(/Nama.*Alamat Lokasi/), 'A');
    await user.click(screen.getByRole('button', { name: 'Kirim Laporan' }));
    expect(screen.getAllByText('Deskripsi masalah minimal harus 10 karakter.')).toHaveLength(2);
    await user.clear(screen.getByLabelText(/Deskripsi Masalah/));
    await user.type(screen.getByLabelText(/Deskripsi Masalah/), 'Deskripsi sudah cukup panjang');
    await user.click(screen.getByRole('button', { name: 'Kirim Laporan' }));
    expect(screen.getAllByText('Nama / alamat lokasi minimal harus 3 karakter.')).toHaveLength(2);
    await user.clear(screen.getByLabelText(/Nama.*Alamat Lokasi/));
    await user.type(screen.getByLabelText(/Nama.*Alamat Lokasi/), 'Jalan Merdeka');
    await user.click(screen.getByRole('button', { name: 'Kirim Laporan' }));
    expect(screen.getAllByText(/Foto bukti laporan wajib/)).toHaveLength(2);
  }, 15000);

  it('handles an empty category response and empty photo selection', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValueOnce({ data: [] });
    await loadedPage();
    const photoInput = screen.getByLabelText(/Klik atau seret file foto ke sini/);
    fireEvent.change(photoInput, { target: { files: Object.assign([], { item() { return null; } }) } });
    await user.type(screen.getByLabelText(/Judul Laporan/), 'Jalan rusak');
    await user.type(screen.getByLabelText(/Deskripsi Masalah/), 'Deskripsi cukup panjang.');
    await user.type(screen.getByLabelText(/Nama.*Alamat Lokasi/), 'Jalan Melati');
    await user.click(screen.getByRole('button', { name: 'Kirim Laporan' }));
    expect(screen.getAllByText('Silakan pilih kategori laporan.')).toHaveLength(2);
  });

  it('normalizes null category data and falls back to the first category when selection is cleared', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValueOnce({ data: null });
    await loadedPage();
    expect(document.getElementById('report-category').options).toHaveLength(0);

    cleanup();
    api.get.mockResolvedValueOnce({ data: [{ id: 9, name: 'Sampah' }] });
    await loadedPage();
    fireEvent.change(screen.getByLabelText(/Kategori Masalah/), { target: { value: '' } });
    await fillRequired(user);
    await user.click(screen.getByRole('button', { name: 'Kirim Laporan' }));
    expect(screen.getAllByText(/Foto bukti laporan wajib/)).toHaveLength(2);
  });

  it('rejects unsupported and oversized photos, and supports preview and removal', async () => {
    const user = userEvent.setup();
    await loadedPage();
    const input = screen.getByLabelText(/Klik atau seret file foto ke sini/);
    const badType = new File(['bad'], 'notes.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: Object.assign([badType], { item(index) { return this[index]; } }) } });
    expect(screen.getAllByText('Format file harus berupa gambar JPEG, PNG, atau WebP.')).toHaveLength(2);

    const big = new File([new Uint8Array(3 * 1024 * 1024 + 1)], 'large.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: Object.assign([big], { item(index) { return this[index]; } }) } });
    expect(screen.getAllByText('Ukuran file foto maksimal 3 MB.')).toHaveLength(2);

    const photo = new File(['image'], 'jalan.jpg', { type: 'image/jpeg' });
    await user.upload(input, photo);
    expect(await screen.findByRole('img', { name: 'Pratinjau foto laporan yang dipilih' })).toBeInTheDocument();
    expect(screen.getByText('jalan.jpg')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Hapus & Ganti/ }));
    expect(screen.getByText('Klik atau seret file foto ke sini')).toBeInTheDocument();
  });

  it('submits normalized values with optional coordinates and displays progress/success', async () => {
    const user = userEvent.setup();
    await loadedPage();
    await user.selectOptions(screen.getByLabelText(/Kategori Masalah/), '5');
    await fillRequired(user);
    await user.selectOptions(screen.getByLabelText(/Tingkat Urgensi/), 'kritis');
    await user.type(screen.getByLabelText('Latitude'), '-6.2');
    await user.type(screen.getByLabelText('Longitude'), '106.8');
    await user.upload(screen.getByLabelText(/Klik atau seret file foto ke sini/), new File(['image'], 'bukti.png', { type: 'image/png' }));
    apiRequest.mockResolvedValueOnce({ data: { id: 99 } });
    await user.click(screen.getByRole('button', { name: 'Kirim Laporan' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledOnce());
    const formData = apiRequest.mock.calls[0][1].body;
    expect(apiRequest.mock.calls[0][0]).toBe('/reports');
    expect(formData.get('title')).toBe('Jalan rusak');
    expect(formData.get('category_id')).toBe('5');
    expect(formData.get('urgency')).toBe('kritis');
    expect(formData.get('latitude')).toBe('-6.2');
    expect(formData.get('longitude')).toBe('106.8');
    expect(screen.getByTestId('location')).toHaveTextContent('/reports/99');
    expect(screen.getByTestId('location')).toHaveTextContent('Laporan Anda berhasil dibuat');
  });

  it('omits blank coordinates and reports submission errors', async () => {
    const user = userEvent.setup();
    await loadedPage();
    await fillRequired(user);
    await user.upload(screen.getByLabelText(/Klik atau seret file foto ke sini/), new File(['image'], 'bukti.png', { type: 'image/png' }));
    apiRequest.mockRejectedValueOnce(new Error('server failed'));
    await user.click(screen.getByRole('button', { name: 'Kirim Laporan' }));
    expect(screen.getAllByText('server failed')).toHaveLength(2);
    expect(apiRequest.mock.calls[0][1].body.has('latitude')).toBe(false);
    expect(apiRequest.mock.calls[0][1].body.has('longitude')).toBe(false);
  });

  it('uses the fallback message for submission errors without a message', async () => {
    const user = userEvent.setup();
    await loadedPage();
    await fillRequired(user);
    await user.upload(screen.getByLabelText(/Klik atau seret file foto ke sini/), new File(['image'], 'bukti.png', { type: 'image/png' }));
    apiRequest.mockRejectedValueOnce({});
    await user.click(screen.getByRole('button', { name: 'Kirim Laporan' }));
    expect(screen.getAllByText('Gagal membuat laporan. Silakan periksa kembali input Anda.')).toHaveLength(2);
  });

  it('navigates away when cancelling report creation', async () => {
    const user = userEvent.setup();
    await loadedPage();
    await user.click(screen.getByRole('button', { name: 'Batalkan' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });
});
