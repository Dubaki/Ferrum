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
        # Если труба мелкая (до 30мм), считаем по 6м
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
            'square_tubes': 'Труба ПК (Квадрат)', 'rect_tubes': 'Труба ПП (Прямоуг)',
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
        # 1. ТРУБА ПП (Прямоугольная) - Маркер "ПП"
        # Ищет: Труба ПП 100x50x4
        self.re_tube_pp = re.compile(r'Труба\s*ПП\s*(\d+)[xх*](\d+)[xх*](\d+[.,]?\d*)', re.I)

        # 2. ТРУБА ПК (Квадратная) - Маркер "ПК"
        # Ищет: Труба ПК 100x4 (2 цифры) или 100x100x4 (3 цифры)
        self.re_tube_pk = re.compile(r'Труба\s*ПК\s*(\d+)[xх*](\d+)(?:[xх*](\d+[.,]?\d*))?', re.I)

        # 3. ТРУБА (Э/С) - Маркер "Труба" БЕЗ "ПП" или "ПК"
        # Negative Lookahead (?!П[ПК]) гарантирует, что это не профильная
        self.re_tube_es = re.compile(r'Труба\s+(?!П[ПК])(\S*\s)?(\d+)[xх*](\d+[.,]?\d*)', re.I)

        # 4. УГОЛОК - Маркер "Уголок"
        self.re_angle = re.compile(r'Уголок\s*(\d+)[xх*](\d+)(?:[xх*](\d+))?', re.I)

        # 5. КРУГ - Маркер "Круг"
        self.re_round = re.compile(r'Круг\s*(\d+)', re.I)

        # 6. ЛИСТ - Маркер "Лист" или "-"
        self.re_sheet = re.compile(r'(?:Лист|^|[\s\d])[-—–]\s*(\d+)[xх*](\d+)', re.I)

    def parse(self, pdf_path):
        data = {'sheets': [], 'rect_tubes': {}, 'square_tubes': {}, 'es_pipes': {}, 'angles': {}, 'rounds': {}}
        
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if not text: continue
                
                # Чистка: замена русских 'х' на 'x'
                clean_text = text.replace('х', 'x').replace('Х', 'x').replace('–', '-').replace('—', '-')

                for line in clean_text.split('\n'):
                    line = line.strip()
                    if not line or "Марка" in line or "Спецификация" in line: continue

                    # 1. ТРУБА ПП (Прямоугольная)
                    m = self.re_tube_pp.search(line)
                    if m:
                        name = f"Труба ПП {m.group(1)}x{m.group(2)}x{m.group(3).replace(',','.')}"
                        self._extract_qty_len_and_add(data['rect_tubes'], line, m, name)
                        continue

                    # 2. ТРУБА ПК (Квадратная)
                    m = self.re_tube_pk.search(line)
                    if m:
                        v1, v2, v3 = m.groups()
                        # Если только 2 цифры (100x4), значит 100x100x4
                        if not v3:
                            name = f"Труба ПК {v1}x{v1}x{v2.replace(',','.')}"
                        else:
                            name = f"Труба ПК {v1}x{v2}x{v3.replace(',','.')}"
                        
                        self._extract_qty_len_and_add(data['square_tubes'], line, m, name)
                        continue

                    # 3. ТРУБА Э/С (Просто "Труба")
                    m = self.re_tube_es.search(line)
                    if m:
                        d = m.group(2)
                        s = m.group(3)
                        name = f"Труба Э/С Ø{d}x{s.replace(',','.')}"
                        self._extract_qty_len_and_add(data['es_pipes'], line, m, name)
                        continue

                    # 4. УГОЛОК
                    m = self.re_angle.search(line)
                    if m:
                        s1, s2, s3 = m.groups()
                        # Если 3 цифры - разнополочный, 2 - равнополочный
                        name = f"Уголок {s1}x{s2}x{s3}" if s3 else f"Уголок {s1}x{s1}x{s2}"
                        self._extract_qty_len_and_add(data['angles'], line, m, name)
                        continue

                    # 5. КРУГ
                    m = self.re_round.search(line)
                    if m:
                        name = f"Круг Ø{m.group(1)}"
                        self._extract_qty_len_and_add(data['rounds'], line, m, name)
                        continue

                    # 6. ЛИСТ
                    m = self.re_sheet.search(line)
                    if m:
                        self._extract_sheet(data['sheets'], line, m)
                        continue

        return data

    def _extract_sheet(self, storage, line, match_obj):
        # Длина (справа)
        right_part = line[match_obj.end():]
        length = 0
        m_len = re.search(r'(\d+)', right_part)
        if m_len: length = float(m_len.group(1))

        # Количество (слева)
        left_part = line[:match_obj.start()]
        qty = 1
        m_qty = re.findall(r'(\d+)', left_part)
        if m_qty: qty = int(m_qty[-1])

        if length > 0:
            storage.append({
                'qty': qty, 
                'thickness': float(match_obj.group(1)), 
                'width': float(match_obj.group(2)), 
                'length': length
            })

    def _extract_qty_len_and_add(self, storage, line, match_obj, name):
        # Длина (справа, колонка "L")
        right_part = line[match_obj.end():]
        length = 0
        m_len = re.search(r'(\d+)', right_part)
        if m_len: length = float(m_len.group(1))

        # Количество (слева)
        left_part = line[:match_obj.start()]
        qty = 1
        m_qty = re.findall(r'(\d+)', left_part)
        if m_qty: qty = int(m_qty[-1])

        if length > 10:
            if name not in storage: storage[name] = []
            storage[name].append({'length': length, 'qty': qty})