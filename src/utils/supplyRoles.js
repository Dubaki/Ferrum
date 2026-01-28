// Роли для раздела "Снабжение"
export const SUPPLY_ROLES = {
  technologist: { label: 'Технолог', password: 'fer25', icon: '👷' },
  supplier: { label: 'Снабженец', password: 'fer25', icon: '📦' },
  shopManager: { label: 'Начальник цеха', password: 'fer25', icon: '🏭' },
  director: { label: 'Директор', password: 'fer25', icon: '💼' },
  accountant: { label: 'Бухгалтер', password: 'fer25', icon: '💰' },
  master: { label: 'Мастер', password: 'fer25', icon: '🔧' }
};

// Статусы заявок (новый workflow с указанием роли)
export const SUPPLY_STATUSES = {
  // Старый статус для обратной совместимости (алиас для with_supplier)
  new: { label: 'Снабжение — запрос счёта', color: 'bg-yellow-500', textColor: 'text-yellow-600', owner: 'supplier' },
  with_supplier: { label: 'Снабжение — запрос счёта', color: 'bg-yellow-500', textColor: 'text-yellow-600', owner: 'supplier' },
  invoice_attached: { label: 'Снабжение — счёт получен', color: 'bg-yellow-600', textColor: 'text-yellow-700', owner: 'supplier' },
  pending_tech_approval: { label: 'Согласование — технолог', color: 'bg-blue-500', textColor: 'text-blue-600', owner: 'technologist' },
  pending_shop_approval: { label: 'Согласование — нач. цеха', color: 'bg-indigo-500', textColor: 'text-indigo-600', owner: 'shopManager' },
  pending_director_approval: { label: 'Согласование — директор', color: 'bg-purple-500', textColor: 'text-purple-600', owner: 'director' },
  pending_payment: { label: 'Бухгалтерия — ожидает оплаты', color: 'bg-orange-500', textColor: 'text-orange-600', owner: 'accountant' },
  paid: { label: 'Оплачено', color: 'bg-emerald-500', textColor: 'text-emerald-600', owner: 'supplier' },
  awaiting_delivery: { label: 'Снабжение — ожидает доставки', color: 'bg-cyan-500', textColor: 'text-cyan-600', owner: 'supplier' },
  delivered: { label: 'Доставлено', color: 'bg-green-600', textColor: 'text-green-600', owner: null },
  rejected: { label: 'Отклонено', color: 'bg-red-500', textColor: 'text-red-600', owner: null }
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
    createRequest: ['director', 'shopManager', 'technologist'],
    createOrder: ['director', 'shopManager', 'technologist'],
    deleteOrder: ['director', 'shopManager'],
    deleteRequest: ['director', 'shopManager', 'admin'],
    attachInvoice: ['director', 'shopManager', 'supplier'],
    submitForApproval: ['director', 'shopManager', 'supplier'],
    approveTechnologist: ['director', 'shopManager', 'technologist'],
    approveShopManager: ['director', 'shopManager'],
    approveDirector: ['director'],
    markPaid: ['director', 'accountant'],
    setDeliveryDate: ['director', 'shopManager', 'supplier'],
    markDelivered: ['director', 'shopManager', 'supplier', 'master'],
    rejectRequest: ['director', 'shopManager', 'technologist']
  };

  return permissions[action]?.includes(role) || false;
};

// Получить заявки для роли (личная папка)
export const getRequestsForRole = (requests, role) => {
  if (!role || role === 'admin') return [];

  return requests.filter(req => {
    const status = SUPPLY_STATUSES[req.status];
    if (!status || !status.owner) return false;

    // owner может быть строкой с несколькими ролями через запятую
    const owners = status.owner.split(',');
    return owners.includes(role);
  });
};

// Дедлайны для каждого статуса (в днях)
export const STATUS_DEADLINES = {
  new: 1, // Старый статус (алиас)
  with_supplier: 1, // Снабженец: 1 день на получение счёта
  invoice_attached: 1, // Снабженец: 1 день на отправку на согласование
  pending_tech_approval: 1, // Технолог: 1 день
  pending_shop_approval: 1, // Начальник цеха: 1 день
  pending_director_approval: 1, // Директор: 1 день
  pending_payment: 0, // Бухгалтер: срочно (в день поступления)
  paid: 1, // Снабженец: 1 день на назначение срока доставки
  awaiting_delivery: null // Зависит от deliveryDate
};

// Проверка просрочки заявки
export const isRequestOverdue = (request) => {
  if (!request.status || !request.updatedAt) return false;

  const deadline = STATUS_DEADLINES[request.status];
  if (deadline === null || deadline === undefined) return false;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const updated = new Date(request.updatedAt);
  updated.setHours(0, 0, 0, 0);

  const daysPassed = Math.floor((now - updated) / (1000 * 60 * 60 * 24));

  return daysPassed > deadline;
};

// Получить оставшиеся дни до дедлайна
export const getDaysUntilDeadline = (request) => {
  if (!request.status || !request.updatedAt) return null;

  const deadline = STATUS_DEADLINES[request.status];
  if (deadline === null || deadline === undefined) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const updated = new Date(request.updatedAt);
  updated.setHours(0, 0, 0, 0);

  const daysPassed = Math.floor((now - updated) / (1000 * 60 * 60 * 24));

  return deadline - daysPassed;
};
