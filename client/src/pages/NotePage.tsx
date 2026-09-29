import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Navbar } from '../components/Navbar';
import { Toolbar } from '../components/Toolbar';
import { Editor } from '../components/Editor';
import { StatusBar } from '../components/StatusBar';
import { PasswordModal } from '../components/PasswordModal';
import { ChangeUrlModal } from '../components/ChangeUrlModal';
import { ShareModal } from '../components/ShareModal';
import { AuthModal } from '../components/AuthModal';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Lock, KeyRound, ShieldAlert } from 'lucide-react';
import { getApiUrl, getSocketUrl } from '../config';
import { getSupabase } from '../services/supabaseClient';

export const NotePage = ({ isDarkMode, setIsDarkMode }: { isDarkMode: boolean; setIsDarkMode: (v: boolean) => void }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { t } = useLanguage();

  const [content, setContent] = useState('');
  const [language, setLanguage] = useState('plaintext');
  const [fontSize, setFontSize] = useState(16);
  const [hasPassword, setHasPassword] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [enteredPass, setEnteredPass] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const [viewersCount, setViewersCount] = useState(1);
  const [isSyncing, setIsSyncing] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showChangeUrlModal, setShowChangeUrlModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isHistoryAction = useRef(false);
  const socketRef = useRef<any>(null);
  const supabaseChannelRef = useRef<any>(null);
  const saveDebounceRef = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    if (!slug) return;

    // 1. Load cached note content immediately if available for zero-latency load
    const localContent = localStorage.getItem('local_note_' + slug);
    if (localContent !== null) {
      setContent(localContent);
      setHistory([localContent]);
      setHistoryIndex(0);
    }

    // 2. Fetch note from backend / PostgreSQL
    const savedPass = localStorage.getItem('note_pass_' + slug) || '';
    fetch(getApiUrl(`/api/note/${slug}`), {
      headers: {
        'x-note-password': savedPass,
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.locked) {
          setIsLocked(true);
          setHasPassword(true);
          return;
        }
        setIsLocked(false);
        setHasPassword(Boolean(data.hasPassword));
        if (data.content !== undefined) {
          setContent(data.content);
          setHistory([data.content]);
          setHistoryIndex(0);
          localStorage.setItem('local_note_' + slug, data.content);
        }
        if (data.language) setLanguage(data.language);
      })
      .catch((err) => {
        console.warn('Could not fetch note from backend:', err);
      });

    // 3. Supabase Realtime channel (if supabase url/key configured)
    const client = getSupabase();
    if (client) {
      const channel = client.channel(`note-room:${slug}`, {
        config: { broadcast: { self: false } },
      });
      supabaseChannelRef.current = channel;

      channel
        .on('broadcast', { event: 'content-change' }, ({ payload }) => {
          if (payload?.content !== undefined) setContent(payload.content);
        })
        .on('broadcast', { event: 'language-change' }, ({ payload }) => {
          if (payload?.language) setLanguage(payload.language);
        })
        .on('broadcast', { event: 'typing' }, ({ payload }) => {
          setTypingUser(payload?.username);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 1500);
        })
        .on('broadcast', { event: 'slug-changed' }, ({ payload }) => {
          if (payload?.newSlug) navigate('/' + payload.newSlug);
        })
        .on('presence', { event: 'sync' }, () => {
          const presenceState = channel.presenceState();
          const count = Object.keys(presenceState).length;
          setViewersCount(Math.max(1, count));
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ online_at: Date.now() });
          }
        });
    }

    // 4. Socket.IO connection (if standalone server is running)
    try {
      const socket = io(getSocketUrl(), { transports: ['websocket', 'polling'], timeout: 3000 });
      socketRef.current = socket;

      socket.emit('join-note', {
        slug,
        password: savedPass,
        userToken: token,
      });

      socket.on('init-note', (data) => {
        setContent(data.content || '');
        setLanguage(data.language || 'plaintext');
        setHasPassword(data.hasPassword || false);
        setIsLocked(false);
        setHistory([data.content || '']);
        setHistoryIndex(0);
        if (data.content) {
          localStorage.setItem('local_note_' + slug, data.content);
        }
      });

      socket.on('note-locked', () => {
        setIsLocked(true);
        setHasPassword(true);
      });

      socket.on('note-updated', ({ content: newContent }) => setContent(newContent));
      socket.on('language-updated', ({ language: newLang }) => setLanguage(newLang));
      socket.on('viewers-count', (count) => setViewersCount(count));

      socket.on('user-typing', ({ username }) => {
        setTypingUser(username);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 1500);
      });

      socket.on('slug-changed', ({ newSlug }) => navigate('/' + newSlug));
    } catch (_) {}

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (supabaseChannelRef.current) supabaseChannelRef.current.unsubscribe();
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    };
  }, [slug, token, navigate]);


  const handleContentChange = (newVal: string) => {
    setContent(newVal);
    setIsSyncing(true);
    localStorage.setItem('local_note_' + slug, newVal);

    if (!isHistoryAction.current) {
      const newHist = history.slice(0, historyIndex + 1);
      newHist.push(newVal);
      if (newHist.length > 50) newHist.shift();
      setHistory(newHist);
      setHistoryIndex(newHist.length - 1);
    }
    isHistoryAction.current = false;

    // Realtime broadcast via Supabase
    if (supabaseChannelRef.current) {
      supabaseChannelRef.current.send({
        type: 'broadcast',
        event: 'content-change',
        payload: { content: newVal },
      });
      supabaseChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { username: user ? user.username : 'Khách' },
      });
    }

    // Auto-save debounced directly to database via API
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(async () => {
      try {
        const savedPass = localStorage.getItem('note_pass_' + slug) || '';
        await fetch(getApiUrl(`/api/note/${slug}`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-note-password': savedPass,
            ...(token ? { Authorization: 'Bearer ' + token } : {}),
          },
          body: JSON.stringify({ content: newVal, language }),
        });
      } catch (err) {
        console.warn('Auto-save error:', err);
      } finally {
        setIsSyncing(false);
      }
    }, 400);

    if (socketRef.current) {
      socketRef.current.emit('note-change', { slug, content: newVal, userId: user ? user.id : null });
      socketRef.current.emit('typing', { slug, username: user ? user.username : 'Khách' });
    }
  };

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    if (supabaseChannelRef.current) {
      supabaseChannelRef.current.send({
        type: 'broadcast',
        event: 'language-change',
        payload: { language: newLang },
      });
    }

    const savedPass = localStorage.getItem('note_pass_' + slug) || '';
    fetch(getApiUrl(`/api/note/${slug}`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-note-password': savedPass,
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: JSON.stringify({ content, language: newLang }),
    }).catch(console.warn);

    if (socketRef.current) socketRef.current.emit('language-change', { slug, language: newLang });
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      isHistoryAction.current = true;
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setContent(prev);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      isHistoryAction.current = true;
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setContent(next);
    }
  };

  const handleShareClick = () => {
    const shareUrl = window.location.origin + '/share/' + slug;
    navigator.clipboard.writeText(shareUrl);
    showToast('Đã tự động sao chép link chỉ đọc: /share/' + slug);
    setShowShareModal(true);
  };

  const handleUnlockNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError(null);
    try {
      const res = await fetch(getApiUrl('/api/note/' + slug + '/verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: enteredPass }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Mật khẩu không đúng');

      localStorage.setItem('note_pass_' + slug, enteredPass);
      setContent(data.content || '');
      setLanguage(data.language || 'plaintext');
      setIsLocked(false);
      if (socketRef.current) {
        socketRef.current.emit('join-note', { slug, password: enteredPass, userToken: token });
      }
    } catch (err: any) {
      setUnlockError(err.message);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 overflow-hidden">
      <Navbar
        slug={slug}
        viewersCount={viewersCount}
        hasPassword={hasPassword}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenPassword={() => setShowPasswordModal(true)}
      />

      {isLocked ? (
        <div className="flex-1 flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
          <div className="w-full max-w-md p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl text-center">
            <div className="w-14 h-14 mx-auto mb-4 bg-amber-100 dark:bg-amber-950/60 rounded-2xl flex items-center justify-center text-amber-600">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold mb-2">{t.lockedNote.title}</h2>
            <p className="text-xs text-slate-500 mb-6">{t.lockedNote.subtitle}</p>

            {unlockError && (
              <div className="mb-4 p-2.5 bg-rose-50 text-rose-600 text-xs rounded-lg flex items-center gap-2 justify-center">
                <ShieldAlert className="w-4 h-4" />
                <span>{unlockError}</span>
              </div>
            )}

            <form onSubmit={handleUnlockNote} className="space-y-3">
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="password"
                  required
                  value={enteredPass}
                  onChange={(e) => setEnteredPass(e.target.value)}
                  placeholder={t.lockedNote.placeholder}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold shadow-md active:scale-98 transition-all"
              >
                {t.lockedNote.unlockBtn}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <>
          <Toolbar
            slug={slug}
            fontSize={fontSize}
            setFontSize={setFontSize}
            language={language}
            setLanguage={handleLanguageChange}
            hasPassword={hasPassword}
            onOpenPassword={() => setShowPasswordModal(true)}
            onOpenChangeUrl={() => setShowChangeUrlModal(true)}
            onOpenShare={handleShareClick}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            content={content}
          />

          <Editor
            content={content}
            onChange={handleContentChange}
            fontSize={fontSize}
            language={language}
          />

          <StatusBar
            content={content}
            isSyncing={isSyncing}
            typingUser={typingUser}
          />
        </>
      )}

      {toastMessage && (
        <div className="fixed bottom-12 right-6 z-50 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-medium flex items-center gap-2">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        slug={slug}
        hasPassword={hasPassword}
        onPasswordChanged={(val) => setHasPassword(val)}
      />

      <ChangeUrlModal
        isOpen={showChangeUrlModal}
        onClose={() => setShowChangeUrlModal(false)}
        currentSlug={slug}
        hasPassword={hasPassword}
      />

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        slug={slug}
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
};