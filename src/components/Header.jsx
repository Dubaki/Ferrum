import { memo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Calendar, Users, BarChart3, FileText, Layers, Menu, X, Truck, Lock, Unlock, ShoppingBag, Package } from 'lucide-react';
import { getRoleLabel } from '../utils/supplyRoles';

const tabs = [
  { path: '/', label: 'Заказы', icon: Layers },
  { path: '/products', label: 'Товары', icon: ShoppingBag },
  { path: '/shipping', label: 'Отгрузки', icon: Truck },
  { path: '/supply', label: 'Снабжение', icon: Package },

  { path: '/resources', label: 'Цех', icon: Users },
  { path: '/gantt', label: 'Гант', icon: BarChart3 },
  { path: '/reports', label: 'Финансы', icon: FileText },
];

const Header = memo(({ hasUrgentShipping, hasSupplyAlert, userRole, onToggleAuth }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const roleLabel = userRole ? getRoleLabel(userRole) : null;

  const getTabStyle = ({ isActive, isAlert }) => {
    if (isActive) {
      return 'bg-primary-50 text-primary-600';
    }
    if (isAlert) {
        return 'bg-warning-50 text-warning-600 animate-pulse';
    }
    return 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800';
  };

  const renderTab = (tab, isMobile = false) => {
    const isAlert = (tab.path === '/shipping' && hasUrgentShipping) || 
                    (tab.path === '/supply' && hasSupplyAlert);

    return (
      <NavLink
        key={tab.path}
        to={tab.path}
        end={tab.path === '/'}
        onClick={() => isMobile && setMobileMenuOpen(false)}
        className={({ isActive }) =>
          `relative flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-lg transition-colors duration-150 whitespace-nowrap ${getTabStyle({ isActive, isAlert })}`
        }
      >
        <tab.icon size={18} />
        {tab.label}
        {isAlert && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-warning-500 rounded-full"></span>}
      </NavLink>
    );
  };

  return (
    <header className="bg-white/70 backdrop-blur-2xl border-b border-slate-200/50 sticky top-0 z-40 shadow-[0_2px_15px_-1px_rgba(0,0,0,0.05)] transition-all duration-500">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">
          
          {/* LOGO: Living Icon Design */}
          <NavLink to="/" className="group flex items-center gap-3 shrink-0 outline-none">
            <div className="relative">
                <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                <img
                  src="/pic/cropped-logo.png.webp"
                  alt="Феррум"
                  className="w-9 h-9 object-contain relative transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110 group-hover:rotate-[10deg]"
                />
            </div>
            <div className="flex flex-col">
                <span className="font-black text-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent tracking-tighter leading-none">
                    ФЕРРУМ
                </span>
                <span className="text-[8px] font-black text-orange-500 tracking-[0.4em] uppercase leading-none mt-1 opacity-80 group-hover:tracking-[0.5em] transition-all duration-700">
                    Production
                </span>
            </div>
          </NavLink>

          {/* DESKTOP NAVIGATION: Floating Tab Style */}
          <nav className="hidden xl:flex items-center bg-slate-100/50 p-1 rounded-2xl border border-slate-200/30 gap-1 mx-8 shadow-inner">
            {tabs.map(tab => {
                const isAlert = (tab.path === '/shipping' && hasUrgentShipping) || 
                                (tab.path === '/supply' && hasSupplyAlert);
                
                return (
                    <NavLink
                        key={tab.path}
                        to={tab.path}
                        end={tab.path === '/'}
                        className={({ isActive }) =>
                        `relative flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 group
                        ${isActive 
                            ? 'bg-white text-slate-900 shadow-md scale-[1.02]' 
                            : 'text-slate-400 hover:text-slate-600 hover:bg-white/40'}`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <tab.icon size={16} strokeWidth={isActive ? 3 : 2} className={isActive ? 'text-orange-500' : 'text-slate-400 group-hover:text-slate-500'} />
                                <span>{tab.label}</span>
                                {isAlert && (
                                    <span className={`absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full ${isActive ? 'ring-2 ring-white' : ''} animate-pulse`}></span>
                                )}
                            </>
                        )}
                    </NavLink>
                );
            })}
          </nav>

          {/* RIGHT GROUP: Auth & Global Actions */}
          <div className="flex items-center gap-3 shrink-0">
            {roleLabel && (
              <div className="hidden sm:flex flex-col items-end mr-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-60">Доступ</span>
                  <span className="text-xs font-bold text-slate-700">{roleLabel}</span>
              </div>
            )}
            
            <button
              onClick={onToggleAuth}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 border
                ${userRole 
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-500 hover:text-white shadow-emerald-100 shadow-lg' 
                    : 'bg-white border-slate-200 text-slate-400 hover:border-slate-900 hover:text-slate-900 shadow-sm'}`}
              title={userRole ? `Выйти (${roleLabel})` : "Войти"}
            >
              {userRole ? <Unlock size={20} strokeWidth={2.5} /> : <Lock size={20} strokeWidth={2.5} />}
            </button>
            
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden w-10 h-10 flex items-center justify-center bg-slate-900 text-white rounded-xl shadow-lg shadow-slate-200 active:scale-90 transition-all"
            >
              {mobileMenuOpen ? <X size={22} strokeWidth={3} /> : <Menu size={22} strokeWidth={3} />}
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE NAVIGATION: Bottom Sheet Style Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 xl:hidden">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity duration-500" onClick={() => setMobileMenuOpen(false)}></div>
            <div className="absolute top-0 right-0 w-4/5 max-w-sm h-full bg-white shadow-[-20px_0_50px_rgba(0,0,0,0.1)] p-6 animate-in slide-in-from-right duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]">
                <div className="flex justify-between items-center mb-10">
                    <div className="flex flex-col">
                        <span className="font-black text-2xl text-slate-900 tracking-tighter">ФЕРРУМ</span>
                        <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em]">Navigation</span>
                    </div>
                    <button onClick={() => setMobileMenuOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 active:rotate-90 transition-all duration-500">
                        <X size={24} />
                    </button>
                </div>
                
                <nav className="flex flex-col space-y-3">
                    {tabs.map(tab => {
                        const isAlert = (tab.path === '/shipping' && hasUrgentShipping) || 
                                        (tab.path === '/supply' && hasSupplyAlert);
                        
                        return (
                            <NavLink
                                key={tab.path}
                                to={tab.path}
                                end={tab.path === '/'}
                                onClick={() => setMobileMenuOpen(false)}
                                className={({ isActive }) =>
                                `flex items-center gap-4 px-5 py-4 text-sm font-black uppercase tracking-widest rounded-2xl transition-all duration-300
                                ${isActive 
                                    ? 'bg-slate-900 text-white shadow-2xl shadow-slate-300 scale-[1.02]' 
                                    : 'text-slate-500 hover:bg-slate-50'}`
                                }
                            >
                                <tab.icon size={20} />
                                <span>{tab.label}</span>
                                {isAlert && <span className="ml-auto w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>}
                            </NavLink>
                        );
                    })}
                </nav>

                <div className="absolute bottom-8 left-6 right-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Version</span>
                        <span className="text-xs font-bold text-slate-500 tracking-tight">1.0.0 Stable</span>
                    </div>
                    <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-orange-200">
                        <Layers size={18} />
                    </div>
                </div>
            </div>
        </div>
      )}
    </header>
  );
});

export default Header;
