import { useMemo } from 'react';

export const useGanttData = (orders = [], products = [], resources = [], daysToRender = 60) => {
    // 1. Настройка календаря (начинаем за 3 дня до сегодня)
    const startDate = new Date();
    startDate.setHours(0,0,0,0);
    startDate.setDate(startDate.getDate() - 3);

    const calendarDays = Array.from({ length: daysToRender }, (_, i) => {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        return d;
    });

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
            const pStart = new Date(p.startDate);
            if (isNaN(pStart.getTime())) return;

            const ops = p.operations || [];
            const totalHours = ops.reduce((sum, op) => sum + (parseFloat(op.minutesPerUnit) || 0) * (p.quantity || 1), 0) / 60;
            
            if (totalHours <= 0) return;

            let hoursLeft = totalHours;
            let currentDate = new Date(pStart);
            let loopGuard = 0;

            while (hoursLeft > 0 && loopGuard < 60) {
                const dStr = currentDate.toISOString().split('T')[0];
                if (map[dStr]) {
                    const hoursToday = Math.min(hoursLeft, 8); 
                    map[dStr].booked += hoursToday;
                    hoursLeft -= hoursToday;
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
    }, [products, resources, calendarDays]);

    // 3. Структура для Ганта
    const ganttRows = useMemo(() => {
        // Берем ВСЕ активные заказы
        const activeOrders = orders
            .filter(o => o.status === 'active')
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
                const pStart = prod.startDate ? new Date(prod.startDate) : new Date();
                const ops = prod.operations || [];
                const totalMinutes = ops.reduce((sum, op) => sum + (parseFloat(op.minutesPerUnit) || 0) * (prod.quantity || 1), 0);
                const durationDays = Math.max(1, Math.ceil(totalMinutes / 60 / 8)); 

                const pEnd = new Date(pStart);
                pEnd.setDate(pStart.getDate() + durationDays - 1);

                return {
                    id: prod.id,
                    type: 'product', 
                    name: prod.name,
                    quantity: prod.quantity,
                    startDate: pStart,
                    endDate: pEnd,
                    totalHours: (totalMinutes / 60).toFixed(1),
                    durationDays
                };
            });

            // Расчет дат заказа
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

            const durationDays = minStart && maxEnd 
                ? Math.ceil((maxEnd - minStart) / (1000 * 60 * 60 * 24)) + 1
                : 1;

            const startOffset = Math.ceil((minStart - startDate) / (1000 * 60 * 60 * 24));

            return {
                id: order.id,
                type: 'order',
                customStatus: order.customStatus,
                
                // НОВЫЕ ПОЛЯ
                drawingsDeadline: order.drawingsDeadline,
                materialsDeadline: order.materialsDeadline,

                orderNumber: order.orderNumber,
                clientName: order.clientName,
                deadline: order.deadline,
                startDate: minStart,
                endDate: maxEnd,
                totalHours: orderTotalHours.toFixed(1),
                durationDays,
                startOffset, 
                children: children
            };
        });

    }, [orders, products, startDate]);

    return { calendarDays, heatmapData, ganttRows, startDate };
};