import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { NotePage } from './pages/NotePage';
import { SharePage } from './pages/SharePage';
import { MyNotesPage } from './pages/MyNotesPage';
import { generateRandomSlug } from './utils/slug';

// Khi truy cập domain/ thì tự động tạo slug ngẫu nhiên domain/abc3223
const HomeRedirect: React.FC = () => {
  const [randomSlug] = useState(() => generateRandomSlug());
  return <Navigate to={`/${randomSlug}`} replace />;
};

export const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('notepad_theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('notepad_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('notepad_theme', 'light');
    }
  }, [isDarkMode]);

  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/share/:slug" element={<SharePage isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />} />
            <Route path="/my-notes" element={<MyNotesPage isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />} />
            <Route path="/:slug" element={<NotePage isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
};

export default App;
