import { useState, useMemo } from 'react';
import {
    Archive, Package, ChevronDown, ChevronRight,
    Clock, CheckCircle2, AlertTriangle, Search
} from 'lucide-react';

// ─── Вспомогательные ─────────────────────────────────────────

function fmtDate(str) {
    if (!str) return '—';
    return new Date(str).toLocaleDateString('ru-RU', {
        day: '2-digit', month: '2-digit', year: '2-digit'
    });
}

function fmtMins(mins) {
    const m = parseFloat(mins) || 0;
    if (m < 60) return `${Math.round(m)} мин`;
    const h = Math.floor(m / 60);
    const rem = Math.round(m % 60);
    return rem ? `${h}ч ${rem}м` : `${h}ч`;
}

function calcProductTotalMins(product) {
    return (product.operations || []).reduce((acc, op) => {
        const m = parseFloat(op.actualMinutes) || parseFloat(op.minutesPerUnit) || 0;
        return acc + m * (product.quantity || 1);
    }, 0);
}

function hasActualData(product) {
    return (product.operations || []).some(op => parseFloat(op.actualMinutes) > 0);
}

// ─── Карточка изделия ─────────────────────────────────────────

function ProductCard({ product }) {
    const [expanded, setExpanded] = useState(false);
    const ops = product.operations || [];
    const totalMins = calcProductTotalMins(product);
    const hasActual = hasActualData(product);

    return (
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 overflow-hidden">
            <button
                className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-700/40 transition-colors"
                onClick={() => setExpanded(v => !v)}
            >
                <div className="mt-0.5 text-slate-500 shrink-0">
                    {expanded
                        ? <ChevronDown size={14} />
                        : <ChevronRight size={14} />
                    }
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white truncate">
                            {product.name}
                        </span>
                        {hasActual
                            ? <span className="text-[9px] font-black text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded uppercase tracking-wider">ФАКТ</span>
                            : <span className="text-[9px] font-black text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">ПЛАН</span>
                        }
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-3">
                        <span>× {product.quantity} шт</span>
                        <span>·</span>
                        <span>{ops.length} операций</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                            <Clock size={10} />
                            <span>{fmtMins(totalMins)} всего</span>
                        </span>
                    </div>
                </div>
            </button>

            {expanded && ops.length > 0 && (
                <div className="px-4 pb-3 border-t border-slate-700/60">
                    <div className="space-y-1 pt-2">
                        {ops.map((op, idx) => {
                            const actualMins = parseFloat(op.actualMinutes) || 0;
                            const planMins = parseFloat(op.minutesPerUnit) || 0;
                            const displayMins = actualMins > 0 ? actualMins : planMins;
                            const isActual = actualMins > 0;

                            return (
                                <div
                                    key={op.id ?? idx}
                                    className="flex items-center justify-between text-xs bg-slate-900/50 px-3 py-1.5 rounded-lg"
                                >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <span className="font-mono text-slate-600 text-[10px] w-4 shrink-0">
                                            {op.sequence ?? idx + 1}
                                        </span>
                                        <span className="text-slate-300 truncate">{op.name}</span>
                                        {!isActual && (
                                            <AlertTriangle size={11} className="text-yellow-500 shrink-0" />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {isActual && (
                                            <CheckCircle2 size={11} className="text-emerald-400" />
                                        )}
                                        <span className={isActual ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                                            {fmtMins(displayMins)}/ед
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Основной компонент ────────────────────────────────────────

export default function KnowledgeBaseView({ orders, products }) {
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const [search, setSearch] = useState('');

    const completedOrders = useMemo(() =>
        orders
            .filter(o => o.status === 'completed')
            .sort((a, b) => new Date(b.finishedAt || 0) - new Date(a.finishedAt || 0)),
        [orders]
    );

    const filteredOrders = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return completedOrders;
        return completedOrders.filter(o =>
            o.orderNumber?.toLowerCase().includes(q) ||
            o.clientName?.toLowerCase().includes(q)
        );
    }, [completedOrders, search]);

    const selectedOrder = completedOrders.find(o => o.id === selectedOrderId) ?? null;

    const orderProducts = useMemo(() => {
        if (!selectedOrderId) return [];
        return products.filter(p => p.orderId === selectedOrderId);
    }, [products, selectedOrderId]);

    // Сводка по выбранному заказу
    const summary = useMemo(() => {
        if (!orderProducts.length) return null;
        const totalMins = orderProducts.reduce((acc, p) => acc + calcProductTotalMins(p), 0);
        const withActual = orderProducts.filter(hasActualData).length;
        return { totalMins, withActual, total: orderProducts.length };
    }, [orderProducts]);

    return (
        <div className="flex h-full overflow-hidden">

            {/* ─── Левая панель: заказы ─── */}
            <div className="w-64 shrink-0 border-r border-slate-800 flex flex-col">
                <div className="px-4 pt-4 pb-3 border-b border-slate-800 shrink-0">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Archive size={11} />
                        ЗАВЕРШЁННЫЕ ЗАКАЗЫ ({completedOrders.length})
                    </div>
                    {/* Поиск */}
                    <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Поиск..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-7 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-orange-500/50"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto py-2">
                    {filteredOrders.length === 0 ? (
                        <div className="text-center text-slate-600 text-xs py-8">
                            {completedOrders.length === 0
                                ? 'Архив пуст'
                                : 'Нет совпадений'
                            }
                        </div>
                    ) : (
                        filteredOrders.map(order => {
                            const pCount = products.filter(p => p.orderId === order.id).length;
                            const isActive = order.id === selectedOrderId;
                            return (
                                <button
                                    key={order.id}
                                    onClick={() => setSelectedOrderId(order.id)}
                                    className={`w-full text-left px-4 py-2.5 transition-colors ${
                                        isActive
                                            ? 'bg-orange-500/15 border-r-2 border-orange-400'
                                            : 'hover:bg-slate-800/60 border-r-2 border-transparent'
                                    }`}
                                >
                                    <div className={`text-sm font-bold leading-tight ${isActive ? 'text-orange-300' : 'text-slate-200'}`}>
                                        {order.orderNumber}
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                                        {order.clientName || 'Без клиента'}
                                    </div>
                                    <div className="text-[10px] text-slate-600 mt-0.5 flex items-center gap-2">
                                        <span>🏁 {fmtDate(order.finishedAt)}</span>
                                        <span>·</span>
                                        <span>{pCount} изд.</span>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ─── Правая панель: изделия ─── */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {selectedOrder ? (
                    <>
                        {/* Шапка выбранного заказа */}
                        <div className="px-5 py-4 border-b border-slate-800 shrink-0">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-base font-black text-white">
                                        {selectedOrder.orderNumber}
                                    </h3>
                                    <div className="text-xs text-slate-400 mt-0.5">
                                        {selectedOrder.clientName || 'Без клиента'}
                                        {selectedOrder.finishedAt && (
                                            <span className="ml-2 text-slate-600">
                                                · сдан {fmtDate(selectedOrder.finishedAt)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {summary && (
                                    <div className="flex gap-3 shrink-0">
                                        <div className="text-right">
                                            <div className="text-[10px] text-slate-600 uppercase tracking-wider">Изделий</div>
                                            <div className="text-sm font-bold text-slate-300">{summary.total}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] text-slate-600 uppercase tracking-wider">С фактом</div>
                                            <div className="text-sm font-bold text-emerald-400">{summary.withActual}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] text-slate-600 uppercase tracking-wider">Всего</div>
                                            <div className="text-sm font-bold text-slate-300">{fmtMins(summary.totalMins)}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Список изделий */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {orderProducts.length === 0 ? (
                                <div className="text-center text-slate-600 text-sm py-12">
                                    <Package size={32} className="mx-auto mb-3 opacity-30" />
                                    Нет изделий в этом заказе
                                </div>
                            ) : (
                                orderProducts.map(product => (
                                    <ProductCard key={product.id} product={product} />
                                ))
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                        <Archive size={48} className="text-slate-700 mb-4" />
                        <div className="text-slate-500 font-bold text-sm mb-1">
                            Выберите заказ
                        </div>
                        <div className="text-xs text-slate-600 max-w-xs">
                            {completedOrders.length > 0
                                ? `${completedOrders.length} завершённых заказов · выберите слева для просмотра изделий и операций`
                                : 'Завершите хотя бы один заказ, чтобы заполнить базу знаний'
                            }
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
