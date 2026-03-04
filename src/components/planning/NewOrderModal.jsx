import { memo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createPortal } from 'react-dom';
import { X, Save, PenTool, Truck, Calendar, Droplet, AlertCircle, ShoppingBag } from 'lucide-react';
import { orderSchema } from '../../utils/validation';

// Вынесен за пределы компонента — иначе React видит новый тип на каждый рендер и делает unmount/mount
const ErrorMessage = ({ error }) => error ? (
  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
    <AlertCircle size={12} /> {error.message}
  </p>
) : null;

const NewOrderModal = memo(function NewOrderModal({ onClose, onCreate }) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      orderNumber: '',
      clientName: '',
      deadline: '',
      isProductOrder: false,
      hasDrawings: false,
      drawingsDeadline: '',
      hasMaterials: false,
      materialsDeadline: '',
      hasPaint: false,
      paintDeadline: '',
    }
  });

  const hasDrawings = watch('hasDrawings');
  const hasMaterials = watch('hasMaterials');
  const hasPaint = watch('hasPaint');
  const isProductOrder = watch('isProductOrder');

  const onSubmit = useCallback((data) => {
    let initialStatus = 'work';
    if (!data.hasMaterials) initialStatus = 'metal';
    else if (!data.hasDrawings) initialStatus = 'drawings';

    onCreate({
      orderNumber: data.orderNumber,
      clientName: data.clientName,
      deadline: data.deadline,
      isProductOrder: data.isProductOrder,
      drawingsDeadline: data.hasDrawings ? null : (data.drawingsDeadline || null),
      materialsDeadline: data.hasMaterials ? null : (data.materialsDeadline || null),
      paintDeadline: data.hasPaint ? null : (data.paintDeadline || null),
      customStatus: initialStatus,
    });
    onClose();
  }, [onCreate, onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="bg-slate-900 p-4 text-white flex justify-between items-center shrink-0">
          <h3 className="font-bold text-lg">Новый заказ</h3>
          <button onClick={onClose} type="button"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5 overflow-y-auto overflow-x-hidden">
          {/* Основное */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Номер заказа</label>
              <input
                autoFocus
                type="text"
                {...register('orderNumber')}
                className={`w-full border-2 rounded-lg p-2 font-bold text-slate-800 outline-none focus:border-orange-500 transition-colors ${errors.orderNumber ? 'border-red-300 bg-red-50' : 'border-slate-100 bg-slate-50'}`}
                placeholder="Напр. 21980"
              />
              <ErrorMessage error={errors.orderNumber} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Клиент</label>
              <input
                type="text"
                {...register('clientName')}
                className="w-full border-2 border-slate-100 bg-slate-50 rounded-lg p-2 font-bold text-slate-800 outline-none focus:border-orange-500 transition-colors"
                placeholder="Заказчик"
              />
            </div>
          </div>

          {/* Тип заказа (Товарный) */}
          <div className="bg-cyan-50 p-4 rounded-xl border-2 border-cyan-100 transition-all hover:border-cyan-300">
            <label className="flex items-center gap-3 font-bold text-cyan-900 cursor-pointer">
              <input
                type="checkbox"
                {...register('isProductOrder')}
                className="w-5 h-5 accent-cyan-600 rounded cursor-pointer"
              />
              <ShoppingBag size={20} className={isProductOrder ? 'text-cyan-600' : 'text-cyan-300'} />
              <div>
                <div className={isProductOrder ? 'text-cyan-900' : 'text-cyan-700'}>Товарный заказ (перепродажа)</div>
                <div className="text-[10px] font-normal text-cyan-600">Не требует производственных операций</div>
              </div>
            </label>
          </div>

          {/* Блоки снабжения */}
          {!isProductOrder && (
            <div className="grid grid-cols-3 gap-3">
              <div className={`p-3 rounded-xl border-2 transition-all ${hasDrawings ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100 shadow-sm'}`}>
                <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer mb-2 text-xs">
                  <input type="checkbox" {...register('hasDrawings')} className="w-4 h-4 accent-indigo-600" />
                  <PenTool size={14} className="text-indigo-500"/> КМД
                </label>
                {!hasDrawings && (
                  <input type="date" {...register('drawingsDeadline')} className="w-full border rounded p-1.5 text-xs bg-slate-50 font-bold text-slate-700" />
                )}
              </div>

              <div className={`p-3 rounded-xl border-2 transition-all ${hasMaterials ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100 shadow-sm'}`}>
                <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer mb-2 text-xs">
                  <input type="checkbox" {...register('hasMaterials')} className="w-4 h-4 accent-amber-600" />
                  <Truck size={14} className="text-amber-500"/> Металл
                </label>
                {!hasMaterials && (
                  <input type="date" {...register('materialsDeadline')} className="w-full border rounded p-1.5 text-xs bg-slate-50 font-bold text-slate-700" />
                )}
              </div>

              <div className={`p-3 rounded-xl border-2 transition-all ${hasPaint ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-100 shadow-sm'}`}>
                <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer mb-2 text-xs">
                  <input type="checkbox" {...register('hasPaint')} className="w-4 h-4 accent-rose-600" />
                  <Droplet size={14} className="text-rose-500"/> Краска
                </label>
                {!hasPaint && (
                  <input type="date" {...register('paintDeadline')} className="w-full border rounded p-1.5 text-xs bg-slate-50 font-bold text-slate-700" />
                )}
              </div>
            </div>
          )}

          {/* Дедлайн */}
          <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200">
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1 tracking-wider">
              <Calendar size={12}/> Срок отгрузки клиенту
            </label>
            <input
              type="date"
              {...register('deadline')}
              className={`w-full border-2 rounded-lg p-3 font-black text-slate-800 outline-none focus:border-red-500 transition-all ${errors.deadline ? 'border-red-300 bg-red-50' : 'border-white bg-white'}`}
            />
            <ErrorMessage error={errors.deadline} />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-orange-600 transition-all shadow-lg flex justify-center items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? 'Создание...' : <><Save size={20}/> Создать заказ</>}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
});

export default NewOrderModal;
