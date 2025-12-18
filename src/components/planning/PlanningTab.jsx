import React, { useState, useMemo } from 'react';
import { Plus, FolderOpen, Search, Package } from 'lucide-react';

import OrderCard from './OrderCard';
import ProductCard from './ProductCard';
import OrderSettingsModal from './OrderSettingsModal';
import NewOrderModal from './NewOrderModal';
import AddProductModal from './AddProductModal';
import CopyFromArchiveModal from './CopyFromArchiveModal'; 

export default function PlanningTab({ products, resources, actions, ganttItems = [], orders = [], isAdmin }) {
  const [expandedOrderIds, setExpandedOrderIds] = useState([]);
  const [openExecutorDropdown, setOpenExecutorDropdown] = useState(null);
  const [openStatusMenuId, setOpenStatusMenuId] = useState(null);
  const [settingsOrder, setSettingsOrder] = useState(null);

  // Состояние: В какой заказ мы сейчас добавляем изделия?
  const [addingProductToOrder, setAddingProductToOrder] = useState(null);

  // Состояние: В какой заказ копируем из архива?
  const [copyingToOrder, setCopyingToOrder] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const toggleOrder = (id) => setExpandedOrderIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  // Оптимизировано с useMemo для предотвращения пересчета при каждом рендере
  const activeOrders = useMemo(() => {
    return orders
      .filter(o => o.status === 'active' && !o.inShipping && o.isProductOrder !== true) // Исключаем заказы в отгрузках и ТОВАРНЫЕ заказы
      .filter(o =>
          (o.orderNumber && o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (o.clientName && o.clientName.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .sort((a, b) => {
          // ЛОГИКА СОРТИРОВКИ ПО СРОЧНОСТИ

          // 1. Если у обоих нет даты - сортируем по дате создания (новые выше)
          if (!a.deadline && !b.deadline) return (b.createdAt || 0) - (a.createdAt || 0);

          // 2. Если у одного нет даты - кидаем его вниз
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;

          // 3. Сравниваем даты (Меньшая дата = Раньше = Выше в списке)
          // Это поднимет просроченные (старые даты) и ближайшие наверх
          return new Date(a.deadline) - new Date(b.deadline);
      });
  }, [orders, searchTerm]);

  const orphanProducts = useMemo(() => products.filter(p => !p.orderId), [products]);

  // Обработчик добавления из модалки
  const handleAddFromPreset = (items) => {
      if (addingProductToOrder) {
          actions.addProductsBatch(addingProductToOrder.id, items);
          setAddingProductToOrder(null);
      }
  };

  // Обработчик копирования из архива
  const handleCopyFromArchive = (items) => {
      if (copyingToOrder) {
          actions.addProductsBatch(copyingToOrder.id, items);
          setCopyingToOrder(null);
      }
  };

  return (
    <div className="space-y-6 pb-20 fade-in font-sans text-slate-800">
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

             {isAdmin && (
                 <button 
                    onClick={() => setIsCreating(true)} 
                    className="shiny-effect flex items-center gap-2 bg-slate-800 text-white px-6 py-2.5 rounded-lg shadow-lg hover:bg-orange-600 transition-all active:scale-95 font-bold uppercase tracking-wide text-xs"
                 >
                   <Plus size={16} strokeWidth={3} /> Создать заказ
                 </button>
             )}
         </div>
      </div>

      {/* Список заказов */}
      <div className="grid gap-4">
        {activeOrders.map(order => (
            <OrderCard
                key={order.id}
                order={order}
                products={products}
                orders={orders}
                actions={actions}
                resources={resources}
                ganttItems={ganttItems}
                isExpanded={expandedOrderIds.includes(order.id)}
                onToggle={() => toggleOrder(order.id)}
                isAdmin={isAdmin}
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
                // Передаем функции открытия модалок
                onAddProduct={() => setAddingProductToOrder(order)}
                onCopyFromArchive={() => setCopyingToOrder(order)}
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
                          key={product.id}
                          product={product}
                          products={products}
                          orders={orders}
                          actions={actions}
                          resources={resources}
                          ganttItem={ganttItems.find(g => g.productId === product.id)}
                          sortedResources={resources}
                          openExecutorDropdown={openExecutorDropdown}
                          setOpenExecutorDropdown={setOpenExecutorDropdown}
                          isOrphan={true}
                          isAdmin={isAdmin}
                      />
                  ))}
              </div>
          </div>
      )}

      {/* Модалка создания заказа */}
      {isCreating && (
          <NewOrderModal 
             onClose={() => setIsCreating(false)} 
             onCreate={actions.addOrder} 
          />
      )}

      {/* Модалка настроек заказа */}
      {settingsOrder && (
          <OrderSettingsModal 
              order={settingsOrder} 
              onClose={() => setSettingsOrder(null)} 
              actions={actions} 
          />
      )}

      {/* Модалка добавления изделия */}
      {addingProductToOrder && (
          <AddProductModal
              onClose={() => setAddingProductToOrder(null)}
              onAdd={handleAddFromPreset}
          />
      )}

      {/* Модалка копирования из архива */}
      {copyingToOrder && (
          <CopyFromArchiveModal
              onClose={() => setCopyingToOrder(null)}
              onCopy={handleCopyFromArchive}
              orders={orders}
              products={products}
          />
      )}
    </div>
  );
}