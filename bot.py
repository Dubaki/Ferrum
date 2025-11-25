import os
import asyncio
from aiogram import Bot, Dispatcher, F
from aiogram.types import Message, ContentType
from aiogram.filters import Command
from logic import MetalCalculator, SpecParser

# --- НАСТРОЙКИ ---
TOKEN = "тут будет токен"
bot = Bot(token=TOKEN)
dp = Dispatcher()

@dp.message(Command("start"))
async def cmd_start(message: Message):
    await message.answer(
        "👋 Привет! Я бот для расчета металлопроката.\n"
        "<b>Отправь мне PDF-файл со спецификацией</b>, и я рассчитаю раскрой."
    )

@dp.message(F.document)
async def handle_document(message: Message):
    doc = message.document
    
    # Проверка формата
    if not doc.file_name.lower().endswith('.pdf'):
        await message.answer("❌ Пожалуйста, загрузите файл в формате PDF.")
        return

    await message.answer("⏳ Скачиваю и обрабатываю файл...")
    
    # Скачивание файла
    file_path = f"temp_{doc.file_id}.pdf"
    file = await bot.get_file(doc.file_id)
    await bot.download_file(file.file_path, file_path)

    try:
        # 1. Парсинг
        parser = SpecParser()
        data = parser.parse(file_path)

        if not data['sheets'] and not data['profiles']:
            await message.answer("⚠️ Не удалось найти детали в файле. Проверьте формат таблицы.")
            return

        # 2. Расчет
        calc = MetalCalculator()
        report_lines = ["📊 <b>ЗАКАЗ СНАБЖЕНИЮ</b>\n"]

        # Листы
        if data['sheets']:
            report_lines.append("🟦 <b>ЛИСТОВОЙ ПРОКАТ:</b>")
            results = calc.calculate_sheets(data['sheets'])
            for r in results:
                report_lines.append(f"— {r['name']}: {r['summary']} \n   <i>({r['details']})</i>")
            report_lines.append("")

        # Профили
        if data['profiles']:
            report_lines.append("🟧 <b>ПРОФИЛЬНЫЙ ПРОКАТ:</b>")
            for name, parts in data['profiles'].items():
                res = calc.optimize_profile(name, parts)
                report_lines.append(f"— {res['name']}: {res['summary']} \n   <i>({res['details']})</i>")

        # Отправка отчета
        final_text = "\n".join(report_lines)
        
        # Если сообщение слишком длинное, Telegram может его обрезать, 
        # но для начала отправим как есть
        await message.answer(final_text, parse_mode="HTML")

    except Exception as e:
        await message.answer(f"❌ Произошла ошибка при расчете: {e}")
    
    finally:
        # Удаляем временный файл
        if os.path.exists(file_path):
            os.remove(file_path)

# Запуск бота
async def main():
    await dp.start_polling(bot)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Бот остановлен")