// Роли для раздела "Снабжение"
export const SUPPLY_ROLES = {
  technologist: { label: 'Технолог', password: 'tech25' },
  supplier: { label: 'Снабженец', password: 'supply25' },
  shopManager: { label: 'Начальник цеха', password: 'shop25' },
  director: { label: 'Директор', password: 'dir25' },
  accountant: { label: 'Бухгалтер', password: 'acc25' }
};

// Статусы заявок
export const SUPPLY_STATUSES = {
  new: { label: 'Новая', color: 'bg-slate-500', textColor: 'text-slate-500' },
  invoice_requested: { label: 'Запрошен счёт', color: 'bg-yellow-500', textColor: 'text-yellow-600' },
  pending_tech_approval: { label: 'На согласовании (технолог)', color: 'bg-blue-500', textColor: 'text-blue-600' },
  pending_management: { label: 'На согласовании (руководство)', color: 'bg-purple-500', textColor: 'text-purple-600' },
  pending_payment: { label: 'Ожидает оплаты', color: 'bg-orange-500', textColor: 'text-orange-600' },
  paid: { label: 'Оплачено', color: 'bg-emerald-500', textColor: 'text-emerald-600' },
  awaiting_delivery: { label: 'Ожидает доставки', color: 'bg-cyan-500', textColor: 'text-cyan-600' },
  delivered: { label: 'Доставлено', color: 'bg-green-600', textColor: 'text-green-600' }
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
    createRequest: ['admin', 'technologist'],
    requestInvoice: ['admin', 'supplier'],
    submitForApproval: ['admin', 'supplier'],
    approveTechnologist: ['admin', 'technologist'],
    approveShopManager: ['admin', 'shopManager'],
    approveDirector: ['admin', 'director'],
    markPaid: ['admin', 'accountant'],
    setDeliveryDate: ['admin', 'supplier'],
    markDelivered: ['admin', 'supplier']
  };

  return permissions[action]?.includes(role) || false;
};
