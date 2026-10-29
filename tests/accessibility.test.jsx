import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import axe from 'axe-core';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AuthPage from '../src/pages/AuthPage.jsx';
import HomePage from '../src/pages/HomePage.jsx';
import NotFoundPage from '../src/pages/NotFoundPage.jsx';
import CreateReportPage from '../src/pages/CreateReportPage.jsx';
import DashboardPage from '../src/pages/DashboardPage.jsx';
import EditReportPage from '../src/pages/EditReportPage.jsx';
import ReportDetailPage from '../src/pages/ReportDetailPage.jsx';

const auth = vi.hoisted(() => ({
  value: {
    user: null,
    isAuthenticated: false,
    isAdmin: false,
    isWarga: false,
    login: vi.fn(),
    register: vi.fn(),
  },
}));
vi.mock('../src/context/AuthContext.jsx', () => ({
  useAuth: () => auth.value,
}));

vi.mock('../src/api/client.js', () => ({
  api: {
    get: vi.fn((path) => {
      if (path === '/categories') {
        return Promise.resolve({ data: [{ id: 1, name: 'Jalan' }] });
      }
      if (path.startsWith('/reports?')) {
        return Promise.resolve({
          data: [{
            id: 8,
            user_id: 4,
            title: 'Jalan berlubang di dekat sekolah',
            description: 'Kondisi jalan rusak dan perlu segera diperbaiki.',
            category_name: 'Jalan',
            location_name: 'Jalan Melati',
            urgency: 'tinggi',
            status: 'diajukan',
            created_at: '2025-02-01T12:00:00Z',
            support_count: 2,
            priority_score: 72,
            is_supported_by_me: false,
            reporter_name: 'Rina',
          }],
          pagination: { page: 1, total_pages: 1, total: 1, limit: 9 },
        });
      }
      if (path === '/reports/8') {
        return Promise.resolve({
          data: {
            id: 8,
            user_id: 4,
            category_id: 1,
            title: 'Jalan berlubang di dekat sekolah',
            description: 'Kondisi jalan rusak dan perlu segera diperbaiki.',
            category_name: 'Jalan',
            location_name: 'Jalan Melati',
            urgency: 'tinggi',
            status: 'diajukan',
            created_at: '2025-02-01T12:00:00Z',
            latitude: null,
            longitude: null,
            support_count: 2,
            priority_score: 72,
            is_supported_by_me: false,
            reporter_name: 'Rina',
            history: [],
          },
        });
      }
      if (path === '/dashboard/summary') {
        return Promise.resolve({ data: { total_reports: 1 } });
      }
      if (path === '/dashboard/by-category') {
        return Promise.resolve({ data: [{ category_name: 'Jalan', count: 1 }] });
      }
      if (path === '/dashboard/by-status') {
        return Promise.resolve({ data: [{ status: 'diajukan', count: 1 }] });
      }
      if (path.startsWith('/dashboard/priority')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    }),
  },
  apiRequest: vi.fn(),
  getReportPhotoUrl: vi.fn(() => '/photo'),
}));

vi.mock('recharts', () => {
  const Stub = ({ children }) => <div>{children}</div>;
  return {
    Bar: Stub, BarChart: Stub, CartesianGrid: Stub, Cell: Stub, Legend: Stub,
    Pie: Stub, PieChart: Stub, ResponsiveContainer: Stub, Tooltip: Stub, XAxis: Stub, YAxis: Stub,
  };
});

async function expectNoAccessibilityViolations(container) {
  const results = await axe.run(container);
  expect(results.violations).toEqual([]);
}

describe('automated accessibility checks', () => {
  it('keeps the home report explorer and report cards free of axe-core violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <main>
          <HomePage />
        </main>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument());
    await expectNoAccessibilityViolations(container);
  }, 20000);

  it('keeps the login and registration form accessible', async () => {
    const { container } = render(
      <MemoryRouter>
        <main>
          <AuthPage />
        </main>
      </MemoryRouter>,
    );

    await expectNoAccessibilityViolations(container);
    screen.getByTestId('auth-register-mode').click();
    expect(await screen.findByTestId('auth-name-input')).toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  }, 20000);

  it('keeps the not-found page accessible', async () => {
    const { container } = render(
      <MemoryRouter>
        <main>
          <NotFoundPage />
        </main>
      </MemoryRouter>,
    );

    await expectNoAccessibilityViolations(container);
  }, 20000);

  it.each([
    ['/reports/new', <CreateReportPage />, 'create-report-page'],
    ['/reports/8/edit', <EditReportPage />, 'edit-report-page'],
    ['/reports/8', <ReportDetailPage />, 'report-detail-page'],
    ['/dashboard', <DashboardPage />, 'dashboard-page'],
  ])('keeps %s accessible', async (path, page, testId) => {
    auth.value = {
      ...auth.value,
      user: path === '/reports/8/edit' ? { id: 4, role: 'warga' } : null,
      isAuthenticated: false,
      isAdmin: false,
      isWarga: false,
    };
    const { container } = render(
      <MemoryRouter initialEntries={[path]}>
        <main>
          <Routes>
            <Route path="/reports/new" element={page} />
            <Route path="/reports/:id/edit" element={page} />
            <Route path="/reports/:id" element={page} />
            <Route path="/dashboard" element={page} />
          </Routes>
        </main>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByTestId(testId)).toBeInTheDocument());
    await waitFor(() => expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument());
    await expectNoAccessibilityViolations(container);
  }, 20000);
});
