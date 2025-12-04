import React from 'react';
import { Save, Trash2 } from 'lucide-react';

export default function ReportsTab({ reports, resourceLoad, actions }) {
  
  // Функция сохранения отчета в облако
  const saveReport = async () => {
    // Формируем объект отчета
    const reportData = {
      createdAt: Date.now(), // Метка времени для сортировки
      date: new Date().toLocaleDateString('ru-RU'),
      // Важно: делаем глубокую копию объекта resourceLoad, чтобы сохранить цифры "как есть" на данный момент
      stats: JSON.parse(JSON.stringify(resourceLoad)), 
      month: new Date().toLocaleString('ru-RU', { month: 'long', year: 'numeric' })
    };
    
    try {
      // Отправляем в Firebase
      await actions.addReport(reportData);
      alert('Отчет успешно сохранен в облако!');
    } catch (error) {
      console.error("Ошибка при сохранении:", error);
      alert('Не удалось сохранить отчет. Проверьте консоль.');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Месячные отчеты</h2>
          <button 
            onClick={saveReport} 
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 font-medium transition"
          >
            <Save size={18} /> Сохранить отчет
          </button>
        </div>
        
        {/* Блок 1: Текущий прогноз (то, что сейчас в работе) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
           <div className="border border-blue-200 bg-blue-50/50 p-5 rounded-xl">
             <h3 className="font-bold text-blue-900 mb-3 text-lg">Текущий месяц (Прогноз)</h3>
             <div className="space-y-3">
               {Object.values(resourceLoad).map(stat => (
                 <div key={stat.name} className="flex justify-between text-sm border-b border-blue-100 pb-1">
                   <span className="text-gray-600">{stat.name}</span>
                   <span className="font-bold text-blue-700">{stat.totalHours.toFixed(1)} ч</span>
                 </div>
               ))}
             </div>
           </div>
        </div>

        {/* Блок 2: Список сохраненных отчетов из базы */}
        <div className="space-y-4">
           {reports.map(report => (
               <div key={report.id} className="border p-4 rounded-lg flex justify-between items-center bg-white shadow-sm hover:shadow-md transition">
                   <div>
                       <div className="font-bold text-lg text-gray-800">{report.month}</div>
                       <div className="text-sm text-gray-500">Создан: {report.date}</div>
                       
                       {/* Можно вывести краткую сводку по отчету */}
                       <div className="mt-2 text-xs text-gray-400 flex gap-2">
                           {report.stats && Object.values(report.stats).slice(0, 3).map(s => (
                               <span key={s.name}>{s.name}: {s.totalHours.toFixed(0)}ч</span>
                           ))}
                           {report.stats && Object.keys(report.stats).length > 3 && <span>...</span>}
                       </div>
                   </div>
                   
                   <button 
                     onClick={() => actions.deleteReport(report.id)} 
                     className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded transition"
                     title="Удалить отчет"
                   >
                     <Trash2 size={20}/>
                   </button>
               </div>
           ))}
           
           {reports.length === 0 && (
               <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                   Нет сохраненных отчетов
               </div>
           )}
        </div>
    </div>
  );
}