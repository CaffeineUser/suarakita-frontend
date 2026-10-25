import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from '../../src/pages/DashboardPage.jsx';
import { api } from '../../src/api/client.js';

vi.mock('../../src/api/client.js', () => ({ api: { get: vi.fn() } }));
vi.mock('recharts', () => {
  const Stub = ({ children }) => <div data-testid="chart">{children}</div>;
  return {
    Bar: Stub, BarChart: Stub, CartesianGrid: Stub, Cell: Stub, Legend: Stub,
    Pie: Stub, PieChart: Stub, ResponsiveContainer: Stub, Tooltip: Stub, XAxis: Stub, YAxis: Stub,
  };
});

const urls = [
  '/dashboard/summary',
  '/dashboard/by-category',
  '/dashboard/by-status',
  '/dashboard/priority?limit=10',
];
function setDashboardResponses({ summary = {}, categories = [], statuses = [], reports = [] } = {}) {
  const data = [summary, categories, statuses, reports];
  urls.forEach((url, i) => api.get.mockImplementationOnce((requested) => {
    expect(requested).toBe(url);
    return Promise.resolve({ data: data[i] });
  }));
}
function renderPage() {
  return render(<MemoryRouter><DashboardPage /></MemoryRouter>);
}

describe('DashboardPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads metrics, charts and report table with known and unknown statuses', async () => {
    setDashboardResponses({
      summary: { total_reports: 8, pending_reports: 2, in_progress_reports: 1, completed_reports: 4, total_supports: 12, total_users: 6 },
      categories: [{ category_name: 'Jalan', count: 3 }],
      statuses: [{ status: 'diajukan', count: 4 }, { status: 'asing', count: 1 }],
      reports: [{ id: 10, title: 'Lubang besar', category_name: 'Jalan', location_name: 'Jl. A', urgency: 'tinggi', support_count: 2, priority_score: 74, status: 'diajukan' }],
    });
    renderPage();
    expect(screen.getByText('Memuat statistik dan grafik dashboard admin...')).toBeInTheDocument();
    expect(await screen.findByText('Ringkasan Statistik & Prioritas Laporan')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Distribusi Laporan per Kategori')).toBeInTheDocument();
    expect(screen.getByText('Lubang besar')).toHaveAttribute('href', '/reports/10');
    expect(screen.getByRole('link', { name: /Kelola/ })).toHaveAttribute('href', '/reports/10');
    expect(screen.getAllByTestId('chart').length).toBeGreaterThan(0);
  });

  it('renders empty states when chart and priority datasets are empty', async () => {
    setDashboardResponses();
    renderPage();
    expect(await screen.findByText('Belum Ada Data Kategori')).toBeInTheDocument();
    expect(screen.getByText('Belum Ada Data Status')).toBeInTheDocument();
    expect(screen.getByText('Tidak Ada Laporan Prioritas')).toBeInTheDocument();
  });

  it('shows dashboard errors, retries loading, and can manually refresh', async () => {
    api.get.mockRejectedValueOnce(new Error('Jaringan putus'));
    renderPage();
    expect(await screen.findByText('Jaringan putus')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Gagal Memuat Dashboard' })).toBeInTheDocument();
    setDashboardResponses();
    fireEvent.click(screen.getByRole('button', { name: 'Coba Lagi' }));
    expect(await screen.findByText('Ringkasan Statistik & Prioritas Laporan')).toBeInTheDocument();

    setDashboardResponses();
    fireEvent.click(screen.getByRole('button', { name: 'Segarkan Data' }));
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(12));
  });

  it('uses the fallback error for unlabelled failures', async () => {
    api.get.mockRejectedValueOnce({});
    renderPage();
    expect(await screen.findByText('Gagal memuat data analitik dashboard.')).toBeInTheDocument();
  });

  it('normalizes missing dashboard datasets and displays zero-valued metrics', async () => {
    setDashboardResponses({ summary: null, categories: null, statuses: null, reports: null });
    renderPage();
    expect(await screen.findByText('Ringkasan Statistik & Prioritas Laporan')).toBeInTheDocument();
    expect(screen.getAllByText('0')).toHaveLength(6);
    expect(screen.getByText('Belum Ada Data Kategori')).toBeInTheDocument();
    expect(screen.getByText('Belum Ada Data Status')).toBeInTheDocument();
    expect(screen.getByText('Tidak Ada Laporan Prioritas')).toBeInTheDocument();
  });
});
