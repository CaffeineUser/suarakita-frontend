const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
export const API_BASE_URL = (
  configuredApiBaseUrl ||
  (import.meta.env.DEV ? 'http://localhost:3000/api/v1' : '')
).replace(/\/+$/, '');

function ensureApiBaseUrl() {
  if (!API_BASE_URL) {
    throw new Error(
      'URL backend belum dikonfigurasi. Atur VITE_API_BASE_URL ke URL API backend.',
    );
  }
}

export const TOKEN_KEY = 'suarakita_token';

export async function apiRequest(path, options = {}) {
  ensureApiBaseUrl();

  const headers = new Headers(options.headers);
  const token = sessionStorage.getItem(TOKEN_KEY);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let body = options.body;
  if (body && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
    if (typeof body !== 'string') {
      body = JSON.stringify(body);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    body,
    headers,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload?.error?.message || 'Terjadi kesalahan pada API.');
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

export function getReportPhotoUrl(reportId) {
  ensureApiBaseUrl();
  return `${API_BASE_URL}/reports/${reportId}/photo`;
}

export const api = {
  get: (path, options) => apiRequest(path, { ...options, method: 'GET' }),
  post: (path, body, options) => apiRequest(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => apiRequest(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => apiRequest(path, { ...options, method: 'DELETE' }),
};
