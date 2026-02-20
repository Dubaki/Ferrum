import React, { useState, useMemo, useCallback } from 'react';
import { Package, Plus, Trash2, Search, TrendingUp, BarChart3, Archive, ChevronDown, ChevronRight } from 'lucide-react';

// ─── Inline-ячейка с числовым редактированием ───
function InlineNumberCell({ value, onSave, placeholder = '0', suffix = '' }) {
    const [editing, setEditing] = useState(false);
    const [val, setVal] = useState(String(value || ''));

    const handleBlur = () => {
        setEditing(false);
        const num = parseFloat(val) || 0;
        if (num !== (value || 0)) onSave(num);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') e.target.blur();
        if (e.key === 'Escape') { setVal(String(value || '')); setEditing(false); }
    };

    if (!editing) {
        return (
            <button
                onClick={() => { setVal(String(value || '')); setEditing(true); }}
                className="w-full text-center font-bold text-sm py-1 px-2 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
                {value ? <>{value}<span className="text-slate-400 text-xs ml-0.5">{suffix}</span></> : <span className="text-slate-300">{placeholder}</span>}
            </button>
        );
    }

    return (
        <input
            type="number"
            min="0"
            autoFocus
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-20 text-center font-bold text-sm bg-white border-2 border-blue-400 rounded-lg py-1 px-2 outline-none"
        />
    );
}

// ─── Inline-ячейка с текстовым редактированием ───
function InlineTextCell({ value, onSave, placeholder = '—' }) {
    const [editing, setEditing] = useState(false);
    const [val, setVal] = useState(value || '');

    const handleBlur = () => {
        setEditing(false);
        if (val !== (value || '')) onSave(val);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') e.target.blur();
        if (e.key === 'Escape') { setVal(value || ''); setEditing(false); }
    };

    if (!editing) {
        return (
            <button
                onClick={() => { setVal(value || ''); setEditing(true); }}
                className="w-full text-left text-sm py-1 px-2 rounded-lg hover:bg-slate-100 transition cursor-pointer truncate"
            >
                {value || <span className="text-slate-300">{placeholder}</span>}
            </button>
        );
    }

    return (
        <input
            type="text"
            autoFocus
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full text-sm bg-white border-2 border-blue-400 rounded-lg py-1 px-2 outline-none"
        />
    );
}

