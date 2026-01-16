import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, DollarSign, TrendingUp, AlertCircle, FileText, Edit3 } from 'lucide-react';
// ИСПРАВЛЕННЫЙ ИМПОРТ (одна точка = текущая папка)
import SalaryMatrixModal from './SalaryMatrixModal';

export default function SalaryView({ resources, actions }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedResource, setSelectedResource] = useState(null);
    const [editingAdvance, setEditingAdvance] = useState(null);
    const [advanceValue, setAdvanceValue] = useState('');
    const [editingWorkDays, setEditingWorkDays] = useState(false);
    const [workDaysValue, setWorkDaysValue] = useState('');
    const [workDaysOverrides, setWorkDaysOverrides] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('workDaysOverrides') || '{}');
        } catch { return {}; }
    });

    const changeMonth = (delta) => {
        const d = new Date(currentDate);
        d.setMonth(d.getMonth() + delta);
        setCurrentDate(d);
    };

    const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const monthName = currentDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const monthDays = Array.from({length: daysInMonth}, (_, i) => i + 1);

    // Рабочие дни в месяце (из настроек или по умолчанию пн-пт)
    const defaultWorkingDays = useMemo(() => {
        let count = 0;
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const dayOfWeek = date.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
        }
        return count;
    }, [currentDate, daysInMonth]);

    const workingDaysInMonth = workDaysOverrides[monthKey] || defaultWorkingDays;

    // Сохранение количества рабочих дней
    const handleSaveWorkDays = () => {
        const value = parseInt(workDaysValue) || defaultWorkingDays;
        const newOverrides = { ...workDaysOverrides, [monthKey]: value };
        setWorkDaysOverrides(newOverrides);
        localStorage.setItem('workDaysOverrides', JSON.stringify(newOverrides));
        setEditingWorkDays(false);
        setWorkDaysValue('');
    };

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
            let shiftsWorked = 0;

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

            // Текущая дата для проверки будущих дней
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

            monthDays.forEach(day => {
                const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                const dateObj = new Date(dateStr + 'T00:00:00');

                // Пропускаем будущие дни - учитываем только фактически отработанные
                if (dateStr > todayStr) {
                    return;
                }

                const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

                // 1. Часы (Приоритет: Переопределение -> График -> 0)
                const override = res.scheduleOverrides?.[dateStr];
                const isWorkDay = res.workWeekends ? true : !isWeekend;

                let dailyHours = 0;

                // КРИТИЧЕСКАЯ ПРОВЕРКА: Если день ДО даты трудоустройства или начала работы - часы ВСЕГДА 0
                const employmentDate = res.employmentDate || res.startDate;
                if (employmentDate && dateStr < employmentDate) {
                    dailyHours = 0; // Сотрудник еще не работал - часы = 0
                } else if (res.startDate && dateStr < res.startDate) {
                    dailyHours = 0; // Сотрудник еще не начал работу - часы = 0
                } else {
                    // Только если сотрудник уже работал - берём часы
                    if (override !== undefined) dailyHours = override;
                    else if (isWorkDay) dailyHours = standardHours;
                }

                if (dailyHours > 0) {
                    hoursWorked += dailyHours;
                    shiftsWorked++;

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

            const totalSum = totalBase + totalTb + totalKtu;
            const effectiveHourlyRate = hoursWorked > 0 ? totalSum / hoursWorked : 0;
            const avgCoefficient = totalBase > 0 ? totalSum / totalBase : 1;
            const advance = res.advances?.[monthKey] || 0;
            const toPay = totalSum - advance;

            return {
                ...res,
                hoursWorked,
                shiftsWorked,
                totalBase,
                totalTb,
                totalKtu,
                totalSum,
                effectiveHourlyRate,
                avgCoefficient,
                advance,
                toPay
            };
        }).sort((a,b) => b.totalSum - a.totalSum); // Сортируем по зарплате (богатые сверху)
    }, [resources, currentDate, monthKey]);

    // Итоговые суммы по цеху
    const totalPayroll = payrollData.reduce((sum, r) => sum + r.totalSum, 0);
    const totalHours = payrollData.reduce((sum, r) => sum + r.hoursWorked, 0);
    const totalAdvances = payrollData.reduce((sum, r) => sum + r.advance, 0);
    const totalToPay = payrollData.reduce((sum, r) => sum + r.toPay, 0);

    // Сохранение аванса
    const handleSaveAdvance = (resourceId) => {
        const value = parseFloat(advanceValue) || 0;
        const resource = resources.find(r => r.id === resourceId);
        if (resource && actions?.updateResource) {
            const newAdvances = { ...(resource.advances || {}), [monthKey]: value };
            actions.updateResource(resourceId, { advances: newAdvances });
        }
        setEditingAdvance(null);
        setAdvanceValue('');
    };

    const startEditAdvance = (row, e) => {
        e.stopPropagation();
        setEditingAdvance(row.id);
        setAdvanceValue(row.advance > 0 ? String(row.advance) : '');
    };

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

                {/* 2. Начислено (ФОТ) */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                            <DollarSign size={14} className="text-slate-500"/> Начислено (ФОТ)
                        </div>
                        <div className="text-2xl font-black text-slate-800 tracking-tight">
                            {Math.round(totalPayroll).toLocaleString()} ₽
                        </div>
                    </div>
                    <div className="text-xs text-slate-400 mt-2">
                        Авансов: {Math.round(totalAdvances).toLocaleString()} ₽
                    </div>
                </div>

                {/* 3. К выплате */}
                <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-5 rounded-2xl shadow-lg text-white flex flex-col justify-between relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="text-emerald-200 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                            <DollarSign size={14}/> К выплате
                        </div>
                        <div className="text-3xl font-black tracking-tight">
                            {Math.round(totalToPay).toLocaleString()} ₽
                        </div>
                    </div>
                    <div className="text-xs text-emerald-200 mt-2">
                        Часов: {Math.round(totalHours).toLocaleString()} ч
                    </div>
                    <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-500">
                        <DollarSign size={100} />
                    </div>
                </div>
            </div>

            {/* Таблица сотрудников */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                            <tr>
                                <th className="p-3">Сотрудник</th>
                                <th className="p-3 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        <span>Смены</span>
                                        {editingWorkDays ? (
                                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                                <span className="text-slate-400 normal-case">(из</span>
                                                <input
                                                    type="number"
                                                    value={workDaysValue}
                                                    onChange={e => setWorkDaysValue(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleSaveWorkDays();
                                                        if (e.key === 'Escape') { setEditingWorkDays(false); setWorkDaysValue(''); }
                                                    }}
                                                    className="w-12 px-1 py-0.5 text-[10px] border rounded text-center font-mono"
                                                    placeholder={String(defaultWorkingDays)}
                                                    autoFocus
                                                />
                                                <span className="text-slate-400 normal-case">)</span>
                                                <button
                                                    onClick={handleSaveWorkDays}
                                                    className="px-1.5 py-0.5 text-[9px] bg-blue-500 text-white rounded hover:bg-blue-600"
                                                >
                                                    ✓
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => { setEditingWorkDays(true); setWorkDaysValue(String(workingDaysInMonth)); }}
                                                className="flex items-center gap-0.5 text-slate-400 hover:text-blue-500 normal-case font-normal"
                                                title="Изменить кол-во рабочих дней"
                                            >
                                                <span>(из {workingDaysInMonth})</span>
                                                <Edit3 size={10} />
                                            </button>
                                        )}
                                    </div>
                                </th>
                                <th className="p-3 text-center">Часы</th>
                                <th className="p-3 text-right">Оклад</th>
                                <th className="p-3 text-right text-emerald-600">Эффект. ЗП</th>
                                <th className="p-3 text-right text-blue-600">₽/час</th>
                                <th className="p-3 text-center text-indigo-600">Коэфф.</th>
                                <th className="p-3 text-right text-orange-600">Аванс</th>
                                <th className="p-3 text-right font-black text-slate-800">К выплате</th>
                                <th className="p-3 w-8"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {payrollData.map((row) => (
                                <tr
                                    key={row.id}
                                    onClick={() => setSelectedResource(row)}
                                    className="hover:bg-orange-50/50 transition-colors cursor-pointer group"
                                >
                                    <td className="p-3 font-bold text-slate-700">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-black text-xs group-hover:bg-white group-hover:shadow-md transition-all">
                                                {row.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="text-sm">{row.name}</div>
                                                <div className="text-[9px] text-slate-400 font-normal uppercase">{row.position}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-3 text-center text-slate-600 font-mono text-xs">
                                        <span className="font-bold">{row.shiftsWorked}</span>
                                        <span className="text-slate-400"> ({workingDaysInMonth})</span>
                                    </td>
                                    <td className="p-3 text-center font-bold text-slate-700 text-xs">
                                        {parseFloat(row.hoursWorked.toFixed(1))}
                                    </td>
                                    <td className="p-3 text-right text-slate-500 font-mono text-xs">
                                        {Math.round(row.totalBase).toLocaleString()}
                                    </td>
                                    <td className="p-3 text-right font-bold text-emerald-600 font-mono text-xs bg-emerald-50/30">
                                        {Math.round(row.totalSum).toLocaleString()}
                                    </td>
                                    <td className="p-3 text-right text-blue-600 font-mono text-xs">
                                        {Math.round(row.effectiveHourlyRate).toLocaleString()}
                                    </td>
                                    <td className="p-3 text-center text-indigo-600 font-mono text-xs font-bold">
                                        ×{row.avgCoefficient.toFixed(2)}
                                    </td>
                                    <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
                                        {editingAdvance === row.id ? (
                                            <div className="flex items-center gap-1 justify-end">
                                                <input
                                                    type="number"
                                                    value={advanceValue}
                                                    onChange={e => setAdvanceValue(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleSaveAdvance(row.id);
                                                        if (e.key === 'Escape') { setEditingAdvance(null); setAdvanceValue(''); }
                                                    }}
                                                    className="w-20 px-2 py-1 text-xs border rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                    placeholder="0"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={() => handleSaveAdvance(row.id)}
                                                    className="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
                                                >
                                                    ✓
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={(e) => startEditAdvance(row, e)}
                                                className={`font-mono text-xs px-2 py-1 rounded transition-colors ${
                                                    row.advance > 0
                                                        ? 'text-orange-600 bg-orange-50 hover:bg-orange-100 font-bold'
                                                        : 'text-slate-400 hover:bg-slate-100'
                                                }`}
                                            >
                                                {row.advance > 0 ? `-${Math.round(row.advance).toLocaleString()}` : '—'}
                                            </button>
                                        )}
                                    </td>
                                    <td className="p-3 text-right font-black text-sm text-slate-800">
                                        {Math.round(row.toPay).toLocaleString()} ₽
                                    </td>
                                    <td className="p-3 text-slate-300 group-hover:text-orange-500 transition-colors">
                                        <FileText size={16} />
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