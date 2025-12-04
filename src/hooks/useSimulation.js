import { useMemo } from 'react';
import { formatDate, getResourceHoursForDate } from '../utils/helpers';

export const useSimulation = (products, resources) => {
  return useMemo(() => {
    const ganttItems = [];
    
    // 1. Глобальный календарь занятости
    const globalTimeline = {};
    
    // Инициализируем timeline для всех ресурсов
    resources.forEach(r => {
        globalTimeline[r.id] = {};
    });

    // 2. Берем только активные заказы
    const activeProducts = products.filter(p => p.status === 'active');

    // 3. Симуляция каждого заказа
    activeProducts.forEach(product => {
      // Жесткая дата начала заказа. Раньше нее ничего планировать нельзя.
      const productStartDate = new Date(product.startDate);
      productStartDate.setHours(0,0,0,0);

      // Текущая дата старта для цепочки операций (сдвигается по мере выполнения)
      let currentOperationStartDate = new Date(productStartDate);
      
      const sortedOps = [...product.operations].sort((a, b) => a.sequence - b.sequence);
      const productGanttSegments = [];

      sortedOps.forEach(op => {
        const totalHoursNeeded = (op.minutesPerUnit * product.quantity) / 60;
        const assignedCount = op.resourceIds.length;
        
        let operationMaxEndDate = new Date(currentOperationStartDate);

        if (assignedCount > 0) {
            // ЛОГИКА #2: Делим время поровну между сотрудниками
            const hoursPerPerson = totalHoursNeeded / assignedCount;

            // Для каждого сотрудника планируем его кусок работы
            op.resourceIds.forEach(resId => {
                let personalHoursRemaining = hoursPerPerson;
                
                // Сотрудник начинает работу не раньше, чем разрешено (дата старта операции)
                let simulationDate = new Date(currentOperationStartDate);
                simulationDate.setHours(0,0,0,0);
                
                let daysElapsed = 0;

                while (personalHoursRemaining > 0.01 && daysElapsed < 365) {
                    const dateStr = formatDate(simulationDate);
                    const resource = resources.find(r => r.id === resId);

                    if (resource) {
                        // Сколько вообще может работать в этот день
                        const maxCapacity = getResourceHoursForDate(resource, simulationDate);
                        // Сколько уже занято на других задачах
                        const usedHours = globalTimeline[resId]?.[dateStr] || 0;
                        // Сколько свободно
                        const freeHours = Math.max(0, maxCapacity - usedHours);

                        if (freeHours > 0) {
                            const contribution = Math.min(freeHours, personalHoursRemaining);
                            
                            // Записываем нагрузку
                            if (!globalTimeline[resId]) globalTimeline[resId] = {};
                            const currentTotal = globalTimeline[resId][dateStr] || 0;
                            globalTimeline[resId][dateStr] = currentTotal + contribution;

                            personalHoursRemaining -= contribution;
                        }
                    }

                    // Если работа еще осталась, переходим на завтра, иначе - стоп для этого сотрудника
                    if (personalHoursRemaining > 0.01) {
                        simulationDate.setDate(simulationDate.getDate() + 1);
                        daysElapsed++;
                    }
                }
                
                // Дата окончания работы конкретного сотрудника
                if (simulationDate > operationMaxEndDate) {
                    operationMaxEndDate = new Date(simulationDate);
                }
            });
        } else {
             // Если исполнителей нет, операция не выполняется, но мы должны сдвинуть график?
             // Пока просто оставляем дату как есть, считаем что она выполнена мгновенно (или висит)
        }

        const operationStartDate = new Date(currentOperationStartDate);
        const operationEndDate = new Date(operationMaxEndDate);
        const daysDuration = Math.ceil((operationEndDate - operationStartDate) / (1000 * 60 * 60 * 24)) + 1;

        productGanttSegments.push({
            opId: op.id,
            name: op.name,
            hours: totalHoursNeeded,
            startDate: operationStartDate,
            endDate: operationEndDate,
            days: daysDuration,
            resourceNames: op.resourceIds.map(id => resources.find(r => r.id === id)?.name).join(', ')
        });

        // Следующая операция начинается когда закончилась эта (самый поздний сотрудник)
        currentOperationStartDate = new Date(operationEndDate);
    
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