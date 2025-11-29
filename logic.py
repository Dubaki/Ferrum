import re
import math
import pdfplumber
import openpyxl
from openpyxl.styles import Font, PatternFill, Border, Side, Alignment
from io import BytesIO

class MetalCalculator:
    def __init__(self):
        self.SHEET_LARGE_AREA = 9.0
        self.SHEET_SMALL_AREA = 3.125
        self.PROFILE_STD_LEN = 12000
        self.PROFILE_SMALL_LEN = 6000

    def calculate_sheets(self, parts_data):
        grouped = {}
        for part in parts_data:
            t = part['thickness']
            if t not in grouped: grouped[t] = {'parts': [], 'total_area': 0}
            area = (part['width'] * part['length'] * part['qty']) / 1_000_000
            grouped[t]['parts'].append(part)
            grouped[t]['total_area'] += area

        results = []
        for t, data in grouped.items():
            std_area, std_name = (self.SHEET_SMALL_AREA, "1250x2500") if 0.5 <= t <= 2 else (self.SHEET_LARGE_AREA, "1500x6000")
            count = math.ceil(data['total_area'] / std_area)
            weight = (data['total_area'] * (t / 1000) * 7850) / 1000
            results.append({
                'name': f"Лист t={t}мм",
                'summary': f"{count} шт ({std_name})",
                'details': f"Вес: {round(weight, 3)}т, S={round(data['total_area'], 2)}м²",
                'raw_parts': data['parts']
            })
        return results

    def optimize_profile(self, name, parts_list):
        stock_len = self.PROFILE_STD_LEN
        # Если в названии есть маркеры мелкой трубы - длина 6м
        if any(x in name for x in ["15x15", "20x20", "25x25", "30x30", "15x1", "20x2"]): 
            stock_len = self.PROFILE_SMALL_LEN

        all_pieces = []
        for p in parts_list: all_pieces.extend([p['length']] * p['qty'])
        all_pieces.sort(reverse=True)

        whips = []
        for piece in all_pieces:
            placed = False
            for whip in whips:
                if whip['remaining'] >= piece:
                    whip['remaining'] -= piece
                    whip['parts'].append(piece)
                    placed = True
                    break
            if not placed: whips.append({'remaining': stock_len - piece, 'parts': [piece]})

        total_m = (len(whips) * stock_len) / 1000
        rem_warehouse = sum(w['remaining'] for w in whips if w['remaining'] >= 1000)
        
        return {
            'name': name,
            'summary': f"{len(whips)} хлыстов ({stock_len/1000}м)",
            'details': f"Погонаж: {total_m}м. Склад: {rem_warehouse/1000}м",
            'whips_count': len(whips),
            'stock_len': stock_len,
            'whips_data': whips 
        }

    def generate_excel(self, calculated_data):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Заказ металла"
        
        header_font = Font(bold=True, color="FFFFFF")
        header_fill = PatternFill("solid", fgColor="4F46E5")
        border = Border(left=Side(style='thin'), right=Side(style='thin'), top=Side(style='thin'), bottom=Side(style='thin'))
        
        headers = ["Тип", "Наименование", "Заказ", "Инфо"]
        for col, h in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col)
            cell.value = h
            cell.font = header_font
            cell.fill = header_fill

        row = 2
        def add_row(cat, name, order, details):
            nonlocal row
            ws.cell(row, 1, cat).border = border
            ws.cell(row, 2, name).border = border
            ws.cell(row, 3, order).border = border
            ws.cell(row, 4, details).border = border
            row += 1

        for item in calculated_data.get('sheets', []):
            add_row("Лист", item['name'], item['summary'], item['details'])

        categories = {
            'square_tubes': 'Квадратная', 'rect_tubes': 'Прямоугольная',
            'es_pipes': 'Труба Э/С', 'angles': 'Уголок', 'rounds': 'Круг'
        }
        for key, label in categories.items():
            for item in calculated_data.get(key, []):
                add_row(label, item['name'], item['summary'], item['details'])

        stream = BytesIO()
        wb.save(stream)
        stream.seek(0)
        return stream

