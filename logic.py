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
        # Трубы профильные прямоугольные (ПП)
        self.re_pp = re.compile(r'(?:Труба\s+)?ПП.*?(\d+)\s*[xх×*]\s*(\d+)\s*[xх×*]\s*(\d+[.,]?\d*)', re.I)
        
        # Трубы профильные квадратные (ПК)
        self.re_pk = re.compile(r'(?:Труба\s+)?ПК.*?(\d+)\s*[xх×*]\s*(\d+[.,]?\d*)', re.I)
        
        # Трубы электросварные (Э/С)
        self.re_es = re.compile(r'Труба(?!\s*(?:ПП|ПК)).*?(\d+)\s*[xх×*]\s*(\d+[.,]?\d*)', re.I)
        
        # Уголок (по слову)
        self.re_angle = re.compile(r'Уголок.*?(\d+)\s*[xх×*]\s*(\d+)(?:\s*[xх×*]\s*(\d+))?', re.I)
        
        # Круг (по слову)
        self.re_round = re.compile(r'Круг.*?(\d+)', re.I)
        
        # Лист (по слову)
        self.re_sheet = re.compile(r'Лист.*?(\d+)\s*[xх×*]\s*(\d+)', re.I)
        
        # Поиск по символам (резервные паттерны)
        self.re_sheet_dash = re.compile(r'[-–—]\s*(\d+)\s*[xх×*]\s*(\d+)', re.I)
        self.re_angle_L = re.compile(r'[L∟∠]\s*(\d+)\s*[xх×*]\s*(\d+)(?:\s*[xх×*]\s*(\d+))?', re.I)
        self.re_es_circle = re.compile(r'[ØOО0]\s*(\d+)\s*[xх×*]\s*(\d+[.,]?\d*)', re.I)
        self.re_round_circle = re.compile(r'[ØOО0]\s*(\d+)(?!\s*[xх×*])', re.I)

    def parse(self, pdf_path):
        data = {
            'sheets': [], 
            'rect_tubes': {}, 
            'square_tubes': {}, 
            'es_pipes': {}, 
            'angles': {}, 
            'rounds': {}
        }
        
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if not text:
                    continue
                
                # Нормализация текста
                text = text.replace('х', 'x').replace('Х', 'x').replace('×', 'x')
                text = text.replace('*', 'x').replace('–', '-').replace('—', '-')
                
                for line in text.split('\n'):
                    line = line.strip()
                    if not line or len(line) < 5:
                        continue
                    
                    # Пропускаем заголовки
                    if any(word in line for word in ['Марка', 'Обозначение', 'Наименование', 'Формат']):
                        continue
                    
                    # Обрабатываем строку по приоритету
                    if self._try_parse_line(line, data):
                        continue
        
        return data

    def _try_parse_line(self, line, data):
        """Пытается распарсить строку по всем известным паттернам"""
        
        # 1. Профильная труба прямоугольная (ПП)
        if 'ПП' in line.upper():
            m = self.re_pp.search(line)
            if m:
                name = f"Труба ПП {m.group(1)}x{m.group(2)}x{m.group(3).replace(',', '.')}"
                self._add_profile_item(data['rect_tubes'], line, m, name)
                return True
        
        # 2. Профильная труба квадратная (ПК)
        if 'ПК' in line.upper():
            m = self.re_pk.search(line)
            if m:
                size = m.group(1)
                thickness = m.group(2).replace(',', '.')
                name = f"Труба ПК {size}x{thickness}"
                self._add_profile_item(data['square_tubes'], line, m, name)
                return True
        
        # 3. Уголок
        if 'УГОЛОК' in line.upper():
            m = self.re_angle.search(line)
            if m:
                s1, s2, s3 = m.groups()
                if s3:
                    name = f"Уголок {s1}x{s2}x{s3}"
                else:
                    # Равнополочный уголок
                    name = f"Уголок {s1}x{s1}x{s2}"
                self._add_profile_item(data['angles'], line, m, name)
                return True
        
        # 4. Круг (пруток)
        if 'КРУГ' in line.upper():
            m = self.re_round.search(line)
            if m:
                name = f"Круг Ø{m.group(1)}"
                self._add_profile_item(data['rounds'], line, m, name)
                return True
        
        # 5. Лист
        if 'ЛИСТ' in line.upper():
            m = self.re_sheet.search(line)
            if m:
                self._add_sheet_item(data['sheets'], line, m)
                return True
        
        # 6. Труба электросварная (без ПП/ПК)
        if 'ТРУБА' in line.upper() and not ('ПП' in line.upper() or 'ПК' in line.upper()):
            m = self.re_es.search(line)
            if m:
                name = f"Труба Э/С Ø{m.group(1)}x{m.group(2).replace(',', '.')}"
                self._add_profile_item(data['es_pipes'], line, m, name)
                return True
        
        # 7. Резервные паттерны (символы)
        
        # Лист (по тире)
        m = self.re_sheet_dash.search(line)
        if m:
            self._add_sheet_item(data['sheets'], line, m)
            return True
        
        # Уголок (по L)
        m = self.re_angle_L.search(line)
        if m:
            s1, s2, s3 = m.groups()
            if s3:
                name = f"Уголок {s1}x{s2}x{s3}"
            else:
                name = f"Уголок {s1}x{s1}x{s2}"
            self._add_profile_item(data['angles'], line, m, name)
            return True
        
        # Труба Э/С (по Ø с двумя числами)
        m = self.re_es_circle.search(line)
        if m:
            name = f"Труба Э/С Ø{m.group(1)}x{m.group(2).replace(',', '.')}"
            self._add_profile_item(data['es_pipes'], line, m, name)
            return True
        
        # Круг (по Ø с одним числом)
        m = self.re_round_circle.search(line)
        if m:
            name = f"Круг Ø{m.group(1)}"
            self._add_profile_item(data['rounds'], line, m, name)
            return True
        
        return False

    def _add_profile_item(self, storage, line, match_obj, name):
        """Добавляет профильный элемент (труба, уголок, круг)"""
        # Ищем длину после совпадения
        right_part = line[match_obj.end():]
        m_len = re.search(r'L\s*=\s*(\d+)|(\d{3,5})\s*мм', right_part, re.I)
        
        if not m_len:
            # Просто ищем число длины
            m_len = re.search(r'(\d{3,5})', right_part)
        
        length = float(m_len.group(1) or m_len.group(2)) if m_len else 0
        
        # Ищем количество слева от совпадения
        left_part = line[:match_obj.start()]
        nums = re.findall(r'(\d+)', left_part)
        qty = int(nums[-1]) if nums else 1
        
        # Добавляем только если длина разумная
        if 50 <= length <= 15000:
            if name not in storage:
                storage[name] = []
            storage[name].append({'length': length, 'qty': qty})

    def _add_sheet_item(self, storage, line, match_obj):
        """Добавляет листовой элемент"""
        # Толщина и ширина из регулярки
        thickness = float(match_obj.group(1))
        width = float(match_obj.group(2))
        
        # Ищем длину после совпадения
        right_part = line[match_obj.end():]
        m_len = re.search(r'(\d+)', right_part)
        length = float(m_len.group(1)) if m_len else 0
        
        # Ищем количество слева
        left_part = line[:match_obj.start()]
        nums = re.findall(r'(\d+)', left_part)
        qty = int(nums[-1]) if nums else 1
        
        if length > 0:
            storage.append({
                'qty': qty,
                'thickness': thickness,
                'width': width,
                'length': length
            })