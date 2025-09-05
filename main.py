# main.py
import os
import json
import logging
from datetime import datetime
from typing import List, Optional

import gspread
from google.oauth2.service_account import Credentials
from aiogram import Bot, Dispatcher, Router, F, types
from aiogram.filters import CommandStart, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (
    Message,
    ReplyKeyboardMarkup,
    KeyboardButton,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    CallbackQuery,
    ReplyKeyboardRemove,
)
from aiogram.utils.keyboard import InlineKeyboardBuilder
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, Request
from dotenv import load_dotenv

# --- Конфигурация и инициализация ---
# Загрузка переменных окружения из .env файла для локальной разработки
load_dotenv()

# Настройка логирования для отладки
logging.basicConfig(level=logging.INFO)

# Получение переменных окружения
BOT_TOKEN = os.getenv("BOT_TOKEN")
# ID бригадиров через запятую (например, "12345,67890")
BRIGADIER_IDS_STR = os.getenv("BRIGADIER_IDS", "")
BRIGADIER_IDS = [int(bid.strip()) for bid in BRIGADIER_IDS_STR.split(",") if bid]
# ID Google-таблицы
SPREADSHEET_ID = os.getenv("SPREADSHEET_ID")
# JSON-ключ сервисного аккаунта Google в виде однострочного текста
GOOGLE_CREDENTIALS_JSON = os.getenv("GOOGLE_CREDENTIALS_JSON")
# URL для вебхука (например, "https://your-app-name.vercel.app")
BASE_WEBHOOK_URL = os.getenv("BASE_WEBHOOK_URL")

# Инициализация бота и диспетчера
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()
router = Router()
dp.include_router(router)
app = FastAPI()

# --- Настройка Google Sheets ---
try:
    # Преобразование JSON-строки в словарь
    creds_dict = json.loads(GOOGLE_CREDENTIALS_JSON)
    scopes = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
    ]
    creds = Credentials.from_service_account_info(creds_dict, scopes=scopes)
    gc = gspread.authorize(creds)
    spreadsheet = gc.open_by_key(SPREADSHEET_ID)
    reports_sheet = spreadsheet.worksheet("Отчеты")
    employees_sheet = spreadsheet.worksheet("Сотрудники")
    logging.info("Успешное подключение к Google Sheets.")
except Exception as e:
    logging.error(f"Ошибка подключения к Google Sheets: {e}")
    # В реальном проекте здесь может быть отправка уведомления администратору

# --- Клавиатуры ---

def main_keyboard() -> ReplyKeyboardMarkup:
    """Главное меню."""
    buttons = [
        [KeyboardButton(text="Отправить отчет (РТИ)")],
        [KeyboardButton(text="Отправить отчет (Химмаш)")],
        [KeyboardButton(text="Кабинет бригадира")],
    ]
    return ReplyKeyboardMarkup(keyboard=buttons, resize_keyboard=True)

def brigadier_keyboard() -> ReplyKeyboardMarkup:
    """Меню для бригадира."""
    buttons = [
        [KeyboardButton(text="Выставить коэффициенты")],
        [KeyboardButton(text="Управление сотрудниками")],
        [KeyboardButton(text="Назад в главное меню")],
    ]
    return ReplyKeyboardMarkup(keyboard=buttons, resize_keyboard=True)

def process_keyboard() -> InlineKeyboardMarkup:
    """Inline-клавиатура для выбора процесса."""
    processes = ["Резка", "Плазма", "Сварка", "Сборка", "Покраска", "Другое"]
    builder = InlineKeyboardBuilder()
    for process in processes:
        builder.add(InlineKeyboardButton(text=process, callback_data=f"process_{process}"))
    builder.adjust(2) # 2 кнопки в ряд
    return builder.as_markup()

# --- Машины состояний (FSM) ---

class ReportState(StatesGroup):
    """Состояния для отправки отчета."""
    choose_process = State()
    enter_other_description = State()
    
