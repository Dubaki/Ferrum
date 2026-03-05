import React, { useState } from 'react';
import { Target, BarChart2, BookOpen, Clock } from 'lucide-react';
import KnowledgeBaseView from './KnowledgeBaseView';
import { useShopResources } from '../../hooks/useShopResources';
import { useScheduler } from '../../hooks/useScheduler';

// Локальный хелпер для дат
const fmtDate = (date) => {
  const d = new Date(date);
  const month = '' + (d.getMonth() + 1);
  const day = '' + d.getDate();
  const year = d.getFullYear();
  return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
};

const TABS = [
    { id: 'planner', label: 'Тепловая карта' },
    { id: 'knowledge', label: 'База знаний' },
];

// Компонент Тепловой карты
const Heatmap = ({ loadMatrix, resources }) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const horizonDays = 30;

    const days = [];
    let curDate = new Date(today);
    for (let i = 0; i < horizonDays; i++) {
        days.push({
            dateStr: fmtDate(curDate),
            isWeekend: curDate.getDay() === 0 || curDate.getDay() === 6,
            label: curDate.getDate()
        });
        curDate.setDate(curDate.getDate() + 1);
    }

    const sortedResources = [...resources].sort((a, b) => {
        const order = ['cutting_profile', 'cutting_sheet', 'rolling', 'weld_assembly', 'fitting', 'painting'];
        return order.indexOf(a.stage) - order.indexOf(b.stage);
    });

    return (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 overflow-x-auto">
            <div className="min-w-[800px]">
                <div className="flex mb-2 sticky top-0 bg-slate-900 z-10">
                    <div className="w-48 shrink-0"></div>
                    {days.map((d, i) => (
                        <div key={i} className={`w-8 shrink-0 text-center text-[10px] font-bold pb-2 border-b-2 ${d.isWeekend ? 'text-slate-600 border-slate-800' : 'text-slate-400 border-slate-700'}`}>
                            {d.label}
                        </div>
                    ))}
                </div>

                <div className="space-y-1">
                    {sortedResources.map(res => {
                        const capacity = res.hoursPerDay || 8;
                        return (
                            <div key={res.id} className="flex items-center group">
                                <div className="w-48 shrink-0 text-xs font-bold text-slate-300 truncate pr-4 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: res.color || '#3b82f6' }}></div>
                                    {res.shortName || res.name}
                                </div>
                                {days.map((d, i) => {
                                    if (d.isWeekend) return <div key={i} className="w-8 h-8 shrink-0 bg-slate-950/50 m-[1px] rounded"></div>;
                                    const dayData = loadMatrix[res.id]?.[d.dateStr] || { total: 0, details: [] };
                                    const percent = (dayData.total / capacity) * 100;
                                    
                                    let bgColor = 'bg-slate-800/50';
                                    let textColor = 'text-slate-500';
                                    if (percent > 0) {
                                        if (percent <= 50) { bgColor = 'bg-emerald-500/20'; textColor = 'text-emerald-400'; }
                                        else if (percent <= 80) { bgColor = 'bg-yellow-500/30'; textColor = 'text-yellow-400'; }
                                        else if (percent <= 100) { bgColor = 'bg-orange-500/40'; textColor = 'text-orange-400'; }
                                        else { bgColor = 'bg-red-500/50'; textColor = 'text-red-400 font-black'; }
                                    }

                                    const tooltip = dayData.total > 0 
                                        ? `${res.name} - ${d.dateStr}\nЗагрузка: ${dayData.total.toFixed(1)}ч (${Math.round(percent)}%)\n\n` + 
                                          dayData.details.map(det => `${det.orderNumber}: ${det.hours.toFixed(1)}ч`).join('\n')
                                        : 'Свободно';

                                    return (
                                        <div key={i} title={tooltip} className={`w-8 h-8 shrink-0 m-[1px] rounded flex items-center justify-center text-[9px] transition-colors cursor-help hover:ring-2 hover:ring-white/20 ${bgColor} ${textColor}`}>
                                            {dayData.total > 0 ? Math.round(percent) : ''}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default function SchedulerTab({ products, orders }) {
    const [activeTab, setActiveTab] = useState('planner');
    
    const { shopResources, loading: resLoading } = useShopResources();
    
    const { loadMatrix, scheduledOps, ordersTimeline } = useScheduler(
        orders || [], 
        products || [], 
        shopResources || []
    );

    return (
        <div className="flex flex-col h-full bg-slate-950 text-white overflow-hidden font-sans">
            <div className="px-6 pt-5 pb-0 border-b border-slate-800 shrink-0">
                <div className="text-[10px] font-black tracking-[0.3em] text-cyan-400 uppercase mb-1 flex items-center gap-2">
                    ФЕРРУМ × ПЛАНИРОВАНИЕ
                </div>
                <div className="flex items-end justify-between gap-4">
                    <h2 className="text-xl font-black text-white leading-tight pb-3">Производственный график</h2>
                    <div className="flex gap-1 pb-0">
                        {TABS.map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 ${activeTab === tab.id ? 'text-white border-cyan-400 bg-slate-800/50' : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/30'}`}>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-950 p-6 relative">
                {activeTab === 'planner' && (
                    <div className="space-y-6 max-w-6xl mx-auto">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400"><BarChart2 size={20}/></div>
                                <div><div className="text-xl font-black text-white">{orders?.filter(o => o.status === 'active' && !o.isProductOrder).length || 0}</div><div className="text-[8px] text-slate-500 font-bold uppercase">Активных заказов</div></div>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400"><Target size={20}/></div>
                                <div><div className="text-xl font-black text-white">{scheduledOps.length}</div><div className="text-[8px] text-slate-500 font-bold uppercase">Операций в плане</div></div>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2"><BarChart2 className="text-cyan-400" size={14}/> Загрузка ресурсов (%)</h3>
                            </div>
                            <Heatmap loadMatrix={loadMatrix} resources={shopResources} />
                        </div>

                        <div>
                            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-3"><Target className="text-orange-400" size={14}/> Прогноз выполнения заказов</h3>
                            <div className="grid gap-2">
                                {ordersTimeline.sort((a,b) => a.start - b.start).map(tl => (
                                    <div key={tl.id} className={`bg-slate-900 border ${tl.isLate ? 'border-red-500/30 bg-red-500/5' : 'border-slate-800'} rounded-xl p-3 flex items-center justify-between group hover:border-slate-700 transition-all`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-[10px] ${tl.isLate ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-400 group-hover:text-white group-hover:bg-cyan-600 transition-colors'}`}>
                                                {tl.number || '—'}
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
                                                    {tl.start.toLocaleDateString('ru-RU', {day:'2-digit', month:'short'})} — {tl.end.toLocaleDateString('ru-RU', {day:'2-digit', month:'short'})}
                                                </div>
                                                <div className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">Дедлайн: {tl.deadline ? new Date(tl.deadline).toLocaleDateString('ru-RU', {day:'2-digit', month:'2-digit'}) : '—'}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {tl.isLate ? (
                                                <div className="text-[9px] font-black text-red-500 uppercase px-2 py-1 bg-red-500/10 rounded">⚠️ Опоздание {tl.delayDays}д</div>
                                            ) : (
                                                <div className="text-[9px] font-black text-emerald-500 uppercase px-2 py-1 bg-emerald-500/10 rounded">В графике ✓</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'knowledge' && <KnowledgeBaseView orders={orders ?? []} products={products ?? []} />}
            </div>
        </div>
    );
}
