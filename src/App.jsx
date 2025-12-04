import React, { useState } from 'react';
import { useProductionData } from './hooks/useProductionData';
import { useSimulation } from './hooks/useSimulation';

import Header from './components/Header';
import PlanningTab from './components/PlanningTab';
import ResourcesTab from './components/ResourcesTab';
import GanttTab from './components/GanttTab';
import ReportsTab from './components/ReportsTab';

export default function App() {
  const [activeTab, setActiveTab] = useState('planning');
  
  // 1. Подключаем данные и функции управления (теперь из Firebase)
  // Мы добавили standardOps в список того, что забираем из хука
  const { 
    resources, 
    setResources, 
    products, 
    setProducts, 
    reports, 
    setReports, 
    actions, 
    loading,
    standardOps // <--- НОВОЕ: получаем список операций из базы
  } = useProductionData();
  
  // 2. Подключаем движок расчетов (симуляцию)
  // Он пересчитывает график каждый раз, когда меняются данные
  const { ganttItems, resourceLoad } = useSimulation(products, resources);

  // 3. Функция экспорта (Бэкап)
  const exportData = () => {
    const data = { resources, products, reports, date: new Date().toISOString() };
    const fileName = `ferrum_backup_${new Date().toLocaleDateString('ru-RU')}.json`;
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
  };

  // Импорт отключен для облачной версии во избежание конфликтов ID
  const importData = () => {
      alert("В облачном режиме загрузка из файла временно недоступна. Данные загружаются автоматически с сервера.");
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
        
        {/* Вкладка Планирования */}
        {activeTab === 'planning' && (
            <PlanningTab 
                products={products} 
                resources={resources} 
                resourceLoad={resourceLoad} 
                actions={actions} 
                standardOps={standardOps} // <--- ВАЖНО: Передаем список операций в компонент
            />
        )}

        {/* Вкладка Сотрудников */}
        {activeTab === 'resources' && (
            <ResourcesTab 
                resources={resources} 
                setResources={setResources} // Передаем для работы календаря (через actions под капотом)
                actions={actions}
            />
        )}

        {/* Вкладка Графика */}
        {activeTab === 'gantt' && (
            <GanttTab ganttItems={ganttItems} />
        )}

        {/* Вкладка Отчетов */}
        {activeTab === 'reports' && (
            <ReportsTab 
                reports={reports} 
                setReports={setReports} 
                resourceLoad={resourceLoad} 
                actions={actions} // <-- Обязательно передаем actions для работы кнопок
            />
        )}
      </div>
    </div>
  );
}