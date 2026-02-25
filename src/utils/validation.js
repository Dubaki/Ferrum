import { z } from 'zod';

// Схема для создания заказа
export const orderSchema = z.object({
  orderNumber: z.string().min(1, 'Введите номер заказа'),
  clientName: z.string().optional(),
  deadline: z.string().min(1, 'Укажите срок сдачи заказа'),
  isProductOrder: z.boolean().optional(), // Флаг товарного заказа
  hasDrawings: z.boolean(),
  drawingsDeadline: z.string().optional(),
  hasMaterials: z.boolean(),
  materialsDeadline: z.string().optional(),
  hasPaint: z.boolean(),
  paintDeadline: z.string().optional(),
  // AI Planning fields
  orderType: z.enum(['A', 'B']).default('A'),
  category: z.string().default('other'),
  priority: z.string().or(z.number()).default(3),
  sizeCategory: z.enum(['small', 'medium', 'large', 'xlarge']).default('medium'),
  complexity: z.string().or(z.number()).default(2),
  weightTotalKg: z.string().or(z.number()).optional(),
  notes: z.string().optional(),
}).refine(
  (data) => data.isProductOrder || data.hasDrawings || data.drawingsDeadline,
  { message: 'Укажите дату готовности чертежей', path: ['drawingsDeadline'] }
).refine(
  (data) => data.isProductOrder || data.hasMaterials || data.materialsDeadline,
  { message: 'Укажите дату поставки материалов', path: ['materialsDeadline'] }
).refine(
  (data) => data.isProductOrder || data.hasPaint || data.paintDeadline,
  { message: 'Укажите дату поставки краски', path: ['paintDeadline'] }
);

// Схема для сотрудника
export const resourceSchema = z.object({
  name: z.string().min(1, 'Введите имя сотрудника'),
  position: z.string().min(1, 'Укажите должность'),
  phone: z.string().optional(),
  address: z.string().optional(),
  dob: z.string().optional(),
  hoursPerDay: z.number().min(1).max(24).default(8),
  workWeekends: z.boolean().default(false),
  baseRate: z.number().min(0).default(3000),
  employmentDate: z.string().optional(),
});

// Схема для операции
export const operationSchema = z.object({
  name: z.string().min(1, 'Введите название операции'),
  minutesPerUnit: z.number().min(1, 'Время должно быть больше 0'),
});

// Схема для изделия
export const productSchema = z.object({
  name: z.string().min(1, 'Введите название изделия'),
  quantity: z.number().min(1, 'Количество должно быть больше 0'),
  startDate: z.string().optional(),
});
