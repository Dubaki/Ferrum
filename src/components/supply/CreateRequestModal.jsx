import { useState } from 'react';
import { X, Package, Plus, Trash2, FileText, Building, MessageSquare } from 'lucide-react';
import { SUPPLY_UNITS } from '../../utils/supplyRoles';

export default function CreateRequestModal({ orders, userRole, onClose, onCreate, editData, onEdit }) {
  const isEditing = !!editData;
  const [items, setItems] = useState(
    isEditing && editData.items?.length > 0
      ? editData.items.map(item => ({ title: item.title || '', quantity: item.quantity?.toString() || '', unit: item.unit || 'шт' }))
      : [{ title: '', quantity: '', unit: 'шт' }]
  );
  const [selectedOrders, setSelectedOrders] = useState(
    isEditing && editData.orders?.length > 0 ? editData.orders : []
  );
  const [desiredDate, setDesiredDate] = useState(isEditing ? (editData.desiredDate || '') : '');
  const [department, setDepartment] = useState(isEditing ? (editData.department || 'Химмаш') : 'Химмаш');
  const [comment, setComment] = useState(isEditing ? (editData.creatorComment || '') : '');
  const [loading, setLoading] = useState(false);

  const addItem = () => {
    setItems(prev => [...prev, { title: '', quantity: '', unit: 'шт' }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index, field, value) => {
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const toggleOrder = (order) => {
    setSelectedOrders(prev => {
      const orderId = order.id || order.orderNumber;
      const exists = prev.find(o => o.orderId === orderId);
      if (exists) {
        return prev.filter(o => o.orderId !== orderId);
      } else {
        return [...prev, { orderId: orderId, orderNumber: order.orderNumber }];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validItems = items.filter(item => item.title.trim() && item.quantity);
    if (validItems.length === 0) {
      alert('Добавьте хотя бы одну позицию с названием и количеством');
      return;
    }

    for (const item of validItems) {
      if (parseFloat(item.quantity) <= 0) {
        alert('Количество должно быть больше 0');
        return;
      }
    }
    
    if (selectedOrders.length === 0) {
        alert('Выберите заказ или "В цех"');
        return;
    }

    setLoading(true);
    try {
      const payload = {
        items: validItems.map(item => ({
          ...item,
          quantity: parseFloat(item.quantity)
        })),
        orders: selectedOrders,
        desiredDate,
        department,
        comment,
        createdBy: userRole
      };
      if (isEditing && onEdit) {
        await onEdit(payload);
      } else {
        await onCreate(payload);
      }
    } catch (error) {
      console.error(isEditing ? 'Error editing request:' : 'Error creating request:', error);
    } finally {
      setLoading(false);
    }
  };

  const workshopOrder = { orderNumber: 'В цех' };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 shrink-0">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <div className="p-2 bg-cyan-50 rounded-lg">
                <Package className="text-cyan-600" size={20} />
            </div>
            {isEditing ? 'Редактирование' : 'Новая заявка'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-5 overflow-y-auto custom-scrollbar flex-1">

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2"><Building size={14} className="inline mr-1" />Цех <span className="text-red-500">*</span></label>
            <div className="flex gap-3">
              {['Химмаш', 'РТИ'].map(dep => (
                  <label key={dep} className={`flex-1 relative cursor-pointer group`}>
                    <input type="radio" name="department" value={dep} checked={department === dep} onChange={(e) => setDepartment(e.target.value)} className="peer sr-only" />
                    <div className="p-3 rounded-xl border-2 text-center font-bold text-sm transition-all peer-checked:border-cyan-500 peer-checked:bg-cyan-50 peer-checked:text-cyan-700 border-slate-200 text-slate-500 hover:bg-slate-50">
                        {dep}
                    </div>
                  </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2"><FileText size={14} className="inline mr-1" />Заказы (можно выбрать несколько)</label>
            <div className="border border-slate-200 rounded-lg max-h-60 overflow-y-auto">
              <label className={`flex items-center gap-2 p-2 cursor-pointer hover:bg-slate-50 border-b border-slate-100 last:border-0 ${selectedOrders.find(o => o.orderId === workshopOrder.orderNumber) ? 'bg-cyan-50' : ''}`}>
                <input type="checkbox" checked={!!selectedOrders.find(o => o.orderId === workshopOrder.orderNumber)} onChange={() => toggleOrder(workshopOrder)} className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500" />
                <span className="font-medium">{workshopOrder.orderNumber}</span>
              </label>
              {orders.length === 0 ? (
                <div className="p-3 text-sm text-slate-400 text-center">Нет активных заказов</div>
              ) : (
                orders.map(order => (
                  <label key={order.id} className={`flex items-center gap-2 p-2 cursor-pointer hover:bg-slate-50 border-b border-slate-100 last:border-0 ${selectedOrders.find(o => o.orderId === order.id) ? 'bg-cyan-50' : ''}`}>
                    <input type="checkbox" checked={!!selectedOrders.find(o => o.orderId === order.id)} onChange={() => toggleOrder(order)} className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500" />
                    <span className="font-medium">{order.orderNumber}</span>
                    {order.clientName && (<span className="text-slate-500 text-sm">- {order.clientName}</span>)}
                  </label>
                ))
              )}
            </div>
            {selectedOrders.length > 0 && (<div className="mt-2 text-sm text-cyan-600">Выбрано заказов: {selectedOrders.length}</div>)}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700"><Package size={14} className="inline mr-1" />Позиции <span className="text-red-500">*</span></label>
              <button type="button" onClick={addItem} className="text-sm text-cyan-600 hover:text-cyan-700 flex items-center gap-1"><Plus size={14} />Добавить позицию</button>
            </div>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-medium text-slate-400">Позиция {index + 1}</span>
                    {items.length > 1 && (<button type="button" onClick={() => removeItem(index)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>)}
                  </div>
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => updateItem(index, 'title', e.target.value)}
                    placeholder="Название (труба 40x20, болты М10...)"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent mb-2 text-base"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      placeholder="Кол-во"
                      className="flex-1 min-w-0 px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-base"
                    />
                    <select
                      value={item.unit}
                      onChange={(e) => updateItem(index, 'unit', e.target.value)}
                      className="w-20 px-2 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-base bg-white"
                    >
                      {SUPPLY_UNITS.map(unit => (<option key={unit} value={unit}>{unit}</option>))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Желаемая дата поставки</label>
            <input type="date" value={desiredDate} onChange={(e) => setDesiredDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-base" />
          </div>

          <div>
            <label htmlFor="creator-comment" className="block text-sm font-medium text-slate-700 mb-1"><MessageSquare size={14} className="inline mr-1" />Комментарий к заявке</label>
            <textarea id="creator-comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Например: 'Очень срочно', 'Закупать только у этого поставщика'..." className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm" rows={3} />
          </div>

          <div className="flex gap-2 pt-2 sticky bottom-0 bg-white pb-2 -mb-2 border-t border-slate-100 sm:border-0 sm:static">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium">Отмена</button>
            <button type="submit" disabled={loading} className="flex-[2] px-4 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]">
              {loading ? (<span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />) : (<><Plus size={18} />{isEditing ? 'Сохранить' : 'Создать'}</>)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
