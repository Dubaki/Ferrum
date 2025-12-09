import React from 'react';
import { Trash2 } from 'lucide-react';
import { STANDARD_OPERATIONS } from '../../utils/constants';

export default function OperationRow({ op, productId, actions, resources, isOpen, onToggleDropdown }) {
    const isStandard = (name) => STANDARD_OPERATIONS.includes(name);

    return (
        <div className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded border border-slate-200 relative shadow-sm hover:border-orange-200 transition-colors">
            <div className="col-span-1 text-[10px] text-slate-400 text-center font-mono">{op.sequence}</div>
            
            {/* Выбор названия */}
            <div className="col-span-4">
                {STANDARD_OPERATIONS ? (
                    <select 
                        value={isStandard(op.name) ? op.name : 'other'} 
                        onChange={(e) => actions.updateOperation(productId, op.id, 'name', e.target.value === 'other' ? 'Новая' : e.target.value)} 
                        className="w-full text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer hover:text-orange-600 focus:text-orange-600 transition-colors"
                    >
                        {STANDARD_OPERATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        <option value="other">Свой вариант...</option>
                    </select>
                ) : <input type="text" value={op.name} className="w-full text-xs"/>}
                
                {!isStandard(op.name) && (
                    <input 
                        type="text" 
                        value={op.name} 
                        onChange={e => actions.updateOperation(productId, op.id, 'name', e.target.value)} 
                        className="w-full text-xs border-b border-orange-200 mt-1 focus:border-orange-500 outline-none" 
                        placeholder="Название..." 
                    />
                )}
            </div>
            
            {/* Исполнитель (Выпадающий список) */}
            <div className="col-span-3 relative">
                <button 
                    onClick={(e) => { e.stopPropagation(); onToggleDropdown(); }} 
                    className={`w-full text-left text-[10px] font-bold px-2 py-1.5 rounded border transition flex justify-between items-center uppercase tracking-wide
                        ${op.resourceIds?.length > 0 
                            ? 'bg-slate-800 text-white border-slate-800 hover:bg-slate-700' 
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700'
                        }
                    `}
                >
                    <span className="truncate">
                        {op.resourceIds?.length > 0 
                            ? resources.filter(r => op.resourceIds.includes(r.id)).map(r => r.name.split(' ')[0]).join(', ') 
                            : 'НАЗНАЧИТЬ'}
                    </span>
                </button>

                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-[80] cursor-default" onClick={(e) => { e.stopPropagation(); onToggleDropdown(); }}></div>
                        <div 
                            className="fixed z-[90] w-64 bg-white shadow-2xl border border-slate-200 rounded-xl p-3 max-h-64 overflow-y-auto animate-in zoom-in-95" 
                            style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
                        >
                            <div className="text-[10px] font-black text-slate-400 uppercase mb-2 px-1 tracking-wider">Выберите исполнителей</div>
                            <div className="space-y-1">
                                {resources.map(res => (
                                    <label key={res.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group">
                                        <input 
                                            type="checkbox" 
                                            checked={op.resourceIds?.includes(res.id)} 
                                            onChange={() => actions.toggleResourceForOp(productId, op.id, res.id)} 
                                            className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300 transition"
                                        />
                                        <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">{res.name}</span>
                                        <span className="text-[10px] text-slate-400 ml-auto">{res.position}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* План */}
            <div className="col-span-2 text-center">
                <input 
                    type="number" 
                    value={op.minutesPerUnit} 
                    onChange={e => actions.updateOperation(productId, op.id, 'minutesPerUnit', parseFloat(e.target.value))} 
                    className="w-full text-center text-xs bg-slate-50 rounded py-1 outline-none focus:bg-white focus:ring-2 focus:ring-slate-200 transition font-mono" 
                    placeholder="0" 
                />
            </div>

            {/* Факт + Удаление */}
            <div className="col-span-2 flex items-center gap-1">
                <input 
                    type="number" 
                    value={op.actualMinutes || 0} 
                    onChange={e => actions.updateOperation(productId, op.id, 'actualMinutes', parseFloat(e.target.value))} 
                    className="w-full text-center text-xs font-bold bg-orange-50 text-orange-700 rounded py-1 outline-none focus:ring-2 focus:ring-orange-200 transition font-mono" 
                    placeholder="0"
                />
                <button 
                    onClick={() => actions.deleteOperation(productId, op.id)} 
                    className="text-slate-300 hover:text-red-500 p-1 transition-colors" 
                    title="Удалить операцию"
                >
                    <Trash2 size={14}/>
                </button>
            </div>
        </div>
    );
}