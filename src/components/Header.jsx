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

const Header = memo(({ hasUrgentShipping, hasWorkshopAlert, hasSupplyAlert, userRole, onToggleAuth }) => {
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
                    (tab.path === '/supply' && hasSupplyAlert) || 
                    (tab.path === '/resources' && hasWorkshopAlert);

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
    <header className="bg-white border-b border-neutral-200/75 sticky top-0 z-40 shadow-sm">
      <div className="max-w-screen-2xl mx-auto px-4">
        <div className="flex justify-between items-center h-14">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2 shrink-0">
            <img
              src="/pic/cropped-logo.png.webp"
              alt="Феррум"
              className="w-8 h-8 object-contain"
            />
            <span className="font-extrabold text-xl text-primary-600 tracking-tight">ФЕРРУМ</span>
          </NavLink>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1.5 flex-1 justify-center mx-4">
            {tabs.map(tab => renderTab(tab))}
          </nav>

          {/* Right Group: Auth & Mobile Menu */}
          <div className="flex items-center gap-2 shrink-0">
            {roleLabel && (
              <span className="hidden lg:inline-block text-xs font-medium text-success-700 bg-success-50 px-2.5 py-1 rounded-full">
                {roleLabel}
              </span>
            )}
            <button
              onClick={onToggleAuth}
              className={`p-2 rounded-full transition-colors ${userRole ? 'text-success-500 hover:bg-success-50' : 'text-neutral-400 hover:bg-neutral-100'}`}
              title={userRole ? `Выйти (${roleLabel})` : "Войти"}
            >
              {userRole ? <Unlock size={20} /> : <Lock size={20} />}
            </button>
            
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-neutral-500 hover:bg-neutral-100 rounded-full transition"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-neutral-200/75 shadow-lg">
          <nav className="flex flex-col p-2 space-y-1">
            {tabs.map(tab => renderTab(tab, true))}
          </nav>
        </div>
      )}
    </header>
  );
});

export default Header;
