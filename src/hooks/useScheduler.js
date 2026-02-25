import { useMemo } from 'react';
import { generateRoute } from '../utils/routeGenerator';

// Нормализация даты в строку YYYY-MM-DD
const fmtDate = (date) => {
  const d = new Date(date);
  const month = '' + (d.getMonth() + 1);
  const day = '' + d.getDate();
  const year = d.getFullYear();
  return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

/**
 * Хук автоматического планирования (AI Scheduler Core)
 */
export const useScheduler = (orders, products, resources, simulatedOrders = []) => {
  
  const scheduleData = useMemo(() => {
    if (!resources.length) return { scheduledOps: [], loadMatrix: {}, ordersTimeline: [] };

    // 1. Подготовка операций (Реальные + Симулируемые)
    let allOps = [];
    
    // А. Реальные
    products.forEach(prod => {
      if (prod.status === 'completed' || prod.status === 'archived') return;
      const order = orders.find(o => o.id === prod.orderId);
      if (order && order.status !== 'active') return;

      const priority = order ? (order.priority || 3) : 4;
      const deadline = order?.deadline || '2099-12-31';

      prod.operations?.forEach(op => {
        const totalMinutes = op.minutesPerUnit * (prod.quantity || 1);
        const doneMinutes = op.actualMinutes || 0;
        const remainingHours = Math.max(0.1, (totalMinutes - doneMinutes) / 60);
        if (remainingHours <= 0.1 && doneMinutes > 0) return;

        allOps.push({
          id: op.id,
          prodId: prod.id,
          prodName: prod.name,
          orderId: order?.id,
          orderNumber: order?.orderNumber,
          opName: op.name,
          stage: op.stage,
          seq: op.sequence || 1,
          hours: remainingHours,
          priority: priority,
          deadline: deadline,
          preferredResIds: op.resourceIds || [], 
          needsLargePost: op.needsLargePost || false,
          isSimulated: false
        });
      });
    });

    // Б. Симулируемые
    simulatedOrders.forEach(sim => {
      const simRoute = generateRoute({
        id: sim.number || 'SIM',
        weight_kg: (sim.tonnage || 1) * 1000,
        quantity: 1,
        complexity: sim.complexity || 'medium',
        sizeCategory: sim.sizeCategory || 'medium',
        hasProfileCut: true,
        hasSheetCut: sim.hasSheetCut || false
      });

      simRoute.forEach(op => {
        allOps.push({
          id: `sim_${sim.id}_${op.id}`,
          prodId: `sim_prod_${sim.id}`,
          prodName: `[СИМ] ${sim.number}`,
          orderId: `sim_order_${sim.id}`,
          orderNumber: sim.number,
          opName: op.label,
          stage: op.stage,
          seq: op.sequence,
          hours: op.hours,
          priority: sim.priority || 3,
          deadline: sim.deadline || '2099-12-31',
          preferredResIds: [op.preferredResourceId],
          isSimulated: true
        });
      });
    });

    // 2. Сортировка
    allOps.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.deadline !== b.deadline) return a.deadline.localeCompare(b.deadline);
      if (a.prodId === b.prodId) return a.seq - b.seq;
      return 0;
    });

    // 3. Распределение
    const today = new Date();
    today.setHours(0,0,0,0);
    const loadMatrix = {};
    const scheduledOps = [];
    const ordersTimeline = {};
    const prodProgress = {};

    allOps.forEach(op => {
      let earliestStart = prodProgress[op.prodId] ? new Date(prodProgress[op.prodId]) : new Date(today);
      let candidateResources = resources.filter(r => {
        if (op.preferredResIds.length > 0 && !op.isSimulated) return op.preferredResIds.includes(r.id);
        if (op.stage && r.stage !== op.stage) return false;
        if (op.needsLargePost && !r.isLarge) return false;
        return true;
      });

      if (candidateResources.length === 0) {
        candidateResources = resources.filter(r => r.stage === op.stage);
        if (candidateResources.length === 0) return;
      }

      let bestResource = null;
      let bestStartDate = null;
      let bestEndDate = null;
      let allocated = false;
      let cursorDate = new Date(earliestStart);
      let dayOffset = 0;

      while (!allocated && dayOffset < 365) {
        if (isWeekend(cursorDate)) {
          cursorDate = addDays(cursorDate, 1);
          dayOffset++;
          continue;
        }

        const dateStr = fmtDate(cursorDate);
        candidateResources.sort((a, b) => (loadMatrix[a.id]?.[dateStr]?.total || 0) - (loadMatrix[b.id]?.[dateStr]?.total || 0));

        for (const res of candidateResources) {
          const currentLoad = loadMatrix[res.id]?.[dateStr]?.total || 0;
          const capacity = res.hoursPerDay || 8;
          const freeNow = capacity - currentLoad;

          // ИСПРАВЛЕНИЕ: Не начинаем новую операцию в этот день, если осталось < 1 часа (если только сама операция не < 1 часа)
          if (freeNow >= Math.min(1, op.hours)) {
            let hoursRemaining = op.hours;
            let currentSimDate = new Date(cursorDate);
            bestResource = res;
            bestStartDate = new Date(cursorDate);

            while (hoursRemaining > 0) {
              if (isWeekend(currentSimDate)) {
                currentSimDate = addDays(currentSimDate, 1);
                continue;
              }
              const dStr = fmtDate(currentSimDate);
              if (!loadMatrix[res.id]) loadMatrix[res.id] = {};
              if (!loadMatrix[res.id][dStr]) loadMatrix[res.id][dStr] = { total: 0, details: [] };
              
              const used = loadMatrix[res.id][dStr].total;
              const cap = res.hoursPerDay || 8;
              const free = cap - used;
              
              if (free <= 0) {
                currentSimDate = addDays(currentSimDate, 1);
                continue;
              }

              const chunk = Math.min(free, hoursRemaining);
              loadMatrix[res.id][dStr].total += chunk;
              loadMatrix[res.id][dStr].details.push({
                orderId: op.orderId,
                orderNumber: op.orderNumber,
                prodName: op.prodName,
                hours: chunk,
                isSimulated: op.isSimulated
              });
              hoursRemaining -= chunk;
              if (hoursRemaining > 0) currentSimDate = addDays(currentSimDate, 1);
                    }
                    bestEndDate = new Date(currentSimDate);
                    allocated = true;
                    break;
                  }
                }
                if (!allocated) {
                  cursorDate = addDays(cursorDate, 1);
                  dayOffset++;
                }
              }
            
              if (allocated) {
                scheduledOps.push({ ...op, resourceId: bestResource.id, resourceName: bestResource.shortName, startDate: bestStartDate, endDate: bestEndDate });
                if (op.orderId) {
                  if (!ordersTimeline[op.orderId]) {
                    ordersTimeline[op.orderId] = { 
                      id: op.orderId, 
                      number: op.orderNumber, 
                      start: bestStartDate, 
                      end: bestEndDate, 
                      deadline: op.deadline,
                      isSimulated: op.isSimulated 
                    };
                  } else {
                    if (bestStartDate < ordersTimeline[op.orderId].start) ordersTimeline[op.orderId].start = bestStartDate;
                    if (bestEndDate > ordersTimeline[op.orderId].end) ordersTimeline[op.orderId].end = bestEndDate;
                  }
                }
                // ИСПРАВЛЕНИЕ: Убираем +1 день. Следующая операция может начаться в тот же день.
                prodProgress[op.prodId] = bestEndDate;
              }
            });
    const timelineArray = Object.values(ordersTimeline).map(tl => {
      const dl = new Date(tl.deadline);
      const isLate = tl.end > dl;
      return { ...tl, isLate, delayDays: isLate ? Math.ceil((tl.end - dl) / 86400000) : 0 };
    });

    return { scheduledOps, loadMatrix, ordersTimeline: timelineArray };
  }, [orders, products, resources, simulatedOrders]);

  return scheduleData;
};
