import { useMemo } from 'react';
import { formatDate, getResourceHoursForDate } from '../utils/helpers';

export const useSimulation = (products, resources) => {
  return useMemo(() => {
    const ganttItems = [];
    
    // 1. Глобальный календарь занятости
    // Структура: { "resourceId": { "2023-10-01": 5 (часов занято), "2023-10-02": 8 ... } }
    const globalTimeline = {};
    
    // Инициализируем timeline для всех ресурсов
    resources.forEach(r => {
        globalTimeline[r.id] = {};
    });

    // 2. Берем только активные заказы
    const activeProducts = products.filter(p => p.status === 'active');

    // 3. Симуляция каждого заказа
    activeProducts.forEach(product => {
      // Начало работы над заказом
      let currentOperationStartDate = new Date(product.startDate);
      
      const today = new Date();
      today.setHours(0,0,0,0);
      if (currentOperationStartDate < today) currentOperationStartDate = new Date(today);

      const sortedOps = [...product.operations].sort((a, b) => a.sequence - b.sequence);
      const productGanttSegments = [];

      sortedOps.forEach(op => {
        const totalHoursNeeded = (op.minutesPerUnit * product.quantity) / 60;
        let hoursRemaining = totalHoursNeeded;
        
        let simulationDate = new Date(currentOperationStartDate);
        simulationDate.setHours(0, 0, 0, 0);

        let daysElapsed = 0;
        const operationStartRecorded = new Date(simulationDate); // Запоминаем реальный старт

        // --- ЦИКЛ ПО ДНЯМ (пока не выполним работу) ---
        while (hoursRemaining > 0.01 && daysElapsed < 365) {
           const dateStr =SFformatDate(simulationDate);
           
           // 1. Ищем, кто из назначенных сотрудников свободен в этот день
           let availableResourcesToday = [];
           
           op.resourceIds.forEach(resId => {
               const resource = resources.find(r => r.id === resId);
               if (resource) {
                   // Максимальная емкость сотрудника в этот день (учитывая выходные/больничные)
                   const maxCapacity = getResourceHoursForDate(resource, simulationDate);
                   
                   // Сколько он УЖЕ отработал на других заказах в этот день
                   const usedHours = globalTimeline[resId]?.[dateStr] || 0;
                   
                   // Сколько он может взять еще
                   const freeHours = Math.max(0, maxCapacity - usedHours);
                   
                   if (freeHours > 0) {
                       availableResourcesToday.push({ id: resId, freeHours });
                   }
               }
           });

           // 2. Если есть свободные руки, распределяем работу
           if (availableResourcesToday.length > 0) {
               // Считаем общую свободную мощность бригады на сегодня
               const totalDailyCapacity = availableResourcesToday.reduce((acc, r) => acc + r.freeHours, 0);
               
               // Сколько работы можем выполнить сегодня (не больше, чем нужно, и не больше, чем есть сил)
               const workDoneToday = Math.min(hoursRemaining, totalDailyCapacity);

               // Распределяем нагрузку. 
               // Логика: делим работу поровну, но не превышая лимит каждого.
               // (Упрощенно: просто откусываем по очереди)
               let workToDistribute = workDoneToday;

               availableResourcesToday.forEach(res => {
                   if (workToDistribute <= 0) return;
                   
                   // Сотрудник берет столько, сколько может, или остаток работы
                   const contribution = Math.min(res.freeHours, workToDistribute);
                   
                   // Записываем в Глобальный Таймлайн
                   if (!globalTimeline[res.id]) globalTimeline[res.id] = {};
                   const currentUsed = globalTimeline[res.id][dateStr] || 0;
                   globalTimeline[res.id][dateStr] = currentUsed + contribution;

                   workToDistribute -= contribution;
               });

               hoursRemaining -= workDoneToday;
           }

           // 3. Если работа еще осталась, переходим на следующий день
           if (hoursRemaining > 0.01) {
             simulationDate.setDate(simulationDate.getDate() + 1);
             daysElapsed++;
           }
        }

        const operationEndRecorded = new Date(simulationDate);

        productGanttSegments.push({
            opId: op.id,
            name: op.name,
            hours: totalHoursNeeded,
            startDate: new Date(operationStartRecorded),
            endDate: new Date(operationEndRecorded),
            days: daysElapsed + 1,
            resourceNames: op.resourceIds.map(id => resources.find(r => r.id === id)?.name).join(', ')
        });

        // Следующая операция начнется на следующий день после окончания этой
        // (или в тот же день, если технологически это возможно - но пока ставим +0, чтобы не было разрывов)
        currentOperationStartDate = new Date(operationEndRecorded);
      });

      if (productGanttSegments.length > 0) {
          ganttItems.push({
              productId: product.id,
              productName: product.name,
              segments: productGanttSegments,
              startDate: productGanttSegments[0].startDate,
              endDate: productGanttSegments[productGanttSegments.length - 1].endDate
          });
      }
    });

    return { ganttItems, globalTimeline };
  }, [products, resources]);
};