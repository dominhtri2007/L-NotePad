import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Navbar } from '../components/Navbar';
import { Editor } from '../components/Editor';
import { StatusBar } from '../components/StatusBar';
import { Toolbar } from '../components/Toolbar';
import { useLanguage } from '../context/LanguageContext';
import { Eye, Edit3, ShieldAlert } from 'lucide-react';
import { getSocketUrl } from '../config';
import { getSupabase } from '../services/supabaseClient';
import { supabaseNoteService } from '../services/supabaseNoteService';

export const SharePage = ({ isDarkMode, setIsDarkMode }: { isDarkMode: boolean; setIsDarkMode: (v: boolean) => void }) => {
  const { slug } = useParams();
  const { t } = useLanguage();
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState('plaintext');
  const [fontSize, setFontSize] = useState(16);
  const [viewersCount, setViewersCount] = useState(1);
  const [typingUser, setTypingUser] = useState(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const localContent = localStorage.getItem('local_note_' + slug);
    if (localContent) setContent(localContent);

    // Supabase Mode
    if (supabaseNoteService.isAvailable()) {
      supabaseNoteService.getNote(slug).then((note) => {
        if (!note) return;
        if (note.password) {
          setLocked(true);
          return;
        }
        setContent(note.content || '');
        setLanguage(note.language || 'plaintext');
      });

      const client = getSupabase();
      if (!client) return;
      const channel = client.channel(`note-room:${slug}`, {
        config: { broadcast: { self: false } },
      });

      channel
        .on('broadcast', { event: 'content-change' }, ({ payload }) => {
          if (payload?.content !== undefined) setContent(payload.content);
        })
        .on('broadcast', { event: 'language-change' }, ({ payload }) => {
          if (payload?.language) setLanguage(payload.language);
        })
        .on('broadcast', { event: 'typing' }, ({ payload }) => {
          setTypingUser(payload?.username);
          setTimeout(() => setTypingUser(null), 1500);
        })
        .on('presence', { event: 'sync' }, () => {
          const presenceState = channel.presenceState();
          setViewersCount(Math.max(1, Object.keys(presenceState).length));
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ online_at: Date.now() });
          }
        });

      return () => {
        channel.unsubscribe();
      };
    }

    // Socket.IO Backend Mode
    const socket = io(getSocketUrl(), { transports: ['websocket', 'polling'] });

    socket.emit('join-note', { slug });

    socket.on('init-note', (data) => {
      setContent(data.content || '');
      setLanguage(data.language || 'plaintext');
    });

    socket.on('note-locked', () => {
      setLocked(true);
    });

    socket.on('note-updated', ({ content: newContent }) => {
      setContent(newContent);
    });

    socket.on('language-updated', ({ language: newLang }) => {
      setLanguage(newLang);
    });

    socket.on('viewers-count', (count) => {
      setViewersCount(count);
    });

    socket.on('user-typing', ({ username }) => {
      setTypingUser(username);
      setTimeout(() => setTypingUser(null), 1500);
    });

    return () => { socket.disconnect(); };
  }, [slug]);

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 overflow-hidden">
      <Navbar
        slug={slug}
        viewersCount={viewersCount}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        onOpenAuth={() => {}}
        onOpenPassword={() => {}}
      />

      {/* Read-only Banner */}
      <div className="bg-purple-50 dark:bg-purple-950/40 border-b border-purple-200 dark:border-purple-900/60 px-4 py-2 flex items-center justify-between text-xs text-purple-800 dark:text-purple-300">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span>
            <strong>{t.sharePage.bannerTitle}</strong> {t.sharePage.bannerDesc}
          </span>
        </div>
        <Link
          to={`/${slug}`}
          className="flex items-center gap-1.5 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium text-xs transition-all active:scale-95 shadow-sm"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>{t.sharePage.editBtn}</span>
        </Link>
      </div>

      <Toolbar
        slug={slug || ''}
        fontSize={fontSize}
        setFontSize={setFontSize}
        language={language}
        setLanguage={setLanguage}
        hasPassword={false}
        onOpenPassword={() => {}}
        onOpenChangeUrl={() => {}}
        onOpenShare={() => {
          navigator.clipboard.writeText(window.location.href);
          alert(t.sharePage.copiedLink);
        }}
        onUndo={() => {}}
        onRedo={() => {}}
        canUndo={false}
        canRedo={false}
        content={content}
        readOnly={true}
      />

      {locked ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center p-6 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <ShieldAlert className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="font-semibold text-sm">{t.lockedNote.shareLockedTitle}</p>
            <p className="text-xs text-slate-500 mt-1">{t.lockedNote.shareLockedDesc}</p>
            <Link to={`/${slug}`} className="inline-block mt-3 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium">
              {t.lockedNote.goToOriginal}
            </Link>
          </div>
        </div>
      ) : (
        <Editor
          content={content}
          onChange={() => {}}
          fontSize={fontSize}
          language={language}
          readOnly={true}
        />
      )}

      <StatusBar
        content={content}
        isSyncing={false}
        typingUser={typingUser}
      />
    </div>
  );
};