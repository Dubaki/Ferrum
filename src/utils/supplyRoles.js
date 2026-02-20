// Роли для раздела "Снабжение"
export const SUPPLY_ROLES = {
  technologist: { label: 'Технолог', password: 'fer25', icon: '👷' },
  supplier: { label: 'Снабженец', password: 'fer25', icon: '📦' },
  shopManager: { label: 'Начальник цеха', password: 'proplex', icon: '🏭' },
  director: { label: 'Директор', password: 'proplex', icon: '💼' },
  vesta: { label: 'Веста', password: 'LG26', icon: '💰' },
  master: { label: 'Мастер', password: 'fer25', icon: '🔧' },
  manager: { label: 'Менеджер', password: 'fer25', icon: '📋' }
};

// Статусы заявок (новый workflow с указанием роли)
export const SUPPLY_STATUSES = {
  // Старые статусы для обратной совместимости
  new: { label: 'Снабжение — запрос счёта', color: 'bg-yellow-500', textColor: 'text-yellow-600', owner: 'supplier' },
  invoice_requested: { label: 'Снабжение — запрос счёта', color: 'bg-yellow-500', textColor: 'text-yellow-600', owner: 'supplier' },
  pending_management: { label: 'Согласование — руководство', color: 'bg-purple-500', textColor: 'text-purple-600', owner: 'shopManager,director' },
  pending_payment: { label: 'Веста — ожидает оплаты', color: 'bg-orange-500', textColor: 'text-orange-600', owner: 'vesta' },
  // Актуальные статусы
  with_supplier: { label: 'Снабжение — запрос счёта', color: 'bg-yellow-500', textColor: 'text-yellow-600', owner: 'supplier' },
  invoice_attached: { label: 'Снабжение — счёт получен', color: 'bg-yellow-600', textColor: 'text-yellow-700', owner: 'supplier' },
  pending_tech_approval: { label: 'Согласование — технолог', color: 'bg-blue-500', textColor: 'text-blue-600', owner: 'technologist' },
  pending_shop_approval: { label: 'Согласование — нач. цеха', color: 'bg-indigo-500', textColor: 'text-indigo-600', owner: 'shopManager' },
  pending_director_approval: { label: 'Согласование — директор', color: 'bg-purple-500', textColor: 'text-purple-600', owner: 'director' },
  in_queue_payment: { label: 'Веста — в очереди на оплату', color: 'bg-sky-500', textColor: 'text-sky-600', owner: 'vesta' },
  paid: { label: 'Оплачено', color: 'bg-emerald-500', textColor: 'text-emerald-600', owner: 'supplier' },
  awaiting_delivery: { label: 'Снабжение — ожидает доставки', color: 'bg-cyan-500', textColor: 'text-cyan-600', owner: null },
  delivered: { label: 'Доставлено', color: 'bg-green-600', textColor: 'text-green-600', owner: null },
  rejected: { label: 'Отклонено', color: 'bg-red-500', textColor: 'text-red-600', owner: 'supplier' }
};

// Единицы измерения
export const SUPPLY_UNITS = ['шт', 'кг', 'м', 'м²', 'м³', 'л', 'комп', 'упак'];

// Проверка пароля для роли
export const checkSupplyRolePassword = (password) => {
  // Проверка админского пароля
  if (password === 'fer25') {
    return 'admin';
  }

  // Проверка паролей ролей снабжения
  for (const [role, data] of Object.entries(SUPPLY_ROLES)) {
    if (data.password === password) {
      return role;
    }
  }

  return null;
};

// Получить метку роли
export const getRoleLabel = (role) => {
  if (role === 'admin') return 'Администратор';
  return SUPPLY_ROLES[role]?.label || role;
};

