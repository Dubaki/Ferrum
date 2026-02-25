import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Scale, Hash, Ruler, Scissors, Zap, AlertCircle } from 'lucide-react';
import { getSizeCategory, needsCrane } from '../../utils/norms';

export default function AddMarkModal({ onClose, onAdd, orderId }) {
  const [formData, setFormData] = useState({
    id: '',
    weight_kg: '',
    quantity: 1,
    sizeCategory: 'medium',
    complexity: 'medium',
    hasProfileCut: true,
    hasSheetCut: false,
    needsRolling: false
  });

  const [errors, setErrors] = useState({});

  // Автоматически предлагаем категорию габарита по весу (грубая прикидка)
  useEffect(() => {
    const w = parseFloat(formData.weight_kg) || 0;
    if (w > 0) {
      let cat = 'medium';
      if (w < 20) cat = 'small';
      else if (w > 500) cat = 'large';
      else if (w > 1500) cat = 'xlarge';
      
      setFormData(prev => ({ ...prev, sizeCategory: cat }));
    }
  }, [formData.weight_kg]);

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
      ...formData,
      weight_kg: parseFloat(formData.weight_kg),
      quantity: parseInt(formData.quantity)
    });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <Zap className="text-orange-500" size={20} fill="currentColor"/>
              Добавить марку (КМД)
            </h2>
            <p className="text-slate-400 text-xs mt-1">Автоматическая генерация техмаршрута</p>
          </div>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Марка и Кол-во */}
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
                onInput={e => setFormData({ ...formData, id: e.target.value.toUpperCase() })}
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

          {/* Вес */}
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
            <p className="text-[10px] text-slate-400 mt-1">
              {parseFloat(formData.weight_kg) > 50 ? '⚠️ Требуется кран (К=1.4)' : 'Кран не требуется'}
            </p>
          </div>

          {/* Параметры AI */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase mb-2 block">Сложность</label>
              <div className="flex gap-1">
                {['simple', 'medium', 'complex'].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFormData({ ...formData, complexity: c })}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold border-2 transition-all ${formData.complexity === c ? 'bg-orange-500 border-orange-500 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                  >
                    {c === 'simple' ? 'Пр.' : c === 'medium' ? 'Ср.' : 'Сл.'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase mb-2 block">Габарит (L)</label>
              <select
                value={formData.sizeCategory}
                onChange={e => setFormData({ ...formData, sizeCategory: e.target.value })}
                className="w-full bg-white border-2 border-slate-200 rounded-lg p-2 text-[10px] font-bold text-slate-700 outline-none focus:border-orange-500"
              >
                <option value="small">{'Малый (<1.5м)'}</option>
                <option value="medium">{'Средний (1.5-3м)'}</option>
                <option value="large">{'Крупный (3-6м)'}</option>
                <option value="xlarge">{'Негабарит (>6м)'}</option>
              </select>
            </div>
          </div>

          {/* Опции резки */}
          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={formData.hasProfileCut}
                onChange={e => setFormData({ ...formData, hasProfileCut: e.target.checked })}
                className="w-4 h-4 accent-blue-600 rounded"
              />
              <span className="text-xs font-bold text-slate-600 group-hover:text-blue-600 transition-colors">Пила (профиль)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={formData.hasSheetCut}
                onChange={e => setFormData({ ...formData, hasSheetCut: e.target.checked })}
                className="w-4 h-4 accent-purple-600 rounded"
              />
              <span className="text-xs font-bold text-slate-600 group-hover:text-purple-600 transition-colors">Плазма (лист)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={formData.needsRolling}
                onChange={e => setFormData({ ...formData, needsRolling: e.target.checked })}
                className="w-4 h-4 accent-cyan-600 rounded"
              />
              <span className="text-xs font-bold text-slate-600 group-hover:text-cyan-600 transition-colors">Вальцы</span>
            </label>
          </div>

          <button
            type="submit"
            className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-orange-600 transition-all shadow-lg flex justify-center items-center gap-2 active:scale-95"
          >
            <Save size={20}/> Сгенерировать операции
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
