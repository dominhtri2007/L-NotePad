import React, { useState } from 'react';
import { X, Share2, Copy, Check, Eye, Edit3 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const ShareModal = ({ isOpen, onClose, slug }: { isOpen: boolean; onClose: () => void; slug: string }) => {
  const { t } = useLanguage();
  const [copiedType, setCopiedType] = useState<string | null>(null);
  if (!isOpen) return null;

  const origin = window.location.origin;
  const shareUrl = `${origin}/share/${slug}`;
  const editUrl = `${origin}/${slug}`;

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm'>
      <div className='w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl relative'>
        <button onClick={onClose} className='absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1'><X className='w-5 h-5'/></button>
        <div className='flex items-center gap-3 mb-5'>
          <div className='p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600'><Share2 className='w-6 h-6'/></div>
          <div><h3 className='font-bold text-slate-800 dark:text-white'>{t.shareModal.title}</h3><p className='text-xs text-slate-500'>{t.shareModal.subtitle}</p></div>
        </div>
        <div className='space-y-4'>
          <div className='p-3.5 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 rounded-xl'>
            <div className='flex items-center justify-between mb-1.5'>
              <span className='flex items-center gap-1.5 text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider'><Eye className='w-3.5 h-3.5'/>{t.shareModal.readOnlyTitle}</span>
              <span className='text-[10px] text-purple-600 bg-purple-100 dark:bg-purple-900/60 px-2 py-0.5 rounded font-medium'>{t.shareModal.readOnlyBadge}</span>
            </div>
            <p className='text-xs text-slate-600 dark:text-slate-300 mb-2'>{t.shareModal.readOnlyDesc}</p>
            <div className='flex items-center gap-2'>
              <input readOnly value={shareUrl} className='w-full px-3 py-2 bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 outline-none'/>
              <button onClick={() => copyToClipboard(shareUrl, 'share')} className='px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 flex-shrink-0 transition-colors'>
                {copiedType === 'share' ? <><Check className='w-4 h-4 text-emerald-300'/>{t.shareModal.copied}</> : <><Copy className='w-4 h-4'/>{t.shareModal.copy}</>}
              </button>
            </div>
          </div>
          <div className='p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl'>
            <div className='flex items-center justify-between mb-1.5'>
              <span className='flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider'><Edit3 className='w-3.5 h-3.5'/>{t.shareModal.editTitle}</span>
              <span className='text-[10px] text-slate-600 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded font-medium'>{t.shareModal.editBadge}</span>
            </div>
            <p className='text-xs text-slate-500 mb-2'>{t.shareModal.editDesc}</p>
            <div className='flex items-center gap-2'>
              <input readOnly value={editUrl} className='w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 outline-none'/>
              <button onClick={() => copyToClipboard(editUrl, 'edit')} className='px-3.5 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 flex-shrink-0 transition-colors'>
                {copiedType === 'edit' ? <><Check className='w-4 h-4 text-emerald-300'/>{t.shareModal.copied}</> : <><Copy className='w-4 h-4'/>{t.shareModal.copy}</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};