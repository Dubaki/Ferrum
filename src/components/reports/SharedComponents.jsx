import React, { useState, useEffect } from 'react';

// Кнопка переключения вкладок (iOS Style Segmented Control)
export function TabButton({ id, label, icon: Icon, active, set }) {
    const isActive = active === id;
    return (
        <button 
             onClick={() => set(id)}
             className={`
                relative flex-1 py-2.5 px-4 text-sm font-bold rounded-lg flex justify-center items-center gap-2 transition-all duration-200
                ${isActive 
                    ? 'bg-white text-slate-800 shadow-sm ring-1 ring-black/5' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }
             `}
        >
             <Icon size={16} className={isActive ? "text-indigo-600" : "text-slate-400"} /> 
             {label}
        </button>
    )
}

// Поле ввода КТУ (Стильное)
export const KtuInput = ({ resId, date, initialValue, onSave }) => {
    const [val, setVal] = useState(initialValue);
    useEffect(() => setVal(initialValue), [initialValue]);

    const handleBlur = () => {
        if (parseFloat(val) !== parseFloat(initialValue)) {
            onSave(resId, date, val);
        }
    };

    return (
        <div className="relative group">
            <input 
                type="number"
                min="0" max="50"
                value={val}
                onChange={(e) => setVal(e.target.value)}
                onBlur={handleBlur}
                className={`
                    w-16 text-center font-bold text-lg bg-transparent border-b-2 outline-none py-1 transition-all duration-300
                    ${val > 0 
                        ? 'border-emerald-500 text-emerald-700' 
                        : 'border-slate-200 text-slate-300 group-hover:border-slate-300'
                    }
                `}
            />
        </div>
    );
};

// Метрика для зарплаты
export function SalaryMetric({ label, value, suffix = '', color = 'text-slate-800', big = false }) {
    return (
        <div className="flex flex-col items-center">
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">{label}</div>
            <div className={`font-mono font-bold tracking-tight ${color} ${big ? 'text-2xl' : 'text-base'}`}>
                {value}<span className="text-xs text-slate-400 ml-0.5 font-sans">{suffix}</span>
            </div>
        </div>
    )
}