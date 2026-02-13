// Supply types
export interface SupplyRequestItem {
  title: string;
  quantity: number;
  unit: string;
}

export interface SupplyRequestOrder {
  orderNumber: string;
}

export interface SupplyInvoice {
  url: string;
  name: string;
  path: string;
  uploadedAt: number;
  uploadedBy: string; // e.g., 'supplier' or userRole
}

export interface SupplyApprovalStatus {
  technologist: boolean;
  technologistAt: number | null;
  shopManager: boolean;
  shopManagerAt: number | null;
  director: boolean;
  directorAt: number | null;
  vesta: boolean;
  vestaAt: number | null;
}

export interface SupplyStatusHistoryEntry {
  status: string; // e.g., 'with_supplier', 'pending_tech_approval'
  timestamp: number;
  role: string; // e.g., 'supplier', 'technologist'
  note?: string;
}

export interface SupplyRequest {
  id: string;
  requestNumber: string;
  status: string; // e.g., 'with_supplier', 'awaiting_delivery', 'delivered'
  items: SupplyRequestItem[];
  orders: SupplyRequestOrder[];
  department: string;
  creatorComment?: string;
  desiredDate?: string;
  invoices: SupplyInvoice[];
  approvals: SupplyApprovalStatus;
  deliveryDate?: string;
  deliveredAt?: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  rejectionReason?: string;
  rejectedByRole?: string;
  invoiceRequestCount?: number;
  statusHistory: SupplyStatusHistoryEntry[];
  
  // New fields
  supplierAddress?: string;
  supplierPhone?: string;
}


// Основные типы для приложения ФЕРРУМ

// Статусы заказа
export type OrderCustomStatus = 'metal' | 'components' | 'drawings' | 'work' | 'done';
export type OrderStatus = 'active' | 'completed';

// Статус-история
export interface StatusHistoryEntry {
  status: OrderCustomStatus;
  timestamp: number;
}

// Заказ
export interface Order {
  id: string;
  orderNumber: string;
  clientName: string;
  deadline: string;
  status: OrderStatus;
  customStatus: OrderCustomStatus;
  drawingsDeadline: string | null;
  materialsDeadline: string | null;
  paymentDate: string;
  statusHistory: StatusHistoryEntry[];
  createdAt: number;
  finishedAt: string | null;
  isImportant?: boolean;
  // Поля для отгрузок
  inShipping?: boolean;        // Заказ находится в разделе отгрузок (на складе)
  shippingToday?: boolean;     // Отгрузка запланирована на сегодня
  shippedAt?: string | null;   // Дата фактической отгрузки (ISO string)
}

// Операция
export interface Operation {
  id: number;
  name: string;
  minutesPerUnit: number;
  actualMinutes: number;
  resourceIds: string[];
  sequence: number;
}

// Изделие (продукт)
export interface Product {
  id: string;
  orderId: string | null;
  name: string;
  quantity: number;
  startDate: string;
  status: 'active' | 'completed';
  operations: Operation[];
  createdAt: number;
  isResale?: boolean;
  estimatedHours?: number;
}

// Тип расписания
export type ScheduleType = 'sick' | 'vacation' | 'work';

// Переопределение расписания
export interface ScheduleOverride {
  [date: string]: number;
}

// Причины переопределения расписания
export interface ScheduleReasons {
  [date: string]: ScheduleType;
}

// Ежедневная эффективность (КТУ)
export interface DailyEfficiency {
  [date: string]: number;
}

// Нарушения ТБ
export interface SafetyViolation {
  description: string;
  penalty: number;
}

export interface SafetyViolations {
  [date: string]: SafetyViolation;
}

// История ставок
export interface RateHistoryEntry {
  date: string;
  rate: number;
}

// Сотрудник (ресурс)
export interface Resource {
  id: string;
  name: string;
  position: string;
  phone: string;
  address: string;
  dob: string;
  photoUrl: string;
  hoursPerDay: number;
  workWeekends: boolean;
  scheduleOverrides: ScheduleOverride;
  scheduleReasons: ScheduleReasons;
  baseRate: number;
  rateHistory: RateHistoryEntry[];
  employmentDate: string;
  dailyEfficiency: DailyEfficiency;
  safetyViolations: SafetyViolations;
  status: 'active' | 'fired';
  firedAt?: string;
}

// Отчёт
export interface Report {
  id: string;
  createdAt: number;
  type: 'salary' | 'cost';
  data: Record<string, unknown>;
}

// Пресет изделия
export interface PresetOperation {
  name: string;
  minutes: number;
}

export interface PresetItem {
  name: string;
  ops: PresetOperation[];
}

export interface Preset {
  id: string;
  name: string;
  items: PresetItem[];
}

// Gantt данные
export interface GanttItem {
  productId: string;
  orderId: string | null;
  productName: string;
  startDate: Date;
  endDate: Date;
  totalMinutes: number;
}

// Timeline данные
export interface TimelineEntry {
  date: string;
  hours: number;
  tasks: Array<{
    productId: string;
    operationId: number;
    minutes: number;
  }>;
}

export interface GlobalTimeline {
  [resourceId: string]: TimelineEntry[];
}

// Дневные назначения
export interface DailyAllocation {
  resourceId: string;
  date: string;
  tasks: Array<{
    productId: string;
    productName: string;
    operationName: string;
    minutes: number;
  }>;
}

// Actions типы
export interface ProductionActions {
  addOrder: (data?: Partial<Order>) => Promise<void>;
  updateOrder: (id: string, field: string, value: unknown) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  finishOrder: (id: string) => Promise<boolean>;
  restoreOrder: (id: string) => Promise<void>;
  // Отгрузки
  moveToShipping: (id: string) => Promise<void>;
  returnFromShipping: (id: string) => Promise<void>;
  toggleShippingToday: (id: string) => Promise<void>;
  completeShipping: (id: string) => Promise<void>;
  addProduct: (orderId?: string | null, initialDate?: string | null) => Promise<string>;
  addProductsBatch: (orderId: string, presetItems: PresetItem[]) => Promise<void>;
  updateProduct: (id: string, field: string, value: unknown) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  copyOperationsToAll: (sourceProductId: string) => Promise<void>;
  addOperation: (productId: string, initialName?: string) => Promise<void>;
  updateOperation: (productId: string, opId: number, field: string, value: unknown) => Promise<void>;
  toggleResourceForOp: (productId: string, opId: number, resourceId: string) => Promise<void>;
  deleteOperation: (productId: string, opId: number) => Promise<void>;
  addResource: (data: Partial<Resource>) => Promise<void>;
  updateResource: (id: string, field: string, value: unknown) => Promise<void>;
  updateResourceSchedule: (id: string, dateStr: string, hours: number, type?: ScheduleType | null) => Promise<void>;
  updateResourceEfficiency: (id: string, dateStr: string, percent: number) => Promise<void>;
  updateResourceSafety: (id: string, dateStr: string, violationData: SafetyViolation | null) => Promise<void>;
  fireResource: (id: string) => Promise<void>;
  deleteResource: (id: string) => Promise<void>;
  addReport: (data: Partial<Report>) => Promise<void>;
  deleteReport: (id: string) => Promise<void>;
}

// Hook возвращаемые данные
export interface ProductionData {
  resources: Resource[];
  products: Product[];
  orders: Order[];
  reports: Report[];
  loading: boolean;
  actions: ProductionActions;
}

// Simulation данные
export interface SimulationData {
  ganttItems: GanttItem[];
  globalTimeline: GlobalTimeline;
  dailyAllocations: DailyAllocation[];
}
