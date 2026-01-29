import { useState, useMemo } from 'react';
import { Plus, Search, Package, AlertTriangle, CheckCircle2, Clock, Inbox, Archive, AlertCircle } from 'lucide-react';
import { getRequestsForRole, isRequestOverdue, getRoleLabel } from '../../utils/supplyRoles';
import SupplyRequestCard from './SupplyRequestCard';
import CreateRequestModal from './CreateRequestModal';
import RequestDetailsModal from './RequestDetailsModal';
import DeliveryDateModal from './DeliveryDateModal';

export default function SupplyTab({ orders, supplyRequests, supplyActions, userRole, hasSupplyAlert }) {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'my' | 'overdue' | 'archive'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);

  // Личные заявки (для текущей роли)
  const myRequests = useMemo(() => {
    if (!userRole) return [];
    return getRequestsForRole(supplyRequests, userRole);
  }, [supplyRequests, userRole]);

  // Все активные заявки (не в архиве)
  const allRequests = useMemo(() => {
    return supplyRequests.filter(r => r.status !== 'delivered');
  }, [supplyRequests]);

  // Просроченные заявки
  const overdueRequests = useMemo(() => {
    return supplyRequests.filter(r => r.status !== 'delivered' && isRequestOverdue(r));
  }, [supplyRequests]);

  // Архивные заявки
  const archivedRequests = useMemo(() => {
    return supplyRequests.filter(r => r.status === 'delivered');
  }, [supplyRequests]);

  // Выбор списка заявок в зависимости от активной вкладки
  const currentRequests = useMemo(() => {
    let list;
    switch (activeTab) {
      case 'my':
        list = myRequests;
        break;
      case 'all':
        list = allRequests;
        break;
      case 'overdue':
        list = overdueRequests;
        break;
      case 'archive':
        list = archivedRequests;
        break;
      default:
        list = [];
    }

    // Поиск
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter(r => {
        // Поиск по номеру заявки
        if (r.requestNumber?.toLowerCase().includes(query)) return true;
        // Поиск по названиям позиций
        if (r.items?.some(item => item.title?.toLowerCase().includes(query))) return true;
        // Поиск по номерам заказов
        if (r.orders?.some(order => order.orderNumber?.toLowerCase().includes(query))) return true;
        // Обратная совместимость со старым форматом
        if (r.title?.toLowerCase().includes(query)) return true;
        if (r.orderNumber?.toLowerCase().includes(query)) return true;
        return false;
      });
    }

    return list;
  }, [activeTab, myRequests, allRequests, overdueRequests, archivedRequests, searchQuery]);

  // Активные заказы для создания заявки
  const activeOrders = useMemo(() => {
    return orders.filter(o => o.status === 'active');
  }, [orders]);

  // Статистика
  const stats = useMemo(() => {
    return {
      my: myRequests.length,
      all: allRequests.length,
      overdue: overdueRequests.length,
      archive: archivedRequests.length,
      inProgress: supplyRequests.filter(r => !['delivered'].includes(r.status)).length,
      paid: supplyRequests.filter(r => r.status === 'paid').length,
      awaitingDelivery: supplyRequests.filter(r => r.status === 'awaiting_delivery').length
    };
  }, [myRequests, allRequests, overdueRequests, archivedRequests, supplyRequests]);

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

  const canCreate = userRole === 'technologist' || userRole === 'director' || userRole === 'shopManager';
  const roleLabel = getRoleLabel(userRole);

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
            {userRole ? `Вы вошли как: ${roleLabel}` : 'Войдите в систему для работы'}
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

      {/* Статистика - компактная */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-white rounded border border-slate-200 px-3 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Clock size={14} className="text-slate-500" />
            <span className="text-xs font-medium text-slate-600">В работе</span>
          </div>
          <div className="text-lg font-bold text-slate-800">{stats.inProgress}</div>
        </div>
        <div className="bg-white rounded border border-slate-200 px-3 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <span className="text-xs font-medium text-emerald-600">Оплачено</span>
          </div>
          <div className="text-lg font-bold text-emerald-600">{stats.paid}</div>
        </div>
        <div className="bg-white rounded border border-slate-200 px-3 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Package size={14} className="text-cyan-600" />
            <span className="text-xs font-medium text-cyan-600">Ожидает</span>
          </div>
          <div className="text-lg font-bold text-cyan-600">{stats.awaitingDelivery}</div>
        </div>
        <div className={`rounded border px-3 py-1.5 flex items-center justify-between ${stats.overdue > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={14} className={stats.overdue > 0 ? 'text-orange-600' : 'text-slate-500'} />
            <span className={`text-xs font-medium ${stats.overdue > 0 ? 'text-orange-600' : 'text-slate-500'}`}>Просрочено</span>
          </div>
          <div className={`text-lg font-bold ${stats.overdue > 0 ? 'text-orange-600 animate-pulse' : 'text-slate-400'}`}>{stats.overdue}</div>
        </div>
      </div>

      {/* Поиск - на мобилке сверху */}
      <div className="relative sm:hidden">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Поиск заявок..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-base"
        />
      </div>

      {/* Вкладки */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 -mx-1 px-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 ${
              activeTab === 'all'
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Package size={16} />
            <span className="hidden sm:inline">Все заявки</span>
            <span className="sm:hidden">Все</span>
            <span className="text-xs opacity-75">({stats.all})</span>
          </button>
          {userRole && (
            <button
              onClick={() => setActiveTab('my')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 ${
                activeTab === 'my'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Inbox size={16} />
              <span className="hidden sm:inline">Моя папка</span>
              <span className="sm:hidden">Мои</span>
              <span className="text-xs opacity-75">({stats.my})</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('overdue')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 ${
              activeTab === 'overdue'
                ? 'bg-orange-600 text-white'
                : stats.overdue > 0
                  ? 'bg-orange-50 text-orange-600 border border-orange-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <AlertCircle size={16} />
            <span className="hidden sm:inline">Требует внимания</span>
            <span className="sm:hidden">Срочно</span>
            <span className="text-xs opacity-75">({stats.overdue})</span>
          </button>
          <button
            onClick={() => setActiveTab('archive')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 ${
              activeTab === 'archive'
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Archive size={16} />
            <span>Архив</span>
            <span className="text-xs opacity-75">({stats.archive})</span>
          </button>
        </div>

        {/* Поиск - на десктопе справа */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Поиск..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Список заявок */}
      <div className="space-y-3">
        {!userRole && activeTab === 'my' ? (
          <div className="bg-white rounded-lg p-8 text-center border border-slate-200">
            <AlertCircle className="mx-auto text-slate-300 mb-3" size={48} />
            <p className="text-slate-500">Войдите в систему, чтобы увидеть свои заявки</p>
          </div>
        ) : currentRequests.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center border border-slate-200">
            <Package className="mx-auto text-slate-300 mb-3" size={48} />
            <p className="text-slate-500">
              {searchQuery ? 'Заявки не найдены' : 'Нет заявок'}
            </p>
          </div>
        ) : (
          currentRequests.map(request => (
            <SupplyRequestCard
              key={request.id}
              request={request}
              userRole={userRole}
              supplyActions={supplyActions}
              onOpenDetails={() => handleOpenDetails(request)}
              onOpenDeliveryModal={() => handleOpenDeliveryModal(request)}
              showOverdueIndicator={isRequestOverdue(request)}
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
