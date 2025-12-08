import React, { useState } from 'react';
import { X, Save } from 'lucide-react';

export default function ResourceSettingsModal({ resource, onClose, onSave }) {
    const [rate, setRate] = useState(resource.baseRate || 0);
    const [empDate, setEmpDate] = useState(resource.employmentDate || '');
    const [ktuEligible, setKtuEligible] = useState(resource.ktuEligible !== false);

    const handleSave = () => {
        onSave(resource.id, 'baseRate', parseFloat(rate));
        onSave(resource.id, 'employmentDate', empDate);
        onSave(resource.id, 'ktuEligible', ktuEligible);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg text-gray-800">Настройки: {resource.name}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X /></button>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Ставка за смену (₽)</label>
                        <input 
                            type="number" 
                            value={rate}
                            onChange={(e) => setRate(e.target.value)}
                            className="w-full border-2 border-gray-200 rounded-lg p-3 font-bold text-lg focus:border-blue-500 outline-none transition"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Дата приема</label>
                        <input 
                            type="date" 
                            value={empDate}
                            onChange={(e) => setEmpDate(e.target.value)}
                            className="w-full border-2 border-gray-200 rounded-lg p-3 text-sm focus:border-blue-500 outline-none transition"
                        />
                    </div>
                    
                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition">
                        <input 
                            type="checkbox" 
                            checked={ktuEligible}
                            onChange={(e) => setKtuEligible(e.target.checked)}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                        />
                        <div>
                            <div className="font-bold text-sm text-gray-700">Начислять КТУ</div>
                            <div className="text-[10px] text-gray-400">Если выключено, поле КТУ будет скрыто</div>
                        </div>
                    </label>

                    <button 
                        onClick={handleSave} 
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold shadow-lg hover:bg-blue-700 transition mt-4"
                    >
                        <Save size={18} className="inline mr-2"/> Сохранить
                    </button>
                </div>
            </div>
        </div>
    );
}