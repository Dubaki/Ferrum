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
        # Регулярки для поиска размеров
        self.re_3_nums = re.compile(r'(\d+)\s*[xх×*]\s*(\d+)\s*[xх×*]\s*(\d+[.,]?\d*)', re.I)
        self.re_2_nums = re.compile(r'(\d+)\s*[xх×*]\s*(\d+[.,]?\d*)', re.I)
        self.re_1_num = re.compile(r'(\d+)', re.I)

    def parse(self, file_path):
        """Главная функция парсинга - определяет формат и вызывает нужный парсер"""
        if file_path.endswith('.xlsx') or file_path.endswith('.xls'):
            return self._parse_excel(file_path)
        else:
            return self._parse_pdf(file_path)

    def _parse_excel(self, file_path):
        """Парсинг Excel файлов"""
        wb = openpyxl.load_workbook(file_path, data_only=True)
        sheet = wb.active
        rows = list(sheet.iter_rows(values_only=True))
        return self._process_table_data(rows)

    def _parse_pdf(self, file_path):
        """Парсинг PDF - извлекает таблицы"""
        all_rows = []
        
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                # Извлекаем таблицы из PDF
                tables = page.extract_tables()
                
                if tables:
                    # Если нашли таблицы - обрабатываем их
                    for table in tables:
                        for row in table:
                            clean_row = [str(cell).strip() if cell else "" for cell in row]
                            all_rows.append(clean_row)
                else:
                    # Если таблиц нет - пытаемся парсить как текст
                    text = page.extract_text()
                    if text:
                        for line in text.split('\n'):
                            # Разбиваем по пробелам/табам
                            parts = re.split(r'\s{2,}|\t', line.strip())
                            if len(parts) >= 3:
                                all_rows.append(parts)
        
        return self._process_table_data(all_rows)

    def _process_table_data(self, rows):
        """Единая обработка табличных данных (из PDF или Excel)"""
        data = {
            'sheets': [], 
            'rect_tubes': {}, 
            'square_tubes': {}, 
            'es_pipes': {}, 
            'angles': {}, 
            'rounds': {}
        }
        
        # Автоопределение колонок
        col_indices = self._detect_columns(rows)
        
        if not col_indices:
            # Если не смогли определить колонки - используем дефолт для Tekla
            col_indices = {'qty': 2, 'profile': 3, 'length': 4}
        
        # Обрабатываем строки данных
        start_row = col_indices.get('header_row', 0) + 1
        
        for row in rows[start_row:]:
            if not row or len(row) < max(col_indices.values()):
                continue
            
            try:
                # Извлекаем данные
                qty = self._extract_number(row[col_indices['qty']])
                profile_text = str(row[col_indices['profile']]).strip()
                length = self._extract_number(row[col_indices['length']])
                
                if not profile_text or qty <= 0 or length <= 0:
                    continue
                
                # Классифицируем и добавляем
                self._classify_and_add(profile_text, length, qty, data)
                
            except (IndexError, ValueError, TypeError):
                continue
        
        return data

    def _detect_columns(self, rows):
        """Автоматическое определение колонок в таблице"""
        for idx, row in enumerate(rows[:20]):  # Ищем в первых 20 строках
            row_str = ' '.join([str(cell).lower() for cell in row if cell])
            
            # Ищем заголовок таблицы
            if any(word in row_str for word in ['наименование', 'профиль', 'сечение', 'примечание']):
                result = {'header_row': idx}
                
                for col_idx, cell in enumerate(row):
                    cell_lower = str(cell).lower()
                    
                    # Колонка с профилем/сечением
                    if any(word in cell_lower for word in ['профиль', 'сечение', 'наименование', 'примечание']):
                        result['profile'] = col_idx
                    
                    # Колонка с длиной
                    elif any(word in cell_lower for word in ['длина', 'l=', 'мм']):
                        if 'length' not in result:
                            result['length'] = col_idx
                    
                    # Колонка с количеством
                    elif any(word in cell_lower for word in ['кол', 'шт', 'количество']):
                        if 'qty' not in result:
                            result['qty'] = col_idx
                
                # Проверяем, что нашли все нужные колонки
                if all(key in result for key in ['qty', 'profile', 'length']):
                    return result
        
        return None

    def _extract_number(self, value):
        """Извлекает число из строки"""
        if value is None:
            return 0
        
        value_str = str(value).replace(',', '.').replace(' ', '').strip()
        
        # Ищем все числа в строке
        numbers = re.findall(r'\d+\.?\d*', value_str)
        
        if numbers:
            return float(numbers[0])
        
        return 0

    def _classify_and_add(self, profile_text, length, qty, data):
        """Классифицирует профиль и добавляет в нужную категорию"""
        
        profile_upper = profile_text.upper()
        profile_clean = profile_text.replace('х', 'x').replace('Х', 'x').replace('*', 'x')
        
        # 1. ТРУБА ПП (прямоугольная)
        if 'ПП' in profile_upper or ('ТРУБА' in profile_upper and self.re_3_nums.search(profile_clean)):
            m = self.re_3_nums.search(profile_clean)
            if m:
                name = f"Труба ПП {m.group(1)}x{m.group(2)}x{m.group(3).replace(',', '.')}"
                self._add_item(data['rect_tubes'], name, length, qty)
                return
        
        # 2. ТРУБА ПК (квадратная)
        if 'ПК' in profile_upper:
            m = self.re_3_nums.search(profile_clean)
            if m:
                name = f"Труба ПК {m.group(1)}x{m.group(2)}x{m.group(3).replace(',', '.')}"
            else:
                m = self.re_2_nums.search(profile_clean)
                if m:
                    name = f"Труба ПК {m.group(1)}x{m.group(1)}x{m.group(2).replace(',', '.')}"
            if m:
                self._add_item(data['square_tubes'], name, length, qty)
                return
        
        # 3. ТРУБА Э/С (круглая электросварная)
        is_es_pipe = (
            ('ТРУБА' in profile_upper and 'ПП' not in profile_upper and 'ПК' not in profile_upper) or
            'Ø' in profile_text or
            ('ГОСТ Р 58064' in profile_text) or
            ('159X4' in profile_upper.replace(' ', ''))
        )
        
        if is_es_pipe:
            m = self.re_2_nums.search(profile_clean)
            if m:
                name = f"Труба Э/С Ø{m.group(1)}x{m.group(2).replace(',', '.')}"
                self._add_item(data['es_pipes'], name, length, qty)
                return
        
        # 4. УГОЛОК
        if 'УГОЛОК' in profile_upper or profile_text.startswith('L'):
            m = self.re_3_nums.search(profile_clean)
            if m:
                name = f"Уголок {m.group(1)}x{m.group(2)}x{m.group(3)}"
            else:
                m = self.re_2_nums.search(profile_clean)
                if m:
                    name = f"Уголок {m.group(1)}x{m.group(1)}x{m.group(2)}"
            
            if m:
                self._add_item(data['angles'], name, length, qty)
                return
        
        # 5. ЛИСТ
        if 'ЛИСТ' in profile_upper or profile_text.startswith('-'):
            m = self.re_2_nums.search(profile_clean)
            if m:
                thickness = float(m.group(1))
                width = float(m.group(2))
                data['sheets'].append({
                    'qty': int(qty),
                    'thickness': thickness,
                    'width': width,
                    'length': length
                })
                return
        
        # 6. КРУГ (пруток)
        if 'КРУГ' in profile_upper or ('Ø' in profile_text and 'X' not in profile_upper):
            m = self.re_1_num.search(profile_clean)
            if m:
                diameter = m.group(1)
                name = f"Круг Ø{diameter}"
                self._add_item(data['rounds'], name, length, qty)
                return

    def _add_item(self, storage, name, length, qty):
        """Добавляет элемент в хранилище"""
        if name not in storage:
            storage[name] = []
        storage[name].append({'length': length, 'qty': int(qty)})