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
        # 1. СТРОГИЕ (Слова + Цифры)
        # Ищем слово, потом любой мусор (.*?), потом цифры
        self.re_pp = re.compile(r'ПП.*?(\d+)[xх*](\d+)[xх*](\d+[.,]?\d*)', re.I)
        self.re_pk = re.compile(r'ПК.*?(\d+)[xх*](\d+)(?:[xх*](\d+[.,]?\d*))?', re.I)
        # Э/С: Слово "Труба", но без ПП/ПК впереди
        self.re_es_word = re.compile(r'Труба(?!\s*(?:ПП|ПК|проф)).*?(\d+)[xх*](\d+[.,]?\d*)', re.I)
        self.re_angle_word = re.compile(r'Уголок.*?(\d+)[xх*](\d+)(?:[xх*](\d+))?', re.I)
        self.re_round_word = re.compile(r'Круг.*?(\d+)', re.I)
        self.re_sheet_word = re.compile(r'Лист.*?(\d+)[xх*](\d+)', re.I)

        # 2. РЕЗЕРВНЫЕ (Символы или Формат)
        self.re_sheet_sym = re.compile(r'(?:^|[\s\d])[-—–]\s*(\d+)[xх*](\d+)', re.I)
        self.re_angle_sym = re.compile(r'[L∟∠]\s?(\d+)[xх*](\d+)(?:[xх*](\d+))?', re.I)
        self.re_es_sym = re.compile(r'[ØOО0]\s?(\d+)[xх*](\d+[.,]?\d*)', re.I)
        self.re_round_sym = re.compile(r'[ØOО0]\s?(\d+)(?!\s*[xх*])', re.I)
        
        # Геометрический поиск (если слов нет)
        self.re_rect_geo = re.compile(r'(?:^|\s)(\d+)[xх*](\d+)[xх*](\d+[.,]?\d*)', re.I)
        self.re_sq_geo = re.compile(r'(?:^|\s)(\d+)[xх*](\d+[.,]?\d*)', re.I)

    def parse(self, pdf_path):
        data = {'sheets': [], 'rect_tubes': {}, 'square_tubes': {}, 'es_pipes': {}, 'angles': {}, 'rounds': {}}
        
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if not text: continue
                
                # Нормализация
                clean_text = text.replace('х', 'x').replace('Х', 'x').replace('*', 'x').replace('–', '-').replace('—', '-')

                for line in clean_text.split('\n'):
                    line = line.strip()
                    if not line or "Марка" in line: continue

                    # --- ЭТАП 1: КЛЮЧЕВЫЕ СЛОВА ---
                    
                    if "ПП" in line.upper():
                        m = self.re_pp.search(line)
                        if m:
                            name = f"Труба ПП {m.group(1)}x{m.group(2)}x{m.group(3).replace(',', '.')}"
                            self._add_item(data['rect_tubes'], line, m, name)
                            continue

                    if "ПК" in line.upper():
                        m = self.re_pk.search(line)
                        if m:
                            v1, v2, v3 = m.groups()
                            name = f"Труба ПК {v1}x{v2}x{v3.replace(',', '.')}" if v3 else f"Труба ПК {v1}x{v1}x{v2.replace(',', '.')}"
                            self._add_item(data['square_tubes'], line, m, name)
                            continue

                    if "УГОЛОК" in line.upper():
                        m = self.re_angle_word.search(line)
                        if m:
                            s1, s2, s3 = m.groups()
                            name = f"Уголок {s1}x{s2}x{s3}" if s3 else f"Уголок {s1}x{s1}x{s2}"
                            self._add_item(data['angles'], line, m, name)
                            continue

                    if "КРУГ" in line.upper():
                        m = self.re_round_word.search(line)
                        if m:
                            self._add_item(data['rounds'], line, m, f"Круг Ø{m.group(1)}")
                            continue

                    if "ЛИСТ" in line.upper():
                        m = self.re_sheet_word.search(line)
                        if m:
                            self._add_sheet(data['sheets'], line, m)
                            continue

                    # Труба Э/С (Слово "Труба", но без ПП/ПК)
                    if "ТРУБА" in line.upper() and not ("ПП" in line.upper() or "ПК" in line.upper()):
                        m = self.re_es_word.search(line)
                        if m:
                            name = f"Труба Э/С Ø{m.group(1)}x{m.group(2).replace(',', '.')}"
                            self._add_item(data['es_pipes'], line, m, name)
                            continue

                    # --- ЭТАП 2: СИМВОЛЫ И ГЕОМЕТРИЯ (РЕЗЕРВ) ---
                    
                    # Лист (-)
                    m = self.re_sheet_sym.search(line)
                    if m:
                        self._add_sheet(data['sheets'], line, m)
                        continue

                    # Уголок (L)
                    m = self.re_angle_sym.search(line)
                    if m:
                        s1, s2, s3 = m.groups()
                        name = f"Уголок {s1}x{s2}x{s3}" if s3 else f"Уголок {s1}x{s1}x{s2}"
                        self._add_item(data['angles'], line, m, name)
                        continue

                    # Э/С (Ø)
                    m = self.re_es_sym.search(line)
                    if m:
                        name = f"Труба Э/С Ø{m.group(1)}x{m.group(2).replace(',', '.')}"
                        self._add_item(data['es_pipes'], line, m, name)
                        continue

                    # Круг (Ø)
                    m = self.re_round_sym.search(line)
                    if m:
                        self._add_item(data['rounds'], line, m, f"Круг Ø{m.group(1)}")
                        continue

                    # Геометрия: 3 числа = Прямоугольник
                    m = self.re_rect_geo.search(line)
                    if m:
                        name = f"Труба ПР {m.group(1)}x{m.group(2)}x{m.group(3).replace(',', '.')}"
                        self._add_item(data['rect_tubes'], line, m, name)
                        continue

                    # Геометрия: 2 числа = Квадрат (последний шанс)
                    m = self.re_sq_geo.search(line)
                    if m:
                        name = f"Труба КВ {m.group(1)}x{m.group(1)}x{m.group(2).replace(',', '.')}"
                        self._add_item(data['square_tubes'], line, m, name)
                        continue

        return data

    def _add_item(self, storage, line, match_obj, name):
        right_part = line[match_obj.end():]
        m_len = re.search(r'(\d+)', right_part)
        length = float(m_len.group(1)) if m_len else 0

        left_part = line[:match_obj.start()]
        nums = re.findall(r'(\d+)', left_part)
        qty = int(nums[-1]) if nums else 1

        if length > 10:
            if name not in storage: storage[name] = []
            storage[name].append({'length': length, 'qty': qty})

    def _add_sheet(self, storage, line, match_obj):
        right_part = line[match_obj.end():]
        m_len = re.search(r'(\d+)', right_part)
        length = float(m_len.group(1)) if m_len else 0

        left_part = line[:match_obj.start()]
        nums = re.findall(r'(\d+)', left_part)
        qty = int(nums[-1]) if nums else 1

        if length > 0:
            storage.append({
                'qty': qty, 
                'thickness': float(match_obj.group(1)), 
                'width': float(match_obj.group(2)), 
                'length': length
            })