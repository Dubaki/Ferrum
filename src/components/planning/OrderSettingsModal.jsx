import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Settings, Trash2, Save, PenTool, Truck, Droplet, Cpu, Scale } from 'lucide-react';

const CATEGORIES_A = [
  { id: 'beam', label: 'Балка' },
  { id: 'column', label: 'Колонна' },
  { id: 'truss', label: 'Ферма' },
  { id: 'brace', label: 'Связи' },
  { id: 'purlin', label: 'Прогоны' },
  { id: 'plate', label: 'Пластины/Узлы' },
  { id: 'other', label: 'Другое' },
];

const CATEGORIES_B = [
  { id: 'ladder', label: 'Лестница' },
  { id: 'handrail', label: 'Ограждение' },
  { id: 'platform', label: 'Площадка' },
  { id: 'seal', label: 'Сальник' },
  { id: 'stair', label: 'Стремянка' },
  { id: 'light_pole', label: 'Опора' },
  { id: 'foundation', label: 'Фундамент' },
  { id: 'other', label: 'Другое' },
];

export default function OrderSettingsModal({ order, onClose, actions, userRole }) {
    const [formData, setFormData] = useState({
        orderNumber: order.orderNumber || '',
        clientName: order.clientName || '',
        paymentDate: order.paymentDate || '',
        deadline: order.deadline || '',
        drawingsDeadline: order.drawingsDeadline || '',
        materialsDeadline: order.materialsDeadline || '',
        paintDeadline: order.paintDeadline || '',
        // AI Planning
        orderType: order.orderType || 'A',
        category: order.category || 'other',
        priority: order.priority || 3,
        complexity: order.complexity || 2,
        sizeCategory: order.sizeCategory || 'medium',
        weightTotalKg: order.weightTotalKg || '',
        notes: order.notes || '',
    });

    const categories = formData.orderType === 'A' ? CATEGORIES_A : CATEGORIES_B;

    const handleSave = () => {
        actions.updateOrderSettings(order.id, {
            orderNumber: formData.orderNumber,
            clientName: formData.clientName,
            paymentDate: formData.paymentDate,
            deadline: formData.deadline,
            drawingsDeadline: formData.drawingsDeadline,
            materialsDeadline: formData.materialsDeadline,
            paintDeadline: formData.paintDeadline,
            orderType: formData.orderType,
            category: formData.category,
            priority: parseInt(formData.priority),
            complexity: parseInt(formData.complexity),
            sizeCategory: formData.sizeCategory,
            weightTotalKg: parseFloat(formData.weightTotalKg) || 0,
            notes: formData.notes,
        }, userRole);

        if (formData.drawingsDeadline && !formData.materialsDeadline && order.customStatus === 'metal') {
             actions.updateOrder(order.id, 'customStatus', 'drawings', userRole);
        }
        if (formData.materialsDeadline && order.customStatus === 'drawings') {
             actions.updateOrder(order.id, 'customStatus', 'metal', userRole);
        }

        onClose();
    };

    const set = (field) => (e) => setFormData(prev => ({ ...prev, [field]: e.target.value }));

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden ring-1 ring-white/10 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

                <div className="bg-slate-900 p-4 text-white flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-lg flex items-center gap-2"><Settings size={20}/> Параметры заказа</h3>
                    <button onClick={onClose} className="hover:text-orange-500 transition"><X size={20}/></button>
                </div>

                <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                    {/* Основные данные */}
                    <div className="space-y-4 border-b border-slate-100 pb-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Номер договора</label>
                            <input
                                type="text"
                                value={formData.orderNumber}
                                onChange={set('orderNumber')}
                                className="w-full border-2 border-slate-200 rounded-lg p-3 font-black text-lg text-slate-800 focus:border-orange-500 outline-none transition"
                                placeholder="Например: 124-Ф"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Клиент</label>
                            <input
                                type="text"
                                value={formData.clientName}
                                onChange={set('clientName')}
                                className="w-full border-2 border-slate-200 rounded-lg p-3 font-medium text-slate-800 focus:border-orange-500 outline-none transition"
                                placeholder="Название компании"
                            />
                        </div>
                    </div>

                    {/* AI Planning — только для начальника цеха и выше */}
                    {!order.isProductOrder && (
                        <div className="bg-slate-900 text-white rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/10">
                                <Cpu size={16} className="text-cyan-400" />
                                <span className="text-xs font-black uppercase tracking-widest text-cyan-400">Параметры планирования</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[9px] font-bold text-slate-400 uppercase">Тип изделия</label>
                                        <div className="grid grid-cols-2 gap-2 mt-1">
                                            {['A', 'B'].map(t => (
                                                <label key={t} className={`flex items-center justify-center p-2 rounded-lg border-2 cursor-pointer transition-all ${formData.orderType === t ? (t === 'A' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-orange-500/20 border-orange-500 text-orange-400') : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}>
                                                    <input type="radio" value={t} checked={formData.orderType === t} onChange={set('orderType')} className="hidden" />
                                                    <span className="text-xs font-bold">{t === 'A' ? 'Тип А (МК)' : 'Тип Б (Малые)'}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[9px] font-bold text-slate-400 uppercase">Категория</label>
                                        <select
                                            value={formData.category}
                                            onChange={set('category')}
                                            className="w-full mt-1 bg-white/5 border-2 border-white/10 rounded-lg p-2 text-xs font-bold text-white outline-none focus:border-cyan-500"
                                        >
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id} className="bg-slate-800">{cat.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-[9px] font-bold text-slate-400 uppercase">Размер</label>
                                        <select
                                            value={formData.sizeCategory}
                                            onChange={set('sizeCategory')}
                                            className="w-full mt-1 bg-white/5 border-2 border-white/10 rounded-lg p-2 text-xs font-bold text-white outline-none focus:border-cyan-500"
                                        >
                                            <option value="small" className="bg-slate-800">Малый</option>
                                            <option value="medium" className="bg-slate-800">Средний</option>
                                            <option value="large" className="bg-slate-800">Крупный</option>
                                            <option value="xlarge" className="bg-slate-800">Очень крупный</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1"><Scale size={10}/> Вес заказа (кг)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.weightTotalKg}
                                            onChange={set('weightTotalKg')}
                                            className="w-full mt-1 bg-white/5 border-2 border-white/10 rounded-lg p-2 text-xs font-bold text-white outline-none focus:border-cyan-500"
                                            placeholder="Напр. 4500"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[9px] font-bold text-slate-400 uppercase">Сложность</label>
                                        <select
                                            value={formData.complexity}
                                            onChange={set('complexity')}
                                            className="w-full mt-1 bg-white/5 border-2 border-white/10 rounded-lg p-2 text-xs font-bold text-white outline-none focus:border-cyan-500"
                                        >
                                            <option value="1" className="bg-slate-800">1 — Простая</option>
                                            <option value="2" className="bg-slate-800">2 — Средняя</option>
                                            <option value="3" className="bg-slate-800">3 — Сложная</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-[9px] font-bold text-slate-400 uppercase">Приоритет</label>
                                        <select
                                            value={formData.priority}
                                            onChange={set('priority')}
                                            className="w-full mt-1 bg-white/5 border-2 border-white/10 rounded-lg p-2 text-xs font-bold text-white outline-none focus:border-cyan-500"
                                        >
                                            <option value="1" className="bg-slate-800">1 — Горит!</option>
                                            <option value="2" className="bg-slate-800">2 — Высокий</option>
                                            <option value="3" className="bg-slate-800">3 — Средний</option>
                                            <option value="4" className="bg-slate-800">4 — Низкий</option>
                                            <option value="5" className="bg-slate-800">5 — Запас</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-3">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Примечания</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={set('notes')}
                                    rows={2}
                                    className="w-full mt-1 bg-white/5 border-2 border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-cyan-500 resize-none"
                                    placeholder="Особенности заказа..."
                                />
                            </div>
                        </div>
                    )}

                    {/* Подготовка производства */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                        <div className="text-xs font-black text-slate-400 uppercase tracking-wider">Подготовка производства</div>

                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase mb-1">
                                <PenTool size={14}/> План готовности КМД
                            </label>
                            <input
                                type="date"
                                value={formData.drawingsDeadline}
                                onChange={set('drawingsDeadline')}
                                className="w-full border-2 border-indigo-100 bg-white rounded-lg p-2 text-sm focus:border-indigo-500 outline-none transition font-bold text-slate-700"
                            />
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-rose-600 uppercase mb-1">
                                <Truck size={14}/> Поставка комплектующих
                            </label>
                            <input
                                type="date"
                                value={formData.materialsDeadline}
                                onChange={set('materialsDeadline')}
                                className="w-full border-2 border-rose-100 bg-white rounded-lg p-2 text-sm focus:border-rose-500 outline-none transition font-bold text-slate-700"
                            />
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase mb-1">
                                <Droplet size={14}/> Поставка краски
                            </label>
                            <input
                                type="date"
                                value={formData.paintDeadline}
                                onChange={set('paintDeadline')}
                                className="w-full border-2 border-emerald-100 bg-white rounded-lg p-2 text-sm focus:border-emerald-500 outline-none transition font-bold text-slate-700"
                            />
                        </div>
                    </div>

                    {/* Финансы и Сдача */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-emerald-600 uppercase mb-1">Дата оплаты</label>
                            <input
                                type="date"
                                value={formData.paymentDate}
                                onChange={set('paymentDate')}
                                className="w-full border-2 border-emerald-100 bg-emerald-50/30 rounded-lg p-2 text-sm focus:border-emerald-500 outline-none transition font-medium text-slate-700"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Срок сдачи</label>
                            <input
                                type="date"
                                value={formData.deadline}
                                onChange={set('deadline')}
                                className="w-full border-2 border-slate-200 rounded-lg p-2 text-sm focus:border-orange-500 outline-none transition font-medium text-slate-700"
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3 mt-4 border-t border-slate-100">
                        {userRole !== 'manager' && (
                            <button
                                onClick={() => { if(confirm("Удалить заказ полностью?")) { actions.deleteOrder(order.id); onClose(); }}}
                                className="p-3 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition bg-slate-50 border border-transparent hover:border-red-100"
                                title="Удалить заказ"
                            >
                                <Trash2 size={20}/>
                            </button>
                        )}
                        <button
                            onClick={handleSave}
                            className="flex-1 bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition shadow-lg flex justify-center gap-2 active:scale-95"
                        >
                            <Save size={18}/> Сохранить
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
