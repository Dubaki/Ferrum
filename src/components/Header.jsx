import { memo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Calendar, Users, BarChart3, FileText, Layers, Menu, X, Truck, Lock, Unlock, ShoppingBag } from 'lucide-react';

const tabs = [
  { path: '/', label: 'Заказы', icon: Layers },
  { path: '/products', label: 'Товары', icon: ShoppingBag },
  { path: '/shipping', label: 'Отгрузки', icon: Truck },
  { path: '/workload', label: 'Загрузка', icon: Calendar },
  { path: '/resources', label: 'Цех', icon: Users },
  { path: '/gantt', label: 'Гант', icon: BarChart3 },
  { path: '/reports', label: 'Финансы', icon: FileText },
];

export default memo(function Header({ hasUrgentShipping = false, hasWorkshopAlert = false, isAdmin, onToggleAuth }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const currentTab = tabs.find(t => t.path === location.pathname) || tabs[0];

  return (
    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2c2c2c] border-b-[3px] border-[#d32f2f] sticky top-0 z-40 shadow-[0_10px_20px_rgba(0,0,0,0.2)]">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">

        {/* Верхняя строка с логотипом */}
        <div className="flex justify-between items-center h-[56px] sm:h-[70px]">
          <NavLink to="/" className="flex items-center gap-2 sm:gap-3">
            {/* Логотип */}
            <img
              src="/pic/cropped-logo.png.webp"
              alt="Феррум"
              className="w-[36px] h-[36px] sm:w-[50px] sm:h-[50px] object-contain"
            />

            <div className="flex flex-col">
              <span className="block font-black text-[22px] sm:text-[32px] text-[#d32f2f] tracking-tight leading-none">ФЕРРУМ</span>
              <span className="hidden sm:block text-[9px] font-bold text-[#666] uppercase tracking-[0.05em] mt-[2px]">ЗАВОД МЕТАЛЛОКОНСТРУКЦИЙ</span>
            </div>
          </NavLink>

          {/* Кнопка авторизации (Замок) */}
          <button
            onClick={onToggleAuth}
            className={`ml-4 p-2 rounded-lg transition-colors ${isAdmin ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-slate-500 hover:text-slate-300'}`}
            title={isAdmin ? "Выйти из режима администратора" : "Войти как администратор"}
          >
            {isAdmin ? <Unlock size={20} /> : <Lock size={20} />}
          </button>

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
          {tabs.map(tab => {
            const isShippingUrgent = tab.path === '/shipping' && hasUrgentShipping;
            const isWorkshopAlert = tab.path === '/resources' && hasWorkshopAlert;
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                end={tab.path === '/'}
                className={({ isActive }) => `
                  relative flex items-center gap-2 px-4 lg:px-6 py-3 text-sm font-bold transition-all duration-200 border-b-2 whitespace-nowrap
                  ${isShippingUrgent
                    ? 'border-orange-500 text-orange-400 bg-orange-500/20 animate-pulse-shipping'
                    : isWorkshopAlert
                      ? 'border-blue-500 text-blue-400 bg-blue-500/20 animate-pulse-workshop'
                      : isActive
                        ? 'border-[#d32f2f] text-white bg-[rgba(211,47,47,0.15)]'
                        : 'border-transparent text-[rgba(255,255,255,0.6)] hover:text-[rgba(255,255,255,0.9)] hover:bg-[rgba(255,255,255,0.1)]'
                  }
                `}
              >
                {({ isActive }) => (
                  <>
                    <tab.icon size={18} className={isShippingUrgent ? "text-orange-400" : isWorkshopAlert ? "text-blue-400" : isActive ? "text-[#d32f2f]" : "text-[rgba(255,255,255,0.6)]"} />
                    {tab.label}
                    {isShippingUrgent && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full animate-ping" />
                    )}
                    {isWorkshopAlert && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-ping" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#1a1a1a] border-t border-white/10 animate-in slide-in-from-top-2">
          <nav className="flex flex-col p-2">
            {tabs.map(tab => {
              const isShippingUrgent = tab.path === '/shipping' && hasUrgentShipping;
              const isWorkshopAlert = tab.path === '/resources' && hasWorkshopAlert;
              return (
                <NavLink
                  key={tab.path}
                  to={tab.path}
                  end={tab.path === '/'}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) => `
                    relative flex items-center gap-3 px-4 py-3 rounded-lg text-base font-bold transition-all
                    ${isShippingUrgent
                      ? 'bg-orange-500 text-white animate-pulse'
                      : isWorkshopAlert
                        ? 'bg-blue-500 text-white animate-pulse'
                        : isActive
                          ? 'bg-[#d32f2f] text-white'
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }
                  `}
                >
                  <tab.icon size={20} />
                  {tab.label}
                  {isShippingUrgent && (
                    <span className="ml-auto text-xs bg-white/20 px-2 py-0.5 rounded-full">Сегодня!</span>
                  )}
                  {isWorkshopAlert && (
                    <span className="ml-auto text-xs bg-white/20 px-2 py-0.5 rounded-full">КТУ!</span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      )}

      {/* CSS для анимации пульсации */}
      <style>{`
        @keyframes pulse-shipping {
          0%, 100% { opacity: 1; background-color: rgba(249, 115, 22, 0.2); }
          50% { opacity: 0.7; background-color: rgba(249, 115, 22, 0.4); }
        }
        .animate-pulse-shipping {
          animation: pulse-shipping 1.5s ease-in-out infinite;
        }
        @keyframes pulse-workshop {
          0%, 100% { opacity: 1; background-color: rgba(59, 130, 246, 0.2); }
          50% { opacity: 0.7; background-color: rgba(59, 130, 246, 0.4); }
        }
        .animate-pulse-workshop {
          animation: pulse-workshop 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
});