import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Archive, ChevronDown, ChevronRight, AlertTriangle, Clock, Package } from 'lucide-react';

export default function CopyFromArchiveModal({ onClose, onCopy, orders, products }) {
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const [selectedProductIds, setSelectedProductIds] = useState(new Set());
    const [expandedProductIds, setExpandedProductIds] = useState(new Set());

    // Фильтруем и сортируем завершенные заказы
    const completedOrders = useMemo(() => {
        return orders
            .filter(o => o.status === 'completed')
            .sort((a, b) => new Date(b.finishedAt || 0) - new Date(a.finishedAt || 0));
    }, [orders]);

    // Изделия выбранного заказа
    const orderProducts = useMemo(() => {
        if (!selectedOrderId) return [];
        const filtered = products.filter(p => p.orderId === selectedOrderId);

        // Отладка (можно отключить после тестирования)
        // if (filtered.length > 0) {
        //     console.log('🔍 Изделия завершенного заказа:', filtered.length);
        // }

        return filtered;
    }, [products, selectedOrderId]);

    // Вычисление minutesPerUnit из actualMinutes
    const computeMinutesPerUnit = (operation, productQuantity) => {
        // ВАЖНО: actualMinutes УЖЕ хранит время на ОДНУ единицу (не на всю партию!)
        // Поэтому просто копируем значение БЕЗ деления на quantity
        const actualMins = parseFloat(operation.actualMinutes) || 0;
        const planMins = parseFloat(operation.minutesPerUnit) || 0;

        // Отладка (можно отключить)
        // console.log('⚙️ Вычисление:', operation.name, '→', actualMins > 0 ? actualMins : planMins);

        // Приоритет 1: Фактическое время (УЖЕ на единицу)
        if (actualMins > 0) {
            return Math.round(actualMins);
        }

        // Приоритет 2: Старое плановое
        if (planMins > 0) {
            return Math.round(planMins);
        }

        // Приоритет 3: Дефолт
        return 60;
    };

    // Toggle выбора изделия
    const toggleProduct = (productId) => {
        setSelectedProductIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(productId)) {
                newSet.delete(productId);
            } else {
                newSet.add(productId);
            }
            return newSet;
        });
    };

    // Toggle раскрытия операций
    const toggleExpand = (productId) => {
        setExpandedProductIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(productId)) {
                newSet.delete(productId);
            } else {
                newSet.add(productId);
            }
            return newSet;
        });
    };

    // Обработка копирования
    const handleCopy = () => {
        const selectedProducts = products.filter(p => selectedProductIds.has(p.id));

        const items = selectedProducts.map(product => {
            const ops = (product.operations || []).map(op => {
                const minutesPerUnit = computeMinutesPerUnit(op, product.quantity);
                return {
                    name: op.name,
                    minutes: minutesPerUnit
                };
            });

            return {
                name: product.name,
                ops: ops
            };
        });

        console.log('✅ Копирование изделий:', items.length, 'шт');
        onCopy(items);
        onClose();
    };

    // Форматирование даты
    const formatDate = (dateStr) => {
        if (!dateStr) return 'Нет данных';
        return new Date(dateStr).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-6 text-white flex justify-between items-start shrink-0">
                    <div className="flex-1">
                        <div className="text-xs font-bold text-indigo-200 uppercase tracking-wider mb-2">
                            📦 Копирование из архива
                        </div>
                        <h3 className="text-2xl font-black mb-1 leading-tight">
                            Выберите завершенные изделия
                        </h3>
                        <p className="text-sm text-indigo-200">
                            Фактическое время станет плановым для новых изделий
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-xl transition-colors ml-4"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {completedOrders.length === 0 ? (
                        // Пустое состояние
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <Archive size={64} className="text-slate-300 mb-4"/>
                            <p className="text-slate-600 font-bold text-lg mb-2">Архив пуст</p>
                            <p className="text-slate-400 text-sm max-w-md">
                                Завершите хотя бы один заказ, чтобы иметь возможность копировать изделия из архива
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Список завершенных заказов */}
                            <div>
                                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Archive size={16} />
                                    Завершенные заказы ({completedOrders.length})
                                </h4>
                                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                                    {completedOrders.map(order => {
                                        const productCount = products.filter(p => p.orderId === order.id).length;
                                        const isSelected = selectedOrderId === order.id;

                                        return (
                                            <button
                                                key={order.id}
                                                onClick={() => {
                                                    setSelectedOrderId(order.id);
                                                    setSelectedProductIds(new Set()); // Сброс выбора
                                                }}
                                                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                                                    isSelected
                                                        ? 'border-indigo-500 bg-indigo-50 shadow-md'
                                                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="font-bold text-slate-800">
                                                        {order.orderNumber}
                                                    </div>
                                                    {isSelected && (
                                                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-500 space-y-1">
                                                    <div>{order.clientName || 'Без клиента'}</div>
                                                    <div className="flex items-center gap-2 text-[10px]">
                                                        <span>🏁 {formatDate(order.finishedAt)}</span>
                                                        <span>•</span>
                                                        <span>{productCount} изд.</span>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Список изделий выбранного заказа */}
                            <div>
                                {selectedOrderId ? (
                                    <>
                                        <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Package size={16} />
                                            Изделия заказа ({orderProducts.length})
                                        </h4>
                                        {orderProducts.length === 0 ? (
                                            <div className="text-slate-400 text-sm text-center py-8 bg-slate-50 rounded-xl">
                                                Нет изделий в этом заказе
                                            </div>
                                        ) : (
                                            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                                                {orderProducts.map(product => {
                                                    const isSelected = selectedProductIds.has(product.id);
                                                    const isExpanded = expandedProductIds.has(product.id);
                                                    const operations = product.operations || [];

                                                    return (
                                                        <div
                                                            key={product.id}
                                                            className={`border-2 rounded-xl transition-all ${
                                                                isSelected
                                                                    ? 'border-indigo-300 bg-indigo-50'
                                                                    : 'border-slate-200 bg-white'
                                                            }`}
                                                        >
                                                            <div className="p-3">
                                                                <div className="flex items-start gap-3">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isSelected}
                                                                        onChange={() => toggleProduct(product.id)}
                                                                        className="w-5 h-5 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 transition shrink-0"
                                                                    />
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="font-bold text-slate-800 text-sm mb-1">
                                                                            {product.name}
                                                                        </div>
                                                                        <div className="text-xs text-slate-500 flex items-center gap-3">
                                                                            <span>Кол-во: {product.quantity}</span>
                                                                            <span>•</span>
                                                                            <span>{operations.length} операций</span>
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => toggleExpand(product.id)}
                                                                        className="p-1 hover:bg-slate-100 rounded transition shrink-0"
                                                                        title="Показать операции"
                                                                    >
                                                                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                                    </button>
                                                                </div>

                                                                {/* Превью операций */}
                                                                {isExpanded && operations.length > 0 && (
                                                                    <div className="mt-3 pl-8 space-y-1.5 border-t border-slate-200 pt-3">
                                                                        {operations.map((op, idx) => {
                                                                            const computedTime = computeMinutesPerUnit(op, product.quantity);
                                                                            // ИСПРАВЛЕНИЕ: Преобразуем в числа для корректной проверки
                                                                            const actualMins = parseFloat(op.actualMinutes) || 0;
                                                                            const hasNoActual = actualMins === 0;
                                                                            const usedActual = actualMins > 0 && product.quantity > 0;

                                                                            // Формируем подсказку с расчетом
                                                                            let tooltip = '';
                                                                            if (usedActual) {
                                                                                tooltip = `Факт: ${actualMins} мин/ед (будет скопировано в план)`;
                                                                            } else if (parseFloat(op.minutesPerUnit) > 0) {
                                                                                tooltip = `Нет факта, использовано старое плановое: ${op.minutesPerUnit} мин/ед`;
                                                                            } else {
                                                                                tooltip = `Нет данных, использован дефолт: 60 мин/ед`;
                                                                            }

                                                                            return (
                                                                                <div
                                                                                    key={idx}
                                                                                    className="flex items-center justify-between text-xs bg-slate-50 px-2 py-1.5 rounded hover:bg-slate-100 transition"
                                                                                    title={tooltip}
                                                                                >
                                                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                                        <span className="font-mono text-slate-400 text-[10px]">
                                                                                            {op.sequence}
                                                                                        </span>
                                                                                        <span className="text-slate-700 truncate">
                                                                                            {op.name}
                                                                                        </span>
                                                                                        {hasNoActual && (
                                                                                            <AlertTriangle
                                                                                                size={12}
                                                                                                className="text-yellow-500 shrink-0"
                                                                                            />
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2 shrink-0">
                                                                                        {/* Показываем бейдж "ФАКТ" если использовано фактическое время */}
                                                                                        {usedActual && (
                                                                                            <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                                                                                                ФАКТ
                                                                                            </span>
                                                                                        )}
                                                                                        <div className={`flex items-center gap-1 ${usedActual ? 'text-emerald-600' : 'text-slate-500'}`}>
                                                                                            <Clock size={10} />
                                                                                            <span className="font-bold">{computedTime}</span>
                                                                                            <span className="text-[10px]">мин/ед</span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center py-16">
                                        <div className="text-slate-300 mb-2">
                                            <Package size={48} />
                                        </div>
                                        <p className="text-slate-400 text-sm">
                                            Выберите заказ слева
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="shrink-0 border-t border-slate-200 p-6 bg-slate-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-white text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition-colors border-2 border-slate-200"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleCopy}
                        disabled={selectedProductIds.size === 0}
                        className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
                            selectedProductIds.size === 0
                                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:shadow-lg hover:scale-105 active:scale-95'
                        }`}
                    >
                        <Package size={18} />
                        Скопировать выбранные ({selectedProductIds.size})
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
