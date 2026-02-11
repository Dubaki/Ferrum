import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const ROLES = [
  { id: 'technologist', label: 'Технолог' },
  { id: 'supplier', label: 'Снабженец' },
  { id: 'shopManager', label: 'Начальник цеха' },
  { id: 'director', label: 'Директор' },
  { id: 'accountant', label: 'Бухгалтер' },
  { id: 'master', label: 'Мастер' },
];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function sendTelegramMessage(chatId: number, text: string, replyMarkup?: object) {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  };
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}

async function handleStart(chatId: number) {
  const keyboard = {
    inline_keyboard: ROLES.map((role) => [
      { text: role.label, callback_data: `role:${role.id}` },
    ]),
  };
  await sendTelegramMessage(
    chatId,
    '<b>Planfer — уведомления снабжения</b>\n\nВыберите вашу роль, чтобы получать уведомления:',
    keyboard,
  );
}

async function handleRoleSelection(
  chatId: number,
  roleId: string,
  firstName: string | undefined,
  username: string | undefined,
  callbackQueryId: string,
) {
  const roleLabel = ROLES.find((r) => r.id === roleId)?.label || roleId;

  const { error } = await supabase.from('telegram_users').upsert(
    {
      chat_id: chatId,
      role: roleId,
      first_name: firstName || null,
      username: username || null,
      is_active: true,
      registered_at: new Date().toISOString(),
    },
    { onConflict: 'chat_id,role' },
  );

  if (error) {
    console.error('Supabase upsert error:', error);
    await answerCallbackQuery(callbackQueryId, 'Ошибка регистрации');
    return;
  }

  await answerCallbackQuery(callbackQueryId, `Роль "${roleLabel}" активирована`);
  await sendTelegramMessage(
    chatId,
    `Вы подписаны на уведомления как <b>${roleLabel}</b>.\n\nКоманды:\n/start — добавить ещё роль\n/status — посмотреть активные роли\n/stop — отключить все уведомления`,
  );
}

async function handleStop(chatId: number) {
  const { error } = await supabase
    .from('telegram_users')
    .update({ is_active: false })
    .eq('chat_id', chatId);

  if (error) {
    console.error('Supabase update error:', error);
    await sendTelegramMessage(chatId, 'Ошибка при отключении уведомлений.');
    return;
  }

  await sendTelegramMessage(
    chatId,
    'Уведомления отключены. Используйте /start чтобы подписаться снова.',
  );
}

async function handleStatus(chatId: number) {
  const { data, error } = await supabase
    .from('telegram_users')
    .select('role, is_active')
    .eq('chat_id', chatId);

  if (error || !data || data.length === 0) {
    await sendTelegramMessage(chatId, 'Вы не зарегистрированы. Используйте /start.');
    return;
  }

  const activeRoles = data.filter((r) => r.is_active);
  const inactiveRoles = data.filter((r) => !r.is_active);

  let text = '<b>Ваши роли:</b>\n\n';

  if (activeRoles.length > 0) {
    text += 'Активные:\n';
    for (const r of activeRoles) {
      const label = ROLES.find((role) => role.id === r.role)?.label || r.role;
      text += `  ${label}\n`;
    }
  }

  if (inactiveRoles.length > 0) {
    text += '\nОтключённые:\n';
    for (const r of inactiveRoles) {
      const label = ROLES.find((role) => role.id === r.role)?.label || r.role;
      text += `  ${label}\n`;
    }
  }

  if (activeRoles.length === 0) {
    text += 'Нет активных подписок. Используйте /start.';
  }

  await sendTelegramMessage(chatId, text);
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('OK', { status: 200 });
  }

  try {
    const update = await req.json();

    // Handle callback queries (inline keyboard button presses)
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message?.chat?.id;
      const data = cb.data;

      if (chatId && data?.startsWith('role:')) {
        const roleId = data.replace('role:', '');
        await handleRoleSelection(
          chatId,
          roleId,
          cb.from?.first_name,
          cb.from?.username,
          cb.id,
        );
      }
      return new Response('OK', { status: 200 });
    }

    // Handle text messages
    const message = update.message;
    if (!message?.text) {
      return new Response('OK', { status: 200 });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();

    switch (text) {
      case '/start':
        await handleStart(chatId);
        break;
      case '/stop':
        await handleStop(chatId);
        break;
      case '/status':
        await handleStatus(chatId);
        break;
      default:
        await sendTelegramMessage(
          chatId,
          'Используйте /start для подписки на уведомления.',
        );
    }
  } catch (err) {
    console.error('Webhook error:', err);
  }

  return new Response('OK', { status: 200 });
});
