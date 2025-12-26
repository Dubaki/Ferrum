import React, { useState, useEffect } from 'react';
import { User, LogOut, Play, Square, CheckCircle, Clock, ArrowLeft, AlertTriangle } from 'lucide-react';

export default function WorkshopMode({ resources, products, orders, actions, onExit }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [activeOperation, setActiveOperation] = useState(null); // { product, operation, startTime }
    const [selectedOrder, setSelectedOrder] = useState(null); // Выбранный заказ для просмотра операций
    const [completionModal, setCompletionModal] = useState(null); // Модальное окно завершения
    const [quantityInput, setQuantityInput] = useState(0); // Количество выполненных изделий

    // Эмуляция таймера для активной задачи
    const [timer, setTimer] = useState(0);

    useEffect(() => {
        let interval;
        if (activeOperation) {
            interval = setInterval(() => {
                const now = Date.now();
                const start = activeOperation.startTime;
                setTimer(Math.floor((now - start) / 1000));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [activeOperation]);

    // Форматирование времени чч:мм:сс
    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    };

    // --- ЛОГИКА ЗАВЕРШЕНИЯ ---
    const handleStop = () => {
        if (!activeOperation) return;

        const minutesSpent = Math.ceil(timer / 60);

        // Открываем модалку для ввода количества
        setCompletionModal({
            operation: activeOperation,
            minutesSpent: minutesSpent,
            maxQuantity: activeOperation.product.quantity
        });

        // Устанавливаем начальное значение - максимум
        setQuantityInput(activeOperation.product.quantity);
    };

    const handleSaveCompletion = async (quantityCompleted) => {
        if (!completionModal) return;

        const { operation, minutesSpent } = completionModal;

        // ВАЖНО: Берем СВЕЖИЕ данные из products, а не из activeOperation!
        const freshProduct = products.find(p => p.id === operation.product.id);
        const freshOperation = freshProduct?.operations?.find(op => op.id === operation.operation.id);

        // Создаем запись о завершении
        const completionRecord = {
            workerId: currentUser.id,
            workerName: currentUser.name,
            quantity: quantityCompleted,
            minutes: minutesSpent,
            timestamp: new Date().toISOString()
        };

        // Получаем текущую историю завершений (из СВЕЖИХ данных!)
        const completions = freshOperation?.completions || [];
        const newCompletions = [...completions, completionRecord];

        // Вычисляем общее количество выполненных изделий
        const totalCompleted = newCompletions.reduce((sum, c) => sum + c.quantity, 0);

        // Собираем ВСЕХ уникальных сотрудников из истории завершений
        const allWorkerIds = [...new Set(newCompletions.map(c => c.workerId))];

        // Обновляем историю завершений
        await actions.updateOperation(
            operation.product.id,
            operation.operation.id,
            'completions',
            newCompletions
        );

        // Обновляем список исполнителей (все кто работал)
        await actions.updateOperation(
            operation.product.id,
            operation.operation.id,
            'resourceIds',
            allWorkerIds
        );

        // Если всё выполнено - вычисляем фактическое время на единицу
        if (totalCompleted >= operation.product.quantity) {
            const totalMinutes = newCompletions.reduce((sum, c) => sum + c.minutes, 0);
            // Время на ОДНУ единицу = общее время / количество изделий
            const minutesPerUnit = totalMinutes / operation.product.quantity;

            await actions.updateOperation(
                operation.product.id,
                operation.operation.id,
                'actualMinutes',
                minutesPerUnit
            );
        }

        // Закрываем всё
        setCompletionModal(null);
        setActiveOperation(null);
        setTimer(0);
    };

    // --- ЭКРАН 1: ВЫБОР СОТРУДНИКА ---
    if (!currentUser) {
        return (
            <div className="min-h-screen bg-slate-900 p-6 flex flex-col">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-black text-white uppercase tracking-widest">
                        <span className="text-orange-500">Феррум</span> Цех
                    </h1>
                    <button onClick={onExit} className="text-slate-500 hover:text-white flex items-center gap-2 uppercase font-bold text-sm">
                        <LogOut size={20}/> Выход в офис
                    </button>
                </div>
                
                <div className="flex-1 flex flex-col items-center justify-center">
                    <h2 className="text-xl text-slate-400 font-bold mb-6 uppercase tracking-wider">Выберите себя</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full max-w-5xl">
                        {resources.filter(r => r.status !== 'fired').map(res => (
                            <button 
                                key={res.id}
                                onClick={() => setCurrentUser(res)}
                                className="bg-slate-800 border-2 border-slate-700 hover:border-orange-500 hover:bg-slate-750 text-white p-6 rounded-2xl flex flex-col items-center gap-4 transition-all active:scale-95 group"
                            >
                                <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center text-3xl font-bold text-slate-400 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                    {res.name.charAt(0)}
                                </div>
                                <span className="font-bold text-lg text-center leading-tight">{res.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // --- ПОДГОТОВКА СПИСКА ЗАДАЧ ---
    // Показываем ВСЕ невыполненные операции из активных заказов
    const myTasks = []; // Назначенные на меня
    const availableTasks = []; // Доступные для выбора
    const orderTasksMap = {}; // Группировка доступных задач по заказам

    // Безопасная проверка
    if (!products || !Array.isArray(products)) {
        return null;
    }

    products.forEach(prod => {
        // Пропускаем завершенные изделия
        if (prod.status === 'completed') return;

        // Проверяем что заказ активный и НЕ в отгрузке
        const order = orders?.find(o => o.id === prod.orderId);
        if (!order || order.status !== 'active' || order.inShipping) return;

        prod.operations?.forEach(op => {
            // Показываем только операции БЕЗ фактического времени
            const hasActualTime = (op.actualMinutes || 0) > 0;
            if (hasActualTime) return;

            const task = { product: prod, operation: op };

            // Разделяем на назначенные и доступные
            if (op.resourceIds && op.resourceIds.includes(currentUser.id)) {
                myTasks.push(task);
            } else {
                availableTasks.push(task);

                // Группируем по заказам
                const orderId = prod.orderId;
                if (!orderTasksMap[orderId]) {
                    orderTasksMap[orderId] = {
                        orderId,
                        tasks: []
                    };
                }
                orderTasksMap[orderId].tasks.push(task);
            }
        });
    });

    // Преобразуем в массив заказов
    const availableOrders = Object.values(orderTasksMap);

    const allTasks = [...myTasks, ...availableTasks]; // Сначала мои, потом доступные

    // --- МОДАЛЬНОЕ ОКНО ЗАВЕРШЕНИЯ ---
    if (completionModal) {
        return (
            <div className="min-h-screen bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
                    <h2 className="text-2xl font-black text-slate-800 mb-2">
                        Завершение работы
                    </h2>
                    <p className="text-sm text-slate-500 mb-6">
                        Укажите сколько изделий вы выполнили
                    </p>

                    <div className="bg-slate-50 rounded-xl p-4 mb-6">
                        <div className="text-xs text-slate-400 uppercase font-bold mb-1">Операция</div>
                        <div className="text-lg font-bold text-slate-800 mb-2">
                            {completionModal.operation.product.name}
                        </div>
                        <div className="text-sm text-orange-600 font-bold uppercase">
                            {completionModal.operation.operation.name}
                        </div>
                        <div className="text-xs text-slate-500 mt-3">
                            Всего в заказе: <span className="font-bold">{completionModal.maxQuantity} шт.</span>
                        </div>
                        <div className="text-xs text-slate-500">
                            Время работы: <span className="font-bold font-mono">{formatTime(timer)}</span>
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Выполнено изделий
                        </label>
                        <input
                            type="number"
                            min="1"
                            max={completionModal.maxQuantity}
                            value={quantityInput}
                            onChange={(e) => setQuantityInput(parseInt(e.target.value) || 0)}
                            className="w-full text-3xl font-black text-center bg-slate-50 border-2 border-slate-200 rounded-xl py-4 px-6 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition"
                            autoFocus
                        />
                        <p className="text-xs text-slate-400 text-center mt-2">
                            Введите число от 1 до {completionModal.maxQuantity}
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                setCompletionModal(null);
                            }}
                            className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 rounded-xl transition uppercase text-sm"
                        >
                            Отмена
                        </button>
                        <button
                            onClick={() => handleSaveCompletion(quantityInput)}
                            disabled={quantityInput < 1 || quantityInput > completionModal.maxQuantity}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black py-3 rounded-xl transition uppercase text-sm shadow-lg"
                        >
                            Сохранить
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- ЭКРАН 3: АКТИВНАЯ ЗАДАЧА (ТАЙМЕР) ---
    if (activeOperation) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
                {/* Пульсирующий фон */}
                <div className="absolute inset-0 bg-orange-500/5 animate-pulse z-0"></div>
                
                <div className="z-10 w-full max-w-2xl bg-slate-800 rounded-3xl p-8 border border-slate-700 shadow-2xl text-center">
                    <div className="text-slate-400 font-bold uppercase tracking-widest text-sm mb-2">В работе</div>
                    <h2 className="text-3xl md:text-5xl font-black text-white mb-2 leading-tight">
                        {activeOperation.product.name}
                    </h2>
                    <div className="text-xl text-orange-400 font-bold mb-8 uppercase">
                        {activeOperation.operation.name} — {activeOperation.product.quantity} шт.
                    </div>

                    <div className="text-[80px] md:text-[120px] font-black font-mono text-white mb-10 leading-none tracking-tighter">
                        {formatTime(timer)}
                    </div>

                    <button 
                        onClick={handleStop}
                        className="w-full bg-red-600 hover:bg-red-500 text-white text-2xl font-black uppercase py-8 rounded-2xl shadow-[0_10px_40px_rgba(220,38,38,0.5)] active:scale-95 transition-all flex items-center justify-center gap-4"
                    >
                        <Square fill="currentColor" size={32} /> Завершить работу
                    </button>
                    
                    <button 
                        onClick={() => { setActiveOperation(null); setTimer(0); }} 
                        className="mt-6 text-slate-500 hover:text-white font-bold uppercase text-sm tracking-wider"
                    >
                        Отмена (не сохранять время)
                    </button>
                </div>
            </div>
        );
    }

    // --- ЭКРАН 2: СПИСОК ЗАДАЧ ---
    return (
        <div className="min-h-screen bg-slate-100 flex flex-col">
            {/* Header */}
            <div className="bg-white p-4 flex justify-between items-center shadow-sm sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                        {currentUser.name.charAt(0)}
                    </div>
                    <div>
                        <div className="text-xs text-slate-400 font-bold uppercase">Сотрудник</div>
                        <div className="text-lg font-black text-slate-800 leading-none">{currentUser.name}</div>
                    </div>
                </div>
                <button 
                    onClick={() => setCurrentUser(null)} 
                    className="bg-slate-100 p-2 rounded-lg text-slate-500 font-bold text-xs uppercase hover:bg-slate-200"
                >
                    Сменить
                </button>
            </div>

            <div className="p-4 space-y-4 max-w-3xl mx-auto w-full pb-20">
                {/* Мои назначенные задачи */}
                {myTasks.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                            <CheckCircle className="text-orange-500"/> Мои задания ({myTasks.length})
                        </h3>
                        {myTasks.map((task, idx) => {
                            const completions = task.operation.completions || [];
                            const totalCompleted = completions.reduce((sum, c) => sum + c.quantity, 0);
                            const hasProgress = completions.length > 0;

                            return (
                            <div key={`my-${task.product.id}-${task.operation.id}`} className="bg-white rounded-2xl p-5 shadow-sm border-2 border-orange-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="bg-orange-100 text-orange-600 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                                            Заказ {task.operation.orderNumber || '...'}
                                        </span>
                                        <span className="text-slate-400 text-xs font-bold">
                                            #{task.operation.sequence}
                                        </span>
                                        <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">
                                            МОЯ
                                        </span>
                                    </div>
                                    <div className="text-xl font-black text-slate-800 leading-tight mb-1">
                                        {task.product.name}
                                    </div>
                                    <div className="text-orange-600 font-bold uppercase text-sm flex items-center gap-2">
                                        <AlertTriangle size={14}/> {task.operation.name} — {task.product.quantity} шт.
                                    </div>

                                    {/* Прогресс выполнения */}
                                    {hasProgress && (
                                        <div className="mt-2 bg-emerald-50 rounded-lg p-2 border border-emerald-200">
                                            <div className="flex items-center gap-2 mb-1">
                                                <CheckCircle size={12} className="text-emerald-600" />
                                                <span className="text-xs font-bold text-emerald-700">
                                                    Выполнено {totalCompleted} из {task.product.quantity} шт.
                                                </span>
                                            </div>
                                            <div className="text-[10px] text-slate-600 space-y-0.5">
                                                <div>Работали: {completions.map(c => c.workerName).join(', ')}</div>
                                                {(() => {
                                                    const totalMinutes = completions.reduce((sum, c) => sum + c.minutes, 0);
                                                    const avgPerUnit = totalMinutes / totalCompleted;
                                                    return (
                                                        <div className="font-mono">
                                                            Время: {Math.round(totalMinutes)} мин общ. / {Math.round(avgPerUnit)} мин/ед.
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-4 w-full md:w-auto bg-slate-50 p-3 rounded-xl">
                                    <div className="text-right">
                                        <div className="text-[10px] uppercase font-bold text-slate-400">План / Факт</div>
                                        <div className="font-mono font-bold text-slate-700">
                                            {((task.operation.minutesPerUnit * task.product.quantity) / 60).toFixed(1)} / {((task.operation.actualMinutes||0) / 60).toFixed(1)} ч
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setActiveOperation({ ...task, startTime: Date.now() })}
                                        className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl p-4 shadow-lg shadow-emerald-200 active:scale-95 transition-all flex items-center gap-2 font-black uppercase text-sm"
                                    >
                                        <Play fill="currentColor" /> Старт
                                    </button>
                                </div>
                            </div>
                            );
                        })}
                    </div>
                )}

                {/* Доступные для выбора задачи */}
                {availableTasks.length > 0 && !selectedOrder && (
                    <div className="space-y-3">
                        <h3 className="text-lg font-black text-slate-600 uppercase tracking-tight flex items-center gap-2 mt-6">
                            <Clock className="text-blue-500"/> Выберите заказ ({availableOrders.length})
                        </h3>
                        {availableOrders.map((orderGroup) => {
                            const order = orders?.find(o => o.id === orderGroup.orderId);
                            return (
                                <button
                                    key={orderGroup.orderId}
                                    onClick={() => setSelectedOrder(orderGroup)}
                                    className="w-full bg-white rounded-2xl p-5 shadow-sm border-2 border-slate-200 hover:border-blue-400 transition-all active:scale-95 text-left"
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="text-sm text-slate-500 font-bold mb-1">
                                                Заказ {order?.orderNumber || '...'}
                                            </div>
                                            <div className="text-xl font-black text-slate-800">
                                                {order?.clientName || 'Клиент'}
                                            </div>
                                            <div className="text-sm text-blue-600 font-bold mt-1">
                                                {orderGroup.tasks.length} операций доступно
                                            </div>
                                        </div>
                                        <div className="text-blue-500">
                                            <ArrowLeft size={24} className="rotate-180" />
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Операции выбранного заказа */}
                {selectedOrder && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 mt-6 mb-4">
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="p-2 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <h3 className="text-lg font-black text-slate-600 uppercase tracking-tight flex items-center gap-2">
                                <Clock className="text-blue-500"/> Операции ({selectedOrder.tasks.length})
                            </h3>
                        </div>
                        {selectedOrder.tasks.map((task) => {
                            const completions = task.operation.completions || [];
                            const totalCompleted = completions.reduce((sum, c) => sum + c.quantity, 0);
                            const hasProgress = completions.length > 0;

                            return (
                            <div key={`available-${task.product.id}-${task.operation.id}`} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div className="flex-1">
                                    <div className="text-xl font-black text-slate-800 leading-tight mb-1">
                                        {task.product.name}
                                    </div>
                                    <div className="text-blue-600 font-bold uppercase text-sm flex items-center gap-2">
                                        {task.operation.name} — {task.product.quantity} шт.
                                    </div>

                                    {/* Прогресс выполнения */}
                                    {hasProgress && (
                                        <div className="mt-2 bg-emerald-50 rounded-lg p-2 border border-emerald-200">
                                            <div className="flex items-center gap-2 mb-1">
                                                <CheckCircle size={12} className="text-emerald-600" />
                                                <span className="text-xs font-bold text-emerald-700">
                                                    Выполнено {totalCompleted} из {task.product.quantity} шт.
                                                </span>
                                            </div>
                                            <div className="text-[10px] text-slate-600 space-y-0.5">
                                                <div>Работали: {completions.map(c => c.workerName).join(', ')}</div>
                                                {(() => {
                                                    const totalMinutes = completions.reduce((sum, c) => sum + c.minutes, 0);
                                                    const avgPerUnit = totalMinutes / totalCompleted;
                                                    return (
                                                        <div className="font-mono">
                                                            Время: {Math.round(totalMinutes)} мин общ. / {Math.round(avgPerUnit)} мин/ед.
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-4 w-full md:w-auto bg-slate-50 p-3 rounded-xl">
                                    <div className="text-right">
                                        <div className="text-[10px] uppercase font-bold text-slate-400">План / Факт</div>
                                        <div className="font-mono font-bold text-slate-700">
                                            {((task.operation.minutesPerUnit * task.product.quantity) / 60).toFixed(1)} / {((task.operation.actualMinutes||0) / 60).toFixed(1)} ч
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setActiveOperation({ ...task, startTime: Date.now() })}
                                        className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl p-4 shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center gap-2 font-black uppercase text-sm"
                                    >
                                        <Play fill="currentColor" /> Старт
                                    </button>
                                </div>
                            </div>
                            );
                        })}
                    </div>
                )}

                {/* Нет задач вообще */}
                {allTasks.length === 0 && (
                    <div className="text-center py-20 text-slate-400">
                        <CheckCircle size={64} className="mx-auto mb-4 opacity-20"/>
                        <p className="font-bold text-lg">Нет задач на сегодня</p>
                        <p className="text-sm">Все операции выполнены или не запланированы</p>
                    </div>
                )}
            </div>
        </div>
    );
}