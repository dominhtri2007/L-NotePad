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
  const [unlockError, setUnlockError] = useState(null);

  const [viewersCount, setViewersCount] = useState(1);
  const [isSyncing, setIsSyncing] = useState(false);
  const [typingUser, setTypingUser] = useState(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showChangeUrlModal, setShowChangeUrlModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isHistoryAction = useRef(false);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    if (!slug) return;

    // Load cached note content immediately if available (offline/standalone support)
    const localContent = localStorage.getItem('local_note_' + slug);
    if (localContent !== null) {
      setContent(localContent);
      setHistory([localContent]);
      setHistoryIndex(0);
    }

    const socket = io(getSocketUrl(), { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.emit('join-note', {
      slug,
      password: localStorage.getItem('note_pass_' + slug) || '',
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

    return () => { socket.disconnect(); };
  }, [slug, token, navigate]);

  const handleContentChange = (newVal) => {
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

    if (socketRef.current) {
      socketRef.current.emit('note-change', { slug, content: newVal, userId: user ? user.id : null });
      socketRef.current.emit('typing', { slug, username: user ? user.username : 'Khách' });
    }
    setTimeout(() => setIsSyncing(false), 300);
  };

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    if (socketRef.current) socketRef.current.emit('language-change', { slug, language: newLang });
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      isHistoryAction.current = true;
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setContent(prev);
      if (socketRef.current) socketRef.current.emit('note-change', { slug, content: prev });
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      isHistoryAction.current = true;
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setContent(next);
      if (socketRef.current) socketRef.current.emit('note-change', { slug, content: next });
    }
  };

  const handleShareClick = () => {
    const shareUrl = window.location.origin + '/share/' + slug;
    navigator.clipboard.writeText(shareUrl);
    showToast('Đã tự động sao chép link chỉ đọc: /share/' + slug);
    setShowShareModal(true);
  };

  const handleUnlockNote = async (e) => {
    e.preventDefault();
    setUnlockError(null);
    try {
      const res = await fetch(getApiUrl('/api/note/' + slug + '/verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: enteredPass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Mật khẩu không đúng');

      localStorage.setItem('note_pass_' + slug, enteredPass);
      setContent(data.content || '');
      setLanguage(data.language || 'plaintext');
      setIsLocked(false);
      if (socketRef.current) {
        socketRef.current.emit('join-note', { slug, password: enteredPass, userToken: token });
      }
    } catch (err) {
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