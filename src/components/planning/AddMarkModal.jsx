import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Scale, Hash, Zap } from 'lucide-react';

export default function AddMarkModal({ onClose, onAdd, orderId }) {
  const [formData, setFormData] = useState({
    id: '',
    weight_kg: '',
    quantity: 1
  });

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.id.trim()) newErrors.id = 'Введите название/марку';
    if (!formData.weight_kg || parseFloat(formData.weight_kg) <= 0) newErrors.weight_kg = 'Введите вес';
    if (formData.quantity <= 0) newErrors.quantity = 'Минимум 1 шт';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    onAdd({
      id: formData.id.toUpperCase(),
      weight_kg: parseFloat(formData.weight_kg),
      quantity: parseInt(formData.quantity)
    });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <Zap className="text-orange-500" size={20} fill="currentColor"/>
              Добавить марку
            </h2>
            <p className="text-slate-400 text-xs mt-1">Создание нового изделия в заказе</p>
          </div>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Hash size={10}/> Марка / Название
              </label>
              <input
                autoFocus
                type="text"
                value={formData.id}
                onChange={e => setFormData(prev => ({ ...prev, id: e.target.value }))}
                placeholder="Б-01"
                className={`w-full border-2 rounded-xl p-3 font-black text-slate-800 outline-none focus:border-orange-500 transition-all ${errors.id ? 'border-red-300 bg-red-50' : 'border-slate-100 bg-slate-50'}`}
              />
              {errors.id && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.id}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                Количество (шт)
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full border-2 border-slate-100 bg-slate-50 rounded-xl p-3 font-black text-slate-800 outline-none focus:border-orange-500 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Scale size={10}/> Масса одной марки (кг)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                value={formData.weight_kg}
                onChange={e => setFormData({ ...formData, weight_kg: e.target.value })}
                placeholder="0.0"
                className={`w-full border-2 rounded-xl p-3 pl-10 font-black text-slate-800 outline-none focus:border-orange-500 transition-all ${errors.weight_kg ? 'border-red-300 bg-red-50' : 'border-slate-100 bg-slate-50'}`}
              />
              <Scale className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-orange-600 transition-all shadow-lg flex justify-center items-center gap-2 active:scale-95"
          >
            <Save size={20}/> Добавить изделие
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
