// src/components/Layout.tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import ChatBox from '../ChatBox';
import ThemeToggle from './ThemeToggle';

const Layout: React.FC = () => {
  return (
    // 這個 div 負責全螢幕的背景顏色切換
    <div className="min-h-screen w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <main>
        {/* Outlet 是 react-router 的一個特殊元件，所有子頁面都會在這裡被渲染 */}
        <Outlet />
      </main>

      {/* 將全域元件放在佈局的頂層 */}
      <ChatBox />
      <div className="fixed top-4 right-4 z-100">
        <ThemeToggle />
      </div>
    </div>
  );
};

export default Layout;