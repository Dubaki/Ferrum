import re
import math
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
        if any(x in name for x in ["15x15", "20x20", "25x25", "30x30", "15x1", "20x2", "35x"]): 
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
        # Паттерны для классификации профиля
        self.re_profile_marker = re.compile(r'(?:[xх]\d|L|Ø|ПК|ПП|Труба|Лист|—|-)', re.I)
        
        # Для извлечения размеров
        self.re_3_nums = re.compile(r'(\d+)[xх*](\d+)[xх*](\d+[.,]?\d*)', re.I)
        self.re_2_nums = re.compile(r'(\d+)[xх*](\d+[.,]?\d*)', re.I)
        self.re_1_num = re.compile(r'(?:Ø|O|0)?\s*(\d+)', re.I)

    def parse(self, file_path):
        wb = openpyxl.load_workbook(file_path, data_only=True)
        sheet = wb.active 
        rows = list(sheet.iter_rows(values_only=True))
        
        if not rows: return self._empty_data()

        # --- ЭТАП 1: ОПРЕДЕЛЕНИЕ ТИПОВ КОЛОНОК (Scoring) ---
        # Мы пройдем по всем колонкам и дадим им баллы:
        # Score_Profile: содержит буквы и цифры, есть 'x', 'L', 'Ø'
        # Score_Length: содержит числа > 10 (длина)
        # Score_Qty: содержит целые числа < 1000 (кол-во)

        max_cols = max(len(r) for r in rows[:50]) # Проверяем первые 50 строк
        scores = [{'profile': 0, 'length': 0, 'qty': 0} for _ in range(max_cols)]

        for row in rows[:100]: # Анализируем до 100 строк для точности
            for i, val in enumerate(row):
                if i >= max_cols or not val: continue
                s_val = str(val).strip()
                
                # Проверка на Профиль (текст + цифры + маркеры)
                if self.re_profile_marker.search(s_val) and any(c.isdigit() for c in s_val) and len(s_val) > 2:
                    scores[i]['profile'] += 5 # Сильный признак
                
                # Проверка на Числа
                try:
                    num = float(s_val.replace(',', '.').replace(u'\xa0', ''))
                    if num > 10: 
                        scores[i]['length'] += 1 # Похоже на длину
                    if 0 < num < 1000 and num.is_integer():
                        scores[i]['qty'] += 1    # Похоже на кол-во
                except:
                    pass

        # Выбираем победителей (индексы колонок)
        # Сортируем индексы по баллам
        col_profile = sorted(range(len(scores)), key=lambda k: scores[k]['profile'], reverse=True)[0]
        
        # Для длины и кол-ва берем топ-2 колонки с числами и пытаемся различить
        # Обычно Длина > Кол-ва.
        # Исключаем колонку профиля из кандидатов
        numeric_cols = sorted(range(len(scores)), key=lambda k: scores[k]['length'] + scores[k]['qty'], reverse=True)
        numeric_cols = [c for c in numeric_cols if c != col_profile]
        
        if len(numeric_cols) < 2:
            # Аварийный режим (если не нашли 2 числовые колонки)
            return self._empty_data()

        # Эвристика: Колонка с бОльшим средним значением - это Длина
        col_A = numeric_cols[0]
        col_B = numeric_cols[1]
        
        avg_A = self._get_avg_val(rows, col_A)
        avg_B = self._get_avg_val(rows, col_B)

        if avg_A > avg_B:
            col_length, col_qty = col_A, col_B
        else:
            col_length, col_qty = col_B, col_A

        # --- ЭТАП 2: ЧТЕНИЕ ДАННЫХ ИЗ НАЙДЕННЫХ КОЛОНОК ---
        return self._extract_data(rows, col_profile, col_length, col_qty)

    def _get_avg_val(self, rows, col_idx):
        total, count = 0, 0
        for row in rows[:50]:
            if col_idx < len(row):
                try:
                    val = float(str(row[col_idx]).replace(',', '.'))
                    total += val
                    count += 1
                except: pass
        return total / count if count > 0 else 0

    def _extract_data(self, rows, c_prof, c_len, c_qty):
        data = {'sheets': [], 'rect_tubes': {}, 'square_tubes': {}, 'es_pipes': {}, 'angles': {}, 'rounds': {}}
        
        for row in rows:
            if not row or len(row) <= max(c_prof, c_len, c_qty): continue
            
            raw_profile = str(row[c_prof]).strip()
            if not raw_profile or "Профиль" in raw_profile: continue # Пропуск заголовков

            try:
                length = float(str(row[c_len]).replace(',', '.').replace(u'\xa0', ''))
                qty = float(str(row[c_qty]).replace(',', '.').replace(u'\xa0', ''))
            except: continue

            if length <= 0 or qty <= 0: continue

            # --- ЛОГИКА ОПРЕДЕЛЕНИЯ (Та же, что и раньше, но теперь данные точные) ---
            prof = raw_profile.upper()
            clean = raw_profile.lower().replace('х', 'x').replace('*', 'x').replace(',', '.')

            # 1. ТРУБА ПП
            if "ПП" in prof or ("ТРУБА" in prof and self.re_3_nums.search(clean) and "ПК" not in prof):
                m = self.re_3_nums.search(clean)
                if m:
                    name = f"Труба ПП {m.group(1)}x{m.group(2)}x{m.group(3)}"
                    self._add(data['rect_tubes'], name, length, qty)
                continue

            # 2. ТРУБА ПК
            if "ПК" in prof:
                m3 = self.re_3_nums.search(clean)
                m2 = self.re_2_nums.search(clean)
                if m3: 
                    name = f"Труба ПК {m3.group(1)}x{m3.group(2)}x{m3.group(3)}"
                    self._add(data['square_tubes'], name, length, qty)
                elif m2:
                    name = f"Труба ПК {m2.group(1)}x{m2.group(1)}x{m2.group(2)}"
                    self._add(data['square_tubes'], name, length, qty)
                continue

            # 3. УГОЛОК
            if "УГОЛОК" in prof or prof.startswith("L") or "∟" in prof or "∠" in prof:
                m3 = self.re_3_nums.search(clean)
                m2 = self.re_2_nums.search(clean)
                if m3:
                    name = f"Уголок {m3.group(1)}x{m3.group(2)}x{m3.group(3)}"
                    self._add(data['angles'], name, length, qty)
                elif m2:
                    name = f"Уголок {m2.group(1)}x{m2.group(1)}x{m2.group(2)}"
                    self._add(data['angles'], name, length, qty)
                continue

            # 4. ЛИСТ
            if "ЛИСТ" in prof or prof.startswith("-") or "—" in prof or "–" in prof or "PL" in prof:
                m = self.re_2_nums.search(clean)
                if m:
                    data['sheets'].append({'qty': int(qty), 'thickness': float(m.group(1)), 'width': float(m.group(2)), 'length': length})
                continue

            # 5. КРУГ
            if "КРУГ" in prof or (any(x in prof for x in ["O", "0", "Ø"]) and "X" not in prof.replace("X", "x")):
                m = self.re_1_num.search(clean)
                if m:
                    name = f"Круг Ø{m.group(1)}"
                    self._add(data['rounds'], name, length, qty)
                continue

            # 6. ТРУБА Э/С
            is_es = ("ТРУБА" in prof and "ПП" not in prof and "ПК" not in prof) or ("Ø" in prof and "X" in prof.replace("X", "x"))
            if is_es:
                m = self.re_2_nums.search(clean)
                if m:
                    name = f"Труба Э/С Ø{m.group(1)}x{m.group(2)}"
                    self._add(data['es_pipes'], name, length, qty)
                continue

        return data

    def _add(self, d, name, l, q):
        if name not in d: d[name] = []
        d[name].append({'length': l, 'qty': int(q)})

    def _empty_data(self):
        return {'sheets': [], 'rect_tubes': {}, 'square_tubes': {}, 'es_pipes': {}, 'angles': {}, 'rounds': {}}