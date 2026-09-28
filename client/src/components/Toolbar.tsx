import React, { useState } from 'react';
import { ZoomIn, ZoomOut, Code2, Link2, Lock, Share2, FileCode, Copy, Download, RotateCcw, RotateCw, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const Toolbar = ({
  slug, fontSize, setFontSize, language, setLanguage, hasPassword,
  onOpenPassword, onOpenChangeUrl, onOpenShare, onUndo, onRedo, canUndo, canRedo,
  content, readOnly = false
}: {
  slug: string;
  fontSize: number;
  setFontSize: React.Dispatch<React.SetStateAction<number>>;
  language: string;
  setLanguage: (lang: string) => void;
  hasPassword?: boolean;
  onOpenPassword?: () => void;
  onOpenChangeUrl?: () => void;
  onOpenShare?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  content: string;
  readOnly?: boolean;
}) => {
  const { t } = useLanguage();
  const [copiedAll, setCopiedAll] = useState(false);

  const LANGUAGES = [
    { id: 'plaintext', name: t.toolbar.langPlaintext },
    { id: 'javascript', name: 'JavaScript' },
    { id: 'typescript', name: 'TypeScript' },
    { id: 'python', name: 'Python' },
    { id: 'html', name: 'HTML' },
    { id: 'css', name: 'CSS' },
    { id: 'json', name: 'JSON' },
    { id: 'markdown', name: 'Markdown' },
    { id: 'sql', name: 'SQL' },
    { id: 'cpp', name: 'C++' },
    { id: 'java', name: 'Java' },
    { id: 'bash', name: 'Bash' },
  ];

  const handleZoomIn = () => setFontSize(prev => Math.min(prev + 2, 36));
  const handleZoomOut = () => setFontSize(prev => Math.max(prev - 2, 12));
  const handleOpenRaw = () => {
    const pass = localStorage.getItem('note_pass_' + slug);
    const rawUrl = `/raw/${slug}${pass ? `?pass=${encodeURIComponent(pass)}` : ''}`;
    window.open(rawUrl, '_blank');
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(content);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleDownload = () => {
    const ext = { javascript: 'js', python: 'py', html: 'html', css: 'css', json: 'json', markdown: 'md' }[language] || 'txt';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug || 'note'}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
      <div className="flex items-center flex-wrap gap-1 sm:gap-2">
        {!readOnly && (
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
            <button onClick={onUndo} disabled={!canUndo} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded disabled:opacity-30" title={t.toolbar.undo}><RotateCcw className="w-3.5 h-3.5"/></button>
            <button onClick={onRedo} disabled={!canRedo} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded disabled:opacity-30" title={t.toolbar.redo}><RotateCw className="w-3.5 h-3.5"/></button>
          </div>
        )}

        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
          <button onClick={handleZoomOut} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded" title={t.toolbar.zoomOut}><ZoomOut className="w-3.5 h-3.5"/></button>
          <span className="px-2 font-mono text-slate-700 dark:text-slate-300">{fontSize}px</span>
          <button onClick={handleZoomIn} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded" title={t.toolbar.zoomIn}><ZoomIn className="w-3.5 h-3.5"/></button>
        </div>

        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-700 gap-1">
          <Code2 className="w-3.5 h-3.5 text-blue-500"/>
          <select value={language} onChange={e=>setLanguage(e.target.value)} disabled={readOnly} className="bg-transparent outline-none cursor-pointer">
            {LANGUAGES.map(l => <option key={l.id} value={l.id} className="dark:bg-slate-800">{l.name}</option>)}
          </select>
        </div>

        <button onClick={handleOpenRaw} className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors" title={t.toolbar.rawTooltip}>
          <FileCode className="w-3.5 h-3.5 text-amber-500"/><span>Raw</span>
        </button>
      </div>

      <div className="flex items-center flex-wrap gap-1 sm:gap-2">
        <button onClick={handleCopyAll} className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors" title={t.toolbar.copy}>
          {copiedAll ? <><Check className="w-3.5 h-3.5 text-emerald-500"/><span>{t.toolbar.copied}</span></> : <><Copy className="w-3.5 h-3.5"/><span>{t.toolbar.copy}</span></>}
        </button>
        <button onClick={handleDownload} className="p-1.5 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors" title={t.toolbar.download}><Download className="w-3.5 h-3.5"/></button>

        {!readOnly && (
          <>
            <button onClick={onOpenChangeUrl} className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors" title={t.toolbar.changeUrl}>
              <Link2 className="w-3.5 h-3.5 text-blue-500"/><span>{t.toolbar.changeUrl}</span>
            </button>
            <button onClick={onOpenPassword} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border transition-colors ${hasPassword ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-600' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700'}`} title={t.toolbar.protectPassword}>
              <Lock className="w-3.5 h-3.5"/><span>{t.toolbar.protectPassword}</span>
            </button>
          </>
        )}

        <button onClick={onOpenShare} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium shadow-sm active:scale-95 transition-all">
          <Share2 className="w-3.5 h-3.5"/><span>{t.toolbar.share}</span>
        </button>
      </div>
    </div>
  );
};