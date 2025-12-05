import { useMemo } from 'react';

export const useSimulation = (products, resources, orders = []) => {
  
  const simulationResult = useMemo(() => {
    // 1. Подготовка данных
    // Создаем карту доступности ресурсов: { resourceId: { "2023-12-05": 8 (часов свободно) } }
    const resourceAvailabilityMap = {};
    
    // Хелпер для получения свободного времени ресурса в конкретный день
    const getResourceFreeHours = (resId, dateStr) => {
        if (!resourceAvailabilityMap[resId]) resourceAvailabilityMap[resId] = {};
        if (resourceAvailabilityMap[resId][dateStr] === undefined) {
            // Если день еще не трогали, берем стандартную смену сотрудника
            const res = resources.find(r => r.id === resId);
            resourceAvailabilityMap[resId][dateStr] = res ? res.hoursPerDay : 8;
        }
        return resourceAvailabilityMap[resId][dateStr];
    };

    // Хелпер для бронирования времени
    const bookResourceTime = (resId, dateStr, hoursNeeded) => {
        const free = getResourceFreeHours(resId, dateStr);
        const booked = Math.min(free, hoursNeeded);
        resourceAvailabilityMap[resId][dateStr] -= booked;
        return booked; // Возвращаем, сколько удалось забронировать
    };

    // 2. Сортировка продуктов по приоритету (Сначала те, у кого ранний дэдлайн родительского заказа)
    // Нам нужно знать дэдлайн заказа для каждого продукта
    const sortedProducts = [...products].map(p => {
        const parentOrder = orders.find(o => o.id === p.orderId);
        // Если дэдлайна нет - ставим в конец очереди (год 2099)
        const deadline = parentOrder?.deadline ? new Date(parentOrder.deadline) : new Date('2099-12-31');
        return { ...p, _sortDeadline: deadline };
    }).sort((a, b) => a._sortDeadline - b._sortDeadline);

    // 3. Симуляция
    const ganttItems = [];
    const globalTimeline = {}; // Для отчета по нагрузке

    sortedProducts.forEach(product => {
        if (product.status === 'completed') return; // Пропускаем завершенные в расчете будущего

        let currentSimDate = new Date(product.startDate || new Date()); // Начинаем с даты старта или сегодня
        // Обнуляем время до начала дня
        currentSimDate.setHours(0,0,0,0);

        let productStart = null;

        // Проходим по операциям последовательно
        const sortedOps = [...product.operations].sort((a, b) => a.sequence - b.sequence);
        
        sortedOps.forEach(op => {
            // Сколько часов нужно выполнить (План)
            // Если есть Факт, мы могли бы вычитать, но для Ганта планируем "Весь объем" или "Остаток".
            // Сейчас планируем полный объем для наглядности загрузки.
            let hoursRemaining = (op.minutesPerUnit * product.quantity) / 60;
            
            // Если операция уже выполнена (факт >= план), пропускаем её эмуляцию, время не тратим
            if (op.actualMinutes && op.actualMinutes >= op.minutesPerUnit) {
                hoursRemaining = 0;
            }

            // Если это первая операция, фиксируем старт продукта
            if (hoursRemaining > 0 && !productStart) {
                productStart = new Date(currentSimDate);
            }

            // Пока работа не выполнена
            while (hoursRemaining > 0) {
                const dateStr = currentSimDate.toISOString().split('T')[0];
                
                // Ищем, кто может сделать эту работу
                let assigned = false;
                const capableResourceIds = op.resourceIds && op.resourceIds.length > 0 
                    ? op.resourceIds 
                    : resources.map(r => r.id); // Если никто не назначен, берем любого (упрощение)

                // Пробуем найти ресурс с свободным временем в этот день
                for (let resId of capableResourceIds) {
                    const freeHours = getResourceFreeHours(resId, dateStr);
                    
                    if (freeHours > 0) {
                        const worked = bookResourceTime(resId, dateStr, hoursRemaining);
                        hoursRemaining -= worked;
                        
                        // Записываем в глобальную статистику
                        if (!globalTimeline[resId]) globalTimeline[resId] = {};
                        if (!globalTimeline[resId][dateStr]) globalTimeline[resId][dateStr] = 0;
                        globalTimeline[resId][dateStr] += worked;

                        assigned = true;
                        if (hoursRemaining <= 0.01) break; // Работа выполнена
                    }
                }

                // Если в этот день никто не смог поработать или работы еще осталось -> переходим на следующий день
                if (hoursRemaining > 0) {
                    currentSimDate.setDate(currentSimDate.getDate() + 1);
                }
            }
        });

        const productEnd = new Date(currentSimDate);
        if (!productStart) productStart = new Date(); // Если все операции выполнены

        ganttItems.push({
            productId: product.id,
            productName: product.name,
            startDate: productStart,
            endDate: productEnd,
            durationDays: Math.ceil((productEnd - productStart) / (1000 * 60 * 60 * 24)) + 1
        });
    });

    return { ganttItems, globalTimeline };

  }, [products, resources, orders]);

  return simulationResult;
};