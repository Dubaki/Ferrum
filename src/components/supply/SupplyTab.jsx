import { useState, useMemo } from 'react';
import { Plus, Search, Package, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { SUPPLY_STATUSES, canPerformAction, getRoleLabel } from '../../utils/supplyRoles';
import SupplyRequestCard from './SupplyRequestCard';
import CreateRequestModal from './CreateRequestModal';
import RequestDetailsModal from './RequestDetailsModal';
import DeliveryDateModal from './DeliveryDateModal';

export default function SupplyTab({ orders, supplyRequests, supplyActions, userRole, hasSupplyAlert }) {
  const [activeTab, setActiveTab] = useState('in_progress'); // 'in_progress' | 'paid'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);

  // Фильтрация заявок
  const filteredRequests = useMemo(() => {
    let list = activeTab === 'in_progress'
      ? supplyRequests.filter(r => !['paid', 'awaiting_delivery', 'delivered'].includes(r.status))
      : supplyRequests.filter(r => ['paid', 'awaiting_delivery', 'delivered'].includes(r.status));

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter(r =>
        r.requestNumber?.toLowerCase().includes(query) ||
        r.title?.toLowerCase().includes(query) ||
        r.orderNumber?.toLowerCase().includes(query)
      );
    }

    return list;
  }, [supplyRequests, activeTab, searchQuery]);

  // Подсчёт заявок по статусам
  const statusCounts = useMemo(() => {
    const counts = {};
    supplyRequests.forEach(r => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return counts;
  }, [supplyRequests]);

  // Активные заказы для создания заявки
  const activeOrders = useMemo(() => {
    return orders.filter(o => o.status === 'active');
  }, [orders]);

  // Количество заявок в каждой вкладке
  const inProgressCount = supplyRequests.filter(r => !['paid', 'awaiting_delivery', 'delivered'].includes(r.status)).length;
  const paidCount = supplyRequests.filter(r => ['paid', 'awaiting_delivery', 'delivered'].includes(r.status)).length;

  // Количество заявок, требующих внимания
  const alertCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return supplyRequests.filter(r => {
      if (r.status !== 'awaiting_delivery' || !r.deliveryDate) return false;
      const deliveryDate = new Date(r.deliveryDate);
      deliveryDate.setHours(0, 0, 0, 0);
      return deliveryDate <= tomorrow;
    }).length;
  }, [supplyRequests]);

  const handleOpenDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  const handleOpenDeliveryModal = (request) => {
    setSelectedRequest(request);
    setShowDeliveryModal(true);
  };

  const handleCreateRequest = async (data) => {
    await supplyActions.createRequest({
      ...data,
      createdBy: userRole || 'technologist'
    });
    setShowCreateModal(false);
  };

  const handleSetDeliveryDate = async (date) => {
    if (selectedRequest) {
      await supplyActions.setDeliveryDate(selectedRequest.id, date);
      setShowDeliveryModal(false);
      setSelectedRequest(null);
    }
  };

  const canCreate = canPerformAction(userRole, 'createRequest');

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="text-cyan-600" size={28} />
            Снабжение
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Заявки на материалы и комплектующие
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition font-medium"
          >
            <Plus size={18} />
            Новая заявка
          </button>
        )}
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
            <Clock size={16} />
            В работе
          </div>
          <div className="text-2xl font-bold text-slate-800">{inProgressCount}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="flex items-center gap-2 text-emerald-600 text-sm mb-1">
            <CheckCircle2 size={16} />
            Оплачено
          </div>
          <div className="text-2xl font-bold text-emerald-600">{statusCounts['paid'] || 0}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="flex items-center gap-2 text-cyan-600 text-sm mb-1">
            <Package size={16} />
            Ожидает доставки
          </div>
          <div className="text-2xl font-bold text-cyan-600">{statusCounts['awaiting_delivery'] || 0}</div>
        </div>
        <div className={`rounded-lg p-4 border ${alertCount > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'}`}>
          <div className={`flex items-center gap-2 text-sm mb-1 ${alertCount > 0 ? 'text-orange-600' : 'text-slate-500'}`}>
            <AlertTriangle size={16} />
            Требует внимания
          </div>
          <div className={`text-2xl font-bold ${alertCount > 0 ? 'text-orange-600' : 'text-slate-400'}`}>{alertCount}</div>
        </div>
      </div>

      {/* Вкладки и поиск */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('in_progress')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'in_progress'
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            В работе ({inProgressCount})
          </button>
          <button
            onClick={() => setActiveTab('paid')}
            className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
              activeTab === 'paid'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Оплачено ({paidCount})
            {alertCount > 0 && (
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            )}
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Поиск по номеру, названию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Список заявок */}
      <div className="space-y-3">
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center border border-slate-200">
            <Package className="mx-auto text-slate-300 mb-3" size={48} />
            <p className="text-slate-500">
              {searchQuery ? 'Заявки не найдены' : 'Нет заявок'}
            </p>
          </div>
        ) : (
          filteredRequests.map(request => (
            <SupplyRequestCard
              key={request.id}
              request={request}
              userRole={userRole}
              supplyActions={supplyActions}
              onOpenDetails={() => handleOpenDetails(request)}
              onOpenDeliveryModal={() => handleOpenDeliveryModal(request)}
            />
          ))
        )}
      </div>

      {/* Модалки */}
      {showCreateModal && (
        <CreateRequestModal
          orders={activeOrders}
          userRole={userRole}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateRequest}
        />
      )}

      {showDetailsModal && selectedRequest && (
        <RequestDetailsModal
          request={selectedRequest}
          userRole={userRole}
          supplyActions={supplyActions}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedRequest(null);
          }}
        />
      )}

      {showDeliveryModal && selectedRequest && (
        <DeliveryDateModal
          request={selectedRequest}
          onClose={() => {
            setShowDeliveryModal(false);
            setSelectedRequest(null);
          }}
          onSubmit={handleSetDeliveryDate}
        />
      )}
    </div>
  );
}
