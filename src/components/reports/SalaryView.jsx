import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, DollarSign, TrendingUp, AlertCircle, FileText } from 'lucide-react';
// ИСПРАВЛЕННЫЙ ИМПОРТ (одна точка = текущая папка)
import SalaryMatrixModal from './SalaryMatrixModal';

export default function SalaryView({ resources, actions }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedResource, setSelectedResource] = useState(null);

    const changeMonth = (delta) => {
        const d = new Date(currentDate);
        d.setMonth(d.getMonth() + delta);
        setCurrentDate(d);
    };

    const monthName = currentDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const monthDays = Array.from({length: daysInMonth}, (_, i) => i + 1);

    // --- ЛОГИКА РАСЧЕТА ---
    const payrollData = useMemo(() => {
        // Фильтруем:
        // 1. Уволенных (показываем только если уволен ПОЗЖЕ текущего месяца или работает)
        // 2. Сотрудников с отключенной зарплатой (salaryEnabled === false)
        return resources.filter(r => {
            // Проверка увольнения
            const notFired = r.status !== 'fired' || (r.firedAt && new Date(r.firedAt) > currentDate);
            // Проверка включенного расчета зарплаты (по умолчанию true)
            const salaryEnabled = r.salaryEnabled !== false;
            return notFired && salaryEnabled;
        }).map(res => {
            let totalBase = 0;
            let totalTb = 0;
            let totalKtu = 0;
            let hoursWorked = 0;

            // Используем probationEndDate если есть, иначе рассчитываем автоматически
            let probationEnd;
            if (res.probationEndDate) {
                probationEnd = new Date(res.probationEndDate);
            } else if (res.employmentDate) {
                probationEnd = new Date(res.employmentDate);
                // Плазморез - 30 дней, остальные - 7 дней
                const probationDays = res.position === 'Плазморез' ? 30 : 7;
                probationEnd.setDate(probationEnd.getDate() + probationDays);
            } else {
                probationEnd = new Date(0); // Очень давно = ТБ всегда начисляется
            }

            const standardHours = parseFloat(res.hoursPerDay) || 8;

            monthDays.forEach(day => {
                const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                const dateObj = new Date(dateStr + 'T00:00:00');
                const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

                // 1. Часы (Приоритет: Переопределение -> График -> 0)
                const override = res.scheduleOverrides?.[dateStr];
                const isWorkDay = res.workWeekends ? true : !isWeekend;

                let dailyHours = 0;

                // КРИТИЧЕСКАЯ ПРОВЕРКА: Если день ДО даты трудоустройства - часы ВСЕГДА 0
                if (res.employmentDate && dateStr < res.employmentDate) {
                    dailyHours = 0; // Сотрудник еще не работал - часы = 0
                } else {
                    // Только если сотрудник уже работал - берём часы
                    if (override !== undefined) dailyHours = override;
                    else if (isWorkDay) dailyHours = standardHours;
                }

                if (dailyHours > 0) {
                    hoursWorked += dailyHours;

                    // 2. Ставка (Ищем актуальную на этот день в истории)
                    const history = res.rateHistory || [];
                    const sortedHistory = [...history].sort((a,b) => new Date(a.date) - new Date(b.date));
                    // Берем последнюю запись, дата которой меньше или равна текущему дню
                    const applicableRateEntry = sortedHistory.reverse().find(h => new Date(h.date) <= dateObj);
                    const currentRate = applicableRateEntry ? parseFloat(applicableRateEntry.rate) : (parseFloat(res.baseRate) || 0);

                    // ПРАВИЛЬНАЯ ЛОГИКА: baseRate - дневная ставка за 8 часов
                    // Пример: ставка 4000, работал 10 часов → 4000/8 = 500 руб/час → 500*10 = 5000 за смену
                    const hourlyRate = currentRate / 8;
                    const dailyBase = hourlyRate * dailyHours;

                    // 3. Бонусы (только после окончания испытательного срока)
                    const violation = res.safetyViolations?.[dateStr];
                    const ktuPercent = (res.dailyEfficiency?.[dateStr]) || 0;
                    const isProbationPassed = dateObj > probationEnd;

                    // ТБ (22%) - если прошел исп. срок и нет нарушений в этот день
                    let dailyTb = 0;
                    if (isProbationPassed && !violation) {
                        dailyTb = dailyBase * 0.22;
                    }

                    // КТУ (процент от базы) - только если прошел исп. срок
                    let dailyKtu = 0;
                    if (isProbationPassed) {
                        dailyKtu = dailyBase * (ktuPercent / 100);
                    }

                    totalBase += dailyBase;
                    totalTb += dailyTb;
                    totalKtu += dailyKtu;
                }
            });

            return {
                ...res,
                hoursWorked,
                totalBase,
                totalTb,
                totalKtu,
                totalSum: totalBase + totalTb + totalKtu
            };
        }).sort((a,b) => b.totalSum - a.totalSum); // Сортируем по зарплате (богатые сверху)
    }, [resources, currentDate]);

    // Итоговые суммы по цеху
    const totalPayroll = payrollData.reduce((sum, r) => sum + r.totalSum, 0);
    const totalHours = payrollData.reduce((sum, r) => sum + r.hoursWorked, 0);

    return (
        <div className="space-y-6 fade-in">
            {/* Хедер с навигацией и KPI */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                
                {/* 1. Навигация по месяцам */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                    <div className="flex justify-between items-center bg-slate-50 rounded-xl p-1 mb-2">
                        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white rounded-lg shadow-sm transition text-slate-500"><ChevronLeft size={20}/></button>
                        <div className="font-bold text-slate-800 capitalize flex items-center gap-2 select-none">
                            <Calendar size={18} className="text-orange-500"/>
                            {monthName}
                        </div>
                        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white rounded-lg shadow-sm transition text-slate-500"><ChevronRight size={20}/></button>
                    </div>
                    <div className="text-center text-xs text-slate-400 font-bold uppercase tracking-wider">
                        Расчетный период
                    </div>
                </div>

                {/* 2. Общий ФОТ (Фонд Оплаты Труда) */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-2xl shadow-lg text-white flex flex-col justify-between relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                            <DollarSign size={14} className="text-emerald-400"/> Итого ФОТ
                        </div>
                        <div className="text-3xl font-black tracking-tight">
                            {Math.round(totalPayroll).toLocaleString()} ₽
                        </div>
                    </div>
                    <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-500">
                        <DollarSign size={100} />
                    </div>
                </div>

                {/* 3. Отработанные часы */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                     <div>
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                            <TrendingUp size={14} className="text-blue-500"/> Отработано часов
                        </div>
                        <div className="text-3xl font-black text-slate-800 tracking-tight">
                            {Math.round(totalHours).toLocaleString()} ч
                        </div>
                    </div>
                    <div className="text-xs text-slate-400 mt-2">
                        В среднем {(payrollData.length > 0 ? totalHours / payrollData.length : 0).toFixed(0)} ч/чел
                    </div>
                </div>
            </div>

            {/* Таблица сотрудников */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b border-slate-200">
                            <tr>
                                <th className="p-4">Сотрудник</th>
                                <th className="p-4 text-center">Ставка</th>
                                <th className="p-4 text-center">Часы</th>
                                <th className="p-4 text-right text-slate-400">Оклад</th>
                                <th className="p-4 text-right text-emerald-600">ТБ (+22%)</th>
                                <th className="p-4 text-right text-indigo-600">КТУ</th>
                                <th className="p-4 text-right font-black text-slate-800">ИТОГО</th>
                                <th className="p-4 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {payrollData.map((row) => (
                                <tr 
                                    key={row.id} 
                                    onClick={() => setSelectedResource(row)}
                                    className="hover:bg-orange-50/50 transition-colors cursor-pointer group"
                                >
                                    <td className="p-4 font-bold text-slate-700">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-black text-xs group-hover:bg-white group-hover:shadow-md transition-all">
                                                {row.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div>{row.name}</div>
                                                <div className="text-[10px] text-slate-400 font-normal uppercase">{row.position}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center text-slate-500 font-mono text-xs">
                                        {/* Показываем базовую ставку (или "разные", если менялась) - упрощение: показываем текущую */}
                                        {row.baseRate} ₽
                                    </td>
                                    <td className="p-4 text-center font-bold text-slate-700">
                                        {parseFloat(row.hoursWorked.toFixed(1))}
                                    </td>
                                    <td className="p-4 text-right text-slate-500 font-mono">
                                        {Math.round(row.totalBase).toLocaleString()}
                                    </td>
                                    <td className="p-4 text-right font-bold text-emerald-600 font-mono bg-emerald-50/30">
                                        +{Math.round(row.totalTb).toLocaleString()}
                                    </td>
                                    <td className="p-4 text-right font-bold text-indigo-600 font-mono bg-indigo-50/30">
                                        +{Math.round(row.totalKtu).toLocaleString()}
                                    </td>
                                    <td className="p-4 text-right font-black text-lg text-slate-800">
                                        {Math.round(row.totalSum).toLocaleString()} ₽
                                    </td>
                                    <td className="p-4 text-slate-300 group-hover:text-orange-500 transition-colors">
                                        <FileText size={18} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {payrollData.length === 0 && (
                   <div className="p-10 text-center text-slate-400 flex flex-col items-center">
                       <AlertCircle size={40} className="mb-2 opacity-50"/>
                       <p>Нет сотрудников или данных за этот месяц</p>
                   </div>
                )}
            </div>

            {/* Модальное окно детализации (SalaryMatrixModal) */}
            {selectedResource && (
                <SalaryMatrixModal 
                    resource={selectedResource} 
                    initialDate={currentDate} 
                    onClose={() => setSelectedResource(null)} 
                />
            )}
        </div>
    );
}