import { useMemo } from 'react';
import { formatDate, getResourceHoursForDate } from '../utils/helpers';

export const useSimulation = (products, resources) => {
  return useMemo(() => {
    const ganttItems = [];
    const resourceLoad = {}; 
    
    // 1. Инициализация нагрузки
    resources.forEach(r => {
        resourceLoad[r.id] = { 
            name: r.name, 
            totalHours: 0, 
            maxCapacityPerDay: r.hoursPerDay 
        };
    });

    // 2. Фильтрация активных
    const activeProducts = products.filter(p => p.status === 'active');

    // 3. Симуляция
    activeProducts.forEach(product => {
      let currentOperationStartDate = new Date(product.startDate);
      
      const today = new Date();
      today.setHours(0,0,0,0);
      // Не планируем в прошлом
      if (currentOperationStartDate < today) currentOperationStartDate = new Date(today);

      const sortedOps = [...product.operations].sort((a, b) => a.sequence - b.sequence);
      const productGanttSegments = [];

      sortedOps.forEach(op => {
        const totalHoursNeeded = (op.minutesPerUnit * product.quantity) / 60;
        let hoursRemaining = totalHoursNeeded;
        
        let simulationDate = new Date(currentOperationStartDate);
        simulationDate.setHours(0, 0, 0, 0);

        let daysElapsed = 0;
        let operationStartDate = new Date(simulationDate);

        // Цикл по дням
        while (hoursRemaining > 0.01 && daysElapsed < 365) {
           let dailyProduction = 0;
           
           op.resourceIds.forEach(resId => {
             const resource = resources.find(r => r.id === parseInt(resId));
             if (resource) {
               // ИСПОЛЬЗУЕМ ФУНКЦИЮ ИЗ HELPERS
               const availableHours = getResourceHoursForDate(resource, simulationDate);
               const contribution = Math.min(availableHours, hoursRemaining);
               
               if (contribution > 0) {
                 dailyProduction += availableHours; 
                 // Записываем реальную нагрузку
                 resourceLoad[resId].totalHours += Math.min(availableHours, hoursRemaining);
               }
             }
           });

           if (dailyProduction > 0) {
             hoursRemaining -= dailyProduction;
           }

           if (hoursRemaining > 0 || dailyProduction === 0) {
             simulationDate.setDate(simulationDate.getDate() + 1);
             daysElapsed++;
           }
        }

        const operationEndDate = new Date(simulationDate);

        productGanttSegments.push({
            opId: op.id,
            name: op.name,
            hours: totalHoursNeeded,
            startDate: operationStartDate,
            endDate: operationEndDate,
            days: daysElapsed + 1,
            resourceNames: op.resourceIds.map(id => resources.find(r => r.id == id)?.name).join(', ')
        });

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

    return { ganttItems, resourceLoad };
  }, [products, resources]);
};