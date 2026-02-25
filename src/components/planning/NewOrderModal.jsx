import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createPortal } from 'react-dom';
import { X, Save, PenTool, Truck, Calendar, Droplet, AlertCircle, ShoppingBag, Cpu, Scale, BarChart2 } from 'lucide-react';
import { orderSchema } from '../../utils/validation';

const CATEGORIES_A = [
  { id: 'beam', label: 'Балка' },
  { id: 'column', label: 'Колонна' },
  { id: 'truss', label: 'Ферма' },
  { id: 'brace', label: 'Связи' },
  { id: 'purlin', label: 'Прогоны' },
  { id: 'plate', label: 'Пластины/Узлы' },
  { id: 'other', label: 'Другое' },
];

const CATEGORIES_B = [
  { id: 'ladder', label: 'Лестница' },
  { id: 'handrail', label: 'Ограждение' },
  { id: 'platform', label: 'Площадка' },
  { id: 'seal', label: 'Сальник' },
  { id: 'stair', label: 'Стремянка' },
  { id: 'light_pole', label: 'Опора' },
  { id: 'foundation', label: 'Фундамент' },
  { id: 'other', label: 'Другое' },
];

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
      isProductOrder: false,
      hasDrawings: false,
      drawingsDeadline: '',
      hasMaterials: false,
      materialsDeadline: '',
      hasPaint: false,
      paintDeadline: '',
      orderType: 'A',
      category: 'other',
      priority: 3,
      complexity: 2,
      sizeCategory: 'medium',
      weightTotalKg: '',
      notes: ''
    }
  });

  const hasDrawings = watch('hasDrawings');
  const hasMaterials = watch('hasMaterials');
  const hasPaint = watch('hasPaint');
  const isProductOrder = watch('isProductOrder');
  const orderType = watch('orderType');

  const categories = orderType === 'A' ? CATEGORIES_A : CATEGORIES_B;

  const onSubmit = (data) => {
    // Логика статуса
    let initialStatus = 'work';
    if (!data.hasMaterials) initialStatus = 'metal';
    else if (!data.hasDrawings) initialStatus = 'drawings';

    onCreate({
      orderNumber: data.orderNumber,
      clientName: data.clientName,
      deadline: data.deadline,
      isProductOrder: data.isProductOrder,
      drawingsDeadline: data.hasDrawings ? null : data.drawingsDeadline,
      materialsDeadline: data.hasMaterials ? null : data.materialsDeadline,
      paintDeadline: data.hasPaint ? null : data.paintDeadline,
      customStatus: initialStatus,
      // AI Planning fields
      orderType: data.orderType,
      category: data.category,
      priority: parseInt(data.priority),
      complexity: parseInt(data.complexity),
      sizeCategory: data.sizeCategory,
      weightTotalKg: parseFloat(data.weightTotalKg) || 0,
      notes: data.notes
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="bg-slate-900 p-4 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg">Новый заказ: Входной контроль</h3>
          </div>
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

          {/* AI Planning Section */}
          {!isProductOrder && (
            <div className="bg-slate-900 text-white rounded-xl p-4 shadow-inner">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/10">
                <Cpu size={18} className="text-cyan-400" />
                <span className="text-xs font-black uppercase tracking-widest text-cyan-400">Параметры планирования AI</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Тип изделия</label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <label className={`flex items-center justify-center p-2 rounded-lg border-2 cursor-pointer transition-all ${orderType === 'A' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}>
                        <input type="radio" value="A" {...register('orderType')} className="hidden" />
                        <span className="text-xs font-bold">Тип А (МК)</span>
                      </label>
                      <label className={`flex items-center justify-center p-2 rounded-lg border-2 cursor-pointer transition-all ${orderType === 'B' ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}>
                        <input type="radio" value="B" {...register('orderType')} className="hidden" />
                        <span className="text-xs font-bold">Тип Б (Малые)</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Категория</label>
                    <select
                      {...register('category')}
                      className="w-full mt-1 bg-white/5 border-2 border-white/10 rounded-lg p-2 text-xs font-bold text-white outline-none focus:border-cyan-500"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id} className="bg-slate-800">{cat.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                      <Scale size={10}/> Общий вес заказа (кг)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      {...register('weightTotalKg')}
                      className="w-full mt-1 bg-white/5 border-2 border-white/10 rounded-lg p-2 text-xs font-bold text-white outline-none focus:border-cyan-500"
                      placeholder="Напр. 4500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Сложность</label>
                      <select
                        {...register('complexity')}
                        className="w-full mt-1 bg-white/5 border-2 border-white/10 rounded-lg p-1.5 text-xs font-bold text-white outline-none focus:border-cyan-500"
                      >
                        <option value="1" className="bg-slate-800">1 - Простая</option>
                        <option value="2" className="bg-slate-800">2 - Средняя</option>
                        <option value="3" className="bg-slate-800">3 - Сложная</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Приоритет</label>
                      <select
                        {...register('priority')}
                        className="w-full mt-1 bg-white/5 border-2 border-white/10 rounded-lg p-1.5 text-xs font-bold text-white outline-none focus:border-cyan-500"
                      >
                        <option value="1" className="bg-slate-800">1 - Горит!</option>
                        <option value="2" className="bg-slate-800">2 - Высокий</option>
                        <option value="3" className="bg-slate-800">3 - Средний</option>
                        <option value="4" className="bg-slate-800">4 - Низкий</option>
                        <option value="5" className="bg-slate-800">5 - Запас</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-3 rounded-xl border-2 transition-all ${hasDrawings ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100 shadow-sm'}`}>
                <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer mb-2 text-xs">
                  <input type="checkbox" {...register('hasDrawings')} className="w-4 h-4 accent-indigo-600" />
                  <PenTool size={14} className="text-indigo-500"/> КМД готовы?
                </label>
                {!hasDrawings && (
                  <div className="animate-in slide-in-from-top-1">
                    <input type="date" {...register('drawingsDeadline')} className="w-full border rounded p-1.5 text-xs bg-slate-50 font-bold text-slate-700" />
                    <ErrorMessage error={errors.drawingsDeadline} />
                  </div>
                )}
              </div>

              <div className={`p-3 rounded-xl border-2 transition-all ${hasMaterials ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100 shadow-sm'}`}>
                <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer mb-2 text-xs">
                  <input type="checkbox" {...register('hasMaterials')} className="w-4 h-4 accent-amber-600" />
                  <Truck size={14} className="text-amber-500"/> Металл на складе?
                </label>
                {!hasMaterials && (
                  <div className="animate-in slide-in-from-top-1">
                    <input type="date" {...register('materialsDeadline')} className="w-full border rounded p-1.5 text-xs bg-slate-50 font-bold text-slate-700" />
                    <ErrorMessage error={errors.materialsDeadline} />
                  </div>
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
            {isSubmitting ? 'Создание...' : <><Save size={20}/> Создать заказ и в план</>}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}