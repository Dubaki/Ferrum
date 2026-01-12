import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Calendar, Thermometer, MinusCircle, HelpCircle } from 'lucide-react';

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
    let ktuSum = 0; let ktuCount = 0;

    const data = days.map(day => {
        const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const dateObj = new Date(dateStr);
        const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
        
        // Читаем данные
        const override = resource.scheduleOverrides?.[dateStr];
        const reason = resource.scheduleReasons?.[dateStr]; // Причина отсутствия
        const standardHours = resource.hoursPerDay || 8;
        const isStandardWorkDay = resource.workWeekends ? true : !isWeekend;
        
        let workedHours = 0;
        if (override !== undefined) workedHours = override;
        else if (isStandardWorkDay) workedHours = standardHours;
        
        const worked = workedHours > 0;

        // Ставка
        const history = resource.rateHistory || [];
        const sortedHistory = [...history].sort((a,b) => new Date(a.date) - new Date(b.date));
        const applicableRateEntry = sortedHistory.reverse().find(h => new Date(h.date) <= dateObj);
        const currentRate = applicableRateEntry ? parseFloat(applicableRateEntry.rate) : (parseFloat(resource.baseRate) || 0);

        const hourlyRate = currentRate / standardHours;
        let basePay = 0, tbBonus = 0, ktuBonus = 0;

        const probationEnd = new Date(resource.employmentDate);
        probationEnd.setDate(probationEnd.getDate() + 7);
        const violation = resource.safetyViolations?.[dateStr];
        const ktu = (resource.dailyEfficiency?.[dateStr]) || 0;

        // --- ЛОГИКА СТАТУСА (ИКОНКИ) ---
        let statusContent = null;

        if (worked) {
            statusContent = <span className="font-bold text-slate-700">{workedHours}</span>;
            basePay = hourlyRate * workedHours;

            // Позиции без ТБ и КТУ
            const noKtuPositions = ['Стажёр', 'Мастер', 'Технолог', 'Плазморез'];
            const noTbPositions = ['Стажёр', 'Мастер', 'Технолог', 'Плазморез'];

            const hasKtu = !noKtuPositions.includes(resource.position);
            const hasTb = !noTbPositions.includes(resource.position);

            if (hasTb && dateObj > probationEnd && !violation) tbBonus = basePay * 0.22;
            if (hasKtu) {
                ktuBonus = basePay * (ktu / 100);
                ktuSum += ktu;
                ktuCount++;
            }
        } else {
            // Если не работал - проверяем причину
            if (reason === 'sick') {
                statusContent = (
                    <div className="flex justify-center cursor-help" title="Болел">
                        <Thermometer size={14} className="text-red-500"/>
                    </div>
                );
            } else if (reason === 'absent') {
                statusContent = (
                    <div className="flex justify-center cursor-help" title="Прогул / Отгул">
                        <MinusCircle size={14} className="text-slate-400"/>
                    </div>
                );
            } else if (override === 0) {
                // Если просто стоит 0 без причины (ручной выходной)
                statusContent = <span className="text-slate-300 text-[10px]">-</span>;
            } else {
                // Стандартный выходной
                statusContent = ""; 
            }
        }

        return {
            day, weekday: dateObj.toLocaleDateString('ru-RU', {weekday: 'short'}),
            isWeekend, worked, statusContent, violation,
            basePay, tbBonus, ktuBonus,
            total: basePay + tbBonus + ktuBonus,
            ktuPercent: ktu
        };
    });

    const totalBase = data.reduce((acc, d) => acc + d.basePay, 0);
    const totalTb = data.reduce((acc, d) => acc + d.tbBonus, 0);
    const totalKtu = data.reduce((acc, d) => acc + d.ktuBonus, 0);

    // Месячные премии для определенных должностей
    let monthlyBonus = 0;
    if (resource.position === 'Мастер') monthlyBonus = 30000;
    else if (resource.position === 'Технолог') monthlyBonus = 20000;

    const totalMonth = totalBase + totalTb + totalKtu + monthlyBonus;
    const avgKtu = ktuCount > 0 ? Math.round(ktuSum / ktuCount) : 0;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[98vw] flex flex-col ring-1 ring-white/20 relative max-h-[90vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                
                {/* Шапка */}
                <div className="bg-slate-900 text-white p-4 rounded-t-3xl flex justify-between items-center shadow-lg z-20 shrink-0">
                     <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center font-bold shadow-lg shadow-indigo-500/50">{resource.name.charAt(0)}</div>
                         <div><h3 className="font-bold text-lg leading-tight">{resource.name}</h3><p className="text-[10px] text-indigo-200 font-medium uppercase">Расчетный лист</p></div>
                     </div>
                     <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition"><X size={20}/></button>
                </div>

                <div className="flex items-center justify-between bg-white px-4 py-3 border-b border-slate-100 shrink-0">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-50 rounded-lg border border-slate-200 text-slate-500"><ChevronLeft size={20}/></button>
                    <div className="flex items-center gap-2 font-bold text-slate-800 capitalize bg-slate-50 px-4 py-1 rounded-lg border border-slate-100"><Calendar size={16} className="text-indigo-500"/> {monthName}</div>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-50 rounded-lg border border-slate-200 text-slate-500"><ChevronRight size={20}/></button>
                </div>
                
                {/* ТАБЛИЦА */}
                <div className="overflow-x-auto custom-scrollbar bg-slate-50/50 p-2 rounded-b-3xl flex-1">
                    <table className="w-full text-xs sm:text-[10px] border-collapse text-center whitespace-nowrap bg-white shadow-sm rounded-xl overflow-hidden">
                        <thead className="bg-slate-100">
                            <tr>
                                <th className="p-2 sm:p-2 border-b border-r border-slate-200 bg-slate-100 min-w-[80px] sm:min-w-[96px] text-left font-bold text-slate-500 uppercase tracking-wider sticky left-0 z-10 shadow-[2px_0_4px_rgba(0,0,0,0.05)]">Параметр</th>
                                {data.map(d => (<th key={d.day} className={`p-2 sm:p-1 border-b border-r border-slate-200 min-w-[48px] sm:min-w-[40px] ${d.isWeekend ? 'bg-rose-50/50' : ''}`}><div className={`font-bold text-sm sm:text-xs ${d.isWeekend ? 'text-rose-500' : 'text-slate-700'}`}>{d.day}</div><div className={`text-[9px] sm:text-[8px] uppercase font-bold ${d.isWeekend ? 'text-rose-300' : 'text-slate-400'}`}>{d.weekday}</div></th>))}
                                <th className="p-2 sm:p-2 border-b border-l border-slate-200 bg-slate-100 font-bold min-w-[70px] sm:min-w-[80px] text-slate-700 text-xs sm:text-[10px]">ИТОГО</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            <tr className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-2 sm:p-2 border-b border-r border-slate-100 bg-white sticky left-0 z-10 font-bold text-left text-slate-700 text-xs sm:text-[10px] shadow-[2px_0_4px_rgba(0,0,0,0.05)]">Часы / Причина</td>
                                {data.map(d => (<td key={d.day} className={`p-2 sm:p-1 border-b border-r border-slate-100 ${d.isWeekend ? 'bg-rose-50/20' : ''}`}>{d.statusContent}</td>))}
                                <td className="p-2 sm:p-2 border-b border-l border-slate-200 bg-slate-50 font-bold text-slate-800 text-xs sm:text-[10px]">-</td>
                            </tr>

                            <tr className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-2 sm:p-2 border-b border-r border-slate-100 bg-white sticky left-0 z-10 font-bold text-left text-slate-700 text-xs sm:text-[10px] shadow-[2px_0_4px_rgba(0,0,0,0.05)]">Оклад</td>
                                {data.map(d => (<td key={d.day} className={`p-2 sm:p-1 border-b border-r border-slate-100 text-slate-600 font-medium ${d.isWeekend ? 'bg-rose-50/20' : ''}`}>{d.basePay > 0 ? Math.round(d.basePay) : ''}</td>))}
                                <td className="p-2 sm:p-2 border-b border-l border-slate-200 bg-slate-50 font-bold text-slate-800 text-xs sm:text-[10px]">{Math.round(totalBase)}</td>
                            </tr>

                            <tr className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-2 sm:p-2 border-b border-r border-slate-100 bg-white sticky left-0 z-10 font-bold text-left text-slate-700 text-xs sm:text-[10px] shadow-[2px_0_4px_rgba(0,0,0,0.05)]">ТБ (22%)</td>
                                {data.map(d => {
                                    if(d.violation) return (
                                        <td key={d.day}
                                            className="p-2 sm:p-1 border-b border-r border-slate-100 bg-red-100 cursor-help relative group"
                                            title={d.violation.comment}
                                            onClick={() => alert(d.violation.comment)}
                                        >
                                            <div className="text-[9px] sm:text-[8px] font-bold text-red-600">НЕТ</div>
                                        </td>
                                    );
                                    return <td key={d.day} className={`p-2 sm:p-1 border-b border-r border-slate-100 text-emerald-600 font-medium ${d.isWeekend ? 'bg-rose-50/20' : ''}`}>{d.tbBonus > 0 ? Math.round(d.tbBonus) : ''}</td>
                                })}
                                <td className="p-2 sm:p-2 border-b border-l border-slate-200 bg-slate-50 font-bold text-emerald-600 text-xs sm:text-[10px]">+{Math.round(totalTb)}</td>
                            </tr>

                            <tr className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-2 sm:p-2 border-b border-r border-slate-100 bg-white sticky left-0 z-10 font-bold text-left text-slate-700 text-xs sm:text-[10px] shadow-[2px_0_4px_rgba(0,0,0,0.05)]">КТУ</td>
                                {data.map(d => (<td key={d.day} className={`p-2 sm:p-1 border-b border-r border-slate-100 ${d.isWeekend ? 'bg-rose-50/20' : ''}`}>{d.ktuBonus > 0 && <span className="text-indigo-600 font-bold">{Math.round(d.ktuBonus)}</span>}</td>))}
                                <td className="p-2 sm:p-2 border-b border-l border-slate-200 bg-slate-50 font-bold text-indigo-600 flex flex-col items-end text-xs sm:text-[10px]"><span>+{Math.round(totalKtu)}</span><span className="text-[9px] sm:text-[8px] text-slate-400">ср. {avgKtu}%</span></td>
                            </tr>

                            {monthlyBonus > 0 && (
                                <tr className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-2 sm:p-2 border-b border-r border-slate-100 bg-white sticky left-0 z-10 font-bold text-left text-slate-700 text-xs sm:text-[10px] shadow-[2px_0_4px_rgba(0,0,0,0.05)]">Премия</td>
                                    {data.map(d => (<td key={d.day} className={`p-2 sm:p-1 border-b border-r border-slate-100 ${d.isWeekend ? 'bg-rose-50/20' : ''}`}></td>))}
                                    <td className="p-2 sm:p-2 border-b border-l border-slate-200 bg-slate-50 font-bold text-orange-600 text-xs sm:text-[10px]">+{Math.round(monthlyBonus).toLocaleString()}</td>
                                </tr>
                            )}

                            <tr className="bg-slate-900 text-white">
                                <td className="p-2 sm:p-2 border-r border-slate-700 bg-slate-900 sticky left-0 z-10 font-bold text-left text-xs sm:text-[10px] shadow-[4px_0_24px_-2px_rgba(0,0,0,0.5)]">СУММА</td>
                                {data.map(d => (<td key={d.day} className="p-2 sm:p-1 border-r border-slate-800 font-bold">{d.total > 0 ? Math.round(d.total) : ''}</td>))}
                                <td className="p-2 sm:p-2 border-l border-slate-700 bg-slate-800 font-bold text-sm sm:text-xs text-emerald-400">{Math.round(totalMonth).toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    , document.body);
}