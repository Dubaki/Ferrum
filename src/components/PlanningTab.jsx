import React, { useState } from 'react';
import { Plus, FolderOpen, Search, Package } from 'lucide-react';
import OrderCard from './planning/OrderCard';
import ProductCard from './planning/ProductCard';
import OrderSettingsModal from './planning/OrderSettingsModal';

// Стили блика
const styles = `
  @keyframes shine {
    0% { left: -100%; opacity: 0; }
    50% { opacity: 0.5; }
    100% { left: 100%; opacity: 0; }
  }
  .shiny-effect {
    position: relative;
    overflow: hidden;
  }
  .shiny-effect::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 50%;
    height: 100%;
    background: linear-gradient(to right, transparent, rgba(255,255,255,0.6), transparent);
    transform: skewX(-20deg);
    transition: none;
  }
  .shiny-effect:hover::after {
    animation: shine 0.7s ease-in-out;
  }
`;

export default function PlanningTab({ products, resources, actions, ganttItems = [], orders = [] }) {
  const [expandedOrderIds, setExpandedOrderIds] = useState([]);
  const [openExecutorDropdown, setOpenExecutorDropdown] = useState(null); // Глобальное состояние дропдауна
  const [openStatusMenuId, setOpenStatusMenuId] = useState(null);
  const [settingsOrder, setSettingsOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const toggleOrder = (id) => setExpandedOrderIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  
  const activeOrders = orders
    .filter(o => o.status === 'active')
    .filter(o => 
        (o.orderNumber && o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (o.clientName && o.clientName.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1; 
        if (!b.deadline) return -1; 
        return new Date(a.deadline) - new Date(b.deadline); 
    });

  const orphanProducts = products.filter(p => !p.orderId);

  return (
    <div className="space-y-6 pb-20 fade-in font-sans text-slate-800">
      <style>{styles}</style>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 pt-4 mb-6">
         <div>
            <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                <FolderOpen className="text-orange-600" size={32} />
                Текущие заказы
            </h2>
         </div>

         <div className="flex items-center gap-3 w-full md:w-auto">
             <div className="relative flex-1 md:w-64 group">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={18} />
                 <input 
                    type="text" 
                    placeholder="Поиск..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border-2 border-slate-200 text-slate-700 pl-10 pr-4 py-2.5 rounded-lg focus:border-slate-500 focus:ring-0 outline-none transition-all shadow-sm font-bold text-sm"
                 />
             </div>

             <button 
                onClick={actions.addOrder} 
                className="shiny-effect flex items-center gap-2 bg-slate-800 text-white px-6 py-2.5 rounded-lg shadow-lg hover:bg-orange-600 transition-all active:scale-95 font-bold uppercase tracking-wide text-xs"
             >
               <Plus size={16} strokeWidth={3} /> Создать заказ
             </button>
         </div>
      </div>

      {/* Список заказов */}
      <div className="grid gap-4">
        {activeOrders.map(order => (
            <OrderCard 
                key={order.id} 
                order={order} 
                products={products} 
                actions={actions}
                resources={resources}
                ganttItems={ganttItems}
                isExpanded={expandedOrderIds.includes(order.id)}
                onToggle={() => toggleOrder(order.id)}
                openExecutorDropdown={openExecutorDropdown}
                setOpenExecutorDropdown={setOpenExecutorDropdown}
                
                isStatusMenuOpen={openStatusMenuId === order.id}
                onToggleStatusMenu={(e) => {
                    e.stopPropagation();
                    setOpenStatusMenuId(openStatusMenuId === order.id ? null : order.id);
                }}
                onOpenSettings={(e) => {
                    e.stopPropagation();
                    setSettingsOrder(order);
                }}
            />
        ))}
        {activeOrders.length === 0 && <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-300 rounded-xl">Список пуст</div>}
      </div>

      {/* Нераспределенные изделия */}
      {orphanProducts.length > 0 && (
          <div className="mt-12 bg-slate-100 p-6 rounded-2xl border border-slate-200">
              <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><Package/> Нераспределенные</h3>
              <div className="space-y-4">
                  {orphanProducts.map(product => (
                      <ProductCard 
                          key={product.id} product={product}
                          actions={actions} resources={resources}
                          ganttItem={ganttItems.find(g => g.productId === product.id)}
                          sortedResources={resources}
                          openExecutorDropdown={openExecutorDropdown} setOpenExecutorDropdown={setOpenExecutorDropdown}
                          isOrphan={true}
                      />
                  ))}
              </div>
          </div>
      )}

      {/* Модалка настроек */}
      {settingsOrder && (
          <OrderSettingsModal 
              order={settingsOrder} 
              onClose={() => setSettingsOrder(null)} 
              actions={actions} 
          />
      )}
    </div>
  );
}