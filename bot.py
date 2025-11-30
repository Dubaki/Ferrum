import os
import asyncio
import logging
from aiogram import Bot, Dispatcher, F
from aiogram.types import Message
from aiogram.filters import Command
from aiohttp import web
import aiohttp_cors
from logic import MetalCalculator, SpecParser

logging.basicConfig(level=logging.INFO)

TOKEN = os.getenv("BOT_TOKEN")
if not TOKEN: raise ValueError("Нет токена!")

bot = Bot(token=TOKEN)
dp = Dispatcher()
LAST_CALCULATION = {} 

async def index_handler(request):
    return web.FileResponse('./static/index.html')

async def api_calculate(request):
    try:
        reader = await request.multipart()
        field = await reader.next()
        if field.name != 'file': return web.json_response({'error': 'No file'}, status=400)
        
        filename = field.filename.lower()
        if not (filename.endswith('.xlsx') or filename.endswith('.xls')):
            return web.json_response({'error': 'Пожалуйста, загрузите Excel (.xlsx)'}, status=400)
        
        temp_path = f"temp_{field.filename}"
        with open(temp_path, 'wb') as f:
            while True:
                chunk = await field.read_chunk()
                if not chunk: break
                f.write(chunk)

        try:
            # Сразу используем парсер (он внутри сам откроет Excel)
            parser = SpecParser()
            data = parser.parse(temp_path)
        except Exception as parse_err:
            logging.error(f"Parse error: {parse_err}")
            return web.json_response({'error': 'Ошибка чтения Excel. Проверьте формат.'}, status=400)

        calc = MetalCalculator()
        
        response = {
            "sheets": calc.calculate_sheets(data['sheets']),
            "square_tubes": [], "rect_tubes": [], "es_pipes": [], "angles": [], "rounds": []
        }

        for k in ["square_tubes", "rect_tubes", "es_pipes", "angles", "rounds"]:
            for name, parts in data[k].items():
                response[k].append(calc.optimize_profile(name, parts))

        global LAST_CALCULATION
        LAST_CALCULATION = response

        if os.path.exists(temp_path): os.remove(temp_path)
        return web.json_response(response)

    except Exception as e:
        logging.error(f"API Error: {e}")
        return web.json_response({'error': str(e)}, status=500)

async def api_export_excel(request):
    try:
        if not LAST_CALCULATION: return web.json_response({'error': 'Нет данных'}, status=400)
        calc = MetalCalculator()
        excel_file = calc.generate_excel(LAST_CALCULATION)
        return web.Response(body=excel_file.getvalue(), headers={'Content-Disposition': 'attachment; filename="Order_Metal.xlsx"', 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})
    except Exception as e:
        return web.json_response({'error': str(e)}, status=500)

async def start_server():
    app = web.Application()
    cors = aiohttp_cors.setup(app, defaults={"*": aiohttp_cors.ResourceOptions(allow_credentials=True, expose_headers="*", allow_headers="*", allow_methods="*")})
    app.router.add_get('/', index_handler)
    cors.add(app.router.add_post('/api/calculate', api_calculate))
    cors.add(app.router.add_get('/api/export', api_export_excel))
    
    runner = web.AppRunner(app)
    await runner.setup()
    port = int(os.getenv("PORT", 8080))
    site = web.TCPSite(runner, '0.0.0.0', port)
    await site.start()
    logging.info(f"App started on port {port}")

@dp.message(Command("start"))
async def cmd_start(message: Message):
    await message.answer("Откройте приложение по кнопке меню 📱")

async def main():
    await start_server()
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())