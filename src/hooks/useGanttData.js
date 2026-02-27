import { useMemo } from 'react';

// Хелпер: Добавление РАБОЧИХ дней к дате
const addWorkingDays = (startDate, workingDaysDuration) => {
    const result = new Date(startDate);
    // Если длительность меньше 1 дня, возвращаем ту же дату
    if (workingDaysDuration <= 1) return result;

    let added = 0;
    // Нам нужно найти дату через (Duration - 1) рабочих дней
    // Пример: Длительность 2 дня. Начало Пн. Нам нужен Вт (добавить 1 рабочий день).
    while (added < workingDaysDuration - 1) {
        result.setDate(result.getDate() + 1);
        const day = result.getDay();
        // 0 = Воскресенье, 6 = Суббота. Если не выходной - считаем.
        if (day !== 0 && day !== 6) {
            added++;
        }
    }
    return result;
};

// Хелпер: Посчитать рабочие дни между двумя датами
const countWorkingDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 1;

    const start = new Date(startDate);
    const end = new Date(endDate);

    let count = 0;
    let current = new Date(start);

    while (current <= end) {
        const day = current.getDay();
        // Считаем только будние дни
        if (day !== 0 && day !== 6) {
            count++;
        }
        current.setDate(current.getDate() + 1);
    }

    return Math.max(1, count);
};

