import { useState, useMemo } from 'react';
import { Plus, Search, Package, AlertTriangle, CheckCircle2, Clock, Inbox, Archive, AlertCircle, Truck } from 'lucide-react';
import { getRequestsForRole, isRequestOverdue, getRoleLabel } from '../../utils/supplyRoles';
import SupplyRequestCard from './SupplyRequestCard';
import CreateRequestModal from './CreateRequestModal';
import RequestDetailsModal from './RequestDetailsModal';

const StatCard = ({ icon, label, value, colorClass, pulse = false }) => (
  <div className={`bg-white rounded-lg border border-neutral-200/80 px-4 py-3 flex items-center justify-between`}>
    <div className="flex items-center gap-2">
      {icon}
      <span className={`text-sm font-medium ${colorClass}`}>{label}</span>
    </div>
    <div className={`text-xl font-bold ${colorClass} ${pulse ? 'animate-pulse' : ''}`}>{value}</div>
  </div>
);

export default function SupplyTab({ orders, supplyRequests, supplyActions, userRole }) {
  const [activeTab, setActiveTab] = useState('all');
  const [activeDepartment, setActiveDepartment] = useState('Химмаш');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);

  const departmentFilteredRequests = useMemo(() => supplyRequests.filter(r => 
    activeDepartment === 'Химмаш' ? r.department === 'Химмаш' || !r.department : r.department === activeDepartment
  ), [supplyRequests, activeDepartment]);

  const myRequests = useMemo(() => getRequestsForRole(departmentFilteredRequests, userRole), [departmentFilteredRequests, userRole]);
  const allRequests = useMemo(() => departmentFilteredRequests.filter(r => r.status !== 'delivered'), [departmentFilteredRequests]);
  const overdueRequests = useMemo(() => departmentFilteredRequests.filter(r => r.status !== 'delivered' && isRequestOverdue(r)), [departmentFilteredRequests]);
  const awaitingRequests = useMemo(() => departmentFilteredRequests.filter(r => r.status === 'awaiting_delivery'), [departmentFilteredRequests]);
  const archivedRequests = useMemo(() => departmentFilteredRequests.filter(r => r.status === 'delivered'), [departmentFilteredRequests]);

  const activeOrders = useMemo(() => orders.filter(o => o.status === 'active'), [orders]);

  const currentRequests = useMemo(() => {
    let list;
    switch (activeTab) {
      case 'my': list = myRequests; break;
      case 'awaiting': list = awaitingRequests; break;
      case 'overdue': list = overdueRequests; break;
      case 'archive': list = archivedRequests; break;
      default: list = allRequests; break;
    }
    if (!searchQuery.trim()) return list;
    const query = searchQuery.toLowerCase();
    return list.filter(r => 
      r.requestNumber?.toLowerCase().includes(query) ||
      r.items?.some(item => item.title.toLowerCase().includes(query)) ||
      r.orders?.some(order => order.orderNumber.toLowerCase().includes(query))
    );
  }, [activeTab, myRequests, awaitingRequests, allRequests, overdueRequests, archivedRequests, searchQuery]);

  const stats = useMemo(() => ({
    my: myRequests.length,
    awaiting: awaitingRequests.length,
    all: allRequests.length,
    overdue: overdueRequests.length,
    archive: archivedRequests.length,
    inProgress: departmentFilteredRequests.filter(r => !['delivered', 'paid', 'awaiting_delivery'].includes(r.status)).length,
    paid: departmentFilteredRequests.filter(r => r.status === 'paid').length,
    awaitingDelivery: departmentFilteredRequests.filter(r => r.status === 'awaiting_delivery').length
  }), [myRequests, awaitingRequests, allRequests, overdueRequests, archivedRequests, departmentFilteredRequests]);

  const handleOpenDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  const handleCreateRequest = async (data) => {
    await supplyActions.createRequest({ ...data, createdBy: userRole || 'technologist' });
    setShowCreateModal(false);
  };

  const handleEditRequest = async (data) => {
    if (!editingRequest) return;
    await supplyActions.editRequest(editingRequest.id, data);
    setEditingRequest(null);
    setShowCreateModal(false);
  };

  const handleOpenEdit = (request) => {
    setEditingRequest(request);
    setShowCreateModal(true);
  };

  const renderRequestList = (requests, emptyText) => {
    if (requests.length === 0) {
      return (
        <div className="bg-white rounded-lg p-8 text-center border border-dashed border-neutral-200">
          <Inbox className="mx-auto text-neutral-300 mb-3" size={36} />
          <h3 className="font-semibold text-neutral-700">{searchQuery ? 'Ничего не найдено' : 'Список пуст'}</h3>
          <p className="text-neutral-500 text-sm mt-1">
            {searchQuery ? 'Попробуйте изменить поисковой запрос' : emptyText}
          </p>
        </div>
      );
    }
    return <div className="space-y-2.5">{requests.map(request => <SupplyRequestCard key={request.id} request={request} userRole={userRole} onOpenDetails={() => handleOpenDetails(request)} onOpenInvoice={(url) => url && window.open(url, '_blank')} onDelete={supplyActions.deleteRequest} />)}</div>;
  };

      const canCreate = userRole && ['technologist', 'director', 'shopManager', 'master', 'supplier'].includes(userRole);  const roleLabel = getRoleLabel(userRole);

  const renderFilterButton = (tab, label, count, icon) => {
    const isActive = activeTab === tab;
    const isAlert = tab === 'overdue' && count > 0;
    return (
      <button 
        onClick={() => setActiveTab(tab)} 
        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-150 flex items-center gap-2 whitespace-nowrap ${isActive ? 'bg-primary-600 text-white shadow-md' : isAlert ? 'bg-warning-50 text-warning-600 hover:bg-warning-100' : 'bg-white text-neutral-600 hover:bg-neutral-100/50 hover:text-neutral-800 border border-neutral-200/80'}`}>
        {icon}{label} <span className={`font-bold ${isActive ? 'text-white/70' : isAlert ? 'text-warning-700' : 'text-neutral-400'}`}>{count}</span>
      </button>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-neutral-800 flex items-center gap-3">
            <Package className="text-primary-500" size={32} /> Снабжение
          </h1>
          <p className="text-neutral-500 text-sm mt-1.5">
            {userRole ? `Вы вошли как: ${roleLabel}` : 'Войдите в систему для работы'}
          </p>
        </div>
        {canCreate && (
          <button onClick={() => setShowCreateModal(true)} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all duration-150 font-bold shadow-sm active:scale-95">
            <Plus size={20} /> Новая заявка
          </button>
        )}
      </div>

      {/* Department Toggle */}
      <div className="flex items-center gap-2 p-1 bg-neutral-100 rounded-lg">
        {(['Химмаш', 'РТИ']).map(dep => (
          <button key={dep} onClick={() => setActiveDepartment(dep)} className={`flex-1 text-center px-3 py-1.5 text-sm font-bold rounded-md transition-all duration-200 ${activeDepartment === dep ? 'bg-white shadow text-primary-600' : 'text-neutral-500 hover:text-neutral-700'}`}>{dep}</button>
        ))}
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Clock size={16} className="text-neutral-400"/>} label="В работе" value={stats.inProgress} colorClass="text-neutral-700" />
        <StatCard icon={<CheckCircle2 size={16} className="text-success-500"/>} label="Оплачено" value={stats.paid} colorClass="text-success-600" />
        <StatCard icon={<Truck size={16} className="text-primary-500"/>} label="Ожидает" value={stats.awaitingDelivery} colorClass="text-primary-600" />
        <StatCard icon={<AlertTriangle size={16} className={stats.overdue > 0 ? "text-warning-500" : "text-neutral-400"}/>} label="Просрочено" value={stats.overdue} colorClass={stats.overdue > 0 ? 'text-warning-600' : 'text-neutral-500'} pulse={stats.overdue > 0} />
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {renderFilterButton('all', 'Все', stats.all, null)}
          {userRole && renderFilterButton('my', 'Моя папка', stats.my, <Inbox size={16}/>)}
          {renderFilterButton('awaiting', 'Ожидаем доставку', stats.awaiting, <Truck size={16}/>)}
          {renderFilterButton('overdue', 'Внимание', stats.overdue, <AlertCircle size={16}/>)}
          {renderFilterButton('archive', 'Архив', stats.archive, <Archive size={16}/>)}
        </div>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" size={20} />
          <input type="text" placeholder="Поиск по номеру или названию..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-11 pr-4 py-2.5 border border-neutral-200/80 rounded-lg w-full md:w-72 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all" />
        </div>
      </div>

      {/* Request List */}
      <div>
        {renderRequestList(currentRequests, 'Заявок пока нет. Создайте новую, чтобы начать.')}
      </div>

      {/* Modals */}
      {showCreateModal && <CreateRequestModal orders={activeOrders} userRole={userRole} onClose={() => { setShowCreateModal(false); setEditingRequest(null); }} onCreate={handleCreateRequest} editData={editingRequest} onEdit={handleEditRequest} />}
      {showDetailsModal && selectedRequest && <RequestDetailsModal request={selectedRequest} userRole={userRole} supplyActions={supplyActions} onClose={() => { setShowDetailsModal(false); setSelectedRequest(null); }} onEditRequest={handleOpenEdit} />}
    </div>
  );
}
