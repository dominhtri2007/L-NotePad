import React, { useState } from 'react';
import { Database, KeyRound, ExternalLink, Check, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { getSupabaseConfig, saveSupabaseConfig, DEFAULT_SUPABASE_URL } from '../services/supabaseClient';
import { createClient } from '@supabase/supabase-js';

export const SupabaseConfigModal = ({
  isOpen,
  onClose,
  onSuccess
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) => {
  const currentConfig = getSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url || DEFAULT_SUPABASE_URL);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey || '');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();

    if (!cleanUrl || !cleanKey) {
      setTestResult({ success: false, message: 'Vui lòng nhập Supabase URL và Anon Key' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const tempClient = createClient(cleanUrl, cleanKey);
      const { error } = await tempClient.from('notes').select('slug').limit(1);

      if (error) {
        setTestResult({ success: false, message: `Lỗi: ${error.message}` });
        setTesting(false);
        return;
      }

      saveSupabaseConfig(cleanUrl, cleanKey);
      setTestResult({ success: true, message: 'Kết nối Supabase thành công!' });
      if (onSuccess) onSuccess();
      setTimeout(() => onClose(), 800);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Lỗi kết nối' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-500" />
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Cấu hình Supabase Cloud</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSaveAndTest} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Project URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-slate-800 dark:text-slate-100"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Anon Public Key</label>
              <a
                href="https://supabase.com/dashboard/project/gzlklljypwetgafcdamz/settings/api"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-blue-600 flex items-center gap-0.5 hover:underline"
              >
                Lấy key tại đây <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="relative">
              <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="password"
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOi..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-slate-800 dark:text-slate-100"
                required
              />
            </div>
          </div>

          {testResult && (
            <div className={`p-2 rounded text-xs flex items-center gap-1.5 ${testResult.success ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {testResult.success ? <ShieldCheck className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="bg-blue-50/60 dark:bg-blue-950/30 p-2.5 rounded text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
            <div className="font-semibold text-blue-700 dark:text-blue-300">💡 Cấu hình vĩnh viễn trên Vercel:</div>
            <div>Thêm biến: <code className="text-blue-600">VITE_SUPABASE_URL</code> & <code className="text-blue-600">VITE_SUPABASE_ANON_KEY</code> trong Vercel Settings → Environment Variables, sau đó <strong>Redeploy</strong>.</div>
          </div>

          <div className="pt-1 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg">Đóng</button>
            <button type="submit" disabled={testing} className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1">
              {testing ? 'Đang thử...' : <><Check className="w-3.5 h-3.5" /> Lưu & Kết nối</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
