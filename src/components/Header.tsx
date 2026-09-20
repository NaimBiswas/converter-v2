import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export type PageView = 'converter' | 'tools' | 'api' | 'pricing' | 'docs' | 'privacy' | 'terms' | 'help' | 'contact';

interface HeaderProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenAuthModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  onOpenAuthModal,
}) => {
  const location = useLocation();

  const navItems: { path: string; label: string; icon: string }[] = [
    { path: '/', label: 'Converter Workspace', icon: 'published_with_changes' },
    { path: '/tools', label: 'Tools Directory', icon: 'grid_view' },
    // { path: '/api', label: 'Developer API', icon: 'terminal' },
    // { path: '/pricing', label: 'Pricing', icon: 'workspace_premium' },
    { path: '/docs', label: 'Docs & Security', icon: 'shield' },
  ];

  return (
    <header className="bg-[#f8f9fa] dark:bg-[#12161f] top-0 z-50 sticky border-b border-[#e1e3e4] dark:border-[#262c3a] w-full transition-colors duration-200">
      <div className="flex justify-between items-center max-w-[1200px] mx-auto px-4 md:px-8 h-20 w-full">
        {/* Brand Logo */}
        <Link 
          to="/" 
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-[#d8e2ff] dark:bg-[#1e293b] flex items-center justify-center text-[#0058be] dark:text-[#38bdf8] group-hover:rotate-180 transition-transform duration-500 shadow-xs">
            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              transform
            </span>
          </div>
          <span className="text-xl font-extrabold text-[#0058be] dark:text-[#38bdf8] tracking-tight font-heading">
            Data Converter
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden lg:flex gap-1 items-center bg-[#edeeef] dark:bg-[#1a2333] p-1.5 rounded-full border border-[#e1e3e4]/80 dark:border-[#262c3a]">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`text-xs font-bold px-4 py-2 rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-[#0284c7] text-[#0058be] dark:text-white shadow-xs'
                    : 'text-[#424754] dark:text-[#94a3b8] hover:text-[#0058be] dark:hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Action Buttons & Theme Toggle */}
        <div className="flex items-center gap-2.5">
          {/* Mobile page selector */}
          <div className="lg:hidden flex gap-1">
            <Link
              to="/tools"
              className="text-xs font-bold p-2 text-[#0058be] dark:text-[#38bdf8]"
            >
              Tools
            </Link>
            <Link
              to="/pricing"
              className="text-xs font-bold p-2 text-[#0058be] dark:text-[#38bdf8]"
            >
              Pricing
            </Link>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-2.5 rounded-full text-[#424754] dark:text-[#e2e8f0] bg-[#edeeef] dark:bg-[#1e293b] hover:bg-[#e1e3e4] dark:hover:bg-[#334155] transition-all cursor-pointer flex items-center justify-center active:scale-90"
          >
            <span className="material-symbols-outlined text-xl">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

        </div>
      </div>
    </header>
  );
};
