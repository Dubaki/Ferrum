import { useState, useMemo, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useProductionData } from './hooks/useProductionData';

import { useSupplyRequests } from './hooks/useSupplyRequests';
import { getRoleLabel } from './utils/supplyRoles';

// --- Компоненты ---
import Header from './components/Header';
import ResourcesTab from './components/ResourcesTab';
import GanttTab from './components/GanttTab';
import ReportsTab from './components/ReportsTab';

import ShippingTab from './components/ShippingTab';
import PlanningTab from './components/planning/PlanningTab';
import ProductsTab from './components/ProductsTab';
import WorkshopMode from './components/WorkshopMode';
import SupplyTab from './components/supply/SupplyTab';
import RoleSelectionModal from './components/RoleSelectionModal';

// Компонент загрузки
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-slate-400 font-bold">Загрузка системы...</div>
      </div>
    </div>
  );
}

// Компонент "Доступ запрещён"
function AccessDenied({ navigate }) {
  return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4">🔒</div>
      <h1 className="text-2xl font-bold text-slate-600 mb-4">Доступ запрещён</h1>
      <p className="text-slate-500 mb-6">Этот раздел доступен только администраторам</p>
      <button
        onClick={() => navigate('/')}
        className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-bold"
      >
        Вернуться на главную
      </button>
    </div>
  );
}

