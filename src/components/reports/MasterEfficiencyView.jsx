import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Shield, ShieldAlert } from 'lucide-react';
import { KtuInput } from './SharedComponents';

export default function MasterEfficiencyView({ resources, actions }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showTable, setShowTable] = useState(false);

    const shiftDate = (days) => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + days);
        setCurrentDate(d);
    };

    const dateStr = currentDate.toISOString().split('T')[0];
    const displayDate = currentDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const monthDays = Array.from({length: daysInMonth}, (_, i) => i + 1);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => shiftDate(-1)} className="p-2 rounded-full hover:bg-gray-100 border border-gray-200"><ChevronLeft size={20}/></button>
                    <div className="text-center w-40">
                         <div className="text-lg font-bold text-gray-800 capitalize leading-tight">{displayDate}</div>
                         <div className="text-xs text-gray-400">{currentDate.getFullYear()}</div>
                    </div>
                    <button onClick={() => shiftDate(1)} className="p-2 rounded-full hover:bg-gray-100 border border-gray-200"><ChevronRight size={20}/></button>
                </div>
                
                <button 
                    onClick={() => setShowTable(!showTable)}
                    className="flex items-center gap-2 text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition"
                >
                    {showTable ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                    {showTable ? 'Скрыть сводную таблицу' : 'Показать сводку за месяц'}
                </button>
            </div>

            {/* Сводная таблица (вкладка мастера) */}
            {showTable && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto animate-in fade-in slide-in-from-top-4">
                    <div className="p-4 border-b border-gray-200 bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                        КТУ за {currentDate.toLocaleDateString('ru-RU', { month: 'long' })}
                    </div>
                    <table className="w-full text-xs text-center border-collapse">
                        <thead>
                            <tr>
                                <th className="p-2 text-left sticky left-0 bg-white border-r border-b border-gray-200 min-w-[120px]">Сотрудник</th>
                                {monthDays.map(d => (
                                    <th key={d} className={`p-1 border-b border-gray-100 min-w-[30px] ${d === currentDate.getDate() ? 'bg-blue-100 text-blue-700' : ''}`}>{d}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {resources.map(res => (
                                <tr key={res.id} className="hover:bg-gray-50">
                                    <td className="p-2 text-left sticky left-0 bg-white border-r border-gray-200 font-medium truncate">{res.name}</td>
                                    {monthDays.map(d => {
                                        const dStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                                        const val = res.dailyEfficiency?.[dStr];
                                        return (
                                            <td key={d} className={`border-r border-gray-100 ${d === currentDate.getDate() ? 'bg-blue-50' : ''}`}>
                                                {val > 0 ? <span className="font-bold text-gray-700">{val}</span> : <span className="text-gray-200">·</span>}
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="grid gap-3">
                {resources.map(res => {
                    const currentEff = (res.dailyEfficiency && res.dailyEfficiency[dateStr]) || 0;
                    const isSafetyViolated = res.safetyViolations && res.safetyViolations[dateStr];
                    const isKtuDisabled = res.ktuEligible === false; 

                    return (
                        <div key={res.id} className={`bg-white p-4 rounded-xl border transition flex items-center justify-between
                             ${isSafetyViolated ? 'border-red-300 bg-red-50/30' : 'border-gray-200 shadow-sm'}
                        `}>
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                                    ${isSafetyViolated ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}
                                `}>
                                    {isSafetyViolated ? <ShieldAlert size={20}/> : res.name.charAt(0)}
                                </div>
                                <div>
                                    <div className="font-bold text-gray-800 text-base">{res.name}</div>
                                    <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                                        {isKtuDisabled ? 'КТУ не предусмотрен' : 'Коэффициент участия'}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-6">
                                <button 
                                    onClick={() => {
                                        const currentViolations = res.safetyViolations || {};
                                        const newViolations = { ...currentViolations, [dateStr]: !isSafetyViolated };
                                        actions.updateResource(res.id, 'safetyViolations', newViolations);
                                    }}
                                    className={`flex flex-col items-center gap-1 transition ${isSafetyViolated ? 'text-red-600 opacity-100' : 'text-gray-300 hover:text-gray-400'}`}
                                    title="Нарушение техники безопасности (Аннулирует бонус 22%)"
                                >
                                    <Shield size={24} fill={isSafetyViolated ? "currentColor" : "none"} />
                                    <span className="text-[9px] font-bold uppercase">{isSafetyViolated ? 'Нарушение!' : 'ТБ Соблюдено'}</span>
                                </button>

                                <div className={`flex items-center gap-2 ${isKtuDisabled ? 'opacity-30 pointer-events-none' : ''}`}>
                                    <KtuInput 
                                        resId={res.id} 
                                        date={dateStr} 
                                        initialValue={currentEff} 
                                        onSave={actions.updateResourceEfficiency} 
                                    />
                                    <span className="text-gray-400 font-bold">%</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}