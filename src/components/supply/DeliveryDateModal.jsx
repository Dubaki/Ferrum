import { useState } from 'react';
import { X, Truck, Calendar } from 'lucide-react';

export default function DeliveryDateModal({ request, onClose, onSubmit }) {
  const [deliveryDate, setDeliveryDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!deliveryDate) {
      alert('Укажите дату доставки');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(deliveryDate);
    } catch (error) {
      console.error('Error setting delivery date:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Truck className="text-cyan-600" size={20} />
            Срок доставки
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
          <div>
            <p className="text-sm text-slate-600 mb-3">
              Заявка: <span className="font-medium">{request.requestNumber}</span>
            </p>
            {request.items?.length > 0 && (
              <p className="text-sm text-slate-600 mb-3">
                {request.items[0].title}
                {request.items.length > 1 && ` и ещё ${request.items.length - 1}`}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
              <Calendar size={14} />
              Ожидаемая дата доставки
            </label>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              required
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
                  <Truck size={18} />
                  Установить
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
