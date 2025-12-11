import React, { useState } from 'react';
import { DollarSign, Calculator } from 'lucide-react';

// Импорт компонентов (убедись, что они там есть)
import { TabButton } from './reports/SharedComponents';
import CombinedArchiveView from './reports/CombinedArchiveView';
import SalaryView from './reports/SalaryView';

export default function ReportsTab({ reports, actions, products, orders, resources }) {
  const [activeSubTab, setActiveSubTab] = useState('salary'); 

  return (
    <div className="fade-in space-y-6">
       
       {/* Навигация */}
       <div className="bg-slate-100 p-1.5 rounded-xl flex overflow-x-auto shadow-inner max-w-2xl mx-auto">
          <TabButton 
             id="salary" label="Зарплатная ведомость" icon={DollarSign} 
             active={activeSubTab} set={setActiveSubTab} 
          />
          <TabButton 
             id="costing" label="Архив и Себестоимость" icon={Calculator} 
             active={activeSubTab} set={setActiveSubTab} 
          />
       </div>

       {/* Контент */}
       <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 p-6 min-h-[600px]">
          {activeSubTab === 'costing' && (
              <CombinedArchiveView 
                  orders={orders} 
                  products={products} 
                  resources={resources} 
                  actions={actions} 
              />
          )}
          {activeSubTab === 'salary' && (
              <SalaryView 
                  resources={resources} 
                  actions={actions} 
              />
          )}
       </div>
    </div>
  );
}