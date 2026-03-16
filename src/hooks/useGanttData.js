import { useMemo } from 'react';

// Хелпер: Добавление РАБОЧИХ дней к дате
const addWorkingDays = (startDate, workingDaysDuration) => {
    const result = new Date(startDate);
    if (workingDaysDuration <= 1) return result;

    let added = 0;
    while (added < workingDaysDuration - 1) {
        result.setDate(result.getDate() + 1);
        const day = result.getDay();
        if (day !== 0 && day !== 6) {
            added++;
        }
    }
    return result;
};

// Хелпер для парсинга даты без учета часового пояса
const parseSafeDate = (dateVal) => {
    if (!dateVal) return new Date();
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return new Date();
    
    // Если это строка YYYY-MM-DD, добавляем время для стабильности
    if (typeof dateVal === 'string' && dateVal.length === 10) {
        return new Date(dateVal + 'T00:00:00');
    }
    
    d.setHours(0, 0, 0, 0);
    return d;
};

export const useGanttData = (orders = [], products = [], resources = [], daysToRender = 90) => {
    // 1. Настройка календаря (начинаем за 7 дней до сегодня)
    const startDate = useMemo(() => {
        const date = new Date();
        date.setHours(0,0,0,0);
        date.setDate(date.getDate() - 7);
        return date;
    }, []); 

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
            .filter(o => o.status === 'active' && o.isProductOrder !== true)
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
                let pStart = parseSafeDate(prod.startDate);
                let pEnd;

                if (prod.endDate) {
                    pEnd = parseSafeDate(prod.endDate);
                } else {
                    const estimatedHours = prod.estimatedHours || 8;
                    const workDaysNeeded = Math.max(1, Math.ceil(estimatedHours / 8));
                    pEnd = addWorkingDays(pStart, workDaysNeeded);
                }
                
                // Расчет длительности: (End - Start) в днях + 1
                const diffMs = pEnd.getTime() - pStart.getTime();
                const calendarDuration = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
                
                const displayHours = prod.estimatedHours || 
                    (prod.operations?.reduce((sum, op) => sum + (parseFloat(op.minutesPerUnit) || 0) * (prod.quantity || 1), 0) / 60) || 0;

                return {
                    id: prod.id,
                    productId: prod.id,
                    type: 'product',
                    name: prod.name,
                    quantity: prod.quantity,
                    startDate: pStart,
                    endDate: pEnd,
                    totalHours: displayHours.toFixed(1),
                    durationDays: calendarDuration,
                    isResale: prod.isResale,
                    isCompleted: prod.isCompleted || prod.status === 'completed'
                };
            });

            // Расчет дат заказа (границы его изделий)
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

            const diffMs = maxEnd.getTime() - minStart.getTime();
            const calendarDuration = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);

            // ЗАКАЗ ГОТОВ, если все его изделия готовы
            const isOrderCompleted = children.length > 0 && children.every(c => c.isCompleted);

            return {
                id: order.id,
                type: 'order',
                customStatus: order.customStatus,
                drawingsDeadline: order.drawingsDeadline,
                materialsDeadline: order.materialsDeadline,
                paintDeadline: order.paintDeadline,
                isImportant: order.isImportant, 
                orderNumber: order.orderNumber,
                clientName: order.clientName,
                deadline: order.deadline,
                startDate: minStart,
                endDate: maxEnd,
                totalHours: children.reduce((sum, c) => sum + parseFloat(c.totalHours), 0).toFixed(1), 
                durationDays: calendarDuration, 
                isCompleted: isOrderCompleted,
                children: children
            };
        });

    }, [orders, products, startDate]);

    return { calendarDays, ganttRows, startDate };
};