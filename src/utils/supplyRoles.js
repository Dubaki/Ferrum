// Роли для раздела "Снабжение"
export const SUPPLY_ROLES = {
  technologist: { label: 'Технолог', password: 'fer25', icon: '👷' },
  supplier: { label: 'Снабженец', password: 'fer25', icon: '📦' },
  shopManager: { label: 'Начальник цеха', password: 'fer25', icon: '🏭' },
  director: { label: 'Директор', password: 'fer25', icon: '💼' },
  accountant: { label: 'Бухгалтер', password: 'fer25', icon: '💰' },
  master: { label: 'Мастер', password: 'fer25', icon: '🔧' }
};

// Статусы заявок (новый workflow)
export const SUPPLY_STATUSES = {
  new: { label: 'Создана', color: 'bg-slate-500', textColor: 'text-slate-500', owner: 'technologist' },
  with_supplier: { label: 'У снабженца', color: 'bg-yellow-500', textColor: 'text-yellow-600', owner: 'supplier' },
  invoice_attached: { label: 'Счёт прикреплён', color: 'bg-blue-500', textColor: 'text-blue-600', owner: 'technologist' },
  tech_approved: { label: 'Согласовано технологом', color: 'bg-indigo-500', textColor: 'text-indigo-600', owner: 'shopManager' },
  shop_approved: { label: 'Согласовано начальником', color: 'bg-purple-500', textColor: 'text-purple-600', owner: 'director' },
  director_approved: { label: 'Согласовано директором', color: 'bg-orange-500', textColor: 'text-orange-600', owner: 'accountant' },
  paid: { label: 'Оплачено', color: 'bg-emerald-500', textColor: 'text-emerald-600', owner: 'supplier' },
  awaiting_delivery: { label: 'Ожидает доставки', color: 'bg-cyan-500', textColor: 'text-cyan-600', owner: 'shopManager,master' },
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
  const permissions = {
    createRequest: ['director', 'shopManager', 'technologist'],
    createOrder: ['director', 'shopManager', 'technologist'],
    deleteOrder: ['director', 'shopManager'],
    attachInvoice: ['director', 'shopManager', 'supplier'],
    approveTech: ['director', 'shopManager', 'technologist'],
    approveShopManager: ['director', 'shopManager'],
    approveDirector: ['director'],
    markPaid: ['director', 'shopManager', 'accountant'],
    setDeliveryDate: ['director', 'shopManager', 'supplier'],
    markDelivered: ['director', 'shopManager', 'master'],
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
  new: 3, // Технолог: 3 дня
  with_supplier: 1, // Снабженец: 1 день
  invoice_attached: 1, // Технолог: 1 день
  tech_approved: 1, // Начальник цеха: 1 день
  shop_approved: 1, // Директор: 1 день
  director_approved: 0, // Бухгалтер: в день поступления (0 = сегодня)
  paid: 1, // Снабженец: 1 день
  awaiting_delivery: null // Нет дедлайна, зависит от deliveryDate
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