// ─── KPI-карточка ───
function KpiCard({ label, value, icon: Icon, color = 'text-slate-800' }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color === 'text-blue-600' ? 'bg-blue-50' : color === 'text-emerald-600' ? 'bg-emerald-50' : 'bg-slate-100'}`}>
                <Icon size={20} className={color} />
            </div>
            <div>
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">{label}</div>
                <div className={`text-xl font-black ${color}`}>{value}</div>
            </div>
        </div>
    );
}

// ─── Основной компонент ───
export default function WarehouseView({ supplyRequests, warehouseItems, warehouseActions }) {
    const [search, setSearch] = useState('');
    const [minOrders, setMinOrders] = useState(2);
    const [analyticsOpen, setAnalyticsOpen] = useState(true);

    // ─── Аналитика: группировка позиций из доставленных заявок ───
    const analytics = useMemo(() => {
        const delivered = (supplyRequests || []).filter(r => r.status === 'delivered');
        if (!delivered.length) return [];

        const map = {};

        delivered.forEach(req => {
            const deliveredAt = req.deliveredAt || (req.statusHistory?.find(h => h.status === 'delivered')?.timestamp);
            const deliveredDate = deliveredAt
                ? (typeof deliveredAt === 'number' ? new Date(deliveredAt) : new Date(deliveredAt))
                : new Date(req.updatedAt);

            (req.items || []).forEach(item => {
                const key = item.title.trim().toLowerCase();
                if (!key) return;

                if (!map[key]) {
                    map[key] = {
                        key,
                        title: item.title.trim(),
                        unit: item.unit || 'шт',
                        totalQty: 0,
                        orderCount: 0,
                        firstDate: deliveredDate,
                        lastDate: deliveredDate,
                        requests: [],
                    };
                }

                map[key].totalQty += item.quantity || 0;
                map[key].orderCount += 1;
                if (deliveredDate < map[key].firstDate) map[key].firstDate = deliveredDate;
                if (deliveredDate > map[key].lastDate) map[key].lastDate = deliveredDate;
                map[key].requests.push({ requestNumber: req.requestNumber, quantity: item.quantity, date: deliveredDate });
            });
        });

        // Рассчитать среднее в месяц
        const now = new Date();
        return Object.values(map).map(item => {
            const monthsSpan = Math.max(1,
                (now.getFullYear() - item.firstDate.getFullYear()) * 12 +
                (now.getMonth() - item.firstDate.getMonth()) + 1
            );
            return {
                ...item,
                avgPerOrder: Math.round((item.totalQty / item.orderCount) * 10) / 10,
                avgPerMonth: Math.round((item.totalQty / monthsSpan) * 10) / 10,
                monthsSpan,
            };
        }).sort((a, b) => b.orderCount - a.orderCount);
    }, [supplyRequests]);

    // ─── Множество ключей уже добавленных на склад ───
    const warehouseKeys = useMemo(() => {
        return new Set((warehouseItems || []).map(w => w.title.trim().toLowerCase()));
    }, [warehouseItems]);

    // ─── Обогащение складских позиций аналитикой ───
    const enrichedWarehouseItems = useMemo(() => {
        const analyticsMap = {};
        analytics.forEach(a => { analyticsMap[a.key] = a; });

        return (warehouseItems || []).map(item => {
            const a = analyticsMap[item.title.trim().toLowerCase()];
            return {
                ...item,
                orderCount: a?.orderCount || 0,
                totalQty: a?.totalQty || 0,
                avgPerMonth: a?.avgPerMonth || 0,
                lastDate: a?.lastDate || null,
            };
        });
    }, [warehouseItems, analytics]);

    // ─── Отфильтрованная аналитика ───
    const filteredAnalytics = useMemo(() => {
        return analytics.filter(a => {
            if (a.orderCount < minOrders) return false;
            if (warehouseKeys.has(a.key)) return false;
            if (search) {
                const s = search.toLowerCase();
                if (!a.title.toLowerCase().includes(s)) return false;
            }
            return true;
        });
    }, [analytics, minOrders, warehouseKeys, search]);

    // ─── Отфильтрованные складские позиции ───
    const filteredWarehouse = useMemo(() => {
        if (!search) return enrichedWarehouseItems;
        const s = search.toLowerCase();
        return enrichedWarehouseItems.filter(w => w.title.toLowerCase().includes(s));
    }, [enrichedWarehouseItems, search]);

    // ─── KPI ───
    const totalManaged = (warehouseItems || []).length;
    const totalMonthlyVolume = (warehouseItems || []).reduce((sum, w) => sum + (w.monthlyVolume || 0), 0);
    const totalAnalyticsItems = analytics.length;

    // ─── Handlers ───
    const handleAddToWarehouse = useCallback((item) => {
        warehouseActions.addItem({
            title: item.title,
            unit: item.unit,
            minStock: 0,
            monthlyVolume: Math.round(item.avgPerMonth),
            note: '',
        });
    }, [warehouseActions]);

    const handleUpdate = useCallback((id, field, value) => {
        warehouseActions.updateItem(id, { [field]: value });
    }, [warehouseActions]);

    const handleDelete = useCallback((id) => {
        warehouseActions.deleteItem(id);
    }, [warehouseActions]);

    const formatDate = (date) => {
        if (!date) return '—';
        const d = date instanceof Date ? date : new Date(date);
        return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    return (
        <div className="space-y-6">

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard label="Позиций на складе" value={totalManaged} icon={Package} color="text-blue-600" />
                <KpiCard label="Общий месячный объём" value={totalMonthlyVolume || '—'} icon={TrendingUp} color="text-emerald-600" />
                <KpiCard label="Уникальных в истории" value={totalAnalyticsItems} icon={BarChart3} color="text-slate-800" />
            </div>

            {/* Поиск */}
            <div className="relative max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    placeholder="Поиск по названию..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
                />
            </div>

            {/* ═══════ Секция 1: Управляемые позиции ═══════ */}
            <div>
                <h2 className="text-lg font-black text-slate-800 mb-3 flex items-center gap-2">
                    <Package size={20} className="text-blue-600" />
                    Складские позиции
                    {totalManaged > 0 && <span className="text-sm font-bold text-slate-400">{totalManaged}</span>}
                </h2>

                {filteredWarehouse.length === 0 ? (
                    <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-10 text-center">
                        <Archive size={40} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-500 font-bold">Нет складских позиций</p>
                        <p className="text-slate-400 text-sm mt-1">Добавьте позиции из аналитики ниже</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                                    <th className="text-left py-3 px-4">Название</th>
                                    <th className="text-center py-3 px-2 w-16">Ед.</th>
                                    <th className="text-center py-3 px-2 w-28">Неснижаемый</th>
                                    <th className="text-center py-3 px-2 w-28">Мес. объём</th>
                                    <th className="text-center py-3 px-2 w-20">Заявок</th>
                                    <th className="text-center py-3 px-2 w-24">Ср./мес</th>
                                    <th className="text-center py-3 px-2 w-32">Посл. закупка</th>
                                    <th className="text-left py-3 px-2 w-40">Примечание</th>
                                    <th className="w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredWarehouse.map(item => (
                                    <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="py-2 px-4 font-bold text-sm text-slate-800">{item.title}</td>
                                        <td className="py-2 px-2 text-center text-xs text-slate-500">{item.unit}</td>
                                        <td className="py-2 px-2 text-center">
                                            <InlineNumberCell
                                                value={item.minStock}
                                                onSave={(v) => handleUpdate(item.id, 'minStock', v)}
                                                suffix={item.unit}
                                            />
                                        </td>
                                        <td className="py-2 px-2 text-center">
                                            <InlineNumberCell
                                                value={item.monthlyVolume}
                                                onSave={(v) => handleUpdate(item.id, 'monthlyVolume', v)}
                                                suffix={item.unit}
                                            />
                                        </td>
                                        <td className="py-2 px-2 text-center text-sm font-bold text-slate-600">{item.orderCount || '—'}</td>
                                        <td className="py-2 px-2 text-center text-sm font-bold text-blue-600">{item.avgPerMonth || '—'}</td>
                                        <td className="py-2 px-2 text-center text-xs text-slate-500">{formatDate(item.lastDate)}</td>
                                        <td className="py-2 px-2">
                                            <InlineTextCell
                                                value={item.note}
                                                onSave={(v) => handleUpdate(item.id, 'note', v)}
                                                placeholder="заметка..."
                                            />
                                        </td>
                                        <td className="py-2 px-1">
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition"
                                                title="Удалить"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ═══════ Секция 2: Аналитика ═══════ */}
            <div>
                <button
                    onClick={() => setAnalyticsOpen(!analyticsOpen)}
                    className="flex items-center gap-2 text-lg font-black text-slate-800 mb-3 hover:text-blue-600 transition"
                >
                    {analyticsOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    <BarChart3 size={20} className="text-emerald-600" />
                    Аналитика закупок
                    <span className="text-sm font-bold text-slate-400">{filteredAnalytics.length}</span>
                </button>

                {analyticsOpen && (
                    <>
                        {/* Фильтр минимального количества заявок */}
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-xs text-slate-500 font-bold">Минимум заявок:</span>
                            {[2, 3, 5].map(n => (
                                <button
                                    key={n}
                                    onClick={() => setMinOrders(n)}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                                        minOrders === n
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    {n}+
                                </button>
                            ))}
                        </div>

                        {filteredAnalytics.length === 0 ? (
                            <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                                <p className="text-slate-400 text-sm">
                                    {analytics.length === 0
                                        ? 'Нет доставленных заявок для анализа'
                                        : 'Все подходящие позиции уже добавлены на склад'}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-2xl border border-slate-200">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                                            <th className="text-left py-3 px-4">Название</th>
                                            <th className="text-center py-3 px-2 w-16">Ед.</th>
                                            <th className="text-center py-3 px-2 w-20">Заявок</th>
                                            <th className="text-center py-3 px-2 w-24">Всего</th>
                                            <th className="text-center py-3 px-2 w-24">Ср./заявку</th>
                                            <th className="text-center py-3 px-2 w-24">Ср./мес</th>
                                            <th className="text-center py-3 px-2 w-32">Посл. закупка</th>
                                            <th className="w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredAnalytics.map(item => (
                                            <tr key={item.key} className="hover:bg-emerald-50/30 transition-colors">
                                                <td className="py-2.5 px-4 font-bold text-sm text-slate-800">{item.title}</td>
                                                <td className="py-2.5 px-2 text-center text-xs text-slate-500">{item.unit}</td>
                                                <td className="py-2.5 px-2 text-center">
                                                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-black">
                                                        {item.orderCount}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-2 text-center text-sm font-bold text-slate-700">
                                                    {item.totalQty}<span className="text-slate-400 text-xs ml-0.5">{item.unit}</span>
                                                </td>
                                                <td className="py-2.5 px-2 text-center text-sm text-slate-600">{item.avgPerOrder}</td>
                                                <td className="py-2.5 px-2 text-center text-sm font-bold text-emerald-600">{item.avgPerMonth}</td>
                                                <td className="py-2.5 px-2 text-center text-xs text-slate-500">{formatDate(item.lastDate)}</td>
                                                <td className="py-2.5 px-1">
                                                    <button
                                                        onClick={() => handleAddToWarehouse(item)}
                                                        className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-300 hover:text-emerald-600 transition"
                                                        title="Добавить на склад"
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
