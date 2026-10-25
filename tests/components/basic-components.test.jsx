import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState, ErrorMessage, LoadingSpinner } from '../../src/components/Feedback.jsx';
import Footer from '../../src/components/Footer.jsx';
import Pagination from '../../src/components/Pagination.jsx';
import PriorityBadge from '../../src/components/PriorityBadge.jsx';
import StatusBadge from '../../src/components/StatusBadge.jsx';
import UrgencyBadge from '../../src/components/UrgencyBadge.jsx';

describe('feedback components', () => {
  it('renders loading defaults and custom full-page text', () => {
    const { rerender, container } = render(<LoadingSpinner />);
    expect(screen.getByText('Memuat data...')).toBeInTheDocument();
    expect(container.firstChild).not.toHaveClass('full-page');
    rerender(<LoadingSpinner text="Memuat laporan" fullPage />);
    expect(screen.getByText('Memuat laporan')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('full-page');
  });

  it('renders empty state defaults and only shows a usable action', () => {
    const action = vi.fn();
    const { rerender } = render(<EmptyState />);
    expect(screen.getByText('Tidak Ada Data')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    rerender(<EmptyState title="Kosong" message="Belum ada item" actionLabel="Ulangi" onAction={action} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ulangi' }));
    expect(screen.getByText('Kosong')).toBeInTheDocument();
    expect(action).toHaveBeenCalledOnce();
    rerender(<EmptyState actionLabel="Tidak muncul" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders error defaults and invokes optional retry', () => {
    const retry = vi.fn();
    const { rerender } = render(<ErrorMessage />);
    expect(screen.getByRole('alert')).toHaveTextContent('Terjadi Kesalahan');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    rerender(<ErrorMessage title="Gagal" message="Coba nanti" onRetry={retry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Coba Lagi' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Coba nanti');
    expect(retry).toHaveBeenCalledOnce();
  });
});

describe('badge components', () => {
  it.each([
    ['diajukan', 'Diajukan'],
    ['diverifikasi', 'Diverifikasi'],
    ['diproses', 'Diproses'],
    ['selesai', 'Selesai'],
    ['ditolak', 'Ditolak'],
  ])('shows the mapped status %s', (status, label) => {
    render(<StatusBadge status={status} size="small" />);
    expect(screen.getByText(label).closest('.status-badge')).toHaveClass('badge-small');
    expect(document.querySelector('.badge-icon')).toBeInTheDocument();
  });

  it('supports hidden icons and unknown or missing status labels', () => {
    const { rerender } = render(<StatusBadge status="lainnya" showIcon={false} />);
    expect(screen.getByText('lainnya')).toBeInTheDocument();
    expect(document.querySelector('.badge-icon')).not.toBeInTheDocument();
    rerender(<StatusBadge />);
    expect(screen.getByText('Tidak diketahui')).toBeInTheDocument();
  });

  it.each([
    ['kritis', 'Kritis'],
    ['tinggi', 'Tinggi'],
    ['sedang', 'Sedang'],
    ['rendah', 'Rendah'],
  ])('shows the mapped urgency %s', (urgency, label) => {
    render(<UrgencyBadge urgency={urgency} size="small" />);
    expect(screen.getByText(`Urgensi: ${label}`)).toBeInTheDocument();
    expect(document.querySelector('.badge-icon')).toBeInTheDocument();
  });

  it('supports unknown urgency and suppressed icons', () => {
    const { rerender } = render(<UrgencyBadge urgency="lainnya" showIcon={false} />);
    expect(screen.getByText('Urgensi: lainnya')).toBeInTheDocument();
    expect(document.querySelector('.badge-icon')).not.toBeInTheDocument();
    rerender(<UrgencyBadge />);
    expect(screen.getByText('Urgensi: Normal')).toBeInTheDocument();
  });

  it('formats priority scores and supports numeric strings, hidden labels, and sizes', () => {
    const { rerender } = render(<PriorityBadge score={8} />);
    expect(screen.getByText('8.0')).toBeInTheDocument();
    expect(screen.getByText('Prioritas Rendah')).toBeInTheDocument();
    rerender(<PriorityBadge score="not numeric" showLabel={false} size="small" />);
    expect(screen.getByText('0.0')).toBeInTheDocument();
    expect(screen.queryByText(/prioritas|tinggi|sedang|rendah/i)).not.toBeInTheDocument();
  });
});

describe('pagination', () => {
  it('hides controls for a single page', () => {
    const { container } = render(<Pagination page={1} totalPages={1} total={3} limit={9} onPageChange={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows short page ranges, disabled boundaries, and changes pages', () => {
    const change = vi.fn();
    render(<Pagination page={1} totalPages={3} total={24} limit={9} onPageChange={change} />);
    expect(document.querySelector('[aria-current="page"]')).toHaveTextContent('1');
    expect(document.querySelector('.pagination-info')).toHaveTextContent('1 - 9 dari 24');
    expect(screen.getByRole('button', { name: 'Halaman Sebelumnya' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Halaman Berikutnya' }));
    expect(change).toHaveBeenNthCalledWith(1, 2);
    expect(change).toHaveBeenNthCalledWith(2, 2);
  });

  it('renders ellipses for middle pages and clamps the final item count', () => {
    const change = vi.fn();
    render(<Pagination page={6} totalPages={10} total={73} limit={9} onPageChange={change} />);
    expect(screen.getAllByText('…')).toHaveLength(2);
    expect(document.querySelector('.pagination-info')).toHaveTextContent('46 - 54 dari 73');
    expect(screen.getByRole('button', { name: 'Halaman Berikutnya' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '8' }));
    expect(change).toHaveBeenCalledWith(8);
  });

  it('uses the trailing page window and omits count text for an empty total', () => {
    render(<Pagination page={10} totalPages={10} total={0} limit={9} onPageChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Halaman Sebelumnya' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Halaman Berikutnya' })).toBeDisabled();
    expect(screen.queryByText(/Menampilkan/)).not.toBeInTheDocument();
  });

  it('covers the no-ellipsis boundary and previous-page navigation', () => {
    const change = vi.fn();
    const first = render(<Pagination page={4} totalPages={10} total={90} limit={9} onPageChange={change} />);
    expect(screen.getAllByText('…')).toHaveLength(1);
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Halaman Sebelumnya' }));
    expect(change).toHaveBeenCalledWith(3);

    first.unmount();
    const { unmount } = render(<Pagination page={3} totalPages={6} total={54} limit={9} onPageChange={change} />);
    expect(screen.queryAllByText('…')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Halaman Berikutnya' })).toBeEnabled();
    unmount();
  });
});

describe('footer', () => {
  it('renders platform information, demo accounts, categories, and current year', () => {
    render(<MemoryRouter><Footer /></MemoryRouter>);
    expect(screen.getByText('SuaraKita')).toBeInTheDocument();
    expect(screen.getByText('Akun Demo Lokal')).toBeInTheDocument();
    expect(screen.getByText('warga@example.com')).toBeInTheDocument();
    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getByText('Drainase Tersumbat')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(String(new Date().getFullYear())))).toBeInTheDocument();
  });
});
