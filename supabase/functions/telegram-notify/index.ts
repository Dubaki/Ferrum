import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendTelegramMessage(chatId: number, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });
  } catch (err) {
    console.error(`Failed to send to chat_id ${chatId}:`, err);
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { roles, message } = await req.json();

    if (!roles || !Array.isArray(roles) || roles.length === 0 || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: roles (array) and message (string)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Fetch active users for the requested roles
    const { data: users, error } = await supabase
      .from('telegram_users')
      .select('chat_id')
      .in('role', roles)
      .eq('is_active', true);

    if (error) {
      console.error('Supabase query error:', error);
      return new Response(
        JSON.stringify({ error: 'Database query failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: 'No active users for these roles' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Deduplicate by chat_id (one person may have multiple roles)
    const uniqueChatIds = [...new Set(users.map((u) => u.chat_id))];

    // Send messages in parallel
    await Promise.allSettled(
      uniqueChatIds.map((chatId) => sendTelegramMessage(chatId, message)),
    );

    return new Response(
      JSON.stringify({ sent: uniqueChatIds.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('Notify error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
