import { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useProductionData } from './hooks/useProductionData';
import { useSimulation } from './hooks/useSimulation';

// --- Компоненты ---
import Header from './components/Header';
import ResourcesTab from './components/ResourcesTab';
import GanttTab from './components/GanttTab';
import ReportsTab from './components/ReportsTab';
import WorkloadTab from './components/WorkloadTab';
import PlanningTab from './components/planning/PlanningTab';
import WorkshopMode from './components/WorkshopMode';

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

export default function App() {
  const { resources, products, orders, reports, loading, actions } = useProductionData();
  const { ganttItems, globalTimeline, dailyAllocations } = useSimulation(products, resources, orders);
  const [isWorkshopMode, setIsWorkshopMode] = useState(false);
  const navigate = useNavigate();

  if (loading) {
    return <LoadingScreen />;
  }

  if (isWorkshopMode) {
    return (
      <WorkshopMode
        resources={resources}
        products={products}
        actions={actions}
        onExit={() => setIsWorkshopMode(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Header />

      {/* Кнопка входа в режим цеха */}
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
                ganttItems={ganttItems}
              />
            }
          />
          <Route
            path="/workload"
            element={
              <WorkloadTab
                resources={resources}
                globalTimeline={globalTimeline}
                dailyAllocations={dailyAllocations}
              />
            }
          />
          <Route
            path="/resources"
            element={
              <ResourcesTab
                resources={resources}
                setResources={actions.setResources}
                actions={actions}
              />
            }
          />
          <Route
            path="/gantt"
            element={
              <GanttTab
                products={products}
                resources={resources}
                orders={orders}
                actions={actions}
              />
            }
          />
          <Route
            path="/reports"
            element={
              <ReportsTab
                reports={reports}
                actions={actions}
                products={products}
                orders={orders}
                resources={resources}
              />
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