import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App.jsx';

vi.mock('../src/context/AuthContext.jsx', () => ({
  AuthProvider: ({ children }) => children,
}));

vi.mock('../src/components/Header.jsx', () => ({
  default: () => <header>Header mock</header>,
}));

vi.mock('../src/components/Footer.jsx', () => ({
  default: () => <footer>Footer mock</footer>,
}));

vi.mock('../src/components/RouteGuard.jsx', () => ({
  GuestRoute: ({ children }) => children,
  ProtectedRoute: ({ children }) => children,
}));

vi.mock('../src/pages/HomePage.jsx', () => ({
  default: () => <h1>Home route</h1>,
}));

vi.mock('../src/pages/ReportDetailPage.jsx', () => ({
  default: () => <h1>Report detail route</h1>,
}));

vi.mock('../src/pages/AuthPage.jsx', () => ({
  default: ({ initialMode }) => <h1>{initialMode} auth route</h1>,
}));

vi.mock('../src/pages/CreateReportPage.jsx', () => ({
  default: () => <h1>Create report route</h1>,
}));

vi.mock('../src/pages/EditReportPage.jsx', () => ({
  default: () => <h1>Edit report route</h1>,
}));

vi.mock('../src/pages/DashboardPage.jsx', () => ({
  default: () => <h1>Dashboard route</h1>,
}));

vi.mock('../src/pages/NotFoundPage.jsx', () => ({
  default: () => <h1>Not found route</h1>,
}));

function renderRoute(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('App routing', () => {
  it.each([
    ['/', 'Home route'],
    ['/reports/12', 'Report detail route'],
    ['/login', 'login auth route'],
    ['/register', 'register auth route'],
    ['/reports/new', 'Create report route'],
    ['/reports/12/edit', 'Edit report route'],
    ['/dashboard', 'Dashboard route'],
    ['/unknown-path', 'Not found route'],
  ])('renders the route for %s', (path, expectedHeading) => {
    renderRoute(path);

    expect(screen.getByRole('heading', { name: expectedHeading })).toBeInTheDocument();
    expect(screen.getByText('Header mock')).toBeInTheDocument();
    expect(screen.getByText('Footer mock')).toBeInTheDocument();
  });
});