class AddEmployeeState(StatesGroup):
    """Состояния для добавления сотрудника."""
    enter_fio = State()
    enter_tg_id = State()
    enter_workshop = State()

class DeleteEmployeeState(StatesGroup):
    """Состояние для удаления сотрудника."""
    choose_employee = State()

class SetCoefficientState(StatesGroup):
    """Состояния для выставления коэффициента."""
    choose_workshop = State()
    choose_employee = State()
    enter_coefficient = State()

# --- Вспомогательные функции для работы с Google Sheets ---

async def get_employee_by_id(user_id: int) -> Optional[dict]:
    """Находит сотрудника по Telegram ID."""
    try:
        employees = employees_sheet.get_all_records()
        for employee in employees:
            if employee.get("Telegram ID") == user_id:
                return employee
    except Exception as e:
        logging.error(f"Ошибка при поиске сотрудника {user_id}: {e}")
    return None

async def has_user_reported_today(user_id: int) -> bool:
    """Проверяет, отправлял ли пользователь отчет сегодня."""
    try:
        today_str = datetime.now().strftime("%d.%m.%Y")
        all_reports = reports_sheet.get_all_records()
        for report in all_reports:
            if report.get("Дата") == today_str and report.get("Telegram ID") == user_id:
                return True
    except Exception as e:
        logging.error(f"Ошибка при проверке отчета для {user_id}: {e}")
    return False

# --- Обработчики команд и сообщений ---

@router.message(CommandStart())
async def cmd_start(message: Message):
    """Обработчик команды /start."""
    await message.answer(
        "Здравствуйте! Это бот для сдачи отчетов по работе в цехах.\n"
        "Пожалуйста, выберите действие:",
        reply_markup=main_keyboard()
    )

@router.message(F.text == "Назад в главное меню")
async def back_to_main_menu(message: Message):
    """Возврат в главное меню."""
    await message.answer("Вы вернулись в главное меню.", reply_markup=main_keyboard())


# --- Логика отправки отчета ---

@router.message(F.text.in_(["Отправить отчет (РТИ)", "Отправить отчет (Химмаш)"]))
async def start_report(message: Message, state: FSMContext):
    """Начало процесса сдачи отчета."""
    user_id = message.from_user.id
    employee = await get_employee_by_id(user_id)
    if not employee:
        await message.answer("❌ Вы не зарегистрированы в системе. Обратитесь к бригадиру.")
        return

    if await has_user_reported_today(user_id):
        await message.answer("⚠️ Вы уже отправляли отчет сегодня.")
        return

    workshop = "РТИ" if "РТИ" in message.text else "Химмаш"
    await state.update_data(workshop=workshop, employee_fio=employee['ФИО'])
    await state.set_state(ReportState.choose_process)
    await message.answer("Выберите выполненный процесс:", reply_markup=process_keyboard())

@router.callback_query(ReportState.choose_process, F.data.startswith("process_"))
async def process_chosen(callback: CallbackQuery, state: FSMContext):
    """Обработка выбора процесса."""
    process = callback.data.split("_")[1]
    
    if process == "Другое":
        await state.set_state(ReportState.enter_other_description)
        await callback.message.edit_text("Пожалуйста, опишите выполненный процесс:")
    else:
        user_data = await state.get_data()
        workshop = user_data.get("workshop")
        fio = user_data.get("employee_fio")
        
        # Запись в таблицу
        report_data = [
            datetime.now().strftime("%d.%m.%Y"),
            workshop,
            fio,
            callback.from_user.id,
            process,
            "",  # Описание
            ""   # Коэффициент
        ]
        try:
            reports_sheet.append_row(report_data)
            await callback.message.edit_text(f"✅ Ваш отчет по цеху '{workshop}' принят!")
        except Exception as e:
            logging.error(f"Не удалось записать отчет: {e}")
            await callback.message.edit_text("❌ Произошла ошибка при сохранении отчета.")

        await state.clear()
    await callback.answer()

