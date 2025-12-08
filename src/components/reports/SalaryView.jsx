import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { SalaryMetric } from './SharedComponents';
import ResourceSettingsModal from './ResourceSettingsModal';
import SalaryMatrixModal from './SalaryMatrixModal';

export default function SalaryView({ resources, actions }) {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [editingResource, setEditingResource] = useState(null); 
    const [detailResource, setDetailResource] = useState(null); 

    const changeMonth = (delta) => {
        const newDate = new Date(selectedDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setSelectedDate(newDate);
    };

    const monthName = selectedDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();

    const calculateStats = (res) => {
        let stats = { total: 0, days: 0, base: 0, bonus: 0 };
        const baseRate = parseFloat(res.baseRate) || 0;
        const probationEnd = new Date(res.employmentDate);
        probationEnd.setDate(probationEnd.getDate() + 7);

        for(let d=1; d<=daysInMonth; d++) {
            const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const override = res.scheduleOverrides?.[dateStr];
            const dateObj = new Date(dateStr);
            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
            const worked = override !== undefined ? override > 0 : !isWeekend;
            const isViolated = res.safetyViolations?.[dateStr];

            if(worked) {
                stats.days++;
                stats.base += baseRate;
                if(dateObj > probationEnd && !isViolated) stats.bonus += (baseRate * 0.22);
                const ktu = (res.dailyEfficiency?.[dateStr]) || 0;
                stats.bonus += (baseRate * (ktu / 100)); 
            }
        }
        stats.total = stats.base + stats.bonus;
        return stats;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200 w-full md:w-1/2 mx-auto">
                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded"><ChevronLeft/></button>
                <h2 className="text-xl font-bold capitalize text-gray-800">{monthName}</h2>
                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded"><ChevronRight/></button>
            </div>

            <div className="grid gap-4">
                {resources.map(res => {
                    const stats = calculateStats(res);
                    return (
                        <div key={res.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row items-center gap-4">
                            <div className="flex items-center gap-4 w-full md:w-1/3">
                                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold text-xl">
                                    {res.name.charAt(0)}
                                </div>
                                <div>
                                    <div className="font-bold text-gray-800 text-lg">{res.name}</div>
                                    <button 
                                        onClick={() => setEditingResource(res)}
                                        className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition mt-1"
                                    >
                                        Ставка: {res.baseRate || 0} ₽ ⚙
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 w-full grid grid-cols-2 md:grid-cols-4 gap-4 text-center items-center">
                                <SalaryMetric label="Смены" value={stats.days} />
                                <SalaryMetric label="Оклад (База)" value={stats.base.toLocaleString()} suffix="₽" />
                                <SalaryMetric label="Бонусы (ТБ+КТУ)" value={stats.bonus.toLocaleString()} suffix="₽" color="text-green-600" />
                                
                                <div className="flex flex-col items-center justify-center">
                                     <SalaryMetric label="ИТОГО НА РУКИ" value={Math.round(stats.total).toLocaleString()} suffix="₽" color="text-blue-700" big />
                                     <button 
                                        onClick={() => setDetailResource(res)} 
                                        className="mt-3 flex items-center gap-2 text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 transition"
                                        title="Открыть расчетный лист"
                                     >
                                         <FileText size={14}/> Ведомость
                                     </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {editingResource && (
                <ResourceSettingsModal 
                    resource={editingResource} 
                    onClose={() => setEditingResource(null)} 
                    onSave={(id, field, val) => actions.updateResource(id, field, val)}
                />
            )}

            {detailResource && (
                <SalaryMatrixModal 
                    resource={detailResource}
                    initialDate={selectedDate}
                    onClose={() => setDetailResource(null)}
                />
            )}
        </div>
    );
}