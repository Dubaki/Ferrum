import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Save } from 'lucide-react';
import { formatDate } from '../../utils/helpers'; // Assuming formatDate is available

export default function SetProductStartDateModal({ product, onClose, actions }) {
    const [formData, setFormData] = useState({
        startDate: product.startDate || formatDate(new Date())
    });

    useEffect(() => {
        setFormData({ startDate: product.startDate || formatDate(new Date()) });
    }, [product.startDate]);

    const handleSave = () => {
        actions.updateProduct(product.id, 'startDate', formData.startDate);
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden ring-1 ring-white/10 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                
                <div className="bg-slate-900 p-4 text-white flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-lg flex items-center gap-2"><Calendar size={20}/> Изменить дату начала</h3>
                    <button onClick={onClose} className="hover:text-orange-500 transition"><X size={20}/></button>
                </div>
                
                <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Начало производства</label>
                        <input 
                            type="date" 
                            value={formData.startDate} 
                            onChange={e => setFormData({...formData, startDate: e.target.value})}
                            className="w-full border-2 border-slate-200 rounded-lg p-3 font-medium text-slate-700 focus:border-orange-500 outline-none transition"
                            autoFocus
                        />
                    </div>

                    <div className="pt-4 flex gap-3 mt-4 border-t border-slate-100">
                        <button 
                            onClick={onClose} 
                            className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-200 transition shadow-lg flex justify-center gap-2 active:scale-95"
                        >
                            Отмена
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
        </div>,
        document.body
    );
}