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

export const useGanttData = (orders = [], products = [], resources = [], daysToRender = 60) => {
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

        return activeOrders.map(order => {
            const orderProducts = products.filter(p => p.orderId === order.id);
            
            // Собираем изделия
            const children = orderProducts.map(prod => {
                const ops = prod.operations || [];

                let totalMinutes = 0;

                // Определяем даты начала и конца изделия
                // Даты операций (op.startDate, op.endDate) теперь игнорируются для Ганта
                // и используются только для истории. Расчет Ганта идет от даты начала изделия.
                let pStart = prod.startDate ? new Date(prod.startDate) : new Date();
                let pEnd = null;

                // Теперь определяем дату окончания и общее время с учетом приоритета
                if (prod.estimatedHours && prod.estimatedHours > 0) {
                    // ПРИОРИТЕТ: Новая логика на основе введенных часов
                    totalMinutes = prod.estimatedHours * 60;
                    const workDaysNeeded = Math.max(1, Math.ceil(totalMinutes / 60 / 8));
                    pEnd = addWorkingDays(pStart, workDaysNeeded);
                } else {
                    // ФОЛЛБЭК: Старая логика на основе операций (только для подсчета времени)
                    totalMinutes = ops.reduce((sum, op) => sum + (parseFloat(op.minutesPerUnit) || 0) * (prod.quantity || 1), 0);
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
                    durationDays: calendarDuration, // Ширина полоски = календарные дни
                    workDays: workDaysNeeded // Количество рабочих дней
                };
            });

            // Расчет дат заказа (мин старт и макс конец)
            let minStart = null;
            let maxEnd = null;
            let orderTotalHours = 0;

            if (children.length > 0) {
                children.forEach(child => {
                    if (!minStart || child.startDate < minStart) minStart = child.startDate;
                    if (!maxEnd || child.endDate > maxEnd) maxEnd = child.endDate;
                    orderTotalHours += parseFloat(child.totalHours);
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
            const visualWidth = calendarDuration;

            // NEW: Calculate elapsed working hours for the order
            const elapsedWorkDays = countWorkingDays(minStart, maxEnd);
            const elapsedHours = elapsedWorkDays * 8; // Assuming 8 working hours per day

            const startOffset = Math.ceil((minStart - startDate) / (1000 * 60 * 60 * 24));

            return {
                id: order.id,
                type: 'order',
                customStatus: order.customStatus,
                drawingsDeadline: order.drawingsDeadline,
                materialsDeadline: order.materialsDeadline,
                paintDeadline: order.paintDeadline,
                drawingsArrived: order.drawingsArrived, // Флаг прибытия КМД
                materialsArrived: order.materialsArrived, // Флаг прибытия материалов
                paintArrived: order.paintArrived, // Флаг прибытия краски
                isImportant: order.isImportant, // Флаг важности
                orderNumber: order.orderNumber,
                clientName: order.clientName,
                deadline: order.deadline,
                startDate: minStart,
                endDate: maxEnd,
                totalHours: elapsedHours.toFixed(1), // Use elapsedHours instead of summed orderTotalHours
                durationDays: visualWidth, // Ширина полоски = максимальная длительность изделия
                startOffset,
                children: children
            };
        });

    }, [orders, products, startDate]);

    return { calendarDays, ganttRows, startDate };
};