import { memo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Calendar, Users, BarChart3, FileText, Layers, Menu, X } from 'lucide-react';

const tabs = [
  { path: '/', label: 'Заказы', icon: Layers },
  { path: '/workload', label: 'Загрузка', icon: Calendar },
  { path: '/resources', label: 'Цех', icon: Users },
  { path: '/gantt', label: 'Гант', icon: BarChart3 },
  { path: '/reports', label: 'Финансы', icon: FileText },
];

export default memo(function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const currentTab = tabs.find(t => t.path === location.pathname) || tabs[0];

  return (
    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2c2c2c] border-b-[3px] border-[#d32f2f] sticky top-0 z-40 shadow-[0_10px_20px_rgba(0,0,0,0.2)]">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">

        {/* Верхняя строка с логотипом */}
        <div className="flex justify-between items-center h-[56px] sm:h-[70px]">
          <NavLink to="/" className="flex items-center gap-2 sm:gap-3">
            {/* SVG Лошадь */}
            <svg
              className="w-[36px] h-[36px] sm:w-[50px] sm:h-[50px]"
              style={{ filter: 'brightness(0) invert(1)' }}
              viewBox="0 0 100 100"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M20 80 Q25 60, 35 55 L40 50 Q45 40, 50 45 L55 60 Q58 65, 60 60 L62 50 Q64 45, 66 50 L68 60 Q70 65, 72 60 L74 50 Q76 40, 78 50 L80 70 Q82 80, 75 82 L30 85 Z" fill="white"/>
              <path d="M40 50 L45 35 Q47 25, 50 30 L52 40 Q54 45, 52 50 Z" fill="white"/>
              <ellipse cx="48" cy="36" rx="3" ry="3" fill="#1a1a1a"/>
            </svg>

            <div className="flex flex-col">
              <span className="block font-black text-[22px] sm:text-[32px] text-[#d32f2f] tracking-tight leading-none">ФЕРРУМ</span>
              <span className="hidden sm:block text-[9px] font-bold text-[#666] uppercase tracking-[0.05em] mt-[2px]">ЗАВОД МЕТАЛЛОКОНСТРУКЦИЙ</span>
            </div>
          </NavLink>

          {/* Mobile: Current tab + Hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <span className="text-white/80 text-sm font-medium">{currentTab.label}</span>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-white hover:bg-white/10 rounded-lg transition"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex overflow-x-auto pb-0 gap-1 no-scrollbar -mb-px">
          {tabs.map(tab => (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.path === '/'}
              className={({ isActive }) => `
                relative flex items-center gap-2 px-4 lg:px-6 py-3 text-sm font-bold transition-all duration-200 border-b-2 whitespace-nowrap
                ${isActive
                  ? 'border-[#d32f2f] text-white bg-[rgba(211,47,47,0.15)]'
                  : 'border-transparent text-[rgba(255,255,255,0.6)] hover:text-[rgba(255,255,255,0.9)] hover:bg-[rgba(255,255,255,0.1)]'
                }
              `}
            >
              {({ isActive }) => (
                <>
                  <tab.icon size={18} className={isActive ? "text-[#d32f2f]" : "text-[rgba(255,255,255,0.6)]"} />
                  {tab.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#1a1a1a] border-t border-white/10 animate-in slide-in-from-top-2">
          <nav className="flex flex-col p-2">
            {tabs.map(tab => (
              <NavLink
                key={tab.path}
                to={tab.path}
                end={tab.path === '/'}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-lg text-base font-bold transition-all
                  ${isActive
                    ? 'bg-[#d32f2f] text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }
                `}
              >
                <tab.icon size={20} />
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
});