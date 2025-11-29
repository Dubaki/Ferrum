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
        # Мелкая труба (до 30мм) по 6м
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
        # 1. ЛИСТ: "-3x50"
        self.re_sheet = re.compile(r'(\d+)\s+[-—]\s*(\d+)[xх](\d+)\s+(\d+)', re.I)
        
        # 2. УГОЛКИ: "L 50x5"
        self.re_angle = re.compile(r'(\d+)\s+L\s?(\d+)[xх]?(\d*)[xх]?(\d*)\s+(\d+)', re.I)

        # 3. ТРУБА Э/С: "Ø" + 2 числа (Диаметр х Стенка)
        # Ищем символ перечеркнутого круга (Ø) или похожего
        self.re_es_pipe = re.compile(r'(\d+)\s+[Ø]\s?(\d+)[xх](\d+[.,]?\d*)\s+(\d+)', re.I)

        # 4. КРУГ (ПРУТОК): "O" + 1 число (Диаметр)
        # ВАЖНО: Смотрим, чтобы после числа НЕ БЫЛО 'x' (Negative Lookahead)
        # Ищем символы: O (лат), О (кир), 0 (ноль)
        self.re_round_bar = re.compile(r'(\d+)\s+[OО0]\s?(\d+)(?!\s*[xх])\s+(\d+)', re.I)

        # 5. ПРЯМОУГОЛЬНАЯ ТРУБА: 3 числа (A x B x S)
        # Может быть значок квадрата 🔳 или [], или без него
        self.re_rect = re.compile(r'(\d+)\s+(?:[🔳□\[\]]\s?)?(\d+)[xх](\d+)[xх](\d+[.,]?\d*)\s+(\d+)', re.I)

        # 6. КВАДРАТНАЯ ТРУБА: 2 числа (A x S)
        # Сюда падает всё, что имеет 2 числа и не является Э/С трубой (нет Ø)
        self.re_square = re.compile(r'(\d+)\s+(?:[🔳□\[\]]\s?)?(\d+)[xх](\d+[.,]?\d*)\s+(\d+)', re.I)

    def parse(self, pdf_path):
        data = {'sheets': [], 'rect_tubes': {}, 'square_tubes': {}, 'es_pipes': {}, 'angles': {}, 'rounds': {}}
        
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if not text: continue
                
                for line in text.split('\n'):
                    line = line.strip()
                    if not line or "Марка" in line or "Спецификация" in line: continue

                    # ПРИОРИТЕТ 1: Уникальные маркеры
                    
                    # Лист (Минус)
                    m = self.re_sheet.search(line)
                    if m:
                        data['sheets'].append({'qty': int(m.group(1)), 'thickness': float(m.group(2)), 'width': float(m.group(3)), 'length': float(m.group(4))})
                        continue

                    # Уголок (L)
                    m = self.re_angle.search(line)
                    if m:
                        qty, s1, s2, s3, lng = m.groups()
                        name = f"Уголок {s1}x{s2}x{s3}" if s3 else f"Уголок {s1}x{s1}x{s2}"
                        self._add(data['angles'], name, float(lng), int(qty))
                        continue

                    # ПРИОРИТЕТ 2: Трубы (сначала сложные, потом простые)

                    # Прямоугольная (3 числа) - перепутать невозможно
                    m = self.re_rect.search(line)
                    if m:
                        name = f"Труба ПР 🔳 {m.group(2)}x{m.group(3)}x{m.group(4).replace(',','.')}"
                        self._add(data['rect_tubes'], name, float(m.group(5)), int(m.group(1)))
                        continue

                    # Э/С Труба (Символ Ø + 2 числа)
                    m = self.re_es_pipe.search(line)
                    if m:
                        name = f"Труба Э/С Ø{m.group(2)}x{m.group(3).replace(',','.')}"
                        self._add(data['es_pipes'], name, float(m.group(4)), int(m.group(1)))
                        continue

                    # Круг/Пруток (Символ O + 1 число)
                    m = self.re_round_bar.search(line)
                    if m:
                        name = f"Круг O{m.group(2)}"
                        self._add(data['rounds'], name, float(m.group(3)), int(m.group(1)))
                        continue

                    # Квадратная (2 числа)
                    # Если дошли досюда и строка похожа на "20x2.0", то это квадрат
                    m = self.re_square.search(line)
                    if m:
                        s = m.group(2)
                        w = m.group(3).replace(',', '.')
                        name = f"Труба КВ 🔳 {s}x{s}x{w}"
                        self._add(data['square_tubes'], name, float(m.group(4)), int(m.group(1)))
                        continue

        return data

    def _add(self, d, name, l, q):
        if name not in d: d[name] = []
        d[name].append({'length': l, 'qty': q})