@router.message(ReportState.enter_other_description)
async def other_description_entered(message: Message, state: FSMContext):
    """Обработка ввода описания для процесса 'Другое'."""
    user_data = await state.get_data()
    workshop = user_data.get("workshop")
    fio = user_data.get("employee_fio")

    report_data = [
        datetime.now().strftime("%d.%m.%Y"),
        workshop,
        fio,
        message.from_user.id,
        "Другое",
        message.text, # Описание
        ""          # Коэффициент
    ]
    try:
        reports_sheet.append_row(report_data)
        await message.answer(
            f"✅ Ваш отчет по цеху '{workshop}' принят!",
            reply_markup=main_keyboard()
        )
    except Exception as e:
        logging.error(f"Не удалось записать отчет (Другое): {e}")
        await message.answer("❌ Произошла ошибка при сохранении отчета.")

    await state.clear()


# --- Логика кабинета бригадира ---

@router.message(F.text == "Кабинет бригадира")
async def brigadier_cabinet(message: Message):
    """Вход в кабинет бригадира."""
    if message.from_user.id not in BRIGADIER_IDS:
        await message.answer("❌ У вас нет доступа к этому разделу.")
        return
    await message.answer("Вы вошли в кабинет бригадира.", reply_markup=brigadier_keyboard())

# -- Управление сотрудниками --
@router.message(F.text == "Управление сотрудниками")
async def manage_employees(message: Message):
    """Меню управления сотрудниками."""
    if message.from_user.id not in BRIGADIER_IDS: return

    builder = InlineKeyboardBuilder()
    builder.add(InlineKeyboardButton(text="➕ Добавить сотрудника", callback_data="add_employee"))
    builder.add(InlineKeyboardButton(text="➖ Удалить сотрудника", callback_data="delete_employee"))
    await message.answer("Выберите действие:", reply_markup=builder.as_markup())

# Добавление сотрудника
@router.callback_query(F.data == "add_employee")
async def start_add_employee(callback: CallbackQuery, state: FSMContext):
    await state.set_state(AddEmployeeState.enter_fio)
    await callback.message.edit_text("Введите ФИО нового сотрудника:")
    await callback.answer()

@router.message(AddEmployeeState.enter_fio)
async def enter_employee_fio(message: Message, state: FSMContext):
    await state.update_data(fio=message.text)
    await state.set_state(AddEmployeeState.enter_tg_id)
    await message.answer("Введите Telegram ID сотрудника (это число):")

@router.message(AddEmployeeState.enter_tg_id)
async def enter_employee_tg_id(message: Message, state: FSMContext):
    if not message.text.isdigit():
        await message.answer("❗️ Telegram ID должен быть числом. Попробуйте снова.")
        return
    await state.update_data(tg_id=int(message.text))
    await state.set_state(AddEmployeeState.enter_workshop)
    
    # Клавиатура для выбора цеха
    builder = InlineKeyboardBuilder()
    builder.add(InlineKeyboardButton(text="РТИ", callback_data="workshop_РТИ"))
    builder.add(InlineKeyboardButton(text="Химмаш", callback_data="workshop_Химмаш"))
    await message.answer("Выберите цех для сотрудника:", reply_markup=builder.as_markup())

@router.callback_query(AddEmployeeState.enter_workshop, F.data.startswith("workshop_"))
async def enter_employee_workshop(callback: CallbackQuery, state: FSMContext):
    workshop = callback.data.split("_")[1]
    user_data = await state.get_data()
    
    employee_data = [user_data.get("fio"), user_data.get("tg_id"), workshop]
    try:
        employees_sheet.append_row(employee_data)
        await callback.message.edit_text(
            f"✅ Сотрудник {user_data.get('fio')} успешно добавлен в цех {workshop}."
        )
    except Exception as e:
        logging.error(f"Не удалось добавить сотрудника: {e}")
        await callback.message.edit_text("❌ Произошла ошибка при добавлении сотрудника.")

    await state.clear()
    await callback.answer()

