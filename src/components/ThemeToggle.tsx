import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 dark:focus:ring-offset-gray-900 ${
        theme === 'light' ? 'bg-cyan-500' : 'bg-slate-700'
      }`}
    >
      <span className="sr-only">Toggle theme</span>
      <span
        className={`absolute inset-y-0 left-0 flex h-8 w-8 transform items-center justify-center rounded-full bg-white shadow-lg transition-transform duration-300 ease-in-out ${
          theme === 'dark' ? 'translate-x-6' : 'translate-x-0'
        }`}
      >
        {theme === 'dark' ? (
          <Moon className="h-5 w-5 text-slate-700" />
        ) : (
          <Sun className="h-5 w-5 text-cyan-500" />
        )}
      </span>
    </button>
  );
}