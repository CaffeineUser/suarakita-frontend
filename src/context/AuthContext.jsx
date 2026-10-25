import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, clearToken, getToken, setToken } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(getToken());
  const [isLoading, setIsLoading] = useState(true);

  // Restore session saat aplikasi dimuat
  useEffect(() => {
    async function restoreSession() {
      const savedToken = getToken();
      if (!savedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        setUser(response.data.user);
        setTokenState(savedToken);
      } catch (_error) {
        // Token tidak valid atau kedaluwarsa
        clearToken();
        setUser(null);
        setTokenState(null);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  async function login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    const { token: receivedToken, user: receivedUser } = response.data;
    setToken(receivedToken);
    setTokenState(receivedToken);
    setUser(receivedUser);
    return receivedUser;
  }

  async function register(name, email, password) {
    const response = await api.post('/auth/register', { name, email, password });
    const { token: receivedToken, user: receivedUser } = response.data;
    setToken(receivedToken);
    setTokenState(receivedToken);
    setUser(receivedUser);
    return receivedUser;
  }

  async function logout() {
    try {
      if (getToken()) {
        await api.post('/auth/logout', {});
      }
    } catch (_error) {
      // Abaikan error pada logout
    } finally {
      clearToken();
      setTokenState(null);
      setUser(null);
    }
  }

  async function refreshUser() {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
      return response.data.user;
    } catch (_err) {
      return null;
    }
  }

  const value = {
    user,
    token,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === 'admin',
    isWarga: user?.role === 'warga',
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider');
  }
  return context;
}
