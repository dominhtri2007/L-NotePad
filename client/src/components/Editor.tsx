import React, { useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

export const Editor = ({
  content,
  onChange,
  fontSize = 16,
  language = 'plaintext',
  readOnly = false,
  onKeyDown,
}: {
  content: string;
  onChange: (val: string) => void;
  fontSize?: number;
  language?: string;
  readOnly?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}) => {
  const { t } = useLanguage();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const isCode = language !== 'plaintext';
  const lines = (content || '').split('\n');
  const lineCount = Math.max(lines.length, 1);

  // Sync scrolling between line numbers and textarea
  const handleScroll = () => {
    if (lineNumbersRef.current && textareaRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Handle Tab key for indentation
  const handleKeyDown = (e) => {
    if (onKeyDown) onKeyDown(e);

    if (e.key === 'Tab' && !readOnly) {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;

      const newVal = val.substring(0, start) + '  ' + val.substring(end);
      onChange(newVal);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden relative bg-white dark:bg-slate-900">
      {/* Line numbers for code mode */}
      {isCode && (
        <div
          ref={lineNumbersRef}
          style={{ fontSize: `${fontSize}px`, lineHeight: '1.6' }}
          className="select-none py-4 pl-3 pr-3 text-right bg-slate-50 dark:bg-slate-950/60 border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono overflow-hidden hidden sm:block"
        >
          {Array.from({ length: lineCount }).map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
      )}

      {/* Main text area */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        readOnly={readOnly}
        spellCheck={false}
        placeholder={
          readOnly
            ? t.editor.readOnly
            : isCode
            ? t.editor.codePlaceholder
            : t.editor.textPlaceholder
        }
        style={{
          fontSize: `${fontSize}px`,
          lineHeight: '1.6',
          fontFamily: isCode ? 'Fira Code, Consolas, Monaco, monospace' : 'inherit',
        }}
        className={`w-full h-full p-4 sm:p-6 bg-transparent resize-none outline-none overflow-y-auto ${
          isCode ? 'font-mono' : ''
        } text-slate-800 dark:text-slate-100 placeholder-slate-400/50 dark:placeholder-slate-600`}
      />
    </div>
  );
};