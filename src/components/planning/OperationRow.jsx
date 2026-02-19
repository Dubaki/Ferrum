import React, { useState, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, ChevronUp, ChevronDown, Calendar, Check, UserPlus } from 'lucide-react';
import { STANDARD_OPERATIONS } from '../../utils/constants';

// Вынесенный компонент списка для максимальной производительности
const ExecutorSelector = memo(({ isOpen, onClose, op, resources, onToggle, productId }) => {
    if (!isOpen) return null;

    return createPortal(
        <>
            {/* Прозрачная подложка для мгновенного закрытия */}
            <div
                className="fixed inset-0 z-[9998] bg-slate-900/10 backdrop-blur-[2px] transition-opacity duration-300"
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
            ></div>

            {/* Меню с аппаратным ускорением анимации */}
            <div
                className="fixed z-[9999] w-[calc(100vw-2rem)] sm:w-80 bg-white shadow-[0_20px_70px_-10px_rgba(0,0,0,0.25)] border border-slate-200 rounded-2xl p-2 sm:p-3 overflow-hidden animate-in zoom-in-95 fade-in duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    willChange: 'transform, opacity'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-3 px-3 pt-2">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Исполнители</div>
                    <div className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
                        Выбрано: {op.resourceIds?.length || 0}
                    </div>
                </div>
                
                <div className="space-y-0.5 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                    {resources.map(res => {
                        const isSelected = op.resourceIds?.includes(res.id);
                        return (
                            <label
                                key={res.id}
                                className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-200 group ${
                                    isSelected 
                                    ? 'bg-slate-900 text-white shadow-md shadow-slate-200 scale-[1.02]' 
                                    : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                    isSelected ? 'bg-orange-500 border-orange-500' : 'border-slate-200 group-hover:border-slate-300 bg-white'
                                }`}>
                                    {isSelected && <Check size={12} strokeWidth={4} className="text-white" />}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-sm font-bold truncate">{res.name}</span>
                                    <span className={`text-[10px] uppercase tracking-tight font-medium ${isSelected ? 'text-slate-400' : 'text-slate-400 opacity-70'}`}>
                                        {res.position}
                                    </span>
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={isSelected || false}
                                    onChange={() => onToggle(productId, op.id, res.id)}
                                />
                            </label>
                        );
                    })}
                </div>
                
                <button 
                    onClick={onClose}
                    className="w-full mt-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-widest rounded-xl transition-colors"
                >
                    Готово
                </button>
            </div>
        </>,
        document.body
    );
});

function OperationRow({ op, product, products, orders, productId, actions, resources, isAdmin, isFirst, isLast, onMoveUp, onMoveDown }) {
    // ЛОКАЛЬНОЕ СОСТОЯНИЕ для мгновенного отклика
    const [isLocalOpen, setIsLocalOpen] = useState(false);

    const isStandard = (name) => STANDARD_OPERATIONS.includes(name);
    const isCompleted = (op.actualMinutes || 0) > 0;

    const handleDateChange = (field, newDate) => {
        actions.updateOperation(productId, op.id, field, newDate);
    };

    // Оптимизированный список имен исполнителей
    const assignedNames = useMemo(() => {
        if (!op.resourceIds?.length) return null;
        return resources
            .filter(r => op.resourceIds.includes(r.id))
            .map(r => r.name.split(' ')[0])
            .join(', ');
    }, [op.resourceIds, resources]);

    const rowClass = isCompleted
        ? "grid grid-cols-12 gap-2 items-center bg-emerald-50 p-2 rounded-xl border border-emerald-200 relative transition-all duration-300"
        : "grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-xl border border-slate-100 relative shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-300";

    return (
        <div className={rowClass}>
            {/* Кнопки порядка */}
            {isAdmin && (
                <div className="col-span-1 flex flex-col gap-0.5">
                    <button
                        onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
                        disabled={isFirst}
                        className={`p-1 rounded-lg transition-colors ${isFirst ? 'text-slate-100' : 'text-slate-300 hover:text-indigo-600 hover:bg-indigo-50'}`}
                    >
                        <ChevronUp size={14} strokeWidth={3} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
                        disabled={isLast}
                        className={`p-1 rounded-lg transition-colors ${isLast ? 'text-slate-100' : 'text-slate-300 hover:text-indigo-600 hover:bg-indigo-50'}`}
                    >
                        <ChevronDown size={14} strokeWidth={3} />
                    </button>
                </div>
            )}
            {!isAdmin && <div className="col-span-1"></div>}

            {/* Выбор названия */}
            <div className="col-span-3">
                <select 
                    value={isStandard(op.name) ? op.name : 'other'} 
                    onChange={(e) => actions.updateOperation(productId, op.id, 'name', e.target.value === 'other' ? 'Новая' : e.target.value)} 
                    disabled={!isAdmin}
                    className={`w-full text-xs font-black text-slate-700 bg-transparent outline-none transition-colors appearance-none ${isAdmin ? 'cursor-pointer hover:text-orange-600' : ''}`}
                >
                    {STANDARD_OPERATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    <option value="other">Свой вариант...</option>
                </select>
                {!isStandard(op.name) && (
                    <input 
                        type="text" 
                        value={op.name} 
                        onChange={e => actions.updateOperation(productId, op.id, 'name', e.target.value)} 
                        disabled={!isAdmin}
                        className="w-full text-[10px] font-bold border-b border-orange-100 mt-0.5 outline-none bg-transparent focus:border-orange-400 transition-colors"
                        placeholder="Название..." 
                    />
                )}
            </div>

            {/* Даты */}
            <div className="col-span-2 flex flex-col items-center">
                <div className="flex items-center gap-1">
                    <input
                        type="date"
                        value={op.startDate || op.plannedDate || ''}
                        onChange={(e) => handleDateChange('startDate', e.target.value)}
                        disabled={!isAdmin}
                        className="w-full text-[9px] font-bold text-slate-500 bg-slate-50 rounded-md py-1 px-1 outline-none border border-transparent focus:border-indigo-200 transition-all"
                    />
                    <span className="text-[10px] text-slate-300 font-bold">-</span>
                    <input
                        type="date"
                        value={op.endDate || ''}
                        onChange={(e) => handleDateChange('endDate', e.target.value)}
                        disabled={!isAdmin}
                        className="w-full text-[9px] font-bold text-slate-500 bg-slate-50 rounded-md py-1 px-1 outline-none border border-transparent focus:border-orange-200 transition-all"
                    />
                </div>
            </div>
            
            {/* Исполнитель */}
            <div className="col-span-3">
                <button 
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        if (isAdmin) setIsLocalOpen(true); 
                    }} 
                    className={`w-full h-8 px-2 rounded-xl border transition-all duration-300 flex items-center justify-between group/btn
                        ${op.resourceIds?.length > 0 
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-100 hover:shadow-lg' 
                            : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-300 hover:bg-white'
                        }
                    `}
                >
                    <span className="text-[10px] font-black uppercase tracking-tight truncate flex-1 text-left">
                        {assignedNames || 'Назначить'}
                    </span>
                    <UserPlus size={12} className={`shrink-0 transition-transform duration-300 ${op.resourceIds?.length ? 'text-orange-400' : 'text-slate-300 group-hover/btn:scale-110'}`} />
                </button>

                <ExecutorSelector 
                    isOpen={isLocalOpen}
                    onClose={() => setIsLocalOpen(false)}
                    op={op}
                    resources={resources}
                    onToggle={actions.toggleResourceForOp}
                    productId={productId}
                />
            </div>

            {/* План */}
            <div className="col-span-1">
                <input 
                    type="number" 
                    value={op.minutesPerUnit} 
                    onChange={e => actions.updateOperation(productId, op.id, 'minutesPerUnit', parseFloat(e.target.value))} 
                    disabled={!isAdmin}
                    className="w-full text-center text-xs font-bold bg-slate-50 rounded-lg py-1.5 outline-none border border-transparent focus:border-slate-200 transition-all font-mono"
                />
            </div>

            {/* Факт */}
            <div className="col-span-2 flex items-center gap-1.5 pl-1">
                <input 
                    type="number" 
                    value={op.actualMinutes || 0} 
                    onChange={e => actions.updateOperation(productId, op.id, 'actualMinutes', parseFloat(e.target.value))} 
                    disabled={!isAdmin}
                    className="w-full text-center text-xs font-black bg-orange-50 text-orange-700 rounded-lg py-1.5 outline-none border border-transparent focus:border-orange-200 transition-all font-mono shadow-inner"
                />
                {isAdmin && (
                    <button onClick={() => actions.deleteOperation(productId, op.id)} className="text-slate-200 hover:text-red-500 p-1.5 transition-colors">
                        <Trash2 size={14} strokeWidth={2.5}/>
                    </button>
                )}
            </div>
        </div>
    );
}

export default memo(OperationRow);