import React, { useState, useCallback, useMemo, memo } from 'react';
import { X, Package, Plus, Trash2, FileText, Building, MessageSquare } from 'lucide-react';
import { SUPPLY_UNITS } from '../../utils/supplyRoles';

// --- МЕМОИЗИРОВАННЫЙ КОМПОНЕНТ ПОЗИЦИИ ---
const ItemRow = memo(({ index, item, onUpdate, onRemove, showRemove }) => {
  return (
    <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 transition-all hover:border-slate-300">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Позиция {index + 1}</span>
        {showRemove && (
          <button 
            type="button" 
            onClick={() => onRemove(index)} 
            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      
      <input
        type="text"
        value={item.title}
        onChange={(e) => onUpdate(index, 'title', e.target.value)}
        placeholder="Название (труба 40x20, болты М10...)"
        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent mb-2 text-sm font-bold text-slate-700"
      />
      
      <div className="flex gap-2">
        <input
          type="number"
          step="0.01"
          min="0"
          value={item.quantity}
          onChange={(e) => onUpdate(index, 'quantity', e.target.value)}
          placeholder="Кол-во"
          className="flex-1 min-w-0 px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm font-black"
        />
        <select
          value={item.unit}
          onChange={(e) => onUpdate(index, 'unit', e.target.value)}
          className="w-24 px-2 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-xs font-bold bg-white cursor-pointer"
        >
          {SUPPLY_UNITS.map(unit => (<option key={unit} value={unit}>{unit}</option>))}
        </select>
      </div>
    </div>
  );
});

// --- МЕМОИЗИРОВАННЫЙ ВЫБОР ЗАКАЗА ---
const OrderItem = memo(({ order, isSelected, onToggle }) => (
  <label className={`flex items-center gap-3 p-3 cursor-pointer transition-all border-b border-slate-100 last:border-0 hover:bg-slate-50 ${isSelected ? 'bg-cyan-50/50' : ''}`}>
    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-cyan-500 border-cyan-500' : 'border-slate-300 bg-white'}`}>
      {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
    </div>
    <input 
      type="checkbox" 
      checked={isSelected} 
      onChange={() => onToggle(order)} 
      className="hidden" 
    />
    <div className="flex flex-col min-w-0">
      <span className={`text-sm font-black uppercase tracking-tight ${isSelected ? 'text-cyan-700' : 'text-slate-700'}`}>
        {order.orderNumber}
      </span>
      {order.clientName && (
        <span className="text-[10px] text-slate-400 font-bold uppercase truncate">
          {order.clientName}
        </span>
      )}
    </div>
  </label>
));

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

  // Стабильные коллбэки для предотвращения лишних ререндеров
  const addItem = useCallback(() => {
    setItems(prev => [...prev, { title: '', quantity: '', unit: 'шт' }]);
  }, []);

  const removeItem = useCallback((index) => {
    setItems(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
  }, []);

  const updateItem = useCallback((index, field, value) => {
    setItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const toggleOrder = useCallback((order) => {
    setSelectedOrders(prev => {
      const orderId = order.id || order.orderNumber;
      const exists = prev.find(o => o.orderId === orderId);
      if (exists) {
        return prev.filter(o => o.orderId !== orderId);
      } else {
        return [...prev, { orderId: orderId, orderNumber: order.orderNumber }];
      }
    });
  }, []);

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

  const workshopOrder = useMemo(() => ({ orderNumber: 'В цех' }), []);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-500 overflow-hidden border border-white/20">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-black text-white p-5 flex justify-between items-center relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/10">
              <Package size={20} className="text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-widest leading-none">
                {isEditing ? 'Редактирование' : 'Новая заявка'}
              </h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-1.5">Снабжение и комплектующие</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all active:scale-90 relative z-10">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-white">

          {/* ЦЕХ */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">
              <Building size={12} className="inline mr-1 -mt-0.5" />Цех назначения
            </label>
            <div className="flex gap-3">
              {['Химмаш', 'РТИ'].map(dep => (
                  <label key={dep} className="flex-1 cursor-pointer">
                    <input type="radio" name="department" value={dep} checked={department === dep} onChange={(e) => setDepartment(e.target.value)} className="peer sr-only" />
                    <div className="py-3 px-4 rounded-2xl border-2 text-center font-black text-xs uppercase tracking-widest transition-all peer-checked:border-cyan-500 peer-checked:bg-cyan-50 peer-checked:text-cyan-700 border-slate-100 text-slate-400 hover:bg-slate-50">
                        {dep}
                    </div>
                  </label>
              ))}
            </div>
          </div>

          {/* ЗАКАЗЫ */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">
              <FileText size={12} className="inline mr-1 -mt-0.5" />Привязка к заказам
            </label>
            <div className="border border-slate-100 rounded-2xl max-h-48 overflow-y-auto custom-scrollbar bg-slate-50/50 shadow-inner">
              <OrderItem 
                order={workshopOrder} 
                isSelected={!!selectedOrders.find(o => o.orderId === workshopOrder.orderNumber)} 
                onToggle={toggleOrder} 
              />
              {orders.map(order => (
                <OrderItem 
                  key={order.id} 
                  order={order} 
                  isSelected={!!selectedOrders.find(o => o.orderId === order.id)} 
                  onToggle={toggleOrder} 
                />
              ))}
              {orders.length === 0 && <div className="p-4 text-center text-[10px] font-bold text-slate-400 uppercase">Нет активных заказов</div>}
            </div>
          </div>

          {/* ПОЗИЦИИ */}
          <div className="space-y-4">
            <div className="flex items-center justify-between ml-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                <Package size={12} className="inline mr-1 -mt-0.5" />Состав заявки
              </label>
              <button 
                type="button" 
                onClick={addItem} 
                className="text-[10px] font-black text-cyan-600 hover:text-cyan-700 uppercase tracking-widest flex items-center gap-1.5 transition-colors"
              >
                <Plus size={14} strokeWidth={3} /> Добавить
              </button>
            </div>
            
            <div className="space-y-3">
              {items.map((item, index) => (
                <ItemRow 
                  key={index}
                  index={index}
                  item={item}
                  onUpdate={updateItem}
                  onRemove={removeItem}
                  showRemove={items.length > 1}
                />
              ))}
            </div>
          </div>

          {/* ДОПОЛНИТЕЛЬНО */}
          <div className="grid grid-cols-1 gap-6 pt-2 border-t border-slate-50">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Желаемая дата поставки</label>
              <input 
                type="date" 
                value={desiredDate} 
                onChange={(e) => setDesiredDate(e.target.value)} 
                min={new Date().toISOString().split('T')[0]} 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition-all text-sm font-bold text-slate-700 shadow-sm" 
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Комментарий</label>
              <textarea 
                value={comment} 
                onChange={(e) => setComment(e.target.value)} 
                placeholder="Срочность, особенности закупки..." 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition-all text-sm font-medium text-slate-700 shadow-sm resize-none" 
                rows={2} 
              />
            </div>
          </div>

          {/* КНОПКИ */}
          <div className="flex gap-3 pt-4 sticky bottom-0 bg-white/90 backdrop-blur-md pb-2 -mb-2 z-20 border-t border-slate-50">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 px-4 py-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 hover:text-slate-600 transition-all font-black uppercase tracking-widest text-[10px]"
            >
              Отмена
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="flex-[2] px-4 py-4 bg-slate-900 text-white rounded-2xl hover:bg-cyan-600 shadow-lg hover:shadow-cyan-200 transition-all font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isEditing ? <FileText size={16} /> : <Plus size={16} strokeWidth={3} />}
                  {isEditing ? 'Сохранить изменения' : 'Создать заявку'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
