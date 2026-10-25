import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HomePage from '../../src/pages/HomePage.jsx';
import { api } from '../../src/api/client.js';

const auth = vi.hoisted(() => ({ value: { isAuthenticated: false, isWarga: false } }));
vi.mock('../../src/context/AuthContext.jsx', () => ({ useAuth: () => auth.value }));
vi.mock('../../src/api/client.js', () => ({ api: { get: vi.fn() } }));
vi.mock('../../src/components/ReportCard.jsx', () => ({
  default: ({ report, onSupportChange }) => (
    <article>
      <h3>{report.title}</h3>
      <span>{report.support_count} votes</span>
      <button onClick={() => onSupportChange(report.id, { support_count: 8, priority_score: 80 })}>support test</button>
    </article>
  ),
}));
vi.mock('../../src/components/Pagination.jsx', () => ({
  default: ({ page, totalPages, onPageChange }) => (
    <div><span>{page}/{totalPages}</span><button onClick={() => onPageChange(page + 1)}>Next page</button></div>
  ),
}));

function SearchState() {
  const location = useLocation();
  return <output data-testid="search">{location.search}</output>;
}
function renderPage(search = '') {
  const entry = search ? (search.startsWith('/') ? search : `/?${search}`) : '/';
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <SearchState />
      <Routes><Route path="*" element={<HomePage />} /></Routes>
    </MemoryRouter>,
  );
}
function mockHome({ reports = [], pagination, categories = [{ id: 1, name: 'Jalan Rusak' }] } = {}) {
  api.get.mockImplementation((url) => {
    if (url === '/categories') return Promise.resolve({ data: categories });
    return Promise.resolve({ data: reports, pagination });
  });
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.value = { isAuthenticated: false, isWarga: false };
    mockHome();
  });

  it('loads reports/categories and renders a report grid with pagination', async () => {
    mockHome({
      reports: [
        { id: 1, title: 'Jalan amblas', support_count: 2 },
        { id: 2, title: 'Selokan mampet', support_count: 1 },
      ],
      pagination: { page: 1, total_pages: 3, total: 20, limit: 9 },
    });
    renderPage();
    expect(screen.getByText('Memuat daftar laporan lingkungan...')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Jalan amblas' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Jalan Rusak' })).toBeInTheDocument();
    expect(screen.getByText('1/3')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'support test' })[0]);
    expect(await screen.findByText('8 votes')).toBeInTheDocument();
    expect(screen.getByText('1 votes')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent('page=2'));
  });

  it('shows the create CTA for guests and warga, but not for admins', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /Buat Laporan Baru/ })).toHaveAttribute('href', '/reports/new');
    cleanup();
    auth.value = { isAuthenticated: true, isWarga: true };
    renderPage();
    expect(screen.getByRole('link', { name: /Buat Laporan Baru/ })).toBeInTheDocument();
    cleanup();
    auth.value = { isAuthenticated: true, isWarga: false };
    renderPage();
    expect(screen.queryByRole('link', { name: /Buat Laporan Baru/ })).not.toBeInTheDocument();
  });

  it('submits trimmed search/filter/sort query parameters and offers active filter reset', async () => {
    const user = userEvent.setup();
    renderPage('/?q=lama&category_id=1&status=diajukan&urgency=tinggi&sort=created_at&order=asc');
    await screen.findByText('Tidak Ada Laporan Ditemukan');
    const search = screen.getByRole('textbox', { name: 'Pencarian laporan' });
    await user.clear(search);
    await user.type(search, '  jalan  ');
    await user.click(screen.getByRole('button', { name: 'Cari' }));
    expect(screen.getByTestId('search')).toHaveTextContent('q=jalan');
    expect(screen.getAllByRole('button', { name: 'Reset Filter' }).length).toBeGreaterThan(0);
    await user.selectOptions(screen.getByLabelText(/Status/), 'selesai');
    expect(screen.getByTestId('search')).toHaveTextContent('status=selesai');
    await user.selectOptions(document.getElementById('filter-sort'), 'title_asc');
    expect(screen.getByTestId('search')).toHaveTextContent('sort=title');
    await user.click(screen.getAllByRole('button', { name: 'Reset Filter' })[0]);
    expect(screen.getByTestId('search')).toHaveTextContent('');
    expect(search).toHaveValue('');
  });

  it('clears search directly and resets sort and category filters to page one', async () => {
    const user = userEvent.setup();
    renderPage('/?q=aspal&page=3');
    await screen.findByText('Tidak Ada Laporan Ditemukan');
    await user.click(screen.getByRole('button', { name: 'Hapus kata kunci' }));
    expect(screen.getByTestId('search')).not.toHaveTextContent('q=');
    await user.selectOptions(screen.getByLabelText(/Urgensi/), 'rendah');
    expect(screen.getByTestId('search')).toHaveTextContent('page=1');
    await user.click(screen.getByRole('tab', { name: 'Semua Kategori' }));
    expect(screen.getByTestId('search')).not.toHaveTextContent('category_id');
    expect(document.getElementById('filter-sort')).toHaveValue('priority_score_desc');
    await user.click(screen.getByRole('tab', { name: 'Jalan Rusak' }));
    expect(screen.getByTestId('search')).toHaveTextContent('category_id=1');
  });

  it('renders different empty messages for filtered and unfiltered searches', async () => {
    renderPage();
    expect(await screen.findByText('Belum ada laporan lingkungan yang dibuat warga saat ini.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Buat Laporan Pertama' }));

    cleanup();
    mockHome({ reports: [] });
    renderPage('/?category_id=1');
    expect(await screen.findByText('Tidak ada laporan yang sesuai dengan kriteria pencarian dan filter Anda.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Reset Filter' })).toHaveLength(2);
  });

  it('handles category load failure and invokes retry for report errors', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/categories') return Promise.reject(new Error('categories offline'));
      return Promise.reject(new Error('reports offline'));
    });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderPage();
    expect(await screen.findByText('reports offline')).toBeInTheDocument();
    expect(log).toHaveBeenCalled();
    const reportRequestCount = api.get.mock.calls.filter(([url]) => url.startsWith('/reports?')).length;
    mockHome();
    fireEvent.click(screen.getByRole('button', { name: 'Coba Lagi' }));
    expect(screen.getByText('reports offline')).toBeInTheDocument();
    expect(api.get.mock.calls.filter(([url]) => url.startsWith('/reports?'))).toHaveLength(reportRequestCount);
    log.mockRestore();
  });

  it('uses fallback messages when API errors do not include text', async () => {
    api.get.mockImplementation((url) => url === '/categories' ? Promise.resolve({ data: [] }) : Promise.reject({}));
    renderPage();
    expect(await screen.findByText('Gagal memuat laporan lingkungan.')).toBeInTheDocument();
  });

  it('accepts empty API data and does not require pagination metadata', async () => {
    api.get.mockImplementation((url) => url === '/categories'
      ? Promise.resolve({})
      : Promise.resolve({ data: null }));
    renderPage();
    expect(await screen.findByText('Belum ada laporan lingkungan yang dibuat warga saat ini.')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Jalan Rusak' })).not.toBeInTheDocument();
  });

  it('uses default sorting parameters when no sort filters are provided', async () => {
    renderPage();
    await screen.findByText('Belum ada laporan lingkungan yang dibuat warga saat ini.');
    expect(api.get).toHaveBeenCalledWith(
      '/reports?sort=priority_score&order=desc&page=1&limit=9',
    );
  });
});
