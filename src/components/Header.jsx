import React from 'react';
import { Calendar, Users, BarChart3, FileText, Download, Upload, Layers } from 'lucide-react';

export default function Header({ activeTab, setActiveTab, exportData, importData }) {
  
  const tabs = [
    { id: 'orders', label: 'Заказы', icon: Layers },
    { id: 'planning', label: 'Загрузка', icon: Calendar },
    { id: 'resources', label: 'Цех', icon: Users },
    { id: 'gantt', label: 'Гант', icon: BarChart3 },
    { id: 'reports', label: 'Отчеты', icon: FileText },
  ];

  return (
    <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-2 md:px-6">
        
        {/* Верхняя строка: Логотип и кнопки действий */}
        <div className="flex justify-between items-center h-14 md:h-16">
           <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                F
              </div>
              <span className="font-bold text-lg md:text-xl text-gray-800 tracking-tight hidden md:block">Ferrum CRM</span>
              <span className="font-bold text-lg text-gray-800 tracking-tight md:hidden">CRM</span>
           </div>

           <div className="flex gap-2">
              <button onClick={exportData} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Скачать бэкап">
                  <Download size={20} />
              </button>
              {/* Кнопка импорта скрыта на мобильном, чтобы не занимать место (редкая операция) */}
              <button onClick={importData} className="hidden md:block p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Загрузить">
                  <Upload size={20} />
              </button>
           </div>
        </div>

        {/* Нижняя строка: Навигация (Скролл на мобильном) */}
        <div className="flex overflow-x-auto pb-0.5 no-scrollbar -mx-2 md:mx-0 px-2 md:px-0 gap-1">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                  ${isActive 
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
}