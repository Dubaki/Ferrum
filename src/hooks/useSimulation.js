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

    // 2. СОРТИРОВКА ЗАКАЗОВ (Главное исправление)
    // Планируем в первую очередь те, у которых раньше Дэдлайн (Готовность).
    // Это обеспечивает "жадное" заполнение ближайших дней самыми важными задачами.
    const activeProducts = products
      .filter(p => p.status === 'active')
      .sort((a, b) => {
          // 1. Сначала по дедлайну (срочные вперед)
          if (a.deadline && b.deadline) {
              const diff = new Date(a.deadline) - new Date(b.deadline);
              if (diff !== 0) return diff;
          }
          // 2. Если дедлайна нет - они в конец очереди
          if (a.deadline && !b.deadline) return -1;
          if (!a.deadline && b.deadline) return 1;
          
          // 3. Если даты равны, то по стартовой дате (кто раньше готов начать)
          const startDiff = new Date(a.startDate) - new Date(b.startDate);
          if (startDiff !== 0) return startDiff;

          // 4. По ID (старые вперед)
          return a.id - b.id; 
      });

    // 3. Симуляция
    activeProducts.forEach(product => {
      // Это дата "Материалы готовы". Раньше неё планировать нельзя.
      const earliestStartDate = new Date(product.startDate);
      earliestStartDate.setHours(0,0,0,0);

      // Курсор планирования для текущей операции
      let currentOperationStartDate = new Date(earliestStartDate);
      
      const sortedOps = [...product.operations].sort((a, b) => a.sequence - b.sequence);
      const productGanttSegments = [];

      sortedOps.forEach(op => {
        const totalHoursNeeded = (op.minutesPerUnit * product.quantity) / 60;
        const assignedCount = op.resourceIds.length;
        
        // Дата, когда освободится ПОСЛЕДНИЙ сотрудник в этой операции
        let operationMaxEndDate = new Date(currentOperationStartDate);

        if (assignedCount > 0) {
            // Делим объем работы на количество людей
            const hoursPerPerson = totalHoursNeeded / assignedCount;

            op.resourceIds.forEach(resId => {
                let personalHoursRemaining = hoursPerPerson;
                
                // Начинаем искать свободное место с currentOperationStartDate
                let simulationDate = new Date(currentOperationStartDate);
                simulationDate.setHours(0,0,0,0);
                
                let daysElapsed = 0;

                while (personalHoursRemaining > 0.001 && daysElapsed < 365) {
                    const dateStr = formatDate(simulationDate);
                    const resource = resources.find(r => r.id === resId);

                    if (resource) {
                        const maxCapacity = getResourceHoursForDate(resource, simulationDate);
                        const usedHours = globalTimeline[resId]?.[dateStr] || 0;
                        const freeHours = Math.max(0, maxCapacity - usedHours);

                        if (freeHours > 0) {
                            // Жадный алгоритм: берем всё свободное время в этот день
                            const contribution = Math.min(freeHours, personalHoursRemaining);
                            
                            if (!globalTimeline[resId]) globalTimeline[resId] = {};
                            const currentTotal = globalTimeline[resId][dateStr] || 0;
                            globalTimeline[resId][dateStr] = currentTotal + contribution;

                            personalHoursRemaining -= contribution;
                        }
                    }

                    // Если работа осталась, идем на следующий день
                    if (personalHoursRemaining > 0.001) {
                        simulationDate.setDate(simulationDate.getDate() + 1);
                        daysElapsed++;
                    }
                }
                
                // Сдвигаем дату окончания операции по самому медленному участнику
                if (simulationDate > operationMaxEndDate) {
                    operationMaxEndDate = new Date(simulationDate);
                }
            });
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

        // Следующая операция начинается сразу после окончания этой
        // (ставим ту же дату, так как теоретически можно успеть начать следующую в тот же день)
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