import React, { useState } from 'react';
import { X, Lock, Unlock, KeyRound, AlertCircle, CheckCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getApiUrl } from '../config';

export const PasswordModal = ({ isOpen, onClose, slug, hasPassword, onPasswordChanged }: {
  isOpen: boolean; onClose: () => void; slug: string;
  hasPassword?: boolean; onPasswordChanged: (hasPass: boolean) => void;
}) => {
  const { t } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  if (!isOpen) return null;

  const call = async (password: string) => {
    const token = localStorage.getItem('notepad_token');
    const res = await fetch(getApiUrl(`/api/note/${slug}/set-password`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ password, currentPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
    return data;
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    if (newPassword && newPassword !== confirmPassword) { setError(t.passwordModal.errMismatch); return; }
    setSubmitting(true);
    try {
      const data = await call(newPassword);
      setSuccess(data.message || 'Success'); onPasswordChanged(data.hasPassword);
      setTimeout(() => { onClose(); setSuccess(null); }, 1000);
    } catch (err: any) { setError(err.message); } finally { setSubmitting(false); }
  };

  const handleRemove = async () => {
    setSubmitting(true); setError(null);
    try {
      await call('');
      setSuccess(t.passwordModal.successRemoved); onPasswordChanged(false);
      setTimeout(() => { onClose(); setSuccess(null); }, 1000);
    } catch (err: any) { setError(err.message); } finally { setSubmitting(false); }
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm'>
      <div className='w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl relative'>
        <button onClick={onClose} className='absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1'><X className='w-5 h-5'/></button>
        <div className='flex items-center gap-3 mb-4'>
          <div className='p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600'><KeyRound className='w-6 h-6'/></div>
          <div><h3 className='font-bold text-slate-800 dark:text-white'>{hasPassword ? t.passwordModal.titleChange : t.passwordModal.titleSet}</h3><p className='text-xs text-slate-500'>{t.passwordModal.subtitle}</p></div>
        </div>
        {error && <div className='mb-3 p-2 bg-rose-50 text-rose-600 text-xs rounded flex gap-2'><AlertCircle className='w-4 h-4'/>{error}</div>}
        {success && <div className='mb-3 p-2 bg-emerald-50 text-emerald-600 text-xs rounded flex gap-2'><CheckCircle className='w-4 h-4'/>{success}</div>}
        <form onSubmit={handleSetPassword} className='space-y-3'>
          {hasPassword && (<div><label className='text-xs font-semibold text-slate-600 dark:text-slate-400'>{t.passwordModal.currentPass}</label><input type='password' required value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} placeholder={t.passwordModal.currentPlaceholder} className='w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500'/></div>)}
          <div><label className='text-xs font-semibold text-slate-600 dark:text-slate-400'>{hasPassword ? t.passwordModal.newPass : t.passwordModal.pass}</label><input type='password' required value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder='••••••••' className='w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500'/></div>
          <div><label className='text-xs font-semibold text-slate-600 dark:text-slate-400'>{t.passwordModal.confirmPass}</label><input type='password' required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder='••••••••' className='w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500'/></div>
          <button type='submit' disabled={submitting} className='w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium shadow flex items-center justify-center gap-2'><Lock className='w-4 h-4'/>{hasPassword ? t.passwordModal.submitUpdate : t.passwordModal.submitEnable}</button>
          {hasPassword && (<button type='button' onClick={handleRemove} disabled={submitting} className='w-full py-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5'><Unlock className='w-4 h-4'/>{t.passwordModal.removeBtn}</button>)}
        </form>
      </div>
    </div>
  );
};
