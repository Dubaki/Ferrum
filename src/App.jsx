import React, { useState } from 'react';
import { useProductionData } from './hooks/useProductionData';
import { useSimulation } from './hooks/useSimulation';

import Header from './components/Header';
import PlanningTab from './components/PlanningTab';
import ResourcesTab from './components/ResourcesTab';
import GanttTab from './components/GanttTab';
import WorkloadTab from './components/WorkloadTab'; 
import ReportsTab from './components/ReportsTab';

export default function App() {
  const [activeTab, setActiveTab] = useState('orders'); // По умолчанию - Заказы
  
  const { 
    resources, 
    setResources, 
    products, 
    setProducts, 
    reports, 
    setReports, 
    actions, 
    loading,
    standardOps 
  } = useProductionData();
  
  // Получаем детальную загрузку
  const { ganttItems, globalTimeline } = useSimulation(products, resources);

  // Сохраняем упрощенную сводку только для Отчетов (если там используется)
  const resourceLoadSummary = {};
  resources.forEach(r => {
      let total = 0;
      if (globalTimeline[r.id]) {
          total = Object.values(globalTimeline[r.id]).reduce((a, b) => a + b, 0);
      }
      resourceLoadSummary[r.id] = {
          name: r.name,
          totalHours: total,
          maxCapacityPerDay: r.hoursPerDay
      };
  });

  const exportData = () => {
    const data = { resources, products, reports, date: new Date().toISOString() };
    const fileName = `ferrum_backup_${new Date().toLocaleDateString('ru-RU')}.json`;
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
  };

  const importData = () => {
      alert("В облачном режиме загрузка из файла временно недоступна.");
  };

  if (loading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">
              Загрузка данных из облака...
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 font-sans">
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        exportData={exportData} 
        importData={importData}
      />

      <div className="max-w-7xl mx-auto p-6">
        
        {/* Вкладка Оплаченные заказы */}
        {activeTab === 'orders' && (
            <PlanningTab 
                products={products} 
                resources={resources} 
                actions={actions} 
                standardOps={standardOps} 
            />
        )}

        {/* Вкладка Планирование (Детальная загрузка) */}
        {activeTab === 'planning' && (
            <WorkloadTab resources={resources} globalTimeline={globalTimeline} />
        )}

        {/* Остальные вкладки */}
        {activeTab === 'resources' && (
            <ResourcesTab 
                resources={resources} 
                setResources={setResources} 
                actions={actions}
            />
        )}

        {activeTab === 'gantt' && (
            <GanttTab ganttItems={ganttItems} />
        )}

        {activeTab === 'reports' && (
            <ReportsTab 
                reports={reports} 
                setReports={setReports} 
                resourceLoad={resourceLoadSummary} 
                actions={actions} 
            />
        )}
      </div>
    </div>
  );
}