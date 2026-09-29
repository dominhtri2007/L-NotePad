import React from 'react';
import { countStats } from '../utils/slug';
import { CheckCircle2, RefreshCw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const StatusBar = ({
  content = '',
  isSyncing = false,
  typingUser = null,
}: {
  content?: string;
  isSyncing?: boolean;
  typingUser?: string | null;
}) => {
  const { t } = useLanguage();
  const { chars, charsNoSpaces, words, lines } = countStats(content);

  return (
    <div className="h-8 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 px-4 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 select-none">
      <div className="flex items-center gap-4">
        {typingUser ? (
          <div className="flex items-center gap-1.5 text-blue-500 font-medium animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            <span>{typingUser} {t.status.isTyping}</span>
          </div>
        ) : isSyncing ? (
          <div className="flex items-center gap-1.5 text-amber-500">
            <RefreshCw className="w-3 h-3 animate-spin"/>
            <span>{t.status.saving}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3 h-3"/>
            <span>{t.status.synced}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 font-mono">
        <span>{t.status.words} <strong className="text-slate-700 dark:text-slate-200">{words}</strong></span>
        <span>{t.status.chars} <strong className="text-slate-700 dark:text-slate-200">{chars}</strong> ({t.status.noSpaces} {charsNoSpaces})</span>
        <span>{t.status.lines} <strong className="text-slate-700 dark:text-slate-200">{lines}</strong></span>
      </div>
    </div>
  );
};

