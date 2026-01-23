import { useState } from 'react';
import { X, Package, Plus } from 'lucide-react';
import { SUPPLY_UNITS } from '../../utils/supplyRoles';

export default function CreateRequestModal({ orders, userRole, onClose, onCreate }) {
  const [formData, setFormData] = useState({
    orderId: '',
    orderNumber: '',
    title: '',
    description: '',
    quantity: '',
    unit: 'шт',
    desiredDate: ''
  });
  const [loading, setLoading] = useState(false);

  const handleOrderChange = (orderId) => {
    const order = orders.find(o => o.id === orderId);
    setFormData(prev => ({
      ...prev,
      orderId: orderId,
      orderNumber: order?.orderNumber || ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert('Введите название');
      return;
    }
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      alert('Введите количество');
      return;
    }

    setLoading(true);
    try {
      await onCreate({
        ...formData,
        quantity: parseFloat(formData.quantity),
        createdBy: userRole
      });
    } catch (error) {
      console.error('Error creating request:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Package className="text-cyan-600" size={20} />
            Новая заявка
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded transition"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Привязка к заказу */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Заказ (необязательно)
            </label>
            <select
              value={formData.orderId}
              onChange={(e) => handleOrderChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              <option value="">Не привязано</option>
              {orders.map(order => (
                <option key={order.id} value={order.id}>
                  {order.orderNumber} {order.clientName ? `- ${order.clientName}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Название */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Название <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Например: Профильная труба 40x20"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              required
            />
          </div>

          {/* Описание */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Описание
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Дополнительная информация..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Количество и единица измерения */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Количество <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                placeholder="0"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Ед. изм.
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                {SUPPLY_UNITS.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Желаемая дата */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Желаемая дата поставки
            </label>
            <input
              type="date"
              value={formData.desiredDate}
              onChange={(e) => setFormData(prev => ({ ...prev, desiredDate: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>

          {/* Кнопки */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Plus size={18} />
                  Создать
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
