import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  API_BASE_URL,
  TOKEN_KEY,
  api,
  apiRequest,
  clearToken,
  getReportPhotoUrl,
  getToken,
  setToken,
} from '../src/api/client.js';

function response(payload, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(payload),
  };
}

describe('API client', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('sends JSON bodies and custom headers without a stored token', async () => {
    fetch.mockResolvedValue(response({ data: 'ok' }));

    const result = await apiRequest('/reports', {
      method: 'POST',
      headers: { 'X-Trace': 'trace-id' },
      body: { title: 'Jalan rusak' },
    });

    expect(result).toEqual({ data: 'ok' });
    expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/reports`, {
      method: 'POST',
      headers: expect.any(Headers),
      body: JSON.stringify({ title: 'Jalan rusak' }),
    });
    const requestHeaders = fetch.mock.calls[0][1].headers;
    expect(requestHeaders.get('Content-Type')).toBe('application/json');
    expect(requestHeaders.get('X-Trace')).toBe('trace-id');
    expect(requestHeaders.has('Authorization')).toBe(false);
  });

  it('adds the bearer token and preserves string JSON bodies', async () => {
    setToken('session-token');
    fetch.mockResolvedValue(response({ data: true }));

    await apiRequest('/reports', { method: 'PATCH', body: '{"title":"Baru"}' });

    const requestHeaders = fetch.mock.calls[0][1].headers;
    expect(requestHeaders.get('Authorization')).toBe('Bearer session-token');
    expect(requestHeaders.get('Content-Type')).toBe('application/json');
    expect(fetch.mock.calls[0][1].body).toBe('{"title":"Baru"}');
  });

  it('sends FormData without overriding its content type', async () => {
    fetch.mockResolvedValue(response({ uploaded: true }));
    const formData = new FormData();
    formData.append('photo', new Blob(['photo']), 'photo.png');

    await apiRequest('/reports', { method: 'POST', body: formData });

    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe(`${API_BASE_URL}/reports`);
    expect(options.body).toBe(formData);
    expect(options.headers.has('Content-Type')).toBe(false);
  });

  it('returns null when a successful response does not contain valid JSON', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 204,
      json: vi.fn().mockRejectedValue(new SyntaxError('empty response')),
    });

    await expect(apiRequest('/empty')).resolves.toBeNull();
  });

  it('throws a structured API error when the response is unsuccessful', async () => {
    fetch.mockResolvedValue(response(
      { error: { message: 'Akses ditolak' } },
      { ok: false, status: 403 },
    ));

    const request = apiRequest('/private');
    await expect(request).rejects.toMatchObject({
      message: 'Akses ditolak',
      status: 403,
      payload: { error: { message: 'Akses ditolak' } },
    });
  });

  it('uses the default error when an unsuccessful response has invalid JSON', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockRejectedValue(new SyntaxError('invalid JSON')),
    });

    await expect(apiRequest('/broken')).rejects.toMatchObject({
      message: 'Terjadi kesalahan pada API.',
      status: 500,
      payload: null,
    });
  });

  it('uses the default error when an unsuccessful response has no API error message', async () => {
    fetch.mockResolvedValue(response({}, { ok: false, status: 500 }));

    await expect(apiRequest('/error-without-message')).rejects.toMatchObject({
      message: 'Terjadi kesalahan pada API.',
      status: 500,
      payload: {},
    });
  });

  it('reads, stores, and removes the session token', () => {
    expect(TOKEN_KEY).toBe('suarakita_token');
    expect(getToken()).toBeNull();

    setToken('stored-token');
    expect(getToken()).toBe('stored-token');
    expect(sessionStorage.getItem(TOKEN_KEY)).toBe('stored-token');

    clearToken();
    expect(getToken()).toBeNull();
  });

  it('builds the report photo URL', () => {
    expect(getReportPhotoUrl(42)).toBe(`${API_BASE_URL}/reports/42/photo`);
  });

  it('uses the configured API base URL when one is provided', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test/v2');
    vi.resetModules();

    const configuredClient = await import('../src/api/client.js');
    expect(configuredClient.API_BASE_URL).toBe('https://api.example.test/v2');
    expect(configuredClient.getReportPhotoUrl(3)).toBe(
      'https://api.example.test/v2/reports/3/photo',
    );

    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('removes trailing slashes from the configured API base URL', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test/v2///');
    vi.resetModules();

    const configuredClient = await import('../src/api/client.js');
    expect(configuredClient.API_BASE_URL).toBe('https://api.example.test/v2');
    expect(configuredClient.getReportPhotoUrl(3)).toBe(
      'https://api.example.test/v2/reports/3/photo',
    );

    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('falls back to the local API URL when the environment value is empty', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    vi.resetModules();

    const fallbackClient = await import('../src/api/client.js');
    expect(fallbackClient.API_BASE_URL).toBe('http://localhost:3000/api/v1');

    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('requires an API URL in production instead of silently using localhost', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    vi.stubEnv('DEV', false);
    vi.stubEnv('PROD', true);
    vi.resetModules();

    const productionClient = await import('../src/api/client.js');
    expect(productionClient.API_BASE_URL).toBe('');
    await expect(productionClient.apiRequest('/reports')).rejects.toThrow(
      'URL backend belum dikonfigurasi. Atur VITE_API_BASE_URL ke URL API backend.',
    );
    expect(() => productionClient.getReportPhotoUrl(3)).toThrow(
      'URL backend belum dikonfigurasi. Atur VITE_API_BASE_URL ke URL API backend.',
    );

    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('exposes convenience methods with fixed HTTP verbs', async () => {
    fetch.mockResolvedValue(response({ ok: true }));

    await api.get('/get');
    await api.post('/post', { value: 1 });
    await api.patch('/patch', { value: 2 });
    await api.delete('/delete');

    expect(fetch.mock.calls.map(([, options]) => options.method)).toEqual([
      'GET',
      'POST',
      'PATCH',
      'DELETE',
    ]);
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      `${API_BASE_URL}/get`,
      `${API_BASE_URL}/post`,
      `${API_BASE_URL}/patch`,
      `${API_BASE_URL}/delete`,
    ]);
  });
});
