import os
import asyncio
from aiogram import Bot, Dispatcher, F
from aiogram.types import Message
from aiogram.filters import Command
from logic import MetalCalculator, SpecParser
from aiohttp import web 

# --- НАСТРОЙКИ ---
TOKEN = os.getenv("BOT_TOKEN")

if not TOKEN:
    raise ValueError("Токен не найден! Убедитесь, что переменная BOT_TOKEN добавлена в Render.")

bot = Bot(token=TOKEN)
dp = Dispatcher()

# --- ФЕЙКОВЫЙ СЕРВЕР ДЛЯ RENDER ---
async def health_check(request):
    return web.Response(text="Bot is running")

async def start_server():
    app = web.Application()
    app.router.add_get('/', health_check)
    runner = web.AppRunner(app)
    await runner.setup()
    port = int(os.getenv("PORT", 8080))
    site = web.TCPSite(runner, '0.0.0.0', port)
    await site.start()

@dp.message(Command("start"))
async def cmd_start(message: Message):
    await message.answer(
        "👋 Привет! Я бот для расчета металлопроката.\n"
        "<b>Отправь мне PDF-файл со спецификацией</b>, и я рассчитаю раскрой."
    )

@dp.message(F.document)
async def handle_document(message: Message):
    doc = message.document
    if not doc.file_name.lower().endswith('.pdf'):
        await message.answer("❌ Пожалуйста, загрузите файл в формате PDF.")
        return

    await message.answer("⏳ Скачиваю и обрабатываю файл...")
    file_path = f"temp_{doc.file_id}.pdf"
    
    try:
        file = await bot.get_file(doc.file_id)
        await bot.download_file(file.file_path, file_path)

        parser = SpecParser()
        data = parser.parse(file_path)

        if not data['sheets'] and not data['profiles']:
            await message.answer("⚠️ Не удалось найти детали. Проверьте формат.")
            return

        calc = MetalCalculator()
        report_lines = ["📊 <b>ЗАКАЗ СНАБЖЕНИЮ</b>\n"]

        if data['sheets']:
            report_lines.append("🟦 <b>ЛИСТОВОЙ ПРОКАТ:</b>")
            results = calc.calculate_sheets(data['sheets'])
            for r in results:
                report_lines.append(f"— {r['name']}: {r['summary']} \n   <i>({r['details']})</i>")
            report_lines.append("")

        if data['profiles']:
            report_lines.append("🟧 <b>ПРОФИЛЬНЫЙ ПРОКАТ:</b>")
            for name, parts in data['profiles'].items():
                res = calc.optimize_profile(name, parts)
                report_lines.append(f"— {res['name']}: {res['summary']} \n   <i>({res['details']})</i>")

        final_text = "\n".join(report_lines)
        if len(final_text) > 4096:
             final_text = final_text[:4000] + "\n... (слишком длинный отчет)"
             
        await message.answer(final_text, parse_mode="HTML")

    except Exception as e:
        await message.answer(f"❌ Ошибка: {e}")
    
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

async def main():
    await start_server()
    await dp.start_polling(bot)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Бот остановлен")