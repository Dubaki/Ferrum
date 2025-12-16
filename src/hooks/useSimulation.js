import { useMemo } from 'react';

export const useSimulation = (products, resources, orders = []) => {
  
  const simulationResult = useMemo(() => {
    // 1. Инициализация хранилищ
    const globalTimeline = {}; // { resId: { "2023-12-05": 8.0 } } -> Для цвета ячеек
    const dailyAllocations = {}; // { resId: { "2023-12-05": [ { taskName: '...', hours: 2 }, ... ] } } -> Для модального окна

    const getBookedHours = (resId, dateStr) => {
        if (!globalTimeline[resId]) globalTimeline[resId] = {};
        return globalTimeline[resId][dateStr] || 0;
    };

    const addBookedHours = (resId, dateStr, hours, taskInfo) => {
        // Суммарная загрузка
        if (!globalTimeline[resId]) globalTimeline[resId] = {};
        const current = globalTimeline[resId][dateStr] || 0;
        globalTimeline[resId][dateStr] = Math.round((current + hours) * 100) / 100;

        // Детальная загрузка (для клика по дню)
        if (!dailyAllocations[resId]) dailyAllocations[resId] = {};
        if (!dailyAllocations[resId][dateStr]) dailyAllocations[resId][dateStr] = [];
        
        // Группируем, если такая задача уже есть в этот день
        const existingTask = dailyAllocations[resId][dateStr].find(t => t.id === taskInfo.id);
        if (existingTask) {
            existingTask.hours = Math.round((existingTask.hours + hours) * 100) / 100;
        } else {
            dailyAllocations[resId][dateStr].push({ ...taskInfo, hours: Math.round(hours * 100) / 100 });
        }
    };

    // 2. Сбор операций
    let allOperations = [];
    products.forEach(product => {
        if (product.status === 'completed') return;
        const parentOrder = orders.find(o => o.id === product.orderId);
        const deadlineTimestamp = parentOrder?.deadline ? new Date(parentOrder.deadline).getTime() : 9999999999999;
        let startDate = product.startDate ? new Date(product.startDate) : new Date();
        const today = new Date(); today.setHours(0,0,0,0);
        if (startDate < today) startDate = today;
        const quantity = parseInt(product.quantity) || 1;

        product.operations.forEach(op => {
            allOperations.push({
                ...op,
                productName: product.name,
                orderNumber: parentOrder?.orderNumber,
                productId: product.id,
                quantity: quantity,
                minutesPerUnit: parseFloat(op.minutesPerUnit) || 0,
                actualMinutes: parseFloat(op.actualMinutes) || 0,
                productStartDate: startDate,
                deadline: deadlineTimestamp,
                sequence: op.sequence,
                resourceIds: Array.isArray(op.resourceIds) ? op.resourceIds : []
            });
        });
    });

    allOperations.sort((a, b) => {
        if (a.deadline !== b.deadline) return a.deadline - b.deadline;
        if (a.productId !== b.productId) return a.productId - b.productId;
        return a.sequence - b.sequence;
    });

    // 3. Расчет
    const ganttDataMap = {}; 

    allOperations.forEach(op => {
        // Пропускаем выполненные операции (с галочкой готовности)
        if ((op.actualMinutes || 0) > 0) return;

        // Пропускаем операции с ручной датой (они учтены в manualAllocations)
        if (op.plannedDate) return;

        const totalMinutesRequired = op.minutesPerUnit * op.quantity;
        const totalMinutesDone = op.actualMinutes * op.quantity;
        let remainingMinutes = Math.max(0, totalMinutesRequired - totalMinutesDone);
        let remainingHoursTotal = remainingMinutes / 60;

        if (remainingHoursTotal <= 0.001) return;
        const assignedIds = op.resourceIds.length > 0 ? op.resourceIds : [];
        if (assignedIds.length === 0) return;

        const hoursPerPerson = remainingHoursTotal / assignedIds.length;
        let opStartDate = null;
        let opEndDate = null;

        assignedIds.forEach(resId => {
            const resource = resources.find(r => r.id === resId);
            // НОВОЕ: Учитываем график (больничный/выходной/переработка)
            // Если ресурса нет - берем 8ч, иначе смотрим override, иначе стандартную смену
            const getDailyCapacity = (dateStr) => {
                if (!resource) return 8;
                if (resource.scheduleOverrides && resource.scheduleOverrides[dateStr] !== undefined) {
                    return resource.scheduleOverrides[dateStr];
                }
                return parseFloat(resource.hoursPerDay);
            };
            
            let personalTaskHours = hoursPerPerson;
            let currentDate = new Date(op.productStartDate);
            let loopGuard = 0; 
            
            while (personalTaskHours > 0.001 && loopGuard < 365) {
                const dateStr = currentDate.toISOString().split('T')[0];
                const maxDailyHours = getDailyCapacity(dateStr);
                const currentlyBooked = getBookedHours(resId, dateStr);
                
                const freeSpace = Math.max(0, maxDailyHours - currentlyBooked);

                if (freeSpace > 0.001) {
                    const booking = Math.min(freeSpace, personalTaskHours);
                    addBookedHours(resId, dateStr, booking, {
                        id: op.id,
                        name: op.name,
                        productName: op.productName,
                        orderNumber: op.orderNumber
                    });
                    personalTaskHours -= booking;

                    if (!opStartDate) opStartDate = new Date(currentDate);
                    if (!opEndDate || currentDate > opEndDate) opEndDate = new Date(currentDate);
                }

                if (personalTaskHours > 0.001) {
                    currentDate.setDate(currentDate.getDate() + 1);
                }
                loopGuard++;
            }
        });

        if (opStartDate && opEndDate) {
            if (!ganttDataMap[op.productId]) {
                ganttDataMap[op.productId] = { start: opStartDate, end: opEndDate, name: op.productName };
            } else {
                if (opStartDate < ganttDataMap[op.productId].start) ganttDataMap[op.productId].start = opStartDate;
                if (opEndDate > ganttDataMap[op.productId].end) ganttDataMap[op.productId].end = opEndDate;
            }
        }
    });

    const ganttItems = Object.keys(ganttDataMap).map(pid => {
        const item = ganttDataMap[pid];
        return {
            productId: parseInt(pid) || pid,
            productName: item.name,
            startDate: item.start,
            endDate: item.end,
            durationDays: Math.ceil((item.end - item.start) / (1000 * 60 * 60 * 24)) + 1
        };
    });

    // Возвращаем dailyAllocations для детального просмотра
    return { ganttItems, globalTimeline, dailyAllocations };

  }, [products, resources, orders]);

  return simulationResult;
};