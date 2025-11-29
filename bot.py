import os
import asyncio
import logging
from aiogram import Bot, Dispatcher, F
from aiogram.types import Message
from aiogram.filters import Command
from aiohttp import web
from logic import MetalCalculator, SpecParser

# Логирование
logging.basicConfig(level=logging.INFO)

# --- НАСТРОЙКИ ---
TOKEN = os.getenv("BOT_TOKEN")
if not TOKEN:
    raise ValueError("Токен не найден! Проверьте переменные окружения.")

bot = Bot(token=TOKEN)
dp = Dispatcher()

# --- ВЕБ-СЕРВЕР (ОТДАЕТ САЙТ И СЧИТАЕТ API) ---

# 1. Отдаем index.html при заходе на главную страницу
async def index_handler(request):
    return web.FileResponse('./static/index.html')

# 2. API для расчета (принимает файл от index.html)
async def api_calculate(request):
    try:
        reader = await request.multipart()
        field = await reader.next()
        
        if field.name != 'file':
            return web.json_response({'error': 'Нет файла'}, status=400)
        
        filename = field.filename
        if not filename.lower().endswith('.pdf'):
            return web.json_response({'error': 'Это не PDF'}, status=400)

        # Временное сохранение
        temp_path = f"temp_{filename}"
        size = 0
        with open(temp_path, 'wb') as f:
            while True:
                chunk = await field.read_chunk()
                if not chunk: break
                size += len(chunk)
                f.write(chunk)

        # Расчет (Логика из logic.py)
        parser = SpecParser()
        data = parser.parse(temp_path)
        
        calc = MetalCalculator()
        result_json = {
            "sheets": calc.calculate_sheets(data['sheets']),
            "profiles": []
        }
        
        for name, parts in data['profiles'].items():
            res = calc.optimize_profile(name, parts)
            result_json["profiles"].append(res)

        # Уборка
        if os.path.exists(temp_path):
            os.remove(temp_path)

        return web.json_response(result_json)

    except Exception as e:
        logging.error(f"API Error: {e}")
        return web.json_response({'error': str(e)}, status=500)

# Настройка маршрутов
async def start_server():
    app = web.Application()
    
    # Главная страница (наш TWA)
    app.router.add_get('/', index_handler)
    # API для расчета
    app.router.add_post('/api/calculate', api_calculate)
    # Раздача статики (если захотите добавить CSS/картинки отдельно)
    app.router.add_static('/static/', path='./static', name='static')

    runner = web.AppRunner(app)
    await runner.setup()
    
    port = int(os.getenv("PORT", 8080))
    site = web.TCPSite(runner, '0.0.0.0', port)
    await site.start()
    logging.info(f"Web App started on port {port}")

# --- ОБЫЧНЫЙ БОТ ---
@dp.message(Command("start"))
async def cmd_start(message: Message):
    # Эта кнопка откроет ваше веб-приложение
    await message.answer("Для запуска калькулятора нажмите кнопку меню 👇")

# --- ЗАПУСК ---
async def main():
    await start_server() # Запускаем сайт
    await dp.start_polling(bot) # Запускаем бота

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Stop")