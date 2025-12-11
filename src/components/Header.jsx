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
    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2c2c2c] border-b-[3px] border-[#d32f2f] sticky top-0 z-40 shadow-[0_10px_20px_rgba(0,0,0,0.2)]">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        
        {/* Верхняя строка с логотипом */}
        <div className="flex justify-between items-center h-[70px]">
           <div className="flex items-center gap-3">
              {/* SVG Лошадь */}
              <svg 
                className="w-[50px] h-[50px]" 
                style={{ filter: 'brightness(0) invert(1)' }}
                viewBox="0 0 100 100" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M20 80 Q25 60, 35 55 L40 50 Q45 40, 50 45 L55 60 Q58 65, 60 60 L62 50 Q64 45, 66 50 L68 60 Q70 65, 72 60 L74 50 Q76 40, 78 50 L80 70 Q82 80, 75 82 L30 85 Z" fill="white"/>
                <path d="M40 50 L45 35 Q47 25, 50 30 L52 40 Q54 45, 52 50 Z" fill="white"/>
                <ellipse cx="48" cy="36" rx="3" ry="3" fill="#1a1a1a"/>
              </svg>
              
              <div className="flex flex-col">
                <span className="block font-black text-[32px] text-[#d32f2f] tracking-tight leading-none">ФЕРРУМ</span>
                <span className="text-[9px] font-bold text-[#666] uppercase tracking-[0.05em] mt-[2px]">ЗАВОД МЕТАЛЛОКОНСТРУКЦИЙ</span>
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
                    ? 'border-[#d32f2f] text-white bg-[rgba(211,47,47,0.15)]' 
                    : 'border-transparent text-[rgba(255,255,255,0.6)] hover:text-[rgba(255,255,255,0.9)] hover:bg-[rgba(255,255,255,0.1)]'
                  }
                `}
              >
                <tab.icon size={18} className={isActive ? "text-[#d32f2f]" : "text-[rgba(255,255,255,0.6)]"} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}