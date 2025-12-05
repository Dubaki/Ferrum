import { useMemo } from 'react';

export const useSimulation = (products, resources, orders = []) => {
  
  const simulationResult = useMemo(() => {
    // 1. Инициализация глобального таймлайна загрузки
    const globalTimeline = {}; 

    // Хелперы для учета времени
    const getBookedHours = (resId, dateStr) => {
        if (!globalTimeline[resId]) globalTimeline[resId] = {};
        return globalTimeline[resId][dateStr] || 0;
    };

    const addBookedHours = (resId, dateStr, hours) => {
        if (!globalTimeline[resId]) globalTimeline[resId] = {};
        const current = globalTimeline[resId][dateStr] || 0;
        // Округляем до сотых
        globalTimeline[resId][dateStr] = Math.round((current + hours) * 100) / 100;
    };

    // 2. Сбор операций
    let allOperations = [];
    
    products.forEach(product => {
        if (product.status === 'completed') return;

        const parentOrder = orders.find(o => o.id === product.orderId);
        const deadlineTimestamp = parentOrder?.deadline ? new Date(parentOrder.deadline).getTime() : 9999999999999;
        
        let startDate = product.startDate ? new Date(product.startDate) : new Date();
        const today = new Date();
        today.setHours(0,0,0,0);
        if (startDate < today) startDate = today;

        const quantity = parseInt(product.quantity) || 1;

        product.operations.forEach(op => {
            // Защита: Убеждаемся, что resourceIds это массив
            const rawResourceIds = Array.isArray(op.resourceIds) ? op.resourceIds : [];
            
            allOperations.push({
                ...op,
                productName: product.name,
                productId: product.id,
                quantity: quantity,
                minutesPerUnit: parseFloat(op.minutesPerUnit) || 0,
                actualMinutes: parseFloat(op.actualMinutes) || 0,
                productStartDate: startDate,
                deadline: deadlineTimestamp,
                sequence: op.sequence,
                resourceIds: rawResourceIds // Передаем чистый массив
            });
        });
    });

    // Сортировка (Срочные -> По порядку)
    allOperations.sort((a, b) => {
        if (a.deadline !== b.deadline) return a.deadline - b.deadline;
        if (a.productId !== b.productId) return a.productId - b.productId;
        return a.sequence - b.sequence;
    });

    // 3. Расчет ("Тетрис")
    const ganttDataMap = {}; 

    allOperations.forEach(op => {
        // --- ФОРМУЛА РАСЧЕТА ---
        const totalMinutesRequired = op.minutesPerUnit * op.quantity;
        const totalMinutesDone = op.actualMinutes * op.quantity;
        
        // Сколько осталось сделать всего (в часах)
        let remainingMinutes = Math.max(0, totalMinutesRequired - totalMinutesDone);
        let remainingHoursTotal = remainingMinutes / 60;

        // Если работы нет, пропускаем
        if (remainingHoursTotal <= 0.001) return;

        // Проверяем количество исполнителей
        const assignedIds = op.resourceIds.length > 0 ? op.resourceIds : [];
        
        // Если исполнителей нет, мы не можем запланировать работу в график (она висит в воздухе)
        if (assignedIds.length === 0) return;

        // !!! ГЛАВНОЕ ИСПРАВЛЕНИЕ !!!
        // Делим общее время на количество людей
        const hoursPerPerson = remainingHoursTotal / assignedIds.length;

        let opStartDate = null;
        let opEndDate = null;

        // Распределяем долю каждого сотрудника
        assignedIds.forEach(resId => {
            const resource = resources.find(r => r.id === resId);
            // Если ресурс удален, но висит в операции, считаем по стандарту 8ч
            const maxDailyHours = resource ? parseFloat(resource.hoursPerDay) : 8; 
            
            let personalTaskHours = hoursPerPerson; // <--- Вот здесь берем уже поделенное время
            
            let currentDate = new Date(op.productStartDate);
            let loopGuard = 0; 
            
            // Заливаем "стакан" времени для конкретного сотрудника
            while (personalTaskHours > 0.001 && loopGuard < 365) {
                const dateStr = currentDate.toISOString().split('T')[0];
                const currentlyBooked = getBookedHours(resId, dateStr);
                
                const freeSpace = Math.max(0, maxDailyHours - currentlyBooked);

                if (freeSpace > 0.001) {
                    const booking = Math.min(freeSpace, personalTaskHours);
                    addBookedHours(resId, dateStr, booking);
                    personalTaskHours -= booking;

                    // Фиксируем даты начала/конца работы для Ганта
                    if (!opStartDate) opStartDate = new Date(currentDate);
                    // Расширяем дату конца, если эта работа ушла дальше, чем у других коллег
                    if (!opEndDate || currentDate > opEndDate) opEndDate = new Date(currentDate);
                }

                if (personalTaskHours > 0.001) {
                    currentDate.setDate(currentDate.getDate() + 1);
                }
                loopGuard++;
            }
        });

        // Запись итоговых дат в Гант (берем общие рамки операции по всем сотрудникам)
        if (opStartDate && opEndDate) {
            if (!ganttDataMap[op.productId]) {
                ganttDataMap[op.productId] = { start: opStartDate, end: opEndDate, name: op.productName };
            } else {
                if (opStartDate < ganttDataMap[op.productId].start) ganttDataMap[op.productId].start = opStartDate;
                if (opEndDate > ganttDataMap[op.productId].end) ganttDataMap[op.productId].end = opEndDate;
            }
        }
    });

    // Формируем массив для Ганта
    const ganttItems = Object.keys(ganttDataMap).map(pid => {
        const item = ganttDataMap[pid];
        const duration = Math.ceil((item.end - item.start) / (1000 * 60 * 60 * 24)) + 1;
        return {
            productId: parseInt(pid) || pid,
            productName: item.name,
            startDate: item.start,
            endDate: item.end,
            durationDays: duration
        };
    });

    return { ganttItems, globalTimeline };

  }, [products, resources, orders]); // Зависимости для пересчета

  return simulationResult;
};