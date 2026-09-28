import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Users, Lock, Moon, Sun, User as UserIcon, LogOut, BookOpen, Plus, Languages, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage, AVAILABLE_LANGUAGES } from '../context/LanguageContext';
import { generateRandomSlug } from '../utils/slug';

export const Navbar = ({
  slug = '',
  viewersCount = 1,
  hasPassword = false,
  isDarkMode = false,
  setIsDarkMode = () => {},
  onOpenAuth = () => {},
  onOpenPassword = () => {}
}: {
  slug?: string;
  viewersCount?: number;
  hasPassword?: boolean;
  isDarkMode?: boolean;
  setIsDarkMode?: (val: boolean) => void;
  onOpenAuth?: () => void;
  onOpenPassword?: () => void;
}) => {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const newSlug = generateRandomSlug();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLang = AVAILABLE_LANGUAGES.find(l => l.code === language) || AVAILABLE_LANGUAGES[0];

  return (
    <header className='h-14 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 select-none'>
      <div className='flex items-center gap-3'>
        <Link to={`/${slug || newSlug}`} className='flex items-center gap-2 font-bold text-slate-800 dark:text-white'>
          <div className='p-1.5 bg-blue-600 rounded-lg text-white shadow-sm'><FileText className='w-5 h-5'/></div>
          <span className='tracking-tight text-base sm:text-lg'>Live Notepad</span>
        </Link>
        {slug && (
          <div className='hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-500'>
            <span>/{slug}</span>
            {hasPassword && (
              <button onClick={onOpenPassword} className='flex items-center gap-1 text-amber-600 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200'>
                <Lock className='w-3 h-3'/> {t.nav.lock}
              </button>
            )}
          </div>
        )}
      </div>
      <div className='flex items-center gap-2 sm:gap-3'>
        {slug && (
          <div className='flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 text-xs font-medium'>
            <span className='relative flex h-2 w-2'>
              <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75'></span>
              <span className='relative inline-flex rounded-full h-2 w-2 bg-emerald-500'></span>
            </span>
            <Users className='w-3.5 h-3.5'/>
            <span className='hidden sm:inline'>{viewersCount} {t.nav.online}</span>
          </div>
        )}

        <Link to={`/${newSlug}`} className='flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition-colors'>
          <Plus className='w-4 h-4'/><span className='hidden md:inline'>{t.nav.newNote}</span>
        </Link>

        {/* Language selector dropdown */}
        <div className='relative' ref={langRef}>
          <button
            onClick={() => setLangOpen(!langOpen)}
            className='flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200/60 dark:border-slate-700/60'
            title="Language / Ngôn ngữ"
          >
            <Languages className='w-3.5 h-3.5 text-blue-600 dark:text-blue-400'/>
            <span className='text-sm leading-none'>{currentLang.flag}</span>
            <span className='hidden sm:inline text-xs'>{currentLang.name}</span>
          </button>
          {langOpen && (
            <div className='absolute right-0 mt-1.5 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 z-50 animate-in fade-in duration-150'>
              {AVAILABLE_LANGUAGES.map(opt => (
                <button
                  key={opt.code}
                  onClick={() => { setLanguage(opt.code); setLangOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                    language === opt.code
                      ? 'font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/40'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className='flex items-center gap-2'>
                    <span className='text-sm'>{opt.flag}</span>
                    <span>{opt.name}</span>
                  </span>
                  {language === opt.code && <Check className='w-3.5 h-3.5 text-blue-600 dark:text-blue-400'/>}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className='p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors'
          title={isDarkMode ? t.nav.lightMode : t.nav.darkMode}
        >
          {isDarkMode ? <Sun className='w-4 h-4 text-amber-400'/> : <Moon className='w-4 h-4'/>}
        </button>

        {user ? (
          <div className='relative' ref={userMenuRef}>
            <button onClick={() => setDropdownOpen(!dropdownOpen)} className='flex items-center gap-2 pl-2 pr-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 transition-colors'>
              <div className='w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]'>{user.username.slice(0, 1).toUpperCase()}</div>
              <span className='max-w-[80px] truncate'>{user.username}</span>
            </button>
            {dropdownOpen && (
              <div className='absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 z-50'>
                <div className='px-3 py-2 border-b border-slate-100 dark:border-slate-700'>
                  <p className='text-xs font-semibold text-slate-800 dark:text-white truncate'>{user.username}</p>
                  <p className='text-[11px] text-slate-500 truncate'>{user.email}</p>
                </div>
                <Link to='/my-notes' onClick={() => setDropdownOpen(false)} className='flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'>
                  <BookOpen className='w-4 h-4 text-blue-500'/>{t.nav.myNotes}
                </Link>
                <button onClick={() => { logout(); setDropdownOpen(false); }} className='w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'>
                  <LogOut className='w-4 h-4'/>{t.nav.logout}
                </button>
              </div>
            )}
          </div>
        ) : (
          <button onClick={onOpenAuth} className='flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-sm transition-colors'>
            <UserIcon className='w-3.5 h-3.5'/><span>{t.nav.loginRegister}</span>
          </button>
        )}
      </div>
    </header>
  );
};