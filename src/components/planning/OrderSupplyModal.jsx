import React, { useMemo } from 'react';
import { X, Package, Truck, AlertCircle } from 'lucide-react';
import SupplyRequestCard from '../supply/SupplyRequestCard';
import RequestDetailsModal from '../supply/RequestDetailsModal';
import { useState } from 'react';

export default function OrderSupplyModal({ order, requests, supplyActions, userRole, onClose }) {
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const selectedRequest = requests.find(r => r.id === selectedRequestId);

  // Сумма для этого заказа из каждой заявки
  const getAmountForOrder = (request) => {
    if (!request.orderAmounts) return 0;
    if (request.orderAmounts[order.id] !== undefined) return request.orderAmounts[order.id] || 0;
    // Если нет точного ключа — берём всю сумму (единственный заказ)
    return Object.values(request.orderAmounts).reduce((s, v) => s + (v || 0), 0);
  };

  const amountStats = useMemo(() => {
    const total   = requests.reduce((s, r) => s + getAmountForOrder(r), 0);
    const paid    = requests.filter(r => ['paid', 'awaiting_delivery', 'delivered'].includes(r.status))
                            .reduce((s, r) => s + getAmountForOrder(r), 0);
    return { total, paid, pending: total - paid };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests, order.id]);

  const handleOpenDetails = (request) => {
    setSelectedRequestId(request.id);
    setShowDetailsModal(true);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-4xl bg-slate-50 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-slate-800 text-white p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Package size={24} className="text-white" />
            </div>
            <div>
              <h4 className="font-bold text-lg leading-tight">Снабжение по заказу</h4>
              <p className="text-slate-400 text-xs font-mono uppercase tracking-wider">{order.orderNumber} — {order.clientName || 'Без клиента'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Табло сумм */}
        {amountStats.total > 0 && (
          <div className="bg-slate-900 px-6 py-4 flex items-center gap-6 shrink-0">
            <div className="flex-1">
              <div className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-0.5">Всего по заказу</div>
              <div className="text-white text-2xl font-black tracking-tighter leading-none">
                {amountStats.total.toLocaleString('ru-RU')} <span className="text-cyan-400">₽</span>
              </div>
            </div>
            <div className="flex gap-5 text-right">
              <div>
                <div className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">К оплате</div>
                <div className="text-orange-400 text-base font-black">{amountStats.pending.toLocaleString('ru-RU')} ₽</div>
              </div>
              <div>
                <div className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">Оплачено</div>
                <div className="text-emerald-400 text-base font-black">{amountStats.paid.toLocaleString('ru-RU')} ₽</div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar">
          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Truck size={48} className="mb-4 opacity-20" />
              <p className="font-bold">Заявок пока нет</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map(request => (
                <SupplyRequestCard 
                  key={request.id} 
                  request={request} 
                  userRole={userRole} 
                  onOpenDetails={() => handleOpenDetails(request)} 
                  onOpenInvoice={(url) => url && window.open(url, '_blank')} 
                  onDelete={supplyActions.deleteRequest} 
                  supplyActions={supplyActions}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex justify-end shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-all active:scale-95 shadow-lg shadow-slate-200"
          >
            Закрыть
          </button>
        </div>
      </div>

      {/* Details Modal Over the current one */}
      {showDetailsModal && selectedRequest && (
        <div onClick={e => e.stopPropagation()}>
          <RequestDetailsModal
            request={selectedRequest}
            userRole={userRole}
            supplyActions={supplyActions}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedRequestId(null);
            }}
          />
        </div>
      )}
    </div>
  );
}
