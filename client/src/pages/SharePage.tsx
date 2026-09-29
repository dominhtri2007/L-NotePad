import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Navbar } from '../components/Navbar';
import { Editor } from '../components/Editor';
import { StatusBar } from '../components/StatusBar';
import { Toolbar } from '../components/Toolbar';
import { useLanguage } from '../context/LanguageContext';
import { ShieldAlert } from 'lucide-react';
import { getApiUrl, getSocketUrl } from '../config';
import { getSupabase } from '../services/supabaseClient';

export const SharePage = ({ isDarkMode, setIsDarkMode }: { isDarkMode: boolean; setIsDarkMode: (v: boolean) => void }) => {
  const { slug } = useParams();
  const { t } = useLanguage();
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState('plaintext');
  const [fontSize, setFontSize] = useState(16);
  const [viewersCount, setViewersCount] = useState(1);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const localContent = localStorage.getItem('local_note_' + slug);
    if (localContent) setContent(localContent);

    // 0. Zero-latency cross-tab realtime sync via BroadcastChannel
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(`note_channel_${slug}`);
      bc.onmessage = (e) => {
        if (e.data?.type === 'content-change' && e.data?.content !== undefined) {
          setContent(e.data.content);
        }
        if (e.data?.type === 'language-change' && e.data?.language) {
          setLanguage(e.data.language);
        }
        if (e.data?.type === 'typing') {
          setTypingUser(e.data.username);
          setTimeout(() => setTypingUser(null), 1500);
        }
      };
    } catch (_) {}

    // 1. Initial fetch from backend API
    let lastUpdatedAt = '';
    fetch(getApiUrl(`/api/note/${slug}`))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.locked) {
          setLocked(true);
          return;
        }
        setLocked(false);
        if (data.updatedAt) lastUpdatedAt = data.updatedAt;
        if (data.content !== undefined) setContent(data.content);
        if (data.language) setLanguage(data.language);
      })
      .catch(console.warn);

    // 2. High-performance Polling fallback for multi-device realtime updates
    const pollInterval = setInterval(() => {
      fetch(getApiUrl(`/api/note/${slug}`))
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data || data.locked) return;
          if (data.updatedAt && data.updatedAt !== lastUpdatedAt) {
            lastUpdatedAt = data.updatedAt;
            if (data.content !== undefined) setContent(data.content);
            if (data.language) setLanguage(data.language);
          }
        })
        .catch(() => {});
    }, 1200);

    // Realtime via Supabase if configured
    const client = getSupabase();
    let channel: any = null;
    if (client) {
      channel = client.channel(`note-room:${slug}`, {
        config: { broadcast: { self: false } },
      });

      channel
        .on('broadcast', { event: 'content-change' }, ({ payload }: any) => {
          if (payload?.content !== undefined) setContent(payload.content);
        })
        .on('broadcast', { event: 'language-change' }, ({ payload }: any) => {
          if (payload?.language) setLanguage(payload.language);
        })
        .on('broadcast', { event: 'typing' }, ({ payload }: any) => {
          setTypingUser(payload?.username);
          setTimeout(() => setTypingUser(null), 1500);
        })
        .on('presence', { event: 'sync' }, () => {
          const presenceState = channel.presenceState();
          setViewersCount(Math.max(1, Object.keys(presenceState).length));
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ online_at: Date.now() });
          }
        });
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

    return () => {
      if (bc) bc.close();
      clearInterval(pollInterval);
      if (channel) channel.unsubscribe();
      socket.disconnect();
    };
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