# Удаление сотрудника
@router.callback_query(F.data == "delete_employee")
async def start_delete_employee(callback: CallbackQuery, state: FSMContext):
    try:
        employees = employees_sheet.get_all_records()
    except Exception as e:
        logging.error(f"Ошибка получения списка сотрудников: {e}")
        await callback.message.edit_text("❌ Не удалось загрузить список сотрудников.")
        await callback.answer()
        return

    if not employees:
        await callback.message.edit_text("Список сотрудников пуст.")
        await callback.answer()
        return

    builder = InlineKeyboardBuilder()
    for emp in employees:
        # callback_data содержит TG ID для легкого поиска
        builder.add(InlineKeyboardButton(
            text=f"{emp['ФИО']} ({emp['Цех']})",
            callback_data=f"del_emp_{emp['Telegram ID']}"
        ))
    builder.adjust(1)
    await callback.message.edit_text("Выберите сотрудника для удаления:", reply_markup=builder.as_markup())
    await callback.answer()

@router.callback_query(F.data.startswith("del_emp_"))
async def confirm_delete_employee(callback: CallbackQuery):
    tg_id_to_delete = int(callback.data.split("_")[2])
    
    try:
        cell = employees_sheet.find(str(tg_id_to_delete), in_column=2) # Ищем по колонке B (Telegram ID)
        if cell:
            employees_sheet.delete_rows(cell.row)
            await callback.message.edit_text(f"✅ Сотрудник с ID {tg_id_to_delete} удален.")
        else:
            await callback.message.edit_text("❌ Сотрудник не найден.")
    except Exception as e:
        logging.error(f"Ошибка при удалении сотрудника: {e}")
        await callback.message.edit_text("❌ Произошла ошибка при удалении.")
    
    await callback.answer()

# -- Выставление коэффициентов --
@router.message(F.text == "Выставить коэффициенты")
async def start_set_coefficient(message: Message, state: FSMContext):
    if message.from_user.id not in BRIGADIER_IDS: return
    
    builder = InlineKeyboardBuilder()
    builder.add(InlineKeyboardButton(text="РТИ", callback_data="coef_workshop_РТИ"))
    builder.add(InlineKeyboardButton(text="Химмаш", callback_data="coef_workshop_Химмаш"))
    
    await state.set_state(SetCoefficientState.choose_workshop)
    await message.answer("Выберите цех для выставления коэффициентов:", reply_markup=builder.as_markup())

@router.callback_query(SetCoefficientState.choose_workshop, F.data.startswith("coef_workshop_"))
async def choose_employee_for_coef(callback: CallbackQuery, state: FSMContext):
    workshop = callback.data.split("_")[2]
    await state.update_data(workshop=workshop)
    
    today_str = datetime.now().strftime("%d.%m.%Y")
    try:
        all_reports = reports_sheet.get_all_records()
    except Exception as e:
        logging.error(f"Ошибка получения отчетов для коэффициентов: {e}")
        await callback.message.edit_text("❌ Не удалось загрузить отчеты.")
        await callback.answer()
        return

    employees_to_rate = []
    for i, report in enumerate(all_reports):
        if (report.get("Дата") == today_str and
            report.get("Цех") == workshop and
            str(report.get("Коэффициент")).strip() == ""):
            # Сохраняем номер строки (i+2, т.к. нумерация с 1 и есть заголовок)
            employees_to_rate.append({
                "fio": report.get("ФИО"),
                "row_num": i + 2 
            })
            
    if not employees_to_rate:
        await callback.message.edit_text(f"В цеху '{workshop}' нет отчетов без коэффициента за сегодня.")
        await state.clear()
        await callback.answer()
        return
        
    builder = InlineKeyboardBuilder()
    for emp in employees_to_rate:
        builder.add(InlineKeyboardButton(
            text=emp['fio'],
            callback_data=f"rate_emp_{emp['row_num']}_{emp['fio']}"
        ))
    builder.adjust(1)

    await state.set_state(SetCoefficientState.choose_employee)
    await callback.message.edit_text("Выберите сотрудника для оценки:", reply_markup=builder.as_markup())
    await callback.answer()


