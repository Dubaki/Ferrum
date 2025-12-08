import React from 'react';
import { Calendar, Users, BarChart3, FileText, Layers } from 'lucide-react';

export default function Header({ activeTab, setActiveTab }) {
  
  const tabs = [
    { id: 'orders', label: 'Заказы', icon: Layers },
    { id: 'planning', label: 'Загрузка', icon: Calendar },
    { id: 'resources', label: 'Цех', icon: Users },
    { id: 'gantt', label: 'Гант', icon: BarChart3 },
    { id: 'reports', label: 'Финансы', icon: FileText },
  ];

  return (
    <div className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        
        {/* Верхняя строка */}
        <div className="flex justify-between items-center h-16">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-slate-500/20 border border-slate-700">
                F
              </div>
              <div>
                <span className="block font-black text-xl text-slate-800 tracking-tight leading-none uppercase">ООО "ИПП Феррум"</span>
                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">Production Management</span>
              </div>
           </div>
        </div>

        {/* Навигация */}
        <div className="flex overflow-x-auto pb-0 gap-1 no-scrollbar -mb-px">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  relative flex items-center gap-2 px-6 py-3 text-sm font-bold transition-all duration-200 border-b-2
                  ${isActive 
                    ? 'border-orange-500 text-slate-800 bg-orange-50/50' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }
                `}
              >
                <tab.icon size={18} className={isActive ? "text-orange-500" : "text-slate-400"} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}