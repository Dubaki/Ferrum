import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useGanttData } from '../hooks/useGanttData';
import GanttChart from './gantt/GanttChart';
import { X, Save, AlertTriangle, Calendar, Loader, CheckCircle2, CheckCircle } from 'lucide-react';

// --- ОПТИМИЗИРОВАННЫЙ КОМПОНЕНТ МОДАЛКИ ---
const GanttEditModal = React.memo(({ itemId, itemType, initialDates, products, orders, actions, onClose }) => {
    const [isSaving, setIsSaving] = useState(false);
    
    const liveItem = useMemo(() => {
        if (itemType === 'order') return orders.find(o => o.id === itemId);
        return products.find(p => p.id === itemId);
    }, [itemId, itemType, products, orders]);

    const [state, setState] = useState({
        start: '',
        end: '',
        duration: 0
    });

    const formatDateForInput = (dateObj) => {
        if (!dateObj) return '';
        let date = dateObj instanceof Date ? dateObj : new Date(dateObj);
        if (isNaN(date.getTime())) return '';
        // Важно: берем только дату без учета локального времени
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const calculateDuration = (start, end) => {
        if (!start || !end) return 0;
        const s = new Date(start + 'T00:00:00');
        const e = new Date(end + 'T00:00:00');
        const diff = e.getTime() - s.getTime();
        return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
    };

    const addDays = (dateStr, days) => {
        const d = new Date(dateStr + 'T00:00:00');
        d.setDate(d.getDate() + (days - 1));
        return formatDateForInput(d);
    };

    // Инициализация дат из переданных параметров
    useEffect(() => {
        if (initialDates) {
            const s = formatDateForInput(initialDates.start);
            const e = formatDateForInput(initialDates.end);
            setState({
                start: s,
                end: e,
                duration: calculateDuration(s, e)
            });
        }
    }, [itemId]);

    const handleDateChange = (field, value) => {
        setState(prev => {
            let next = { ...prev, [field]: value };
            if (field === 'start') {
                next.end = addDays(value, prev.duration);
            } else if (field === 'end') {
                next.duration = calculateDuration(prev.start, value);
            } else if (field === 'duration') {
                const dur = parseInt(value) || 1;
                next.duration = dur;
                next.end = addDays(prev.start, dur);
            }
            return next;
        });
    };

    const toggleProductDone = async (prodId, currentStatus) => {
        try {
            await actions.updateProduct(prodId, 'isCompleted', !currentStatus);
        } catch (err) {
            console.error('Ошибка переключения готовности:', err);
        }
    };

    const handleSaveDates = async () => {
        if (!actions?.updateProduct || !liveItem) return;
        setIsSaving(true);

        try {
            if (itemType === 'order') {
                const orderProducts = products.filter(p => p.orderId === itemId);
                const oldStartStr = formatDateForInput(initialDates.start);
                const oldStart = new Date(oldStartStr + 'T00:00:00');
                const newStart = new Date(state.start + 'T00:00:00');
                const diffDays = Math.round((newStart - oldStart) / (1000 * 60 * 60 * 24));

                for (const prod of orderProducts) {
                    const pS = new Date((prod.startDate || oldStartStr) + 'T00:00:00');
                    const pE = new Date((prod.endDate || formatDateForInput(pS)) + 'T00:00:00');
                    pS.setDate(pS.getDate() + diffDays);
                    pE.setDate(pE.getDate() + diffDays);
                    
                    await actions.updateProduct(prod.id, 'startDate', formatDateForInput(pS));
                    await actions.updateProduct(prod.id, 'endDate', formatDateForInput(pE));
                }
            } else {
                await actions.updateProduct(itemId, 'startDate', state.start);
                await actions.updateProduct(itemId, 'endDate', state.end);
            }
            onClose();
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            alert('Ошибка при сохранении дат');
        } finally {
            setIsSaving(false);
        }
    };

    if (!liveItem) return null;

    const isProductDone = liveItem.isCompleted || liveItem.status === 'completed';
    const orderItems = itemType === 'order' ? products.filter(p => p.orderId === itemId) : [];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
                
                <div className="bg-slate-50 border-b border-slate-200 p-6 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                            <Calendar size={24} />
                        </div>
                        <div>
                            <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-0.5 tracking-tighter">Сроки и готовность</div>
                            <h3 className="text-xl font-black text-slate-800 truncate max-w-[300px] leading-none">
                                {itemType === 'order' ? `Заказ ${liveItem.orderNumber}` : liveItem.name}
                            </h3>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"><X size={24} /></button>
                </div>
                
                <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                    
                    {/* Статус "ГОТОВО" для отдельного изделия (МГНОВЕННОЕ) */}
                    {itemType === 'product' && (
                        <button 
                            onClick={() => toggleProductDone(itemId, isProductDone)}
                            className={`w-full p-4 rounded-2xl flex items-center justify-between border-2 transition-all duration-300 ${
                                isProductDone 
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-md shadow-emerald-100' 
                                : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <CheckCircle2 size={26} className={isProductDone ? 'text-emerald-500' : 'text-slate-300'} />
                                <span className="font-black text-lg">ИЗДЕЛИЕ ГОТОВО</span>
                            </div>
                            <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all ${
                                isProductDone ? 'bg-emerald-500 border-emerald-500 text-white scale-110' : 'bg-white border-slate-300'
                            }`}>
                                {isProductDone && <CheckCircle size={22} />}
                            </div>
                        </button>
                    )}

                    {/* Поля дат */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-tighter">Дата начала</label>
                            <input 
                                type="date" 
                                value={state.start}
                                onChange={(e) => handleDateChange('start', e.target.value)}
                                className="w-full border-2 border-slate-100 bg-slate-50 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-tighter">Дата окончания</label>
                            <input 
                                type="date" 
                                value={state.end}
                                onChange={(e) => handleDateChange('end', e.target.value)}
                                className="w-full border-2 border-slate-100 bg-slate-50 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                            />
                        </div>
                    </div>

                    {/* Длительность */}
                    <div className="bg-blue-50/50 p-5 rounded-2xl flex items-center justify-between border border-blue-100/50">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white shadow-sm border border-blue-100 rounded-xl flex items-center justify-center">
                                <span className="font-black text-sm text-blue-500">📅</span>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-blue-500 uppercase tracking-tight">Длительность</div>
                                <div className="text-base font-black text-slate-700">Календарных дней</div>
                            </div>
                        </div>
                        <input 
                            type="number"
                            min="1"
                            value={state.duration}
                            onChange={(e) => handleDateChange('duration', e.target.value)}
                            className="w-20 bg-white border-2 border-blue-400 rounded-xl p-2 text-center text-xl font-black text-blue-600 shadow-sm focus:ring-4 focus:ring-blue-100 outline-none"
                        />
                    </div>

                    {/* Состав заказа (МГНОВЕННОЕ СОХРАНЕНИЕ) */}
                    {itemType === 'order' && orderItems.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1 flex justify-between">
                                <span>Состав заказа</span>
                                <span className="text-blue-600">{orderItems.filter(p => p.isCompleted).length} / {orderItems.length} готов</span>
                            </h4>
                            <div className="grid gap-2">
                                {orderItems.map(prod => {
                                    const isDone = prod.isCompleted || prod.status === 'completed';
                                    return (
                                        <div key={prod.id} 
                                            onClick={() => toggleProductDone(prod.id, isDone)}
                                            className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                                isDone 
                                                ? 'bg-emerald-50 border-emerald-200' 
                                                : 'bg-white border-slate-100 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-1.5 rounded-lg transition-colors ${isDone ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                    <CheckCircle2 size={16} />
                                                </div>
                                                <div>
                                                    <div className={`text-sm font-bold transition-colors ${isDone ? 'text-emerald-700' : 'text-slate-700'}`}>{prod.name}</div>
                                                    <div className="text-[10px] text-slate-400 font-medium">Кол-во: {prod.quantity} шт.</div>
                                                </div>
                                            </div>
                                            {isDone && <span className="text-[9px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-lg uppercase tracking-tighter">Готово</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="pt-2 sticky bottom-0 bg-white pb-2">
                        <button 
                            onClick={handleSaveDates}
                            disabled={isSaving}
                            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3"
                        >
                            {isSaving ? <Loader size={20} className="animate-spin" /> : <Save size={22} />}
                            {isSaving ? 'СОХРАНЕНИЕ...' : 'ПРИМЕНИТЬ ИЗМЕНЕНИЯ'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default function GanttTab({ products, resources, orders, actions }) {
    const { calendarDays, ganttRows, startDate } = useGanttData(orders, products, resources);
    const [selectedItemInfo, setSelectedItemInfo] = useState(null); // { id, type, start, end }
    const [expandedIds, setExpandedIds] = useState([]);

    // Фильтрация
    const filteredGanttRows = useMemo(() => {
        if (!ganttRows) return [];
        return ganttRows.filter(row => {
            if (row.type !== 'order') return true;
            const order = orders.find(o => o.id === row.id);
            if (order && order.inShipping) return false;
            if (row.children && row.children.length > 0) {
                const allResale = row.children.every(child => child.isResale);
                return !allResale;
            }
            return true;
        });
    }, [ganttRows, orders]);

    const toggleExpand = useCallback((id) => {
        setExpandedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }, []);

    const handleOpenModal = useCallback((item) => {
        setSelectedItemInfo({ 
            id: item.id, 
            type: item.type,
            start: item.startDate,
            end: item.endDate
        });
    }, []);

    if (!calendarDays || !ganttRows) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-140px)] text-gray-500 bg-white rounded-2xl shadow-sm border border-slate-100">
                <div className="flex flex-col items-center gap-4">
                    <Loader size={48} className="animate-spin text-blue-500" />
                    <span className="font-bold text-slate-400">Загрузка Ганта...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative bg-white">
            
            <div className="flex-1 overflow-hidden relative">
                <GanttChart
                    calendarDays={calendarDays}
                    rows={filteredGanttRows}
                    startDate={startDate}
                    expandedIds={expandedIds}
                    onToggleExpand={toggleExpand}
                    onItemClick={handleOpenModal}
                    onProductNameClick={handleOpenModal}
                />
            </div>

            {/* ВЫНЕСЕННАЯ МОДАЛКА (Оптимизирована и исправлена) */}
            {selectedItemInfo && (
                <GanttEditModal 
                    itemId={selectedItemInfo.id} 
                    itemType={selectedItemInfo.type}
                    initialDates={{ start: selectedItemInfo.start, end: selectedItemInfo.end }}
                    products={products} 
                    orders={orders}
                    actions={actions} 
                    onClose={() => setSelectedItemInfo(null)} 
                />
            )}
        </div>
    );
}