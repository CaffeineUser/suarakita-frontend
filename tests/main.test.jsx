import React from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/App.jsx', () => ({
  default: () => <h1>SuaraKita entrypoint</h1>,
}));

describe('application entrypoint', () => {
  it('mounts the app in the root element', async () => {
    document.body.innerHTML = '<div id="root"></div>';

    await import('../src/main.jsx');

    expect(await screen.findByRole('heading', { name: 'SuaraKita entrypoint' })).toBeInTheDocument();
  });
});
