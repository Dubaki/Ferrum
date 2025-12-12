import React from 'react';

const COL_WIDTH = 48;

function Heatmap({ calendarDays, heatmapData }) {
    
    const getColor = (percent) => {
        if (percent === 0) return 'bg-slate-50 text-slate-300';
        if (percent < 50) return 'bg-emerald-100 text-emerald-700'; 
        if (percent < 70) return 'bg-emerald-300 text-emerald-900'; 
        if (percent < 90) return 'bg-yellow-300 text-yellow-900'; 
        if (percent <= 100) return 'bg-orange-400 text-orange-900 font-black'; 
        return 'bg-red-500 text-white animate-pulse font-black shadow-lg';
    };

    return (
        <div className="flex flex-1 overflow-hidden">
            {calendarDays.map((day, i) => {
                const dateStr = day.toISOString().split('T')[0];
                const data = heatmapData[dateStr] || { percent: 0, booked: 0 };
                
                return (
                    <div 
                        key={i} 
                        className={`flex-shrink-0 border-r border-slate-200 flex flex-col items-center justify-center text-xs transition-all hover:brightness-95 cursor-help ${getColor(data.percent)}`}
                        style={{ width: COL_WIDTH }}
                        title={`Дата: ${day.toLocaleDateString('ru-RU')}\nЗагрузка: ${data.percent}%\nЗанято: ${data.booked.toFixed(1)} часов`}
                    >
                        {data.percent > 0 ? (
                            <>
                                <span className="font-black">{data.percent}%</span>
                                {data.percent > 100 && (
                                    <span className="text-[8px] font-bold opacity-80">!</span>
                                )}
                            </>
                        ) : (
                            <span className="text-[10px]">—</span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// Мемоизация для предотвращения лишних перерисовок
export default React.memo(Heatmap);