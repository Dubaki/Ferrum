// Хелпер: Посчитать рабочие дни между двумя датами
const countWorkingDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 1;

    const start = new Date(startDate);
    const end = new Date(endDate);

    let count = 0;
    let current = new Date(start);

    while (current <= end) {
        const day = current.getDay();
        // Считаем только будние дни
        if (day !== 0 && day !== 6) {
            count++;
        }
        current.setDate(current.getDate() + 1);
    }

    return Math.max(1, count);
};

/**
 * Вычисляет загрузку ресурса на конкретную дату
 * @param {string} resourceId - ID ресурса
 * @param {string} dateStr - Дата в формате YYYY-MM-DD
 * @param {Array} products - Список всех изделий
 * @param {string} excludeOpId - ID операции которую нужно исключить из расчета (при редактировании)
 * @returns {number} Загрузка в часах
 */
export const calculateResourceLoadForDate = (resourceId, dateStr, products, excludeOpId = null) => {
    let totalHours = 0;

    products.forEach(product => {
        const quantity = parseInt(product.quantity) || 1;

        product.operations?.forEach(op => {
            // Пропускаем операцию которую редактируем
            if (excludeOpId && op.id === excludeOpId) return;

            // Пропускаем выполненные операции
            if ((op.actualMinutes || 0) > 0) return;

            // Проверяем что этот ресурс назначен на операцию
            if (!op.resourceIds?.includes(resourceId)) return;

            // Проверяем что у операции есть даты
            if (!op.startDate) return;

            // Определяем диапазон операции
            const opStart = new Date(op.startDate);
            const opEnd = op.endDate ? new Date(op.endDate) : new Date(op.startDate);
            const checkDate = new Date(dateStr);

            // Проверяем попадает ли проверяемая дата в диапазон операции
            if (checkDate < opStart || checkDate > opEnd) return;

            // Пропускаем выходные
            const dayOfWeek = checkDate.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) return;

            // Считаем часы для этого ресурса на эту дату
            const opTotalHours = (op.minutesPerUnit * quantity) / 60;
            const resourceCount = op.resourceIds.length;
            const hoursPerResource = opTotalHours / resourceCount;

            // Распределяем часы равномерно по рабочим дням
            const workDays = countWorkingDays(opStart, opEnd);
            const hoursPerDay = hoursPerResource / workDays;

            totalHours += hoursPerDay;
        });
    });

    return Math.round(totalHours * 100) / 100; // Округляем до 2 знаков
};

/**
 * Проверяет перегрузку ресурсов на дату
 * @param {Array} resourceIds - Список ID ресурсов
 * @param {string} dateStr - Дата в формате YYYY-MM-DD
 * @param {Array} products - Список всех изделий
 * @param {Array} resources - Список всех ресурсов
 * @param {number} newOpHours - Часы добавляемой операции для каждого ресурса
 * @param {string} excludeOpId - ID операции которую нужно исключить (при редактировании)
 * @returns {Array} Массив перегруженных ресурсов { id, name, currentLoad, maxHours, newLoad }
 */
export const checkResourceOverload = (resourceIds, dateStr, products, resources, newOpHours, excludeOpId = null) => {
    const overloaded = [];

    resourceIds.forEach(resId => {
        const resource = resources.find(r => r.id === resId);
        if (!resource) return;

        const currentLoad = calculateResourceLoadForDate(resId, dateStr, products, excludeOpId);
        const maxHours = resource.scheduleOverrides?.[dateStr] !== undefined
            ? resource.scheduleOverrides[dateStr]
            : (resource.hoursPerDay || 8);

        const newLoad = currentLoad + newOpHours;

        if (newLoad > maxHours) {
            overloaded.push({
                id: resId,
                name: resource.name,
                currentLoad: currentLoad,
                maxHours: maxHours,
                newLoad: newLoad,
                overflow: newLoad - maxHours
            });
        }
    });

    return overloaded;
};
