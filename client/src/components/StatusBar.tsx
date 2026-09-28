import React from 'react';
import { countStats } from '../utils/slug';
import { CheckCircle2, RefreshCw, AlertCircle, Database } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const StatusBar = ({
  content = '',
  isSyncing = false,
  typingUser = null,
  isSupabaseConnected = true,
  saveStatus = 'saved',
  onOpenSupabaseConfig
}: {
  content?: string;
  isSyncing?: boolean;
  typingUser?: string | null;
  isSupabaseConnected?: boolean;
  saveStatus?: 'saved' | 'saving' | 'error' | 'local_only';
  onOpenSupabaseConfig?: () => void;
}) => {
  const { t } = useLanguage();
  const { chars, charsNoSpaces, words, lines } = countStats(content);

  const renderStatus = () => {
    if (typingUser) {
      return (
        <div className="flex items-center gap-1.5 text-blue-500 font-medium animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          <span>{typingUser} {t.status.isTyping}</span>
        </div>
      );
    }

    if (isSyncing || saveStatus === 'saving') {
      return (
        <div className="flex items-center gap-1.5 text-amber-500">
          <RefreshCw className="w-3 h-3 animate-spin"/>
          <span>{isSupabaseConnected ? 'Đang lưu lên Supabase...' : t.status.saving}</span>
        </div>
      );
    }

    if (saveStatus === 'error') {
      return (
        <button
          onClick={onOpenSupabaseConfig}
          className="flex items-center gap-1.5 text-rose-500 hover:underline"
        >
          <AlertCircle className="w-3 h-3"/>
          <span>Lỗi lưu Supabase (Bấm xem)</span>
        </button>
      );
    }

    if (!isSupabaseConnected || saveStatus === 'local_only') {
      return (
        <button
          onClick={onOpenSupabaseConfig}
          className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 hover:underline font-medium"
          title="Chưa kết nối Supabase Cloud. Bấm để cấu hình."
        >
          <Database className="w-3 h-3 text-amber-500" />
          <span>Chỉ lưu cục bộ (Chưa nối Supabase)</span>
        </button>
      );
    }

    return (
      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="w-3 h-3"/>
        <span>Đã lưu Supabase Database</span>
      </div>
    );
  };

  return (
    <div className="h-8 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 px-4 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 select-none">
      <div className="flex items-center gap-4">
        {renderStatus()}
      </div>

      <div className="flex items-center gap-4 font-mono">
        <span>{t.status.words} <strong className="text-slate-700 dark:text-slate-200">{words}</strong></span>
        <span>{t.status.chars} <strong className="text-slate-700 dark:text-slate-200">{chars}</strong> ({t.status.noSpaces} {charsNoSpaces})</span>
        <span>{t.status.lines} <strong className="text-slate-700 dark:text-slate-200">{lines}</strong></span>
      </div>
    </div>
  );
};
