import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { getApiUrl } from '../config';

const decodeTokenPayload = (t: string): User | null => {
  try {
    const base64Url = t.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const p = JSON.parse(json);
    if (p && p.id && p.username) {
      return { id: p.id, username: p.username, email: p.email || '' };
    }
  } catch (_) {}
  return null;
};

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('notepad_token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('notepad_token');
    return saved ? decodeTokenPayload(saved) : null;
  });
  const [loading, setLoading] = useState(false);
  // Track whether the current token was set via login() so we skip re-fetching /me
  const skipNextFetchRef = useRef(false);

  const fetchCurrentUser = async (authToken: string) => {
    try {
      const res = await fetch(getApiUrl('/api/auth/me'), {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user && data.user.username) {
          setUser(data.user);
        } else {
          const fallback = decodeTokenPayload(authToken);
          if (fallback) setUser(fallback);
        }
      } else if (res.status === 401 || res.status === 403) {
        // Token invalid – clear it
        localStorage.removeItem('notepad_token');
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.warn('Error fetching current user:', err);
      // Keep existing decoded user from token
      const fallback = decodeTokenPayload(authToken);
      if (fallback) setUser(fallback);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // If login() already supplied the user object, skip redundant /me fetch
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      setLoading(false);
      return;
    }
    if (token) {
      fetchCurrentUser(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('notepad_token', newToken);
    // Mark that user object is already known – no need to hit /me again
    skipNextFetchRef.current = true;
    setToken(newToken);
    setUser(newUser && newUser.username ? newUser : decodeTokenPayload(newToken) || newUser);
  };

  const logout = () => {
    localStorage.removeItem('notepad_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (token) await fetchCurrentUser(token);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
