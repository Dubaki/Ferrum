import { createClient } from '@supabase/supabase-js';
import { getRoleLabel } from './supplyRoles';

/**
 * Supabase-клиент для вызова Edge Functions
 */
const getSupabaseClient = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey);
};

/**
 * Формирует текст уведомления для Telegram
 * @param {object} request - Заявка снабжения
 * @param {string} statusKey - Ключ нового статуса/действия
 * @param {object} extra - Доп. данные (reason, date и т.д.)
 * @returns {string} - HTML-текст для Telegram
 */
export const buildNotificationMessage = (request, statusKey, extra = {}) => {
  const num = request?.requestNumber || '???';
  const items = request?.items
    ?.map(i => `${i.name || '?'}${i.quantity ? ` (${i.quantity} ${i.unit || 'шт'})` : ''}`)
    .join(', ') || 'без позиций';

  const messages = {
    created: `<b>Новая заявка ${num}</b>\nПозиции: ${items}\nНеобходимо найти счёт.`,
    submitted_for_approval: `<b>Заявка ${num} на согласовании</b>\nПозиции: ${items}\nТребуется ваше согласование.`,
    approved_technologist: `<b>Заявка ${num} — технолог согласовал</b>\nПозиции: ${items}\nТребуется ваше согласование.`,
    approved_shop_manager: `<b>Заявка ${num} — нач. цеха согласовал</b>\nПозиции: ${items}\nТребуется ваше согласование.`,
    approved_director: `<b>Заявка ${num} — директор согласовал</b>\nПозиции: ${items}\nОжидает оплаты.`,
    paid: `<b>Заявка ${num} оплачена</b>\nПозиции: ${items}\nНазначьте срок доставки.`,
    delivery_date_set: `<b>Заявка ${num} — срок доставки: ${extra.date || '?'}</b>\nПозиции: ${items}`,
    delivered: `<b>Заявка ${num} доставлена</b>\nПозиции: ${items}`,
    rejected: `<b>Заявка ${num} отклонена</b>\n${extra.role ? `Отклонил: ${getRoleLabel(extra.role)}` : ''}\n${extra.reason ? `Причина: ${extra.reason}` : ''}\nПозиции: ${items}\nТребуется новый счёт.`,
  };

  return messages[statusKey] || `<b>Заявка ${num}</b> — обновление статуса.`;
};

/**
 * Отправить уведомление ролям через Supabase Edge Function (fire-and-forget)
 * @param {string[]} roles - Роли-получатели
 * @param {string} message - HTML-текст уведомления
 */
export const notifyRoles = (roles, message) => {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    // Fire-and-forget: не ждём ответа, не блокируем UI
    supabase.functions.invoke('telegram-notify', {
      body: { roles, message },
    }).catch(err => {
      console.warn('Telegram notify failed (non-blocking):', err);
    });
  } catch (err) {
    console.warn('Telegram notify setup failed:', err);
  }
};
