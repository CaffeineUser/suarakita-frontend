import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '../src/context/AuthContext.jsx';
import { TOKEN_KEY } from '../src/api/client.js';

const warga = { id: 7, name: 'Ayu', email: 'ayu@example.test', role: 'warga' };
const admin = { id: 1, name: 'Admin', email: 'admin@example.test', role: 'admin' };

function createResponse(data) {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({ data }),
  };
}

function AuthConsumer() {
  const auth = useAuth();

  return (
    <section>
      <output data-testid="auth-state">
        {JSON.stringify({
          user: auth.user,
          token: auth.token,
          isAuthenticated: auth.isAuthenticated,
          isAdmin: auth.isAdmin,
          isWarga: auth.isWarga,
          isLoading: auth.isLoading,
        })}
      </output>
      <button onClick={() => auth.login('ayu@example.test', 'password')}>Login</button>
      <button onClick={() => auth.register('Ayu', 'ayu@example.test', 'password')}>Register</button>
      <button onClick={() => auth.logout()}>Logout</button>
      <button onClick={() => auth.refreshUser()}>Refresh</button>
    </section>
  );
}

function readState() {
  return JSON.parse(screen.getByTestId('auth-state').textContent);
}

describe('AuthContext', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('finishes loading without calling the API when there is no saved token', async () => {
    fetch.mockImplementation(() => {
      throw new Error('unexpected API request');
    });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(readState().isLoading).toBe(false));
    expect(readState()).toMatchObject({
      user: null,
      token: null,
      isAuthenticated: false,
      isAdmin: false,
      isWarga: false,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('restores a valid saved session and derives role flags', async () => {
    sessionStorage.setItem(TOKEN_KEY, 'saved-token');
    fetch.mockResolvedValue(createResponse({ user: warga }));

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(readState().isLoading).toBe(false));
    expect(readState()).toMatchObject({
      user: warga,
      token: 'saved-token',
      isAuthenticated: true,
      isAdmin: false,
      isWarga: true,
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/me'),
      expect.any(Object),
    );
  });

  it('clears a saved token when session restoration fails', async () => {
    sessionStorage.setItem(TOKEN_KEY, 'expired-token');
    fetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: vi.fn().mockResolvedValue({ error: { message: 'Expired' } }),
    });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(readState().isLoading).toBe(false));
    expect(readState()).toMatchObject({
      user: null,
      token: null,
      isAuthenticated: false,
      isAdmin: false,
      isWarga: false,
    });
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('stores the session returned by login and registration', async () => {
    fetch
      .mockResolvedValueOnce(createResponse({ token: 'login-token', user: admin }))
      .mockResolvedValueOnce(createResponse({ token: 'register-token', user: warga }));

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(readState().isLoading).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    await waitFor(() => expect(readState().user).toEqual(admin));
    expect(readState()).toMatchObject({
      token: 'login-token',
      isAuthenticated: true,
      isAdmin: true,
      isWarga: false,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    await waitFor(() => expect(readState().user).toEqual(warga));
    expect(readState()).toMatchObject({
      token: 'register-token',
      isAdmin: false,
      isWarga: true,
    });
    expect(sessionStorage.getItem(TOKEN_KEY)).toBe('register-token');
  });

  it('logs out with and without a saved token, clearing local state even if the API fails', async () => {
    fetch
      .mockResolvedValueOnce(createResponse({ token: 'new-token', user: warga }))
      .mockRejectedValueOnce(new Error('network unavailable'));

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(readState().isLoading).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    await waitFor(() => expect(readState().isAuthenticated).toBe(true));

    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    await waitFor(() => expect(readState().isAuthenticated).toBe(false));
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    await waitFor(() => expect(readState().isLoading).toBe(false));
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('refreshes the user and returns null if refresh fails', async () => {
    fetch
      .mockResolvedValueOnce(createResponse({ token: 'token', user: warga }))
      .mockResolvedValueOnce(createResponse({ user: admin }))
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: vi.fn().mockResolvedValue({ error: { message: 'Unavailable' } }),
      });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(readState().isLoading).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    await waitFor(() => expect(readState().isAuthenticated).toBe(true));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(readState().user).toEqual(admin));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(readState().user).toEqual(admin));
  });

  it('requires consumers to be rendered inside the provider', () => {
    function UnwrappedConsumer() {
      useAuth();
      return null;
    }

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<UnwrappedConsumer />)).toThrow(
      'useAuth harus digunakan di dalam AuthProvider',
    );
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
