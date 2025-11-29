import os
import asyncio
import logging
from aiogram import Bot, Dispatcher, F
from aiogram.types import Message
from aiogram.filters import Command
from aiohttp import web
from logic import MetalCalculator, SpecParser

logging.basicConfig(level=logging.INFO)

TOKEN = os.getenv("BOT_TOKEN")
if not TOKEN: raise ValueError("Нет токена!")

bot = Bot(token=TOKEN)
dp = Dispatcher()

# --- ВЕБ-СЕРВЕР ---
async def index_handler(request):
    return web.FileResponse('./static/index.html')

async def api_calculate(request):
    try:
        reader = await request.multipart()
        field = await reader.next()
        if field.name != 'file': return web.json_response({'error': 'Нет файла'}, status=400)
        
        filename = field.filename
        temp_path = f"temp_{filename}"
        
        with open(temp_path, 'wb') as f:
            while True:
                chunk = await field.read_chunk()
                if not chunk: break
                f.write(chunk)

        # 1. Парсинг (получаем данные по группам)
        parser = SpecParser()
        data = parser.parse(temp_path)
        
        # 2. Расчет
        calc = MetalCalculator()
        
        # Формируем ответ для Frontend с четкими категориями
        response = {
            "sheets": calc.calculate_sheets(data['sheets']),
            "square_tubes": [],
            "rect_tubes": [],
            "es_pipes": [],
            "angles": [],
            "rounds": []
        }

        # Функция-помощник для обработки словарей
        def process_dict(source_dict, target_list):
            for name, parts in source_dict.items():
                res = calc.optimize_profile(name, parts)
                target_list.append(res)

        process_dict(data['square_tubes'], response['square_tubes'])
        process_dict(data['rect_tubes'], response['rect_tubes'])
        process_dict(data['es_pipes'], response['es_pipes'])
        process_dict(data['angles'], response['angles'])
        process_dict(data['rounds'], response['rounds'])

        if os.path.exists(temp_path): os.remove(temp_path)

        return web.json_response(response)

    except Exception as e:
        logging.error(f"API Error: {e}")
        return web.json_response({'error': str(e)}, status=500)

async def start_server():
    app = web.Application()
    app.router.add_get('/', index_handler)
    app.router.add_post('/api/calculate', api_calculate)
    runner = web.AppRunner(app)
    await runner.setup()
    port = int(os.getenv("PORT", 8080))
    site = web.TCPSite(runner, '0.0.0.0', port)
    await site.start()
    logging.info(f"App started on port {port}")

@dp.message(Command("start"))
async def cmd_start(message: Message):
    await message.answer("Нажми кнопку меню для расчёта ")

async def main():
    await start_server()
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())