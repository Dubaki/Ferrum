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
  const [activeTab, setActiveTab] = useState('orders');
  
  // Получаем данные и методы управления из Firebase хука
  const { 
    resources, setResources, 
    products, setProducts, 
    orders, setOrders,        
    reports, setReports, 
    actions, loading 
  } = useProductionData();
  
  // Запускаем симуляцию производства (Гант + Загрузка)
  const { ganttItems, globalTimeline, dailyAllocations } = useSimulation(products, resources, orders);

  // Расчет общей статистики загрузки
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

  // Функция экспорта (резервная копия данных)
  const exportData = () => {
    const data = { resources, products, orders, reports, date: new Date().toISOString() };
    const fileName = `ferrum_backup_${new Date().toLocaleDateString('ru-RU')}.json`;
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
  };

  const importData = () => {
      alert("В облачном режиме загрузка из файла временно недоступна (используйте Firebase Console).");
  };

  if (loading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium">
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

      <div className="max-w-7xl mx-auto p-2 md:p-6">
        
        {activeTab === 'orders' && (
            <PlanningTab 
                products={products} 
                resources={resources} 
                orders={orders}          
                actions={actions} 
                ganttItems={ganttItems} 
            />
        )}

        {activeTab === 'planning' && (
            <WorkloadTab 
                resources={resources} 
                globalTimeline={globalTimeline} 
                dailyAllocations={dailyAllocations} 
            />
        )}

        {activeTab === 'resources' && (
            <ResourcesTab 
                resources={resources} 
                setResources={setResources} 
                actions={actions}
            />
        )}

        {activeTab === 'gantt' && (
            <GanttTab 
                products={products} 
                resources={resources} 
                orders={orders}
                actions={actions}
            />
        )}

        {activeTab === 'reports' && (
            <ReportsTab 
                reports={reports} 
                setReports={setReports} 
                resourceLoad={resourceLoadSummary} 
                actions={actions}
                orders={orders}
                products={products}
                resources={resources}
            />
        )}
      </div>
    </div>
  );
}