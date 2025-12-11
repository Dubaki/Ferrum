import React, { useState } from 'react';
import { X, Flame, Zap, Box, Layers, PackagePlus, ArrowRight } from 'lucide-react';
import { PRESETS } from '../../utils/presets';

export default function AddProductModal({ onClose, onAdd }) {
    const [activeTab, setActiveTab] = useState('lines'); // lines | units | custom

    const handleSelect = (presetKey) => {
        const preset = PRESETS[presetKey];
        if (!preset) return;
        onAdd(preset.items);
        onClose();
    };

    const handleCustom = () => {
        // Пустое изделие
        onAdd([{ name: 'Новое изделие', ops: [] }]);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-wide">Добавить в производство</h2>
                        <p className="text-slate-400 text-sm">Выберите готовый комплект или отдельное изделие</p>
                    </div>
                    <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition"><X size={24}/></button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 bg-slate-50 shrink-0">
                    <button 
                        onClick={() => setActiveTab('lines')}
                        className={`flex-1 py-4 font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'lines' ? 'bg-white border-b-2 border-orange-500 text-orange-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Layers size={18}/> Линии (Комплекты)
                    </button>
                    <button 
                        onClick={() => setActiveTab('units')}
                        className={`flex-1 py-4 font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'units' ? 'bg-white border-b-2 border-indigo-500 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Box size={18}/> Отдельные агрегаты
                    </button>
                    <button 
                        onClick={() => setActiveTab('custom')}
                        className={`flex-1 py-4 font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'custom' ? 'bg-white border-b-2 border-slate-500 text-slate-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <PackagePlus size={18}/> Своё изделие
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto bg-slate-50/50 flex-1">
                    
                    {/* Вкладка: ЛИНИИ */}
                    {activeTab === 'lines' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <button onClick={() => handleSelect('line_gas')} className="bg-white border-2 border-orange-100 hover:border-orange-500 p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all group text-left relative overflow-hidden">
                                <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase">Хит</div>
                                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 mb-4 group-hover:scale-110 transition-transform">
                                    <Flame size={32} fill="currentColor" />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 mb-2">Полная линия (ГАЗ)</h3>
                                <ul className="text-sm text-slate-500 space-y-1 mb-4">
                                    <li className="flex items-center gap-2"><ArrowRight size={12} className="text-orange-400"/> Печь полимеризации (Газовая)</li>
                                    <li className="flex items-center gap-2"><ArrowRight size={12} className="text-orange-400"/> Камера напыления</li>
                                    <li className="flex items-center gap-2"><ArrowRight size={12} className="text-orange-400"/> Транспортная система</li>
                                </ul>
                                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-400 uppercase">3 Изделия</span>
                                    <span className="text-orange-600 font-bold text-sm">Добавить →</span>
                                </div>
                            </button>

                            <button onClick={() => handleSelect('line_electric')} className="bg-white border-2 border-indigo-100 hover:border-indigo-500 p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all group text-left">
                                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                                    <Zap size={32} fill="currentColor" />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 mb-2">Полная линия (ЭЛЕКТРО)</h3>
                                <ul className="text-sm text-slate-500 space-y-1 mb-4">
                                    <li className="flex items-center gap-2"><ArrowRight size={12} className="text-indigo-400"/> Печь полимеризации (Электро)</li>
                                    <li className="flex items-center gap-2"><ArrowRight size={12} className="text-indigo-400"/> Камера напыления</li>
                                    <li className="flex items-center gap-2"><ArrowRight size={12} className="text-indigo-400"/> Транспортная система</li>
                                </ul>
                                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-400 uppercase">3 Изделия</span>
                                    <span className="text-indigo-600 font-bold text-sm">Добавить →</span>
                                </div>
                            </button>
                        </div>
                    )}

                    {/* Вкладка: АГРЕГАТЫ */}
                    {activeTab === 'units' && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <button onClick={() => handleSelect('gas_furnace')} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-orange-400 hover:shadow-md transition text-center group">
                                <div className="mx-auto w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center text-orange-500 mb-3 group-hover:bg-orange-500 group-hover:text-white transition-colors"><Flame size={20}/></div>
                                <div className="font-bold text-slate-700 leading-tight">Печь (Газ)</div>
                            </button>
                            
                            <button onClick={() => handleSelect('electric_furnace')} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition text-center group">
                                <div className="mx-auto w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 mb-3 group-hover:bg-indigo-500 group-hover:text-white transition-colors"><Zap size={20}/></div>
                                <div className="font-bold text-slate-700 leading-tight">Печь (Электро)</div>
                            </button>

                            <button onClick={() => handleSelect('booth')} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition text-center group">
                                <div className="mx-auto w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mb-3 group-hover:bg-blue-500 group-hover:text-white transition-colors"><Box size={20}/></div>
                                <div className="font-bold text-slate-700 leading-tight">Камера напыления</div>
                            </button>

                            <button onClick={() => handleSelect('transport')} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-400 hover:shadow-md transition text-center group">
                                <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 mb-3 group-hover:bg-slate-800 group-hover:text-white transition-colors"><Box size={20}/></div>
                                <div className="font-bold text-slate-700 leading-tight">Транспортная система</div>
                            </button>
                        </div>
                    )}

                    {/* Вкладка: СВОЁ */}
                    {activeTab === 'custom' && (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="bg-white p-8 rounded-2xl border-2 border-dashed border-slate-300 max-w-sm w-full">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                    <PackagePlus size={32}/>
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-2">Пустое изделие</h3>
                                <p className="text-slate-400 text-sm mb-6">Создать чистую карточку без операций. Вы сможете добавить операции вручную.</p>
                                <button onClick={handleCustom} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-700 transition">
                                    Создать пустое
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}