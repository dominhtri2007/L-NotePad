import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Lock, User, Mail, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getApiUrl } from '../config';

export const AuthModal: React.FC<{ isOpen: boolean; onClose: () => void; initialTab?: 'login' | 'register' }> = ({ isOpen, onClose, initialTab = 'login' }) => {
  const { t } = useLanguage();
  const [tab, setTab] = useState<'login' | 'register'>(initialTab);
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaId, setCaptchaId] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [loadingCaptcha, setLoadingCaptcha] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setTab(initialTab); setError(null); }, [initialTab, isOpen]);

  const loadCaptcha = async () => {
    setLoadingCaptcha(true);
    try {
      const res = await fetch(getApiUrl('/api/auth/captcha'));
      const data = await res.json();
      setCaptchaId(data.id);
      setCaptchaSvg(data.svg);
      setCaptchaInput('');
    } catch (err) { console.error(err); } finally { setLoadingCaptcha(false); }
  };

  useEffect(() => { if (isOpen && tab === 'register') loadCaptcha(); }, [isOpen, tab]);
  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const endpoint = tab === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = tab === 'login'
        ? { username, password }
        : { username, password, email, captchaId, captchaAnswer: captchaInput };

      const res = await fetch(getApiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Có lỗi xảy ra');
      login(data.token, data.user);
      onClose();
    } catch (err: any) {
      setError(err.message);
      if (tab === 'register') loadCaptcha();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-7">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
          <X className="w-5 h-5" />
        </button>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-4">
          <button
            type="button"
            onClick={() => { setTab('login'); setError(null); }}
            className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${tab === 'login' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500'}`}
          >{t.authModal.loginTab}</button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(null); }}
            className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${tab === 'register' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500'}`}
          >{t.authModal.registerTab}</button>
        </div>

        <h2 className="text-xl font-bold text-center text-slate-800 dark:text-white mb-2">
          {tab === 'login' ? t.authModal.loginTitle : t.authModal.registerTitle}
        </h2>

        {error && (
          <div className="mb-3 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-600 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{t.authModal.username}</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input required value={username} onChange={e => setUsername(e.target.value)} placeholder={t.authModal.usernamePlaceholder} className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {tab === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{t.authModal.email}</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder={t.authModal.emailPlaceholder} className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{t.authModal.password}</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {tab === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{t.authModal.captcha}</label>
              <div className="flex items-center gap-2 mb-2">
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center min-w-[160px] h-[50px] select-none" dangerouslySetInnerHTML={{ __html: captchaSvg }} />
                <button type="button" onClick={loadCaptcha} disabled={loadingCaptcha} className="p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <RefreshCw className={`w-4 h-4 text-slate-500 ${loadingCaptcha ? 'animate-spin text-blue-500' : ''}`} />
                </button>
              </div>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input required value={captchaInput} onChange={e => setCaptchaInput(e.target.value)} placeholder={t.authModal.captchaPlaceholder} className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm uppercase tracking-widest font-mono text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500" maxLength={6} />
              </div>
            </div>
          )}

          <button type="submit" disabled={submitting} className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-all shadow-md active:scale-95 disabled:opacity-50">
            {submitting ? t.authModal.processing : (tab === 'login' ? t.authModal.submitLogin : t.authModal.submitRegister)}
          </button>
        </form>
      </div>
    </div>
  );
};
