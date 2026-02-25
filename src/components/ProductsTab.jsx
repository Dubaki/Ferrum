import React, { useState, useMemo } from 'react';
import { Plus, Search, ShoppingBag } from 'lucide-react';

import OrderCard from './planning/OrderCard';
import ProductCard from './planning/ProductCard';
import OrderSettingsModal from './planning/OrderSettingsModal';
import NewOrderModal from './planning/NewOrderModal';
import AddProductModal from './planning/AddProductModal';

export default function ProductsTab({ products, resources, actions, ganttItems = [], orders = [], isAdmin, userRole, supplyRequests = [], supplyActions = {} }) {
  const [expandedOrderIds, setExpandedOrderIds] = useState([]);
  const [openExecutorDropdown, setOpenExecutorDropdown] = useState(null);
  const [openStatusMenuId, setOpenStatusMenuId] = useState(null);
  const [settingsOrder, setSettingsOrder] = useState(null);

  // Состояние: В какой заказ мы сейчас добавляем изделия?
  const [addingProductToOrder, setAddingProductToOrder] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const toggleOrder = (id) => setExpandedOrderIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  // Фильтруем ТОЛЬКО товарные заказы (isProductOrder === true)
  const productOrders = useMemo(() => {
    return orders
      .filter(o => o.status === 'active' && !o.inShipping && o.isProductOrder === true) // ТОЛЬКО товарные заказы
      .filter(o =>
          (o.orderNumber && o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (o.clientName && o.clientName.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .sort((a, b) => {
          // ЛОГИКА СОРТИРОВКИ ПО СРОЧНОСТИ
          if (!a.deadline && !b.deadline) return (b.createdAt || 0) - (a.createdAt || 0);
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
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

  return (
    <div className="space-y-6 pb-20 fade-in font-sans text-slate-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 pt-4 mb-6">
         <div>
            <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                <ShoppingBag className="text-cyan-600" size={32} />
                Товарные заказы
            </h2>
            <p className="text-slate-500 text-sm font-medium mt-1">Заказы на перепродажу (без производственных операций)</p>
         </div>

         <div className="flex items-center gap-3 w-full md:w-auto">
             <div className="relative flex-1 md:w-64 group">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-500 transition-colors" size={18} />
                 <input
                    type="text"
                    placeholder="Поиск..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border-2 border-slate-200 text-slate-700 pl-10 pr-4 py-2.5 rounded-lg focus:border-cyan-500 focus:ring-0 outline-none transition-all shadow-sm font-bold text-sm"
                 />
             </div>

             {(isAdmin || userRole === 'manager') && (
                 <button
                    onClick={() => setIsCreating(true)}
                    className="shiny-effect flex items-center gap-2 bg-cyan-600 text-white px-6 py-2.5 rounded-lg shadow-lg hover:bg-cyan-700 transition-all active:scale-95 font-bold uppercase tracking-wide text-xs"
                 >
                   <Plus size={16} strokeWidth={3} /> Создать заказ
                 </button>
             )}
         </div>
      </div>

      {/* Список товарных заказов */}
      <div className="space-y-4">
        {productOrders.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-cyan-200">
                <ShoppingBag size={48} className="mx-auto mb-4 text-cyan-300" />
                <h3 className="text-xl font-bold text-slate-600 mb-2">Нет товарных заказов</h3>
                <p className="text-slate-400">
                    {isAdmin
                        ? 'Создайте новый товарный заказ, чтобы начать работу'
                        : searchTerm
                            ? 'Ничего не найдено по вашему запросу'
                            : 'Товарные заказы появятся здесь'}
                </p>
            </div>
        )}

        {productOrders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            products={products}
            orders={orders}
            actions={actions}
            resources={resources}
            isExpanded={expandedOrderIds.includes(order.id)}
            onToggle={() => toggleOrder(order.id)}
            openExecutorDropdown={openExecutorDropdown}
            setOpenExecutorDropdown={setOpenExecutorDropdown}
            isStatusMenuOpen={openStatusMenuId === order.id}
            onToggleStatusMenu={() => setOpenStatusMenuId(prev => prev === order.id ? null : order.id)}
            onOpenSettings={() => setSettingsOrder(order)}
            onAddProduct={() => setAddingProductToOrder(order)}
            onAddMark={() => {}}
            onCopyFromArchive={() => {}}
            isAdmin={isAdmin}
            userRole={userRole}
            supplyRequests={supplyRequests}
            supplyActions={supplyActions}
          />
        ))}
      </div>


      {/* Изделия без заказа */}
      {orphanProducts.length > 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-yellow-800 mb-4 flex items-center gap-2">
            <ShoppingBag size={20} /> Товары без заказа ({orphanProducts.length})
          </h3>
          <div className="space-y-3">
            {orphanProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                products={products}
                orders={orders}
                actions={actions}
                resources={resources}
                sortedResources={resources}
                isAdmin={isAdmin}
                openExecutorDropdown={openExecutorDropdown}
                setOpenExecutorDropdown={setOpenExecutorDropdown}
              />
            ))}
          </div>
        </div>
      )}

      {/* Модальные окна */}
      {isCreating && (
        <NewOrderModal
          onClose={() => setIsCreating(false)}
          onCreate={async (data) => {
            await actions.addOrder(data);
            setIsCreating(false);
          }}
        />
      )}

      {settingsOrder && (
        <OrderSettingsModal
          order={settingsOrder}
          onClose={() => setSettingsOrder(null)}
          actions={actions}
          userRole={userRole}
        />
      )}

      {addingProductToOrder && (
        <AddProductModal
          onClose={() => setAddingProductToOrder(null)}
          onAdd={handleAddFromPreset}
          isProductOrder={true}
        />
      )}
    </div>
  );
}
