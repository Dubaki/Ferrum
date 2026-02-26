import { useMemo } from 'react';
import { generateRoute } from '../utils/routeGenerator';

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

// Лентопил и Плазма работают на уровне заказа (не марки)
const CUTTING_STAGES = new Set(['cutting_profile', 'cutting_sheet']);

/**
 * Хук автоматического планирования (AI Scheduler Core)
 *
 * Логика резки:
 *   Лентопил и Плазма берут весь заказ и пилят его целиком.
 *   Поэтому cutting_profile и cutting_sheet агрегируются на уровне заказа
 *   (сумма часов всех марок = одна операция).
 *   Сборка/Зачистка/Покраска могут начаться только после завершения
 *   ВСЕЙ резки заказа (max(bandsawEnd, plasmaEnd)).
 */
export const useScheduler = (orders, products, resources, simulatedOrders = []) => {

  const scheduleData = useMemo(() => {
    if (!resources.length) return { scheduledOps: [], loadMatrix: {}, ordersTimeline: [] };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const loadMatrix = {};
    const scheduledOps = [];
    const ordersTimeline = {};
    const prodProgress = {};    // prodId → Date (последняя операция марки)
    const orderCuttingEnd = {}; // orderId → Date (когда закончена ВСЯ резка заказа)

    // ── Фаза 1: агрегированная резка заказами ────────────────
    // cutting_profile и cutting_sheet суммируются по всем маркам заказа
    const orderCuttingMap = {}; // key: `${orderId}_${stage}`

    products.forEach(prod => {
      if (prod.status === 'completed' || prod.status === 'archived') return;
      const order = orders.find(o => o.id === prod.orderId);
      if (!order || order.status !== 'active') return;

      prod.operations?.forEach(op => {
        if (!CUTTING_STAGES.has(op.stage)) return;
        const totalMinutes = op.minutesPerUnit * (prod.quantity || 1);
        const doneMinutes = op.actualMinutes || 0;
        const remainingHours = Math.max(0, (totalMinutes - doneMinutes) / 60);
        if (remainingHours <= 0.05 && doneMinutes > 0) return;

        const key = `${prod.orderId}_${op.stage}`;
        if (!orderCuttingMap[key]) {
          orderCuttingMap[key] = {
            id: key,
            prodId: `__cutting__${prod.orderId}`,
            orderId: prod.orderId,
            orderNumber: order.orderNumber,
            opName: op.stage === 'cutting_profile' ? 'Резка профиля' : 'Резка листа',
            stage: op.stage,
            hours: 0,
            priority: order.priority || 3,
            deadline: order.deadline || '2099-12-31',
            preferredResIds: op.resourceIds || [],
            needsLargePost: false,
            isSimulated: false,
          };
        }
        orderCuttingMap[key].hours += remainingHours;
      });
    });

    const phase1 = Object.values(orderCuttingMap)
      .filter(op => op.hours > 0.05)
      .map(op => ({ ...op, hours: Math.max(0.1, op.hours) }));

    // ── Фаза 2: сборка/зачистка/покраска по маркам ───────────
    const phase2 = [];

    products.forEach(prod => {
      if (prod.status === 'completed' || prod.status === 'archived') return;
      const order = orders.find(o => o.id === prod.orderId);
      if (!order || order.status !== 'active') return;

      const priority = order.priority || 3;
      const deadline = order.deadline || '2099-12-31';

      prod.operations?.forEach(op => {
        if (CUTTING_STAGES.has(op.stage)) return; // резка уже в phase1
        const totalMinutes = op.minutesPerUnit * (prod.quantity || 1);
        const doneMinutes = op.actualMinutes || 0;
        const remainingHours = Math.max(0.1, (totalMinutes - doneMinutes) / 60);
        if (remainingHours <= 0.1 && doneMinutes > 0) return;

        phase2.push({
          id: op.id,
          prodId: prod.id,
          prodName: prod.name,
          orderId: order.id,
          orderNumber: order.orderNumber,
          opName: op.name,
          stage: op.stage,
          seq: op.sequence || 1,
          hours: remainingHours,
          priority,
          deadline,
          preferredResIds: op.resourceIds || [],
          needsLargePost: op.needsLargePost || false,
          isSimulated: false,
        });
      });
    });

    // ── Симулируемые заказы ───────────────────────────────────
    // Резка симуляции → phase1, остальное → phase2
    simulatedOrders.forEach(sim => {
      const simRoute = generateRoute({
        id: sim.number || 'SIM',
        weight_kg: (sim.tonnage || 1) * 1000,
        quantity: 1,
        complexity: sim.complexity || 'medium',
        sizeCategory: sim.sizeCategory || 'medium',
        hasProfileCut: true,
        hasSheetCut: sim.hasSheetCut || false,
      });

      simRoute.forEach(op => {
        const item = {
          id: `sim_${sim.id}_${op.id}`,
          prodId: CUTTING_STAGES.has(op.stage)
            ? `__cutting__sim_${sim.id}`
            : `sim_prod_${sim.id}`,
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
          needsLargePost: false,
          isSimulated: true,
        };
        if (CUTTING_STAGES.has(op.stage)) {
          phase1.push(item);
        } else {
          phase2.push(item);
        }
      });
    });

    // ── Сортировка ────────────────────────────────────────────
    const sortByPriorityDeadline = (a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.deadline.localeCompare(b.deadline);
    };

    phase1.sort(sortByPriorityDeadline);

    phase2.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.deadline !== b.deadline) return a.deadline.localeCompare(b.deadline);
      if (a.prodId === b.prodId) return a.seq - b.seq;
      return 0;
    });

    // ── Ядро планирования ─────────────────────────────────────
    function scheduleOp(op, earliestStart) {
      let candidateResources = resources.filter(r => {
        if (op.preferredResIds.length > 0) return op.preferredResIds.includes(r.id);
        if (op.stage && r.stage !== op.stage) return false;
        if (op.needsLargePost && !r.isLarge) return false;
        return true;
      });
      if (candidateResources.length === 0) {
        candidateResources = resources.filter(r => r.stage === op.stage);
        if (candidateResources.length === 0) return null;
      }

      let bestResource = null, bestStartDate = null, bestEndDate = null;
      let allocated = false;
      let cursorDate = new Date(earliestStart);
      let dayOffset = 0;

      while (!allocated && dayOffset < 365) {
        if (isWeekend(cursorDate)) { cursorDate = addDays(cursorDate, 1); dayOffset++; continue; }
        const dateStr = fmtDate(cursorDate);
        candidateResources.sort((a, b) =>
          (loadMatrix[a.id]?.[dateStr]?.total || 0) - (loadMatrix[b.id]?.[dateStr]?.total || 0)
        );

        for (const res of candidateResources) {
          const currentLoad = loadMatrix[res.id]?.[dateStr]?.total || 0;
          const capacity = res.hoursPerDay || 8;
          const freeNow = capacity - currentLoad;
          if (freeNow >= Math.min(1, op.hours)) {
            let hoursRemaining = op.hours;
            let currentSimDate = new Date(cursorDate);
            bestResource = res;
            bestStartDate = new Date(cursorDate);

            while (hoursRemaining > 0) {
              if (isWeekend(currentSimDate)) { currentSimDate = addDays(currentSimDate, 1); continue; }
              const dStr = fmtDate(currentSimDate);
              if (!loadMatrix[res.id]) loadMatrix[res.id] = {};
              if (!loadMatrix[res.id][dStr]) loadMatrix[res.id][dStr] = { total: 0, details: [] };
              const used = loadMatrix[res.id][dStr].total;
              const cap = res.hoursPerDay || 8;
              const free = cap - used;
              if (free <= 0) { currentSimDate = addDays(currentSimDate, 1); continue; }
              const chunk = Math.min(free, hoursRemaining);
              loadMatrix[res.id][dStr].total += chunk;
              loadMatrix[res.id][dStr].details.push({
                orderId: op.orderId,
                orderNumber: op.orderNumber,
                prodName: op.prodName,
                hours: chunk,
                isSimulated: op.isSimulated,
              });
              hoursRemaining -= chunk;
              if (hoursRemaining > 0) currentSimDate = addDays(currentSimDate, 1);
            }
            bestEndDate = new Date(currentSimDate);
            allocated = true;
            break;
          }
        }
        if (!allocated) { cursorDate = addDays(cursorDate, 1); dayOffset++; }
      }

      if (!allocated) return null;

      scheduledOps.push({
        ...op,
        resourceId: bestResource.id,
        resourceName: bestResource.shortName,
        startDate: bestStartDate,
        endDate: bestEndDate,
      });

      if (op.orderId) {
        if (!ordersTimeline[op.orderId]) {
          ordersTimeline[op.orderId] = {
            id: op.orderId,
            number: op.orderNumber,
            start: bestStartDate,
            end: bestEndDate,
            deadline: op.deadline,
            isSimulated: op.isSimulated,
          };
        } else {
          if (bestStartDate < ordersTimeline[op.orderId].start) ordersTimeline[op.orderId].start = bestStartDate;
          if (bestEndDate > ordersTimeline[op.orderId].end) ordersTimeline[op.orderId].end = bestEndDate;
        }
      }

      return { startDate: bestStartDate, endDate: bestEndDate };
    }

    // ── Выполняем планирование ────────────────────────────────

    // Phase 1: резка заказами (Лентопил + Плазма параллельно)
    phase1.forEach(op => {
      const result = scheduleOp(op, today);
      if (result) {
        // orderCuttingEnd = max(bandsawEnd, plasmaEnd) — ждём оба
        if (!orderCuttingEnd[op.orderId] || result.endDate > orderCuttingEnd[op.orderId]) {
          orderCuttingEnd[op.orderId] = result.endDate;
        }
      }
    });

    // Phase 2: сборка/зачистка/покраска — только после завершения резки заказа
    phase2.forEach(op => {
      const prodStart = prodProgress[op.prodId] ? new Date(prodProgress[op.prodId]) : new Date(today);
      const cutEnd = orderCuttingEnd[op.orderId] ? new Date(orderCuttingEnd[op.orderId]) : new Date(today);
      const earliest = prodStart > cutEnd ? prodStart : cutEnd;
      const result = scheduleOp(op, earliest);
      if (result) {
        prodProgress[op.prodId] = result.endDate;
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
