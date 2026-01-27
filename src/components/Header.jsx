import { memo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Calendar, Users, BarChart3, FileText, Layers, Menu, X, Truck, Lock, Unlock, ShoppingBag, Package } from 'lucide-react';
import { getRoleLabel } from '../utils/supplyRoles';

const tabs = [
  { path: '/', label: 'Заказы', icon: Layers },
  { path: '/products', label: 'Товары', icon: ShoppingBag },
  { path: '/shipping', label: 'Отгрузки', icon: Truck },
  { path: '/supply', label: 'Снабжение', icon: Package },
  { path: '/workload', label: 'Загрузка', icon: Calendar },
  { path: '/resources', label: 'Цех', icon: Users },
  { path: '/gantt', label: 'Гант', icon: BarChart3 },
  { path: '/reports', label: 'Финансы', icon: FileText },
];

export default memo(function Header({ hasUrgentShipping = false, hasWorkshopAlert = false, hasSupplyAlert = false, isAdmin, userRole, onToggleAuth }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const roleLabel = userRole ? getRoleLabel(userRole) : null;

  return (
    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2c2c2c] border-b-[3px] border-[#d32f2f] sticky top-0 z-40 shadow-[0_10px_20px_rgba(0,0,0,0.2)]">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">

        {/* Единая строка: Логотип + Навигация + Авторизация */}
        <div className="flex justify-between items-center h-[52px]">
          {/* Логотип */}
          <NavLink to="/" className="flex items-center gap-2 shrink-0">
            <img
              src="/pic/cropped-logo.png.webp"
              alt="Феррум"
              className="w-[32px] h-[32px] object-contain"
            />
            <span className="font-black text-[18px] text-[#d32f2f] tracking-tight leading-none">ФЕРРУМ</span>
          </NavLink>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center mx-4">
            {tabs.map(tab => {
              const isShippingUrgent = tab.path === '/shipping' && hasUrgentShipping;
              const isWorkshopAlert = tab.path === '/resources' && hasWorkshopAlert;
              const isSupplyAlert = tab.path === '/supply' && hasSupplyAlert;
              return (
                <NavLink
                  key={tab.path}
                  to={tab.path}
                  end={tab.path === '/'}
                  className={({ isActive }) => `
                    relative flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-all duration-200 rounded-lg whitespace-nowrap
                    ${isShippingUrgent
                      ? 'text-orange-400 bg-orange-500/20 animate-pulse-shipping'
                      : isWorkshopAlert
                        ? 'text-blue-400 bg-blue-500/20 animate-pulse-workshop'
                        : isSupplyAlert
                          ? 'text-cyan-400 bg-cyan-500/20 animate-pulse-supply'
                          : isActive
                            ? 'text-white bg-[#d32f2f]'
                            : 'text-[rgba(255,255,255,0.6)] hover:text-[rgba(255,255,255,0.9)] hover:bg-[rgba(255,255,255,0.1)]'
                    }
                  `}
                >
                  {({ isActive }) => (
                    <>
                      <tab.icon size={16} className={isShippingUrgent ? "text-orange-400" : isWorkshopAlert ? "text-blue-400" : isSupplyAlert ? "text-cyan-400" : isActive ? "text-white" : "text-[rgba(255,255,255,0.6)]"} />
                      {tab.label}
                      {isShippingUrgent && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full animate-ping" />
                      )}
                      {isWorkshopAlert && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping" />
                      )}
                      {isSupplyAlert && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-500 rounded-full animate-ping" />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Правая группа: Авторизация + Мобильное меню */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Кнопка авторизации (Замок) + роль */}
            <div className="flex items-center gap-2">
              {roleLabel && (
                <span className="hidden lg:block text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                  {roleLabel}
                </span>
              )}
              <button
                onClick={onToggleAuth}
                className={`p-1.5 rounded-lg transition-colors ${userRole ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-slate-500 hover:text-slate-300'}`}
                title={userRole ? `Выйти (${roleLabel})` : "Войти"}
              >
                {userRole ? <Unlock size={18} /> : <Lock size={18} />}
              </button>
            </div>

            {/* Mobile: Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 text-white hover:bg-white/10 rounded-lg transition"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#1a1a1a] border-t border-white/10 animate-in slide-in-from-top-2">
          <nav className="flex flex-col p-2">
            {tabs.map(tab => {
              const isShippingUrgent = tab.path === '/shipping' && hasUrgentShipping;
              const isWorkshopAlert = tab.path === '/resources' && hasWorkshopAlert;
              const isSupplyAlert = tab.path === '/supply' && hasSupplyAlert;
              return (
                <NavLink
                  key={tab.path}
                  to={tab.path}
                  end={tab.path === '/'}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) => `
                    relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-bold transition-all
                    ${isShippingUrgent
                      ? 'bg-orange-500 text-white animate-pulse'
                      : isWorkshopAlert
                        ? 'bg-blue-500 text-white animate-pulse'
                        : isSupplyAlert
                          ? 'bg-cyan-500 text-white animate-pulse'
                          : isActive
                            ? 'bg-[#d32f2f] text-white'
                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }
                  `}
                >
                  <tab.icon size={18} />
                  {tab.label}
                  {isShippingUrgent && (
                    <span className="ml-auto text-[10px] bg-white/20 px-2 py-0.5 rounded-full">Сегодня!</span>
                  )}
                  {isWorkshopAlert && (
                    <span className="ml-auto text-[10px] bg-white/20 px-2 py-0.5 rounded-full">КТУ!</span>
                  )}
                  {isSupplyAlert && (
                    <span className="ml-auto text-[10px] bg-white/20 px-2 py-0.5 rounded-full">Доставка!</span>
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
        @keyframes pulse-supply {
          0%, 100% { opacity: 1; background-color: rgba(6, 182, 212, 0.2); }
          50% { opacity: 0.7; background-color: rgba(6, 182, 212, 0.4); }
        }
        .animate-pulse-supply {
          animation: pulse-supply 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
});