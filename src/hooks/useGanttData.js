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

    // 2. Расчет загрузки (Heatmap)
    const heatmapData = useMemo(() => {
        const map = {}; 
        const dailyCapacity = resources.reduce((sum, r) => sum + (parseFloat(r.hoursPerDay) || 8), 0);

        calendarDays.forEach(date => {
            const dateStr = date.toISOString().split('T')[0];
            map[dateStr] = { capacity: dailyCapacity, booked: 0, percent: 0 };
        });

        products.forEach(p => {
            if (!p.startDate || p.status !== 'active') return;
            // ИСКЛЮЧАЕМ товары для перепродажи из расчёта загрузки
            if (p.isResale === true) return;

            const pStart = new Date(p.startDate);
            if (isNaN(pStart.getTime())) return;

            const ops = p.operations || [];
            const totalHours = ops.reduce((sum, op) => sum + (parseFloat(op.minutesPerUnit) || 0) * (p.quantity || 1), 0) / 60;

            if (totalHours <= 0) return;

            let hoursLeft = totalHours;
            let currentDate = new Date(pStart);
            let loopGuard = 0;

            while (hoursLeft > 0 && loopGuard < 365) {
                const dStr = currentDate.toISOString().split('T')[0];
                const dayOfWeek = currentDate.getDay();
                
                // Пропускаем выходные при заливке Heatmap
                if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                    if (map[dStr]) {
                        const hoursToday = Math.min(hoursLeft, 8); 
                        map[dStr].booked += hoursToday;
                        hoursLeft -= hoursToday;
                    }
                }
                
                currentDate.setDate(currentDate.getDate() + 1);
                loopGuard++;
            }
        });

        Object.keys(map).forEach(key => {
            map[key].percent = map[key].capacity > 0 
                ? Math.round((map[key].booked / map[key].capacity) * 100) 
                : 0;
        });

        return map;
    }, [products, resources, calendarDays]); // calendarDays теперь мемоизирован, поэтому безопасно

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

                // Считаем общее время в минутах
                const totalMinutes = ops.reduce((sum, op) => sum + (parseFloat(op.minutesPerUnit) || 0) * (prod.quantity || 1), 0);

                // Определяем даты начала и конца изделия
                let pStart = null;
                let pEnd = null;

                // Приоритет 1: Даты из операций (если есть хотя бы у одной)
                ops.forEach(op => {
                    if (op.startDate) {
                        const opStart = new Date(op.startDate);
                        if (!pStart || opStart < pStart) pStart = opStart;
                    }
                    if (op.endDate) {
                        const opEnd = new Date(op.endDate);
                        if (!pEnd || opEnd > pEnd) pEnd = opEnd;
                    }
                    // Фоллбэк на старое поле plannedDate для обратной совместимости
                    if (!op.startDate && op.plannedDate) {
                        const opDate = new Date(op.plannedDate);
                        if (!pStart || opDate < pStart) pStart = opDate;
                        if (!pEnd || opDate > pEnd) pEnd = opDate;
                    }
                });

                // Приоритет 2: Дата начала изделия
                if (!pStart && prod.startDate) {
                    pStart = new Date(prod.startDate);
                }

                // Приоритет 3: Сегодняшняя дата
                if (!pStart) {
                    pStart = new Date();
                }

                // Если нет даты окончания - рассчитываем по трудоемкости
                if (!pEnd) {
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
                totalHours: orderTotalHours.toFixed(1),
                durationDays: visualWidth, // Ширина полоски = максимальная длительность изделия
                startOffset,
                children: children
            };
        });

    }, [orders, products, startDate]);

    return { calendarDays, heatmapData, ganttRows, startDate };
};