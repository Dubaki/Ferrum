import React, { useState } from 'react';
import { useProductionData } from './hooks/useProductionData';
import { useSimulation } from './hooks/useSimulation';

// --- Компоненты ---
import Header from './components/Header';
import ResourcesTab from './components/ResourcesTab';
import GanttTab from './components/GanttTab';
import ReportsTab from './components/ReportsTab';
import WorkloadTab from './components/WorkloadTab';

// ВАЖНО: Исправленный путь к компоненту заказов
import PlanningTab from './components/planning/PlanningTab';

// Режим цеха (Убедитесь, что файл WorkshopMode.jsx существует в папке components)
import WorkshopMode from './components/WorkshopMode'; 

export default function App() {
  // 1. Получаем данные и действия из Firebase
  const { 
    resources, products, orders, reports, loading, actions 
  } = useProductionData();

  // 2. Расчет симуляции (для графиков загрузки и Ганта)
  const { ganttItems, globalTimeline, dailyAllocations } = useSimulation(products, resources, orders);

  // Состояние активной вкладки
  const [activeTab, setActiveTab] = useState('orders'); // По умолчанию открываем 'Заказы'
  
  // Состояние режима цеха (Планшет)
  const [isWorkshopMode, setIsWorkshopMode] = useState(false);

  // Экран загрузки
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
             <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
             <div className="text-slate-400 font-bold">Загрузка системы...</div>
        </div>
      </div>
    );
  }

  // --- РЕЖИМ ЦЕХА (ПЛАНШЕТ) ---
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

  // --- ОБЫЧНЫЙ РЕЖИМ (ОФИС) ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      
      {/* Хедер навигации */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* Кнопка входа в режим цеха (плавающая в углу) */}
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
        
        {/* Вкладка 1: ЗАКАЗЫ */}
        {activeTab === 'orders' && (
          <PlanningTab 
            products={products} 
            resources={resources} 
            orders={orders}
            actions={actions}
            ganttItems={ganttItems} 
          />
        )}

        {/* Вкладка 2: ЗАГРУЗКА (Heatmap) */}
        {activeTab === 'planning' && (
           <WorkloadTab 
              resources={resources}
              globalTimeline={globalTimeline}
              dailyAllocations={dailyAllocations}
           />
        )}

        {/* Вкладка 3: ПЕРСОНАЛ (Смены и КТУ) */}
        {activeTab === 'resources' && (
          <ResourcesTab 
            resources={resources} 
            setResources={actions.setResources} 
            actions={actions} 
          />
        )}

        {/* Вкладка 4: ГАНТ (График производства) */}
        {activeTab === 'gantt' && (
          <GanttTab 
            products={products} 
            resources={resources} 
            orders={orders} 
            actions={actions} 
          />
        )}

        {/* Вкладка 5: ФИНАНСЫ (Отчеты и ЗП) */}
        {activeTab === 'reports' && (
           <ReportsTab 
              reports={reports} 
              actions={actions}
              products={products} 
              orders={orders} 
              resources={resources}
           />
        )}

      </main>
    </div>
  );
}