export const useGanttData = (orders = [], products = [], resources = [], schedulerResults = null, daysToRender = 60) => {
    // 1. Настройка календаря (начинаем за 3 дня до сегодня)
    const startDate = useMemo(() => {
        const date = new Date();
        date.setHours(0,0,0,0);
        date.setDate(date.getDate() - 3);
        return date;
    }, []); // startDate не зависит от пропсов, создается один раз

    const calendarDays = useMemo(() => {
        return Array.from({ length: daysToRender }, (_, i) => {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            return d;
        });
    }, [daysToRender, startDate]);

    // 3. Структура для Ганта
    const ganttRows = useMemo(() => {
        const activeOrders = orders
            .filter(o => o.status === 'active' && o.isProductOrder !== true) // ИСКЛЮЧАЕМ товарные заказы
            .sort((a, b) => {
                if (!a.deadline && !b.deadline) return 0;
                if (!a.deadline) return 1;
                if (!b.deadline) return -1;
                return new Date(a.deadline) - new Date(b.deadline);
            });

        const scheduledOps = schedulerResults?.scheduledOps || [];
        const loadMatrix = schedulerResults?.loadMatrix || {};

        return activeOrders.map(order => {
            const orderProducts = products.filter(p => p.orderId === order.id);
            
            // Собираем изделия
            const children = orderProducts.map(prod => {
                // Пытаемся найти операции этого изделия в плане
                const prodOps = scheduledOps.filter(op => op.prodId === prod.id);
                
                let pStart, pEnd, totalMinutes;
                let shopResourceId = null;
                let shopResourceName = null;
                let shopStage = null;
                let isOverloaded = false;

                if (prodOps.length > 0) {
                    // ЕСЛИ ЕСТЬ В ПЛАНЕ: Берем дату НАЧАЛА оттуда
                    const starts = prodOps.map(op => new Date(op.startDate));
                    pStart = new Date(Math.min(...starts));

                    if (prod.estimatedHours && prod.estimatedHours > 0) {
                        // Пользователь задал ориентировочное время — оно в приоритете
                        totalMinutes = prod.estimatedHours * 60;
                        const workDaysNeeded = Math.max(1, Math.ceil(totalMinutes / 60 / 8));
                        pEnd = addWorkingDays(pStart, workDaysNeeded);
                    } else {
                        // Нет estimatedHours — берём даты и часы из планировщика
                        const ends = prodOps.map(op => new Date(op.endDate));
                        pEnd = new Date(Math.max(...ends));
                        totalMinutes = prodOps.reduce((sum, op) => sum + (op.hours * 60), 0);
                    }

                    // Для цвета полоски берем последнюю операцию (или ту, что дольше всего)
                    // Давайте возьмем ту, что заканчивается последней - это логичнее для отображения "текущего" статуса
                    const lastOp = prodOps.reduce((prev, current) => (prev.endDate > current.endDate) ? prev : current);
                    shopResourceId = lastOp.resourceId;
                    shopResourceName = lastOp.resourceName;
                    shopStage = lastOp.stage;

                    // Проверяем перегрузку участка в этот период
                    // Если хоть в один день работы этого изделия на этом участке есть перегрузка > 100%
                    if (shopResourceId && loadMatrix[shopResourceId]) {
                        const startStr = pStart.toISOString().split('T')[0];
                        const endStr = pEnd.toISOString().split('T')[0];
                        
                        // Проверяем все дни работы изделия
                        for (let d = new Date(pStart); d <= pEnd; d.setDate(d.getDate() + 1)) {
                            const dateStr = d.toISOString().split('T')[0];
                            const dayLoad = loadMatrix[shopResourceId][dateStr]?.total || 0;
                            const capacity = resources.find(r => r.id === shopResourceId)?.hoursPerDay || 8;
                            if (dayLoad > capacity) {
                                isOverloaded = true;
                                break;
                            }
                        }
                    }

                } else {
                    // ФОЛЛБЭК: Если изделия нет в плане (например, нет операций)
                    pStart = prod.startDate ? new Date(prod.startDate) : new Date();
                    
                    if (prod.estimatedHours && prod.estimatedHours > 0) {
                        totalMinutes = prod.estimatedHours * 60;
                    } else {
                        const ops = prod.operations || [];
                        totalMinutes = ops.reduce((sum, op) => sum + (parseFloat(op.minutesPerUnit) || 0) * (prod.quantity || 1), 0);
                    }
                    
                    const workDaysNeeded = Math.max(1, Math.ceil(totalMinutes / 60 / 8));
                    pEnd = addWorkingDays(pStart, workDaysNeeded);
                }

                // Считаем календарную длительность для визуализации
                const calendarDuration = Math.max(1, Math.ceil((pEnd - pStart) / (1000 * 60 * 60 * 24)) + 1);
                const workDaysNeeded = countWorkingDays(pStart, pEnd);

                return {
                    id: prod.id,
                    type: 'product',
                    name: prod.name,
                    quantity: prod.quantity,
                    startDate: pStart,
                    endDate: pEnd,
                    totalHours: (totalMinutes / 60).toFixed(1),
                    durationDays: calendarDuration,
                    workDays: workDaysNeeded,
                    shopResourceId,
                    shopResourceName,
                    shopStage,
                    isOverloaded,
                    isResale: prod.isResale
                };
            });

            // Расчет дат заказа (мин старт и макс конец)
            let minStart = null;
            let maxEnd = null;

            if (children.length > 0) {
                children.forEach(child => {
                    if (!minStart || child.startDate < minStart) minStart = child.startDate;
                    if (!maxEnd || child.endDate > maxEnd) maxEnd = child.endDate;
                });
            } else {
                minStart = new Date();
                maxEnd = new Date();
            }

            // ЛОГИКА: Ширина заказа = календарные дни от минимальной до максимальной даты
            // Это корректно для параллельного производства (несколько изделий одновременно)
            const calendarDuration = minStart && maxEnd
                ? Math.max(1, Math.ceil((maxEnd - minStart) / (1000 * 60 * 60 * 24)) + 1)
                : 1;

            // Расчет общего рабочего времени заказа: берем МАКСИМАЛЬНОЕ время одного изделия
            // (как просил пользователь: "по времени максимального изготовления одного изделия")
            const maxProductHours = children.length > 0 
                ? Math.max(...children.map(c => parseFloat(c.totalHours))) 
                : 0;

            const startOffset = Math.ceil((minStart - startDate) / (1000 * 60 * 60 * 24));

            return {
                id: order.id,
                type: 'order',
                customStatus: order.customStatus,
                drawingsDeadline: order.drawingsDeadline,
                materialsDeadline: order.materialsDeadline,
                paintDeadline: order.paintDeadline,
                drawingsArrived: order.drawingsArrived, 
                materialsArrived: order.materialsArrived, 
                paintArrived: order.paintArrived, 
                isImportant: order.isImportant, 
                orderNumber: order.orderNumber,
                clientName: order.clientName,
                deadline: order.deadline,
                startDate: minStart,
                endDate: maxEnd,
                totalHours: maxProductHours.toFixed(1), 
                durationDays: calendarDuration, 
                startOffset,
                children: children
            };
        });

    }, [orders, products, startDate, schedulerResults]);

    return { calendarDays, ganttRows, startDate };
};