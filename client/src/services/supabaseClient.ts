import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const DEFAULT_SUPABASE_URL = 'https://gzlklljypwetgafcdamz.supabase.co';

export const getSupabaseConfig = () => {
  const url = 
    (import.meta.env.VITE_SUPABASE_URL as string) || 
    localStorage.getItem('notepad_supabase_url') || 
    DEFAULT_SUPABASE_URL;
  
  const anonKey = 
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 
    localStorage.getItem('notepad_supabase_anon_key') || 
    '';

  const isConfigured = Boolean(
    url && 
    anonKey && 
    url.startsWith('https://') &&
    url.includes('.supabase.co') &&
    anonKey.length > 20
  );

  return { url, anonKey, isConfigured };
};

let clientInstance: SupabaseClient | null = null;
let currentKey = '';
let currentUrl = '';

export const getSupabase = (): SupabaseClient | null => {
  const { url, anonKey, isConfigured } = getSupabaseConfig();
  if (!isConfigured) {
    clientInstance = null;
    return null;
  }
  if (!clientInstance || currentKey !== anonKey || currentUrl !== url) {
    currentKey = anonKey;
    currentUrl = url;
    clientInstance = createClient(url, anonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  return clientInstance;
};

export const isSupabaseConfigured = (): boolean => {
  return getSupabaseConfig().isConfigured;
};

// Export proxy for backwards compatibility with `import { supabase } from ...`
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabase();
    if (!client) return undefined;
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});

export const saveSupabaseConfig = (url: string, anonKey: string) => {
  if (url) localStorage.setItem('notepad_supabase_url', url.trim());
  if (anonKey) localStorage.setItem('notepad_supabase_anon_key', anonKey.trim());
  clientInstance = null;
  getSupabase();
  window.dispatchEvent(new Event('supabase-config-changed'));
};

export const clearSupabaseConfig = () => {
  localStorage.removeItem('notepad_supabase_url');
  localStorage.removeItem('notepad_supabase_anon_key');
  clientInstance = null;
  window.dispatchEvent(new Event('supabase-config-changed'));
};