@router.callback_query(SetCoefficientState.choose_employee, F.data.startswith("rate_emp_"))
async def ask_for_coefficient(callback: CallbackQuery, state: FSMContext):
    parts = callback.data.split("_")
    row_num = int(parts[2])
    fio = "_".join(parts[3:]) # ФИО может содержать '_'
    
    await state.update_data(row_num=row_num, fio=fio)
    await state.set_state(SetCoefficientState.enter_coefficient)
    await callback.message.edit_text(f"Введите коэффициент для сотрудника {fio} (например, 0.8, 1, 1.2):")
    await callback.answer()

@router.message(SetCoefficientState.enter_coefficient)
async def save_coefficient(message: Message, state: FSMContext):
    try:
        # Проверка, что введено число (возможно, с точкой или запятой)
        coefficient_value = float(message.text.replace(',', '.'))
    except ValueError:
        await message.answer("❗️ Неверный формат. Введите число (например, 1 или 1.2).")
        return

    user_data = await state.get_data()
    row_num = user_data.get("row_num")
    fio = user_data.get("fio")
    
    try:
        # Обновляем ячейку в столбце G (Коэффициент)
        reports_sheet.update_cell(row_num, 7, coefficient_value)
        await message.answer(f"✅ Коэффициент {coefficient_value} для сотрудника {fio} успешно сохранен.")
    except Exception as e:
        logging.error(f"Ошибка обновления коэффициента: {e}")
        await message.answer("❌ Произошла ошибка при сохранении коэффициента.")
        
    await state.clear()
    # Предложить оценить следующего
    await start_set_coefficient(message, state)


# --- Планировщик для напоминаний ---

async def send_reminders():
    """Отправляет напоминания сотрудникам, не сдавшим отчет."""
    logging.info("Запуск задачи по отправке напоминаний...")
    try:
        all_employees = employees_sheet.get_all_records()
        today_str = datetime.now().strftime("%d.%m.%Y")
        all_reports = reports_sheet.get_all_records()
        
        reported_today_ids = {
            report["Telegram ID"]
            for report in all_reports
            if report.get("Дата") == today_str
        }

        for employee in all_employees:
            employee_id = employee.get("Telegram ID")
            if employee_id and employee_id not in reported_today_ids:
                try:
                    await bot.send_message(
                        chat_id=employee_id,
                        text="🔔 Смена скоро заканчивается (18:00). Не забудьте отправить отчет о работе!"
                    )
                    logging.info(f"Напоминание отправлено сотруднику {employee_id}")
                except Exception as e:
                    logging.warning(f"Не удалось отправить напоминание {employee_id}: {e}")
    except Exception as e:
        logging.error(f"Критическая ошибка в задаче напоминаний: {e}")

# --- Настройка вебхуков и запуск ---

@app.on_event("startup")
async def on_startup():
    """Действия при запуске приложения."""
    webhook_info = await bot.get_webhook_info()
    webhook_url = f"{BASE_WEBHOOK_URL}/webhook"
    if webhook_info.url != webhook_url:
        await bot.set_webhook(url=webhook_url)
        logging.info(f"Вебхук установлен: {webhook_url}")

    # Запуск планировщика
    scheduler = AsyncIOScheduler(timezone="Europe/Moscow") # Укажите ваш часовой пояс
    # Запускать каждый день в 17:30
    scheduler.add_job(send_reminders, 'cron', hour=17, minute=30)
    scheduler.start()
    logging.info("Планировщик запущен.")

@app.post("/webhook")
async def webhook(request: Request):
    """Принимает обновления от Telegram."""
    update_data = await request.json()
    update = types.Update.model_validate(update_data, context={"bot": bot})
    await dp.feed_update(bot=bot, update=update)
    return {"ok": True}

@app.on_event("shutdown")
async def on_shutdown():
    """Действия при остановке приложения."""
    await bot.delete_webhook()
    logging.info("Вебхук удален.")

# Для локального тестирования можно запустить через uvicorn
# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8000)