import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createPortal } from 'react-dom';
import { X, Save, PenTool, Truck, Calendar, Droplet, AlertCircle } from 'lucide-react';
import { orderSchema } from '../../utils/validation';

export default function NewOrderModal({ onClose, onCreate }) {
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
      hasDrawings: false,
      drawingsDeadline: '',
      hasMaterials: false,
      materialsDeadline: '',
      hasPaint: false,
      paintDeadline: ''
    }
  });

  const hasDrawings = watch('hasDrawings');
  const hasMaterials = watch('hasMaterials');
  const hasPaint = watch('hasPaint');

  const onSubmit = (data) => {
    // Логика статуса
    let initialStatus = 'work';
    if (!data.hasMaterials) initialStatus = 'metal';
    else if (!data.hasDrawings) initialStatus = 'drawings';

    onCreate({
      orderNumber: data.orderNumber,
      clientName: data.clientName,
      deadline: data.deadline,
      drawingsDeadline: data.hasDrawings ? null : data.drawingsDeadline,
      materialsDeadline: data.hasMaterials ? null : data.materialsDeadline,
      paintDeadline: data.hasPaint ? null : data.paintDeadline,
      customStatus: initialStatus
    });
    onClose();
  };

  const ErrorMessage = ({ error }) => error ? (
    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
      <AlertCircle size={12} /> {error.message}
    </p>
  ) : null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
          <h3 className="font-bold text-lg">Новый заказ: Входной контроль</h3>
          <button onClick={onClose} type="button"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Основное */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Номер</label>
              <input
                autoFocus
                type="text"
                {...register('orderNumber')}
                className={`w-full border-2 rounded-lg p-2 font-bold text-slate-800 outline-none focus:border-orange-500 ${errors.orderNumber ? 'border-red-300' : 'border-slate-200'}`}
              />
              <ErrorMessage error={errors.orderNumber} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Клиент</label>
              <input
                type="text"
                {...register('clientName')}
                className="w-full border-2 border-slate-200 rounded-lg p-2 font-bold text-slate-800 outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Блок КМД */}
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 font-bold text-indigo-900 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('hasDrawings')}
                  className="w-5 h-5 accent-indigo-600"
                />
                <PenTool size={18}/> Чертежи (КМД) готовы?
              </label>
            </div>
            {!hasDrawings && (
              <div className="animate-in slide-in-from-top-1">
                <label className="text-xs font-bold text-indigo-400 uppercase">Ожидаемая дата готовности</label>
                <input
                  type="date"
                  {...register('drawingsDeadline')}
                  className={`w-full mt-1 border rounded p-2 bg-white font-bold text-slate-700 ${errors.drawingsDeadline ? 'border-red-300' : 'border-indigo-200'}`}
                />
                <ErrorMessage error={errors.drawingsDeadline} />
              </div>
            )}
          </div>

          {/* Блок Материалы */}
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 font-bold text-amber-900 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('hasMaterials')}
                  className="w-5 h-5 accent-amber-600"
                />
                <Truck size={18}/> Металл / Комплект. на складе?
              </label>
            </div>
            {!hasMaterials && (
              <div className="animate-in slide-in-from-top-1">
                <label className="text-xs font-bold text-amber-400 uppercase">Ожидаемая дата поставки</label>
                <input
                  type="date"
                  {...register('materialsDeadline')}
                  className={`w-full mt-1 border rounded p-2 bg-white font-bold text-slate-700 ${errors.materialsDeadline ? 'border-red-300' : 'border-amber-200'}`}
                />
                <ErrorMessage error={errors.materialsDeadline} />
              </div>
            )}
          </div>

          {/* Блок Краска */}
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 font-bold text-emerald-900 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('hasPaint')}
                  className="w-5 h-5 accent-emerald-600"
                />
                <Droplet size={18}/> Краска на складе?
              </label>
            </div>
            {!hasPaint && (
              <div className="animate-in slide-in-from-top-1">
                <label className="text-xs font-bold text-emerald-400 uppercase">Ожидаемая дата поставки</label>
                <input
                  type="date"
                  {...register('paintDeadline')}
                  className={`w-full mt-1 border rounded p-2 bg-white font-bold text-slate-700 ${errors.paintDeadline ? 'border-red-300' : 'border-emerald-200'}`}
                />
                <ErrorMessage error={errors.paintDeadline} />
              </div>
            )}
          </div>

          {/* Срок сдачи */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
              <Calendar size={12}/> Дедлайн заказа (Отгрузка)
            </label>
            <input
              type="date"
              {...register('deadline')}
              className={`w-full border-2 rounded-lg p-3 font-black text-slate-800 outline-none focus:border-red-500 ${errors.deadline ? 'border-red-300' : 'border-slate-300'}`}
            />
            <ErrorMessage error={errors.deadline} />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-orange-600 transition shadow-lg flex justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            <Save size={20}/> Создать заказ
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}