// Проверка доступа к действиям по роли
export const canPerformAction = (role, action) => {
  if (role === 'admin') return true; // Админ может всё

  const permissions = {
    // Создание
    createRequest: ['director', 'shopManager', 'technologist', 'vesta', 'manager'],
    // Редактирование (до согласования директором)
    editRequest: ['director', 'shopManager', 'technologist', 'vesta', 'manager'],

    // Работа со счетами (снабженец, веста, технолог, менеджер)
    attachInvoice: ['supplier', 'vesta', 'technologist', 'manager'],
    submitForApproval: ['supplier', 'vesta', 'technologist', 'manager'],

    // Согласование (каждый за себя)
    approveTechnologist: ['technologist', 'vesta'],
    approveShopManager: ['shopManager', 'vesta'],
    approveDirector: ['director', 'vesta'],

    // Оплата
    markPaid: ['vesta'],

    // Доставка
    setDeliveryDate: ['supplier', 'vesta'],
    markDelivered: ['shopManager', 'master', 'director', 'technologist', 'vesta', 'manager'],

    // Отклонение (все, кто согласовывает)
    rejectRequest: ['director', 'shopManager', 'technologist', 'vesta'],

    // Удаление (руководство)
    deleteRequest: ['director', 'shopManager', 'vesta']
  };

  return permissions[action]?.includes(role) || false;
};

// Проверка просрочки доставки
export const isDeliveryOverdue = (request) => {
  if (request.status !== 'awaiting_delivery' || !request.deliveryDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deliveryDate = request.deliveryDate.toDate ? request.deliveryDate.toDate() : new Date(request.deliveryDate);
  deliveryDate.setHours(0, 0, 0, 0);
  return deliveryDate < today;
};

// Получить заявки для роли (личная папка)
export const getRequestsForRole = (requests, role) => {
  if (!role || role === 'admin') return [];

  return requests.filter(req => {
    // Просроченная доставка возвращается к снабженцу
    if (role === 'supplier' && isDeliveryOverdue(req)) return true;

    const status = SUPPLY_STATUSES[req.status];
    if (!status || !status.owner) return false;

    // owner может быть строкой с несколькими ролями через запятую
    const owners = status.owner.split(',');
    return owners.includes(role);
  });
};

// Дедлайны для каждого статуса (в часах)
export const STATUS_DEADLINES = {
  // Старые статусы
  new: 24,
  invoice_requested: 24,
  pending_management: 8,
  // Актуальные статусы
  with_supplier: 24, // Снабженец: 24 часа на получение счёта
  invoice_attached: 4, // Снабженец: 4 часа на отправку на согласование
  pending_tech_approval: 4, // Технолог: 4 часа
  pending_shop_approval: 4, // Начальник цеха: 4 часа
  pending_director_approval: 4, // Директор: 4 часа
  pending_payment: 2, // Веста: 2 часа (срочно)
  paid: 8, // Снабженец: 8 часов на назначение срока доставки
  rejected: 24, // Снабженец: 24 часа на повторное прикрепление счета после отклонения
  awaiting_delivery: null // Зависит от deliveryDate
};

const getTimestampInMillis = (timestamp) => {
  if (!timestamp) return null;
  // Если это объект Firebase Timestamp, используем toMillis()
  if (typeof timestamp.toMillis === 'function') {
    return timestamp.toMillis();
  }
  // Если это уже число (миллисекунды), возвращаем как есть
  if (typeof timestamp === 'number') {
    return timestamp;
  }
  // Если это объект Date
  if (timestamp instanceof Date) {
    return timestamp.getTime();
  }
  // Попытка преобразовать из строки
  const date = new Date(timestamp);
  if (!isNaN(date.getTime())) {
    return date.getTime();
  }
  return null;
};


// Проверка просрочки заявки
export const isRequestOverdue = (request) => {
  const updated = getTimestampInMillis(request.updatedAt);
  if (!request.status || !updated) return false;

  const deadline = STATUS_DEADLINES[request.status];
  if (deadline === null || deadline === undefined) return false;

  const now = Date.now();
  const hoursPassed = (now - updated) / (1000 * 60 * 60);

  return hoursPassed > deadline;
};

// Получить оставшиеся часы до дедлайна
export const getHoursUntilDeadline = (request) => {
  const updated = getTimestampInMillis(request.updatedAt);
  if (!request.status || !updated) return null;

  const deadline = STATUS_DEADLINES[request.status];
  if (deadline === null || deadline === undefined) return null;

  const now = Date.now();
  const hoursPassed = (now - updated) / (1000 * 60 * 60);

  return Math.round(deadline - hoursPassed);
};

// Для обратной совместимости
export const getDaysUntilDeadline = (request) => {
  const hours = getHoursUntilDeadline(request);
  if (hours === null) return null;
  return Math.ceil(hours / 24);
};
