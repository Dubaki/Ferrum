import React, { useState, useMemo } from 'react';
import { useGanttData } from '../hooks/useGanttData';
import GanttChart from './gantt/GanttChart';
import { X, Clock, Save, AlertTriangle, Calendar, Package, Wrench, Timer, Target, Loader } from 'lucide-react';

export default function GanttTab({ products, resources, orders, actions }) {
    const { calendarDays, heatmapData, ganttRows, startDate } = useGanttData(orders, products, resources);
    
    const [selectedItem, setSelectedItem] = useState(null); 
    const [newDateValue, setNewDateValue] = useState('');
    const [expandedIds, setExpandedIds] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    // Фильтрация: Скрываем заказы, состоящие ТОЛЬКО из товаров перепродажи
    const filteredGanttRows = useMemo(() => {
        if (!ganttRows) return [];
        return ganttRows.filter(row => {
            if (row.type !== 'order') return true;

            // Скрываем заказы, которые находятся в отгрузке
            const order = orders.find(o => o.id === row.id);
            if (order && order.inShipping) return false;

            // Если у заказа есть дети, проверяем, все ли они resale
            if (row.children && row.children.length > 0) {
                const allResale = row.children.every(child => child.isResale);
                return !allResale;
            }
            return true; // Пустые заказы оставляем (или можно скрыть return false)
        });
    }, [ganttRows, orders]);

    // Проверка наличия actions при монтировании компонента
    React.useEffect(() => {
        if (!actions) {
            console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: actions не передан в GanttTab!');
            console.error('Проверьте App.jsx - должно быть: <GanttTab actions={actions} ... />');
        }
    }, [actions]);

    // --- DEBUG: Логирование загрузки цеха ---
    React.useEffect(() => {
        if (heatmapData && heatmapData.length > 0) {
            const overloaded = heatmapData.find(d => d.percent > 100);
            if (overloaded) {
                console.group('🔥 Диагностика загрузки цеха (>100%)');
                console.log('Найден день с перегрузкой:', overloaded);
                console.log('Формула: (Минуты работы / Минуты ресурса) * 100');
                console.groupEnd();
            }
        }
    }, [heatmapData]);

    const toggleExpand = (id) => {
        setExpandedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    // Хелпер для форматирования даты в YYYY-MM-DD
    const formatDateForInput = (dateObj) => {
        if (!dateObj) return '';
        
        let date = dateObj;
        if (typeof dateObj === 'string') {
            date = new Date(dateObj);
        }
        
        if (isNaN(date.getTime())) {
            console.error('❌ Некорректная дата:', dateObj);
            return '';
        }
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    };

    // Открытие модалки
    const handleOpenModal = (item) => {
        setSelectedItem(item);
        const formattedDate = formatDateForInput(item.startDate || new Date());
        setNewDateValue(formattedDate);
    };

    // --- ГЛАВНАЯ ФУНКЦИЯ СОХРАНЕНИЯ ---
    const handleSaveDate = async () => {
        // Проверка наличия actions
        if (!actions || !actions.updateProduct) {
            console.error('❌ ОШИБКА: actions.updateProduct не существует');
            alert('Ошибка: Функция обновления недоступна. Проверьте консоль.');
            return;
        }

        if (!selectedItem || !newDateValue) {
            return;
        }

        setIsSaving(true);

        try {
            // Парсим даты
            const targetDate = new Date(newDateValue + 'T00:00:00');
            const originalDate = new Date(selectedItem.startDate);
            originalDate.setHours(0, 0, 0, 0);
            targetDate.setHours(0, 0, 0, 0);

            // Проверка корректности дат
            if (isNaN(targetDate.getTime())) {
                throw new Error('Некорректная целевая дата');
            }
            if (isNaN(originalDate.getTime())) {
                throw new Error('Некорректная оригинальная дата');
            }

            // Вычисляем разницу
            const diffMs = targetDate.getTime() - originalDate.getTime();
            const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays === 0) {
                setSelectedItem(null);
                setIsSaving(false);
                return;
            }

            if (selectedItem.type === 'order') {
                // === ЛОГИКА ДЛЯ ЗАКАЗА ===
                
                const orderProducts = products.filter(p => p.orderId === selectedItem.id);

                if (orderProducts.length === 0) {
                    alert('В заказе нет изделий для обновления');
                    setSelectedItem(null);
                    setIsSaving(false);
                    return;
                }

                // Обновляем каждое изделие последовательно
                let successCount = 0;
                const errors = [];

                for (const prod of orderProducts) {
                    try {
                        // Получаем текущую дату изделия
                        const currentProdStart = prod.startDate 
                            ? new Date(prod.startDate + 'T00:00:00') 
                            : new Date(selectedItem.startDate);
                        
                        currentProdStart.setHours(0, 0, 0, 0);
                        
                        // Прибавляем разницу дней
                        currentProdStart.setDate(currentProdStart.getDate() + diffDays);
                        
                        // Форматируем в строку YYYY-MM-DD
                        const newProdDateStr = formatDateForInput(currentProdStart);
                        
                        // Обновляем через actions
                        await actions.updateProduct(prod.id, 'startDate', newProdDateStr);
                        successCount++;
                        
                        // Небольшая задержка для надёжности Firebase
                        await new Promise(resolve => setTimeout(resolve, 150));
                        
                    } catch (error) {
                        console.error(`      ❌ Ошибка обновления изделия ${prod.id}:`, error);
                        errors.push({ name: prod.name, error: error.message });
                    }
                }
                
                if (errors.length > 0) {
                    console.error('❌ Ошибки при обновлении:', errors);
                    alert(`⚠️ Обновлено: ${successCount} из ${orderProducts.length}\n\nОшибки:\n${errors.map(e => `- ${e.name}: ${e.error}`).join('\n')}`);
                } else {
                    alert(`✅ Успешно обновлено ${successCount} изделий!`);
                }
                
            } else if (selectedItem.type === 'product') {
                // === ЛОГИКА ДЛЯ ИЗДЕЛИЯ ===
                
                const productId = selectedItem.id || selectedItem.productId;
                
                if (!productId) {
                    throw new Error('Не найден ID изделия');
                }
                
                await actions.updateProduct(productId, 'startDate', newDateValue);
                
                alert('✅ Дата изделия успешно обновлена!');
            }

            // Успешное завершение
            setSelectedItem(null);
            
        } catch (error) {
            console.error('❌ ОШИБКА при сохранении:', error);
            alert(`❌ Ошибка: ${error.message}\n\nПроверьте консоль для деталей (F12)`);
        } finally {
            setIsSaving(false);
        }
    };

    // Проверка загрузки данных
    if (!calendarDays || !ganttRows) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-100px)] text-gray-500">
                <div className="text-center">
                    <Loader size={48} className="animate-spin mx-auto mb-4 text-blue-500" />
                    <p className="font-medium">Загрузка данных графика...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative fade-in">
            
            {/* ГРАФИК */}
            <div className="flex-1 bg-white overflow-hidden relative">
                <GanttChart 
                    calendarDays={calendarDays}
                    rows={filteredGanttRows}
                    startDate={startDate}
                    expandedIds={expandedIds}
                    onToggleExpand={toggleExpand}
                    onItemClick={handleOpenModal}
                    heatmapData={heatmapData}
                />
            </div>

            {/* --- МОДАЛКА РЕДАКТИРОВАНИЯ --- */}
            {selectedItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        
                        {/* Header */}
                        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white flex justify-between items-start">
                            <div className="flex-1">
                                <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">
                                    {selectedItem.type === 'order' ? '📦 Редактирование заказа' : '🔧 Редактирование изделия'}
                                </div>
                                <h3 className="text-2xl font-black mb-1 leading-tight">
                                    {selectedItem.type === 'order' ? selectedItem.orderNumber : selectedItem.name}
                                </h3>
                                {selectedItem.clientName && (
                                    <p className="text-sm text-slate-300 font-medium">{selectedItem.clientName}</p>
                                )}
                            </div>
                            <button 
                                onClick={() => setSelectedItem(null)} 
                                className="p-2 hover:bg-white/10 rounded-xl transition-colors ml-4"
                                disabled={isSaving}
                            >
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                            
                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200">
                                    <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Трудоёмкость</div>
                                    <div className="text-3xl font-black text-blue-900 flex items-center gap-2">
                                        <Clock size={24} />
                                        {selectedItem.totalHours}ч
                                    </div>
                                </div>
                                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-4 border border-emerald-200">
                                    <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Длительность</div>
                                    <div className="text-3xl font-black text-emerald-900 flex items-center gap-2">
                                        <Calendar size={24} />
                                        {selectedItem.durationDays}д
                                    </div>
                                </div>
                                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-4 border border-purple-200">
                                    <div className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-2">
                                        {selectedItem.type === 'order' ? 'Изделий' : 'Количество'}
                                    </div>
                                    <div className="text-3xl font-black text-purple-900 flex items-center gap-2">
                                        <Package size={24} />
                                        {selectedItem.type === 'order' ? selectedItem.children?.length || 0 : selectedItem.quantity}
                                    </div>
                                </div>
                            </div>

                            {/* Date Picker */}
                            <div className="bg-slate-50 rounded-2xl p-6 border-2 border-slate-200">
                                <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider flex items-center gap-2">
                                    <Calendar size={16} className="text-blue-600" />
                                    Новая дата начала производства
                                </label>
                                <input 
                                    type="date" 
                                    value={newDateValue}
                                    onChange={(e) => setNewDateValue(e.target.value)}
                                    className="w-full border-2 border-slate-300 bg-white rounded-xl p-4 text-lg font-bold text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                    disabled={isSaving}
                                />
                                
                                {selectedItem.type === 'order' && (
                                    <div className="mt-4 flex items-start gap-3 text-xs text-orange-700 bg-orange-50 p-4 rounded-xl border border-orange-200">
                                        <AlertTriangle size={18} className="shrink-0 mt-0.5 text-orange-600"/>
                                        <p className="leading-relaxed">
                                            <strong>Внимание!</strong> При изменении даты старта заказа все <strong>{selectedItem.children?.length || 0} изделий</strong> автоматически сдвинутся на такое же количество дней.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Products Info for Order */}
                            {selectedItem.type === 'order' && selectedItem.children && selectedItem.children.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <Package size={16} />
                                        Состав заказа ({selectedItem.children.length})
                                    </h4>
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {selectedItem.children.map((child) => {
                                            const product = products.find(p => p.id === child.id);
                                            if (!product) return null;
                                            
                                            return (
                                                <div key={child.id} className="bg-white border-2 border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex-1">
                                                            <div className="font-bold text-slate-800 mb-1">{child.name}</div>
                                                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                                                <span className="flex items-center gap-1">
                                                                    <Target size={12} />
                                                                    {child.quantity} шт
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <Wrench size={12} />
                                                                    {product.operations?.length || 0} операций
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <Timer size={12} />
                                                                    {child.totalHours} ч
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded mt-2">
                                                        Текущая дата: {formatDateForInput(product.startDate) || 'не задана'}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <button 
                                    onClick={handleSaveDate}
                                    disabled={isSaving || !actions}
                                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader size={20} className="animate-spin" />
                                            Сохранение...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={20} />
                                            {selectedItem.type === 'order' ? 'Перенести заказ' : 'Перенести изделие'}
                                        </>
                                    )}
                                </button>
                                <button 
                                    onClick={() => setSelectedItem(null)}
                                    disabled={isSaving}
                                    className="px-6 py-4 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Отмена
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}