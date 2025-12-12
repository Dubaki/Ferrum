import React, { useState } from 'react';
import { X, Settings, Trash2, Save, PenTool, Truck, Droplet } from 'lucide-react';

export default function OrderSettingsModal({ order, onClose, actions }) {
    const [formData, setFormData] = useState({
        orderNumber: order.orderNumber || '',
        clientName: order.clientName || '',
        paymentDate: order.paymentDate || '',
        deadline: order.deadline || '',
        drawingsDeadline: order.drawingsDeadline || '', // Новый: Срок КМД
        materialsDeadline: order.materialsDeadline || '', // Новый: Срок Металла
        paintDeadline: order.paintDeadline || ''          // Новый: Срок Краски
    });

    const handleSave = () => {
        // Обновляем все поля
        actions.updateOrder(order.id, 'orderNumber', formData.orderNumber);
        actions.updateOrder(order.id, 'clientName', formData.clientName);
        actions.updateOrder(order.id, 'paymentDate', formData.paymentDate);
        actions.updateOrder(order.id, 'deadline', formData.deadline);
        actions.updateOrder(order.id, 'drawingsDeadline', formData.drawingsDeadline);
        actions.updateOrder(order.id, 'materialsDeadline', formData.materialsDeadline);
        actions.updateOrder(order.id, 'paintDeadline', formData.paintDeadline);

        // Опциональная логика авто-статусов
        if (formData.drawingsDeadline && !formData.materialsDeadline && order.customStatus === 'metal') {
             actions.updateOrder(order.id, 'customStatus', 'drawings');
        }
        if (formData.materialsDeadline && order.customStatus === 'drawings') {
             actions.updateOrder(order.id, 'customStatus', 'metal');
        }

        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden ring-1 ring-white/10 flex flex-col max-h-[90vh]">
                
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
                                onChange={e => setFormData({...formData, orderNumber: e.target.value})}
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
                                onChange={e => setFormData({...formData, clientName: e.target.value})}
                                className="w-full border-2 border-slate-200 rounded-lg p-3 font-medium text-slate-800 focus:border-orange-500 outline-none transition"
                                placeholder="Название компании"
                            />
                        </div>
                    </div>

                    {/* Блок подготовки производства (НОВЫЙ) */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                        <div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Подготовка производства</div>
                        
                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase mb-1">
                                <PenTool size={14}/> План готовности КМД
                            </label>
                            <input 
                                type="date" 
                                value={formData.drawingsDeadline} 
                                onChange={e => setFormData({...formData, drawingsDeadline: e.target.value})}
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
                                onChange={e => setFormData({...formData, materialsDeadline: e.target.value})}
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
                                onChange={e => setFormData({...formData, paintDeadline: e.target.value})}
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
                                onChange={e => setFormData({...formData, paymentDate: e.target.value})}
                                className="w-full border-2 border-emerald-100 bg-emerald-50/30 rounded-lg p-2 text-sm focus:border-emerald-500 outline-none transition font-medium text-slate-700"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Срок сдачи</label>
                            <input 
                                type="date" 
                                value={formData.deadline} 
                                onChange={e => setFormData({...formData, deadline: e.target.value})}
                                className="w-full border-2 border-slate-200 rounded-lg p-2 text-sm focus:border-orange-500 outline-none transition font-medium text-slate-700"
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3 mt-4 border-t border-slate-100">
                        <button 
                            onClick={() => { if(confirm("Удалить заказ полностью?")) { actions.deleteOrder(order.id); onClose(); }}} 
                            className="p-3 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition bg-slate-50 border border-transparent hover:border-red-100" 
                            title="Удалить заказ"
                        >
                            <Trash2 size={20}/>
                        </button>
                        <button 
                            onClick={handleSave} 
                            className="flex-1 bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition shadow-lg flex justify-center gap-2 active:scale-95"
                        >
                            <Save size={18}/> Сохранить
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}