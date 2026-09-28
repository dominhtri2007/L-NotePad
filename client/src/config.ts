// API and Socket backend configuration for Vercel & Production
export const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export const getApiUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return BACKEND_URL ? `${BACKEND_URL}${cleanEndpoint}` : cleanEndpoint;
};

export const getSocketUrl = (): string => {
  return BACKEND_URL || window.location.origin;
};
