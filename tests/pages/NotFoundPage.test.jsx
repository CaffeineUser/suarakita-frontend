import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import NotFoundPage from '../../src/pages/NotFoundPage.jsx';

describe('NotFoundPage', () => {
  it('explains the missing route and links back to the home page', () => {
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>);
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Halaman Tidak Ditemukan' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Kembali ke Beranda/ })).toHaveAttribute('href', '/');
  });
});
