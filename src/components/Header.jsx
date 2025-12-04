import React from 'react';
import { Calendar, Users, BarChart3, FileText, Download, Upload, LayoutDashboard, ShoppingCart, Printer } from 'lucide-react';

export default function Header({ activeTab, setActiveTab, exportData, importData }) {
  const tabs = [
    { id: 'orders', icon: ShoppingCart, label: 'Оплаченные заказы' },
    { id: 'planning', icon: LayoutDashboard, label: 'Планирование' },
    { id: 'resources', icon: Users, label: 'Сотрудники' },
    { id: 'gantt', icon: BarChart3, label: 'График' },
    { id: 'reports', icon: FileText, label: 'Отчеты' },
  ];

  // Функция печати
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
           <div className="bg-blue-700 text-white p-2 rounded-lg font-bold text-xl">Fe</div>
           <div>
             <h1 className="text-xl font-bold text-gray-800">ИПП Феррум</h1>
             <p className="text-xs text-gray-500 no-print">Система планирования</p>
           </div>
        </div>
        
        {/* Блок кнопок: Скрываем при печати класс "no-print" */}
        <div className="flex items-center gap-4 no-print">
           <div className="flex gap-2 mr-4">
              <button 
                onClick={handlePrint} 
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 rounded border border-gray-300 transition shadow-sm"
                title="Распечатать текущую страницу"
              >
                  <Printer size={16}/> Печать
              </button>
              
              <div className="w-px h-6 bg-gray-300 mx-1"></div>

              <button onClick={exportData} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded border transition">
                  <Download size={14}/> Бэкап
              </button>
           </div>
           <div className="text-right pl-4 border-l border-gray-200 hidden sm:block">
              <div className="text-sm font-semibold text-gray-700">Сегодня</div>
              <div className="text-xs text-gray-500 capitalize">
                  {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
           </div>
        </div>
      </div>
      
      {/* Навигация: Скрываем при печати */}
      <div className="max-w-7xl mx-auto px-6 flex gap-1 mt-2 overflow-x-auto no-print">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition rounded-t-lg border-t border-l border-r whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white border-gray-200 border-b-white text-blue-600 shadow-[0_-2px_5px_rgba(0,0,0,0.02)]'
                  : 'bg-gray-50 border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              style={{marginBottom: -1}}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
      </div>
    </div>
  );
}