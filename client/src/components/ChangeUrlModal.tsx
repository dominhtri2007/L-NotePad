import React, { useState } from 'react';
import { X, Link2, AlertCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getApiUrl } from '../config';

export const ChangeUrlModal = ({ isOpen, onClose, currentSlug, hasPassword }: {
  isOpen: boolean;
  onClose: () => void;
  currentSlug: string;
  hasPassword?: boolean;
}) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [newSlug, setNewSlug] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const clean = newSlug.trim().toLowerCase();
    if (!clean) return setError(t.changeUrlModal.errEmpty);
    if (!/^[a-z0-9_-]+$/.test(clean)) return setError(t.changeUrlModal.errFormat);
    if (clean === currentSlug) return setError(t.changeUrlModal.errSame);

    setSubmitting(true);
    try {
      const token = localStorage.getItem('notepad_token');
      const res = await fetch(getApiUrl(`/api/note/${currentSlug}/change-slug`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ newSlug: clean, currentPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      onClose();
      navigate(`/${clean}`);
    } catch (err: any) { setError(err.message); } finally { setSubmitting(false); }
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm'>
      <div className='w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl relative'>
        <button onClick={onClose} className='absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1'><X className='w-5 h-5'/></button>
        <div className='flex items-center gap-3 mb-4'>
          <div className='p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600'><Link2 className='w-6 h-6'/></div>
          <div><h3 className='font-bold text-slate-800 dark:text-white'>{t.changeUrlModal.title}</h3><p className='text-xs text-slate-500'>{t.changeUrlModal.subtitle}</p></div>
        </div>
        {error && <div className='mb-3 p-2 bg-rose-50 text-rose-600 text-xs rounded flex gap-2'><AlertCircle className='w-4 h-4'/>{error}</div>}
        <form onSubmit={handleSubmit} className='space-y-3.5'>
          <div>
            <label className='text-xs font-semibold text-slate-600 dark:text-slate-400'>{t.changeUrlModal.currentUrl}</label>
            <div className='mt-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-mono text-slate-500'>{window.location.origin}/{currentSlug}</div>
          </div>
          <div>
            <label className='text-xs font-semibold text-slate-600 dark:text-slate-400'>{t.changeUrlModal.desiredUrl}</label>
            <div className='flex items-center mt-1'>
              <span className='px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-r-0 border-slate-200 dark:border-slate-700 rounded-l-lg text-sm text-slate-500'>/</span>
              <input required value={newSlug} onChange={e=>setNewSlug(e.target.value.toLowerCase())} placeholder='my-note' className='w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-r-lg text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500'/>
            </div>
          </div>
          {hasPassword && (
            <div>
              <label className='text-xs font-semibold text-slate-600 dark:text-slate-400'>{t.changeUrlModal.notePassword}</label>
              <input type='password' required value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} placeholder={t.changeUrlModal.passPlaceholder} className='w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500'/>
            </div>
          )}
          <button type='submit' disabled={submitting} className='w-full mt-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow flex items-center justify-center gap-2'>
            {submitting ? t.changeUrlModal.updating : <>{t.changeUrlModal.confirmBtn} <ArrowRight className='w-4 h-4'/></>}
          </button>
        </form>
      </div>
    </div>
  );
};