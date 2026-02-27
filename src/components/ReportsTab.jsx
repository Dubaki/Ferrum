import React, { useState } from 'react';
import { DollarSign, Calculator, Package } from 'lucide-react';

// Импорт компонентов (убедись, что они там есть)
import { TabButton } from './reports/SharedComponents';
import CombinedArchiveView from './reports/CombinedArchiveView';
import SalaryView from './reports/SalaryView';
import WarehouseView from './reports/WarehouseView';

export default function ReportsTab({ reports, actions, products, orders, resources, userRole, supplyRequests, warehouseItems, warehouseActions }) {
  const [activeSubTab, setActiveSubTab] = useState('salary');

  return (
    <div className="fade-in space-y-6">

       {/* Навигация */}
       <div className="bg-slate-100/80 backdrop-blur-md p-1.5 rounded-2xl flex overflow-x-auto shadow-inner max-w-3xl mx-auto border border-slate-200/50">
          <TabButton
             id="salary" label="Зарплатная ведомость" icon={DollarSign}
             active={activeSubTab} set={setActiveSubTab}
          />
          <TabButton
             id="costing" label="Архив и Себестоимость" icon={Calculator}
             active={activeSubTab} set={setActiveSubTab}
          />
          <TabButton
             id="warehouse" label="Склад" icon={Package}
             active={activeSubTab} set={setActiveSubTab}
          />
       </div>

       {/* Контент */}
       <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200/60 border border-slate-100 p-6 min-h-[600px]">
          {activeSubTab === 'costing' && (
              <CombinedArchiveView
                  orders={orders}
                  products={products}
                  resources={resources}
                  actions={actions}
                  userRole={userRole}
                  supplyRequests={supplyRequests}
              />
          )}
          {activeSubTab === 'salary' && (
              <SalaryView
                  resources={resources}
                  actions={actions}
              />
          )}
          {activeSubTab === 'warehouse' && (
              <WarehouseView
                  supplyRequests={supplyRequests}
                  warehouseItems={warehouseItems}
                  warehouseActions={warehouseActions}
              />
          )}
       </div>
    </div>
  );
}
