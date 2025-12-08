import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

export default function SalaryMatrixModal({ resource, initialDate, onClose }) {
    const [viewDate, setViewDate] = useState(new Date(initialDate));

    const changeMonth = (delta) => {
        const d = new Date(viewDate);
        d.setMonth(d.getMonth() + delta);
        setViewDate(d);
    };

    const monthName = viewDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    const days = Array.from({length: daysInMonth}, (_, i) => i + 1);

    // Подготовка данных
    const data = days.map(day => {
        const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const dateObj = new Date(dateStr);
        const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
        const override = resource.scheduleOverrides?.[dateStr];
        const worked = override !== undefined ? override > 0 : !isWeekend;

        const baseRate = parseFloat(resource.baseRate) || 0;
        let basePay = 0, tbBonus = 0, ktuBonus = 0;
        const probationEnd = new Date(resource.employmentDate);
        probationEnd.setDate(probationEnd.getDate() + 7);
        const isViolated = resource.safetyViolations?.[dateStr];
        const ktu = (resource.dailyEfficiency?.[dateStr]) || 0;

        let statusSymbol = worked ? "✓" : "";
        if (override === 0) statusSymbol = "✗"; // Б/О
        if (!worked && !override) statusSymbol = ""; // Выходной

        if (worked) {
            basePay = baseRate;
            if (dateObj > probationEnd && !isViolated) tbBonus = baseRate * 0.22;
            ktuBonus = baseRate * (ktu / 100);
        }

        return {
            day, weekday: dateObj.toLocaleDateString('ru-RU', {weekday: 'short'}),
            isWeekend, worked, statusSymbol, isViolated,
            basePay, tbBonus, ktuBonus,
            total: basePay + tbBonus + ktuBonus,
            ktuPercent: ktu
        };
    });

    const totalBase = data.reduce((acc, d) => acc + d.basePay, 0);
    const totalTb = data.reduce((acc, d) => acc + d.tbBonus, 0);
    const totalKtu = data.reduce((acc, d) => acc + d.ktuBonus, 0);
    const totalMonth = totalBase + totalTb + totalKtu;

    return (
        // 1. Изменено: items-start и pt-10 поднимают окно наверх. h-auto позволяет ему растягиваться.
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-900/60 backdrop-blur-sm pt-10 pb-10 px-4 animate-in fade-in duration-200 overflow-y-auto">
            
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[98vw] flex flex-col ring-1 ring-white/20 relative">
                
                {/* Шапка Модалки */}
                <div className="bg-slate-900 text-white p-4 rounded-t-3xl flex justify-between items-center shadow-lg z-20">
                     <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center font-bold shadow-lg shadow-indigo-500/50">
                             {resource.name.charAt(0)}
                         </div>
                         <div>
                             <h3 className="font-bold text-lg leading-tight">{resource.name}</h3>
                             <p className="text-[10px] text-indigo-200 font-medium tracking-wide uppercase">Расчетный лист</p>
                         </div>
                     </div>
                     <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition"><X size={20}/></button>
                </div>

                {/* Навигация */}
                <div className="flex items-center justify-between bg-white px-4 py-3 border-b border-slate-100">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-50 rounded-lg border border-slate-200 text-slate-500 transition"><ChevronLeft size={20}/></button>
                    <div className="flex items-center gap-2 font-bold text-slate-800 capitalize bg-slate-50 px-4 py-1 rounded-lg border border-slate-100">
                        <Calendar size={16} className="text-indigo-500"/> {monthName}
                    </div>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-50 rounded-lg border border-slate-200 text-slate-500 transition"><ChevronRight size={20}/></button>
                </div>
                
                {/* ТАБЛИЦА */}
                <div className="overflow-x-auto custom-scrollbar bg-slate-50/50 p-2 rounded-b-3xl">
                    <table className="w-full text-xs border-collapse text-center whitespace-nowrap bg-white shadow-sm rounded-xl overflow-hidden">
                        <thead className="bg-slate-100">
                            <tr>
                                {/* Уменьшены отступы (p-2) для компактности */}
                                <th className="p-2 border-b border-r border-slate-200 bg-slate-100 min-w-[100px] text-left font-bold text-slate-500 uppercase tracking-wider sticky left-0 z-10">
                                    Параметр
                                </th>
                                {data.map(d => (
                                    <th key={d.day} className={`p-1 border-b border-r border-slate-200 min-w-[32px] ${d.isWeekend ? 'bg-rose-50/50' : ''}`}>
                                        <div className={`text-sm font-bold ${d.isWeekend ? 'text-rose-500' : 'text-slate-700'}`}>{d.day}</div>
                                        <div className={`text-[9px] uppercase font-bold ${d.isWeekend ? 'text-rose-300' : 'text-slate-400'}`}>{d.weekday}</div>
                                    </th>
                                ))}
                                <th className="p-2 border-b border-l border-slate-200 bg-slate-100 font-bold min-w-[80px] text-slate-700">ИТОГО</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Строка 1: Статус */}
                            <tr className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-2 border-b border-r border-slate-100 bg-white sticky left-0 z-10 font-bold text-left text-slate-700 shadow-[4px_0_24px_-2px_rgba(0,0,0,0.05)]">
                                    Присутствие
                                </td>
                                {data.map(d => (
                                    <td key={d.day} className={`p-1 border-b border-r border-slate-100 ${d.isWeekend ? 'bg-rose-50/20' : ''}`}>
                                        {d.statusSymbol === '✓' ? (
                                            <div className="w-2 h-2 bg-emerald-500 rounded-full mx-auto shadow-sm shadow-emerald-200"></div>
                                        ) : (
                                            <span className="text-[10px] font-bold text-slate-300">{d.statusSymbol}</span>
                                        )}
                                    </td>
                                ))}
                                <td className="p-2 border-b border-l border-slate-200 bg-slate-50 font-bold text-slate-400">-</td>
                            </tr>

                            {/* Строка 2: Оклад */}
                            <tr className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-2 border-b border-r border-slate-100 bg-white sticky left-0 z-10 font-bold text-left text-slate-700 shadow-[4px_0_24px_-2px_rgba(0,0,0,0.05)]">
                                    Оклад
                                </td>
                                {data.map(d => (
                                    <td key={d.day} className={`p-1 border-b border-r border-slate-100 text-slate-600 font-medium ${d.isWeekend ? 'bg-rose-50/20' : ''}`}>
                                        {d.basePay > 0 ? Math.round(d.basePay) : ''}
                                    </td>
                                ))}
                                <td className="p-2 border-b border-l border-slate-200 bg-slate-50 font-bold text-slate-800">{Math.round(totalBase)}</td>
                            </tr>

                            {/* Строка 3: ТБ */}
                            <tr className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-2 border-b border-r border-slate-100 bg-white sticky left-0 z-10 font-bold text-left text-slate-700 shadow-[4px_0_24px_-2px_rgba(0,0,0,0.05)]">
                                    Бонус ТБ
                                </td>
                                {data.map(d => {
                                    if(d.isViolated) return <td key={d.day} className="border-b border-r border-slate-100 bg-rose-100"><div className="text-[8px] font-bold text-rose-600">НАРУШ.</div></td>;
                                    return (
                                        <td key={d.day} className={`p-1 border-b border-r border-slate-100 text-emerald-600 font-medium ${d.isWeekend ? 'bg-rose-50/20' : ''}`}>
                                            {d.tbBonus > 0 ? Math.round(d.tbBonus) : ''}
                                        </td>
                                    );
                                })}
                                <td className="p-2 border-b border-l border-slate-200 bg-slate-50 font-bold text-emerald-600">+{Math.round(totalTb)}</td>
                            </tr>

                            {/* Строка 4: КТУ (Улучшена видимость) */}
                            <tr className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-2 border-b border-r border-slate-100 bg-white sticky left-0 z-10 font-bold text-left text-slate-700 shadow-[4px_0_24px_-2px_rgba(0,0,0,0.05)]">
                                    КТУ
                                </td>
                                {data.map(d => (
                                    <td key={d.day} className={`p-1 border-b border-r border-slate-100 ${d.isWeekend ? 'bg-rose-50/20' : ''}`}>
                                        {d.ktuBonus > 0 && (
                                            <div className="flex flex-col items-center">
                                                <span className="text-indigo-600 font-bold">{Math.round(d.ktuBonus)}</span>
                                                {/* 3. Изменено: Яркий стиль для процентов */}
                                                <span className="text-[9px] text-indigo-700 bg-indigo-100 px-1 rounded font-bold mt-0.5">{d.ktuPercent}%</span>
                                            </div>
                                        )}
                                    </td>
                                ))}
                                <td className="p-2 border-b border-l border-slate-200 bg-slate-50 font-bold text-indigo-600">+{Math.round(totalKtu)}</td>
                            </tr>

                            {/* Строка 5: ИТОГО */}
                            <tr className="bg-slate-900 text-white">
                                <td className="p-2 border-r border-slate-700 bg-slate-900 sticky left-0 z-10 font-bold text-left shadow-[4px_0_24px_-2px_rgba(0,0,0,0.5)]">
                                    СУММА
                                </td>
                                {data.map(d => (
                                    <td key={d.day} className="p-1 border-r border-slate-800 font-bold text-emerald-300">
                                        {d.total > 0 ? Math.round(d.total) : ''}
                                    </td>
                                ))}
                                <td className="p-2 border-l border-slate-700 bg-slate-800 font-bold text-sm text-emerald-400">
                                    {Math.round(totalMonth).toLocaleString()}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}