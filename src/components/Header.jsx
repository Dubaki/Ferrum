import React from 'react';
import { Calendar, Users, BarChart3, FileText, Download, Upload } from 'lucide-react';

export default function Header({ activeTab, setActiveTab, exportData, importData }) {
  const tabs = [
    { id: 'planning', icon: Calendar, label: 'Планирование' },
    { id: 'resources', icon: Users, label: 'Сотрудники' },
    { id: 'gantt', icon: BarChart3, label: 'График (Гант)' },
    { id: 'reports', icon: FileText, label: 'Отчеты' },
  ];

  return (
    <div className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
           <div className="bg-blue-700 text-white p-2 rounded-lg font-bold text-xl">Fe</div>
           <div>
             <h1 className="text-xl font-bold text-gray-800">ООО "ИПП Феррум"</h1>
             <p className="text-xs text-gray-500">Система планирования производства</p>
           </div>
        </div>
        <div className="flex items-center gap-4">
           {/* Кнопки БД */}
           <div className="flex gap-2 mr-4">
              <button 
                onClick={exportData}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 transition"
              >
                  <Download size={14}/> Скачать БД
              </button>
              <label className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 transition cursor-pointer">
                  <Upload size={14}/> Загрузить БД
                  <input type="file" onChange={importData} accept=".json" className="hidden" />
              </label>
           </div>

           <div className="text-right pl-4 border-l border-gray-200">
              <div className="text-sm font-semibold text-gray-700">Сегодня</div>
              <div className="text-xs text-gray-500 capitalize">
                  {new Date().toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
           </div>
        </div>
      </div>
      
      {/* Навигация */}
      <div className="max-w-7xl mx-auto px-6 flex gap-1 mt-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition rounded-t-lg border-t border-l border-r ${
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