import React, { useState } from 'react';
import { X, Save, PenTool, Truck, Calendar } from 'lucide-react';

export default function NewOrderModal({ onClose, onCreate }) {
    const [formData, setFormData] = useState({
        orderNumber: '',
        clientName: '',
        deadline: '',
        hasDrawings: false,
        drawingsDeadline: '',
        hasMaterials: false,
        materialsDeadline: ''
    });

    const handleSubmit = () => {
        if (!formData.orderNumber) return alert("Введите номер заказа");
        if (!formData.deadline) return alert("Укажите срок сдачи заказа");

        // Правило: Если нет галочки, должна быть дата
        if (!formData.hasDrawings && !formData.drawingsDeadline) {
            return alert("КМД не готовы: Укажите плановую дату готовности чертежей!");
        }
        if (!formData.hasMaterials && !formData.materialsDeadline) {
            return alert("Материалы не на складе: Укажите дату поставки!");
        }

        // Логика статуса
        let initialStatus = 'work'; // По умолчанию - в работу
        if (!formData.hasMaterials) initialStatus = 'metal'; // Если нет металла - ждем металл
        else if (!formData.hasDrawings) initialStatus = 'drawings'; // Если металл есть, но нет КМД - ждем КМД

        onCreate({
            orderNumber: formData.orderNumber,
            clientName: formData.clientName,
            deadline: formData.deadline,
            // Если галочка стоит - даты ожидания нет (null), иначе берем дату из инпута
            drawingsDeadline: formData.hasDrawings ? null : formData.drawingsDeadline,
            materialsDeadline: formData.hasMaterials ? null : formData.materialsDeadline,
            customStatus: initialStatus
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
                    <h3 className="font-bold text-lg">Новый заказ: Входной контроль</h3>
                    <button onClick={onClose}><X size={20}/></button>
                </div>
                
                <div className="p-6 space-y-6">
                    {/* Основное */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Номер</label>
                            <input autoFocus type="text" value={formData.orderNumber} onChange={e=>setFormData({...formData, orderNumber: e.target.value})} className="w-full border-2 border-slate-200 rounded-lg p-2 font-bold text-slate-800 outline-none focus:border-orange-500"/>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Клиент</label>
                            <input type="text" value={formData.clientName} onChange={e=>setFormData({...formData, clientName: e.target.value})} className="w-full border-2 border-slate-200 rounded-lg p-2 font-bold text-slate-800 outline-none focus:border-orange-500"/>
                        </div>
                    </div>

                    {/* Блок КМД */}
                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                        <div className="flex items-center justify-between mb-2">
                            <label className="flex items-center gap-2 font-bold text-indigo-900 cursor-pointer">
                                <input type="checkbox" checked={formData.hasDrawings} onChange={e=>setFormData({...formData, hasDrawings: e.target.checked})} className="w-5 h-5 accent-indigo-600"/>
                                <PenTool size={18}/> Чертежи (КМД) готовы?
                            </label>
                        </div>
                        {!formData.hasDrawings && (
                            <div className="animate-in slide-in-from-top-1">
                                <label className="text-xs font-bold text-indigo-400 uppercase">Ожидаемая дата готовности</label>
                                <input type="date" value={formData.drawingsDeadline} onChange={e=>setFormData({...formData, drawingsDeadline: e.target.value})} className="w-full mt-1 border border-indigo-200 rounded p-2 bg-white font-bold text-slate-700"/>
                            </div>
                        )}
                    </div>

                    {/* Блок Материалы */}
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                        <div className="flex items-center justify-between mb-2">
                            <label className="flex items-center gap-2 font-bold text-amber-900 cursor-pointer">
                                <input type="checkbox" checked={formData.hasMaterials} onChange={e=>setFormData({...formData, hasMaterials: e.target.checked})} className="w-5 h-5 accent-amber-600"/>
                                <Truck size={18}/> Металл / Комплект. на складе?
                            </label>
                        </div>
                        {!formData.hasMaterials && (
                            <div className="animate-in slide-in-from-top-1">
                                <label className="text-xs font-bold text-amber-400 uppercase">Ожидаемая дата поставки</label>
                                <input type="date" value={formData.materialsDeadline} onChange={e=>setFormData({...formData, materialsDeadline: e.target.value})} className="w-full mt-1 border border-amber-200 rounded p-2 bg-white font-bold text-slate-700"/>
                            </div>
                        )}
                    </div>

                    {/* Срок сдачи */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Calendar size={12}/> Дедлайн заказа (Отгрузка)</label>
                        <input type="date" value={formData.deadline} onChange={e=>setFormData({...formData, deadline: e.target.value})} className="w-full border-2 border-slate-300 rounded-lg p-3 font-black text-slate-800 outline-none focus:border-red-500"/>
                    </div>

                    <button onClick={handleSubmit} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-orange-600 transition shadow-lg flex justify-center gap-2 active:scale-95">
                        <Save size={20}/> Создать заказ
                    </button>
                </div>
            </div>
        </div>
    );
}