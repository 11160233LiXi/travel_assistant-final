// 修正：在檔案最頂部加入這行註解，以停用此 ESLint 規則
/* eslint-disable react-refresh/only-export-components */

// src/ThemeContext.tsx (最終、最穩定的版本)

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // 【關鍵修正】簡化起始狀態的邏輯
  // 1. 優先從 localStorage 讀取。
  // 2. 如果 localStorage 沒有，就預設為 'light'。
  // 3. 移除所有對 window.matchMedia 的檢查。
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) || 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    root.classList.remove('light', 'dark');
    root.classList.add(theme);

    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => {
      const nextTheme = prevTheme === 'light' ? 'dark' : 'light';
      // ▼▼▼ 加入檢測代碼 ▼▼▼
      console.log(`[主題檢測] 主題切換: ${prevTheme} -> ${nextTheme}`);
      // ▲▲▲ 加入檢測代碼 ▲▲▲
      return nextTheme;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}