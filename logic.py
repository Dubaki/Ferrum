import re
import math
import pdfplumber

# --- КЛАСС РАСЧЕТА (КАЛЬКУЛЯТОР) ---
class MetalCalculator:
    def __init__(self):
        self.SHEET_LARGE_AREA = 9.0        # 1500x6000
        self.SHEET_SMALL_AREA = 3.125      # 1250x2500
        self.PROFILE_STD_LEN = 12000       # 12м
        self.PROFILE_SMALL_LEN = 6000      # 6м (для мелочи)

    def calculate_sheets(self, parts_data):
        """Считает листы и группирует их по толщине"""
        grouped = {}
        for part in parts_data:
            t = part['thickness']
            if t not in grouped:
                grouped[t] = {'parts': [], 'total_area': 0}
            area = (part['width'] * part['length'] * part['qty']) / 1_000_000
            grouped[t]['parts'].append(part)
            grouped[t]['total_area'] += area

        results = []
        for t, data in grouped.items():
            # Выбор стандарта (мелкие листы до 2мм считаем как 1250х2500)
            if 0.5 <= t <= 2:
                std_area, std_name = self.SHEET_SMALL_AREA, "1250x2500"
            else:
                std_area, std_name = self.SHEET_LARGE_AREA, "1500x6000"
            
            count = math.ceil(data['total_area'] / std_area)
            weight = (data['total_area'] * (t / 1000) * 7850) / 1000
            
            results.append({
                'name': f"Лист t={t}мм",
                'summary': f"{count} шт ({std_name})",
                'details': f"Деталей: {len(data['parts'])}, Вес: {round(weight, 3)}т, S={round(data['total_area'], 2)}м²"
            })
        return results

    def optimize_profile(self, name, parts_list):
        """Считает раскрой для любого погонажа"""
        # Логика длины хлыста
        stock_len = self.PROFILE_STD_LEN
        # Если труба мелкая (<30мм), то часто идет по 6м. Можно настроить.
        # Для простоты пока берем 12м для всего, кроме совсем мелочи
        if "15x15" in name or "20x20" in name:
             stock_len = self.PROFILE_SMALL_LEN

        # Разворачиваем список деталей в "плоский" массив
        all_pieces = []
        for p in parts_list:
            all_pieces.extend([p['length']] * p['qty'])
        
        # СОРТИРОВКА (Важно для раскроя)
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
            if not placed:
                whips.append({'remaining': stock_len - piece, 'parts': [piece]})

        total_m = (len(whips) * stock_len) / 1000
        rem_warehouse = sum(w['remaining'] for w in whips if w['remaining'] >= 1000)
        
        return {
            'name': name,
            'summary': f"{len(whips)} хлыстов (по {stock_len/1000}м)",
            'details': f"Всего {total_m}м. Полезный остаток: {rem_warehouse/1000}м",
            'whips_count': len(whips),
            'stock_len': stock_len
        }

# --- ПАРСЕР PDF (ОБНОВЛЕННЫЙ) ---
class SpecParser:
    def __init__(self):
        # Флаги для Regex: Ignore Case (I)
        
        # 1. ЛИСТЫ: "-3x50" или "—3х50" (Кол-во ... -Толщ х Шир ... Длина)
        self.re_sheet = re.compile(r'(\d+)\s+[-—]\s*(\d+)[xх](\d+)\s+(\d+)', re.I)
        
        # 2. УГОЛКИ: "L 50x5" (Кол-во ... L Стор х Стенка ... Длина)
        self.re_angle = re.compile(r'(\d+)\s+L\s?(\d+)[xх]?(\d*)[xх]?(\d*)\s+(\d+)', re.I)

        # 3. ПРЯМОУГОЛЬНАЯ ТРУБА: "60x40x3" (3 числа)
        self.re_rect = re.compile(r'(\d+)\s+(\d+)[xх](\d+)[xх](\d+[.,]?\d*)\s+(\d+)', re.I)

        # 4. КВАДРАТНАЯ ТРУБА: "20x2.0" (2 числа, без минуса впереди)
        self.re_square = re.compile(r'(\d+)\s+(\d+)[xх](\d+[.,]?\d*)\s+(\d+)', re.I)

        # 5. Э/С ТРУБА (КРУГЛАЯ): "Ø108x4" или "O108x4" (Диаметр х Стенка)
        self.re_pipe_round = re.compile(r'(\d+)\s+[ØOО0]\s?(\d+)[xх](\d+[.,]?\d*)\s+(\d+)', re.I)

        # 6. КРУГ (ПРУТОК): "Ø16" или "O16" (Просто диаметр, без "х")
        self.re_bar_round = re.compile(r'(\d+)\s+[ØOО0]\s?(\d+)\s+(\d+)', re.I)

    def parse(self, pdf_path):
        # Структура данных разделена по категориям
        data = {
            'sheets': [],         # Листы
            'rect_tubes': {},     # Прямоугольные
            'square_tubes': {},   # Квадратные
            'es_pipes': {},       # Э/С (Круглые трубы)
            'angles': {},         # Уголки
            'rounds': {}          # Круг (Пруток)
        }
        
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if not text: continue
                
                for line in text.split('\n'):
                    line = line.strip()
                    if not line or "Марка" in line or "Спецификация" in line: continue

                    # --- ПРОВЕРКИ (ПОРЯДОК ВАЖЕН!) ---

                    # 1. ЛИСТ
                    m = self.re_sheet.search(line)
                    if m:
                        data['sheets'].append({
                            'qty': int(m.group(1)), 'thickness': float(m.group(2)),
                            'width': float(m.group(3)), 'length': float(m.group(4))
                        })
                        continue

                    # 2. УГОЛОК
                    m = self.re_angle.search(line)
                    if m:
                        side = m.group(2)
                        thk = m.group(3) if m.group(3) else '?'
                        name = f"Уголок {side}x{thk}"
                        self._add(data['angles'], name, float(m.group(5)), int(m.group(1)))
                        continue

                    # 3. Э/С ТРУБА (КРУГЛАЯ ТРУБА) - Ищем значок диаметра + "х"
                    m = self.re_pipe_round.search(line)
                    if m:
                        name = f"Труба Э/С Ø{m.group(2)}x{m.group(3).replace(',','.')}"
                        self._add(data['es_pipes'], name, float(m.group(4)), int(m.group(1)))
                        continue

                    # 4. ПРЯМОУГОЛЬНАЯ ТРУБА (3 числа: 60x40x3)
                    m = self.re_rect.search(line)
                    if m:
                        name = f"Труба проф. {m.group(2)}x{m.group(3)}x{m.group(4).replace(',','.')}"
                        self._add(data['rect_tubes'], name, float(m.group(5)), int(m.group(1)))
                        continue

                    # 5. КВАДРАТНАЯ ТРУБА (2 числа: 20x2.0)
                    m = self.re_square.search(line)
                    if m:
                        s = m.group(2)
                        w = m.group(3).replace(',', '.')
                        name = f"Труба квадрат {s}x{s}x{w}"
                        self._add(data['square_tubes'], name, float(m.group(4)), int(m.group(1)))
                        continue

                    # 6. КРУГ (ПРУТОК) - Значок диаметра, но БЕЗ "х"
                    m = self.re_bar_round.search(line)
                    if m:
                        name = f"Круг Ø{m.group(2)}"
                        self._add(data['rounds'], name, float(m.group(3)), int(m.group(1)))
                        continue
                        
        return data

    def _add(self, category_dict, name, length, qty):
        if name not in category_dict:
            category_dict[name] = []
        category_dict[name].append({'length': length, 'qty': qty})