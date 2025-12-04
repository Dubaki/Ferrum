import React from 'react';
import { getOpColor } from '../utils/helpers';

export default function GanttTab({ ganttItems }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 overflow-x-auto">
      <h2 className="text-xl font-bold mb-6 text-gray-800">Визуализация сроков</h2>
      <div className="min-w-[800px]">
        {ganttItems.length === 0 && <div className="text-center text-gray-400 py-10">Нет активных заказов для отображения</div>}
        
        {ganttItems.map((item) => {
            const totalDuration = item.endDate.getTime() - item.startDate.getTime();
            
            return (
              <div key={item.productId} className="mb-8 group">
                <div className="flex justify-between items-end mb-2 px-1">
                  <div className="font-bold text-gray-800 text-lg">{item.productName}</div>
                  <div className="text-sm text-gray-500 font-medium">
                     Финиш: {item.endDate.toLocaleDateString()}
                  </div>
                </div>
                
                <div className="w-full bg-gray-100 h-10 rounded-full flex overflow-hidden relative shadow-inner">
                  {item.segments.map((seg, idx) => {
                      const segDuration = seg.endDate.getTime() - seg.startDate.getTime();
                      const widthPercent = Math.max((segDuration / totalDuration) * 100, 1);
                      
                      return (
                        <div 
                          key={seg.opId}
                          className={`${getOpColor(idx)} h-full flex flex-col justify-center items-center text-white text-xs border-r border-white/20 first:pl-2 last:pr-2 transition-all hover:brightness-110 relative group/seg`}
                          style={{ width: `${widthPercent}%`, minWidth: '40px' }}
                        >
                          <span className="font-bold truncate px-1 max-w-full">{seg.name}</span>
                          
                          <div className="absolute bottom-full mb-2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover/seg:opacity-100 transition whitespace-nowrap z-10 pointer-events-none">
                              {seg.name}: {seg.days} дн. ({seg.resourceNames})
                          </div>
                        </div>
                      );
                  })}
                </div>
                
                <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
                    <span>{item.startDate.toLocaleDateString()}</span>
                    <span>{Math.ceil(totalDuration / (1000 * 60 * 60 * 24))} дн. в работе</span>
                </div>
              </div>
            );
        })}
      </div>
    </div>
  );
}