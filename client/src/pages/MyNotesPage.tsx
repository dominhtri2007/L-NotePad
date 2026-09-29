import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { BookOpen, Lock, ArrowRight, Copy, Check, Plus, Search } from 'lucide-react';
import { generateRandomSlug } from '../utils/slug';
import { getApiUrl } from '../config';

export const MyNotesPage = ({ isDarkMode, setIsDarkMode }: { isDarkMode: boolean; setIsDarkMode: (v: boolean) => void }) => {
  const { token, user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!token && !user) { navigate('/'); return; }

    fetch(getApiUrl('/api/notes/my'), {
      headers: { Authorization: 'Bearer ' + token },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.notes) {
          setNotes(data.notes);
        }
      })
      .catch((err) => {
        console.error('Fetch my notes error:', err);
      })
      .finally(() => setLoading(false));
  }, [token, user, navigate]);

  const copyLink = (s) => {
    navigator.clipboard.writeText(window.location.origin + '/' + s);
    setCopiedSlug(s);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const filtered = notes.filter(n =>
    n.slug.toLowerCase().includes(search.toLowerCase()) || (n.preview || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      <Navbar isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} onOpenAuth={()=>{}} onOpenPassword={()=>{}} />
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <BookOpen className="w-6 h-6 text-blue-600" /> {t.myNotes.title}
            </h1>
            <p className="text-xs text-slate-500 mt-1">{t.myNotes.subtitle}</p>
          </div>
          <Link to={'/' + generateRandomSlug()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md self-start sm:self-auto transition-all">
            <Plus className="w-4 h-4" /> {t.myNotes.newNote}
          </Link>
        </div>

        <div className="relative mb-6">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder={t.myNotes.searchPlaceholder} className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
        </div>

        {loading ? <div className="text-center py-12 text-slate-400 text-sm">{t.myNotes.loading}</div> : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
            <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">{t.myNotes.emptyTitle}</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">{t.myNotes.emptyDesc}</p>
            <Link to={'/' + generateRandomSlug()} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg">
              <Plus className="w-3.5 h-3.5" /> {t.myNotes.createFirst}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((note: any) => (
              <div key={note.slug} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:shadow transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold text-sm">/{note.slug}</span>
                    <div className="flex items-center gap-2">
                      {note.hasPassword && <span className="flex items-center gap-1 text-[11px] bg-amber-50 dark:bg-amber-950 text-amber-600 px-2 py-0.5 rounded-full border border-amber-200"><Lock className="w-3 h-3"/> {t.nav.lock}</span>}
                      <span className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 px-2 py-0.5 rounded-full uppercase">{note.language}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-3 mb-3 font-mono bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">{note.preview || t.myNotes.emptyPreview}</p>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>{note.wordsCount} {t.myNotes.words} • {note.charsCount} {t.myNotes.chars}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={()=>copyLink(note.slug)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400">
                      {copiedSlug === note.slug ? <Check className="w-4 h-4 text-emerald-500"/> : <Copy className="w-4 h-4"/>}
                    </button>
                    <Link to={'/' + note.slug} className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded text-xs font-medium">
                      {t.myNotes.openNote} <ArrowRight className="w-3 h-3"/>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};