class SpecParser:
    def __init__(self):
        # Стандартные диаметры Э/С труб (Эвристика: если значка нет, но размер совпадает)
        self.STD_PIPE_DIAMETERS = {57, 76, 89, 102, 108, 114, 127, 133, 159, 219, 273, 325}

    def parse(self, pdf_path):
        data = {'sheets': [], 'rect_tubes': {}, 'square_tubes': {}, 'es_pipes': {}, 'angles': {}, 'rounds': {}}
        
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if not text: continue
                
                # Разбиваем текст на токены (слова), а не строки, так надежнее
                # Но для начала попробуем построчный анализ с очисткой
                for line in text.split('\n'):
                    line = line.strip()
                    if not line or "Марка" in line or "Спецификация" in line: continue

                    # Попытка найти профиль в строке
                    # Мы ищем паттерн: "Число x Число" или "Число x Число x Число"
                    # И смотрим, что стоит ПЕРЕД ним
                    
                    # 1. Сначала ищем ПРЯМОУГОЛЬНИК (3 числа) - самый длинный паттерн
                    # Пример: 100x50x4
                    m_rect = re.search(r'(?:^|\s)(\d+)[xх*](\d+)[xх*](\d+[.,]?\d*)', line, re.I)
                    
                    if m_rect:
                        # Это либо Прямоуг. труба, либо Уголок
                        if "L" in line or "∟" in line:
                            # Уголок
                            self._extract_qty_len_and_add(data['angles'], line, m_rect, f"Уголок {m_rect.group(1)}x{m_rect.group(2)}x{m_rect.group(3)}")
                            continue
                        else:
                            # Прямоугольная труба
                            self._extract_qty_len_and_add(data['rect_tubes'], line, m_rect, f"Труба ПР {m_rect.group(1)}x{m_rect.group(2)}x{m_rect.group(3)}")
                            continue

                    # 2. Ищем 2 числа (AxB)
                    m_square = re.search(r'(?:^|\s)([-—LØO0]?)?\s*(\d+)[xх*](\d+[.,]?\d*)', line, re.I)
                    
                    if m_square:
                        prefix = m_square.group(1) # Может быть L, -, Ø, O
                        v1 = m_square.group(2)
                        v2 = m_square.group(3)
                        
                        # --- ЛОГИКА ОПРЕДЕЛЕНИЯ ТИПА ---
                        
                        # А. ЛИСТ (Есть минус или тире)
                        if prefix and prefix in ['-', '—', '–']:
                            # Особая логика для листов - нам нужны 4 параметра, тут только 2 (толщина и ширина)
                            # Листы часто пишут: Кол -3x50 Длина
                            self._extract_sheet(data['sheets'], line, float(v1), float(v2))
                            continue
                            
                        # Б. УГОЛОК (Есть L)
                        if (prefix and prefix in ['L', 'l']) or 'L' in line:
                            self._extract_qty_len_and_add(data['angles'], line, m_square, f"Уголок {v1}x{v1}x{v2}")
                            continue

                        # В. ТРУБА Э/С (Есть Ø, O, 0 или диаметр стандартный)
                        is_std_pipe = False
                        try:
                            if float(v1) in self.STD_PIPE_DIAMETERS: is_std_pipe = True
                        except: pass

                        if (prefix and prefix in ['Ø', 'O', '0', 'О']) or is_std_pipe:
                             self._extract_qty_len_and_add(data['es_pipes'], line, m_square, f"Труба Э/С Ø{v1}x{v2}")
                             continue

                        # Г. КВАДРАТНАЯ ТРУБА (Остальное)
                        self._extract_qty_len_and_add(data['square_tubes'], line, m_square, f"Труба КВ {v1}x{v1}x{v2}")
                        continue

                    # 3. Ищем КРУГ/ПРУТОК (O + 1 число)
                    # Ищем Ø16 или O16, но чтобы дальше НЕ было 'x'
                    m_round = re.search(r'(?:^|\s)[ØOО0]\s?(\d+)(?!\s*[xх*])', line, re.I)
                    if m_round:
                         self._extract_qty_len_and_add(data['rounds'], line, m_round, f"Круг Ø{m_round.group(1)}")
                         continue

        return data

    def _extract_qty_len_and_add(self, storage, line, match_obj, name):
        """Ищет числа слева и справа от найденного профиля"""
        start, end = match_obj.span()
        left_part = line[:start].strip()
        right_part = line[end:].strip()
        
        # Ищем последнее число слева (Кол-во)
        qty = 1
        m_qty = re.findall(r'(\d+)', left_part)
        if m_qty:
            qty = int(m_qty[-1]) # Берем ближайшее число слева

        # Ищем первое число справа (Длина)
        length = 0
        m_len = re.search(r'(\d+)', right_part)
        if m_len:
            length = float(m_len.group(1))
        
        # Если длина не найдена справа (бывает в Tekla), ищем второе число слева
        if length == 0 and len(m_qty) >= 2:
            # Возможно формат: Кол Длина Профиль (редко)
            pass 

        # Валидация: Длина должна быть разумной (>10мм)
        if length > 10:
            if name not in storage: storage[name] = []
            storage[name].append({'length': length, 'qty': qty})

    def _extract_sheet(self, storage, line, thk, width):
        # Аналогичный поиск для листа, но сохраняем в список
        # Лист обычно: QTY -ThkxWidth LENGTH
        # Мы уже нашли -ThkxWidth. Ищем соседей.
        
        # Находим позицию подстроки профиля в линии
        # Упрощенно: разбиваем строку, ищем числа
        nums = re.findall(r'(\d+)', line)
        # В строке "-3x50" регекс найдет 3 и 50.
        # Нам нужны числа, которые НЕ 3 и НЕ 50 (если они уникальны)
        
        # Лучший способ - использовать тот же метод соседей
        m = re.search(r'[-—]\s*(\d+)[xх*](\d+)', line)
        if m:
            start, end = m.span()
            left_part = line[:start].strip()
            right_part = line[end:].strip()
            
            qty = 1
            mq = re.findall(r'(\d+)', left_part)
            if mq: qty = int(mq[-1])
            
            length = 0
            ml = re.search(r'(\d+)', right_part)
            if ml: length = float(ml.group(1))

            if length > 10:
                storage.append({'qty': qty, 'thickness': thk, 'width': width, 'length': length})