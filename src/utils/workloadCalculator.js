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

            // Проверяем что эта операция запланирована на эту дату
            if (op.plannedDate !== dateStr) return;

            // Проверяем что этот ресурс назначен на операцию
            if (!op.resourceIds?.includes(resourceId)) return;

            // Считаем часы для этого ресурса
            const opTotalHours = (op.minutesPerUnit * quantity) / 60;
            const resourceCount = op.resourceIds.length;
            const hoursPerResource = opTotalHours / resourceCount;

            totalHours += hoursPerResource;
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
