# Настройка Supabase для PlanFer

Для корректной работы загрузки чертежей и счетов (Storage), а также Telegram-уведомлений (Edge Functions), необходимо выполнить следующие шаги:

## 1. Регистрация и создание проекта
1. Зарегистрируйтесь на [supabase.com](https://supabase.com/).
2. Создайте новый проект (название например `planfer`).
3. Дождитесь завершения настройки базы данных.

## 2. Настройка Storage (Хранилище файлов)
1. Перейдите в раздел **Storage** в боковом меню.
2. Создайте новый Bucket с именем: `planfer-drawings`.
3. Сделайте его **Public** (публичным), чтобы ссылки на PDF были доступны в приложении.
4. В настройках Bucket (Policies) разрешите операции `INSERT`, `SELECT`, `UPDATE`, `DELETE` для всех (или настройте авторизацию, если используете Supabase Auth).

## 3. Переменные окружения
Скопируйте данные из раздела **Project Settings -> API**:
1. `Project URL` → вставьте в `VITE_SUPABASE_URL` в файле `.env`.
2. `anon public (key)` → вставьте в `VITE_SUPABASE_ANON_KEY` в файле `.env`.

## 4. Edge Functions (Telegram-уведомления)
Если вам нужны уведомления в Telegram:
1. Установите [Supabase CLI](https://supabase.com/docs/guides/cli).
2. Выполните команду `supabase login`.
3. В папке проекта выполните `supabase link --project-ref ваш_id_проекта`.
4. Разверните функции: `supabase functions deploy telegram-notify`.
5. Настройте секреты для бота (токен):
   `supabase secrets set TELEGRAM_BOT_TOKEN=ваш_токен`

---
*Примечание: При работе на Windows Docker Desktop требуется только для локального запуска и тестирования функций (команда `supabase functions serve`). Для обычной работы приложения и деплоя функций в облако Docker не нужен.*