export default function App() {
  const { resources, products, orders, reports, loading, actions } = useProductionData();

  const { requests: supplyRequests, hasSupplyAlert, actions: supplyActions } = useSupplyRequests();
  const [isWorkshopMode, setIsWorkshopMode] = useState(false);
  const [userRole, setUserRole] = useState(() => {
    // Восстанавливаем роль из localStorage при загрузке
    return localStorage.getItem('userRole') || null;
  });
  const [showRoleModal, setShowRoleModal] = useState(false);
  const isAdmin = userRole === 'director' || userRole === 'shopManager';
  const canManageDrawings = isAdmin || userRole === 'technologist';
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();

  // Обновляем время каждую минуту для проверки КТУ после 17:30
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Каждую минуту
    return () => clearInterval(interval);
  }, []);

  // Проверяем есть ли срочные отгрузки (на сегодня)
  const hasUrgentShipping = useMemo(() => {
    return orders.some(o => o.status === 'active' && o.inShipping && o.shippingToday);
  }, [orders]);

  // Проверяем требуется ли внимание мастера в разделе Цех (КТУ)
  const hasWorkshopAlert = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const excludedPositions = ['Электрик'];
    const activeResources = resources.filter(res => !res.firedAt && !excludedPositions.includes(res.position));

    // Проверяем текущее время - КТУ проверяем только после 17:30
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const isAfter1730 = currentHour > 17 || (currentHour === 17 && currentMinute >= 30);

    let notMarked = 0;
    let noKtu = 0;

    activeResources.forEach(res => {
      const override = res.scheduleOverrides?.[today];
      const reason = res.scheduleReasons?.[today];
      const dateObj = new Date(today);
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
      const isWorkDay = res.workWeekends ? true : !isWeekend;

      // Проверяем присутствие
      let isPresent = false;
      if (override !== undefined) {
        isPresent = override > 0;
      } else if (isWorkDay && reason !== 'sick' && reason !== 'absent') {
        isPresent = true;
      }

      // Неотмечен только если мастер вообще не трогал (ни override, ни reason) в рабочий день
      if (override === undefined && !reason && isWorkDay) notMarked++;

      // Проверяем КТУ только у присутствующих (исключая должности без КТУ) И только после 17:30
      const noKtuPositions = ['Стажёр', 'Мастер', 'Технолог', 'Плазморез'];
      if (isAfter1730 && isPresent && !noKtuPositions.includes(res.position)) {
        const ktu = res.dailyEfficiency?.[today];
        if (ktu === undefined || ktu === 0) noKtu++;
      }
    });

    return notMarked > 0 || noKtu > 0;
  }, [resources, currentTime]);

  const handleToggleAuth = useCallback(() => {
    if (userRole) {
      // Выход
      setUserRole(null);
      localStorage.removeItem('userRole');
    } else {
      // Показываем модальное окно выбора роли
      setShowRoleModal(true);
    }
  }, [userRole]);

  const handleSelectRole = (role) => {
    setUserRole(role);
    localStorage.setItem('userRole', role);
    setShowRoleModal(false);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (isWorkshopMode) {
    return (
      <WorkshopMode
        resources={resources}
        products={products}
        orders={orders}
        actions={actions}
        onExit={() => setIsWorkshopMode(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Header
        hasUrgentShipping={hasUrgentShipping}
        hasWorkshopAlert={hasWorkshopAlert}
        hasSupplyAlert={hasSupplyAlert}
        isAdmin={isAdmin}
        userRole={userRole}
        onToggleAuth={handleToggleAuth}
      />

      {/* Модальное окно выбора роли */}
      {showRoleModal && (
        <RoleSelectionModal
          onClose={() => setShowRoleModal(false)}
          onSelectRole={handleSelectRole}
        />
      )}

      {/* Кнопка входа в режим цеха */}
      {(isAdmin || userRole === 'master') && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => setIsWorkshopMode(true)}
            className="bg-slate-800 text-white p-4 rounded-full shadow-xl hover:bg-orange-600 transition-all hover:scale-110 active:scale-95 group border-2 border-slate-700 hover:border-orange-500"
            title="Перейти в режим цеха"
          >
            🏭
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none shadow-lg">
              Открыть режим цеха
            </span>
          </button>
        </div>
      )}

      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-6">
        <Routes>
          <Route
            path="/"
            element={
              <PlanningTab
                products={products}
                resources={resources}
                orders={orders}
                actions={actions}
                isAdmin={isAdmin}
                canManageDrawings={canManageDrawings}
                userRole={userRole} // Pass userRole here
              />
            }
          />
          <Route
            path="/products"
            element={
              isAdmin || userRole === 'technologist' || userRole === 'vesta' ? (
                <ProductsTab
                  products={products}
                  resources={resources}
                  orders={orders}
                  actions={actions}
                  isAdmin={isAdmin}
                  userRole={userRole} // Pass userRole here
                />
              ) : (
                <AccessDenied navigate={navigate} />
              )
            }
          />
          <Route
            path="/shipping"
            element={
              isAdmin || userRole === 'master' || userRole === 'technologist' || userRole === 'manager' || userRole === 'vesta' ? (
                <ShippingTab
                  orders={orders}
                  products={products}
                  actions={actions}
                  isAdmin={isAdmin}
                  userRole={userRole}
                />
              ) : (
                <AccessDenied navigate={navigate} />
              )
            }
          />
          <Route
            path="/supply"
            element={
              isAdmin || userRole === 'master' || userRole === 'technologist' || userRole === 'manager' || userRole === 'supplier' || userRole === 'vesta' ? (
                <SupplyTab
                  orders={orders}
                  supplyRequests={supplyRequests}
                  supplyActions={supplyActions}
                  userRole={userRole}
                  hasSupplyAlert={hasSupplyAlert}
                />
              ) : (
                <AccessDenied navigate={navigate} />
              )
            }
          />

          <Route
            path="/resources"
            element={
              isAdmin || userRole === 'technologist' || userRole === 'vesta' ? (
                <ResourcesTab
                  resources={resources}
                  setResources={actions.setResources}
                  actions={actions}
                  isAdmin={isAdmin}
                />
              ) : (
                <AccessDenied navigate={navigate} />
              )
            }
          />
          <Route
            path="/gantt"
            element={
              isAdmin || userRole === 'technologist' || userRole === 'master' || userRole === 'vesta' ? (
                <GanttTab
                  products={products}
                  resources={resources}
                  orders={orders}
                  actions={actions}
                  isAdmin={isAdmin}
                  userRole={userRole} // Pass userRole for more granular control if needed within GanttTab
                />
              ) : (
                <AccessDenied navigate={navigate} />
              )
            }
          />
          <Route
            path="/reports"
            element={
              isAdmin || userRole === 'vesta' ? (
                <ReportsTab
                  reports={reports}
                  actions={actions}
                  products={products}
                  orders={orders}
                  resources={resources}
                  isAdmin={isAdmin}
                />
              ) : (
                <AccessDenied navigate={navigate} />
              )
            }
          />
          {/* Fallback для несуществующих маршрутов */}
          <Route
            path="*"
            element={
              <div className="text-center py-20">
                <h1 className="text-2xl font-bold text-slate-600 mb-4">Страница не найдена</h1>
                <button
                  onClick={() => navigate('/')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Вернуться на главную
                </button>
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  );
}