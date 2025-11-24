import re
import math
import pdfplumber

# --- ЯДРО КАЛЬКУЛЯТОРА ---
class MetalCalculator:
    def __init__(self):
        self.SHEET_LARGE_AREA = 9.0        # 1500x6000
        self.SHEET_SMALL_AREA = 3.125      # 1250x2500
        self.PROFILE_STD_LEN = 12000
        self.PROFILE_SMALL_LEN = 6000

    def calculate_sheets(self, parts_data):
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
            # Выбор стандарта листа
            if 0.5 <= t <= 2:
                std_area, std_name = self.SHEET_SMALL_AREA, "1250x2500"
            else:
                std_area, std_name = self.SHEET_LARGE_AREA, "1500x6000"
            
            count = math.ceil(data['total_area'] / std_area)
            weight = (data['total_area'] * (t / 1000) * 7850) / 1000
            
            results.append({
                'type': 'SHEET',
                'name': f"Лист {t}мм",
                'summary': f"<b>{count} лист(ов)</b> ({std_name})",
                'details': f"S={round(data['total_area'], 2)}м², Вес={round(weight, 3)}т"
            })
        return results

    def optimize_profile(self, name, parts_list):
        # Определение длины хлыста
        stock_len = self.PROFILE_STD_LEN
        # Если труба мелкая (менее 20х20 или 30х30), считаем по 6м
        if any(x in name for x in ["15x15", "20x20", "20x2"]): 
             stock_len = self.PROFILE_SMALL_LEN

        # Разворачиваем список деталей
        all_pieces = []
        for p in parts_list:
            all_pieces.extend([p['length']] * p['qty'])
        
        # Сортировка (Критически важно!)
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

        # Анализ остатков
        total_m = (len(whips) * stock_len) / 1000
        rem_warehouse = sum(w['remaining'] for w in whips if w['remaining'] >= 1000)
        
        return {
            'type': 'PROFILE',
            'name': name,
            'summary': f"<b>{len(whips)} шт</b> по {stock_len/1000}м",
            'details': f"Всего {total_m}м. На склад: {rem_warehouse/1000}м"
        }

# --- ПАРСЕР PDF ---
class SpecParser:
    def __init__(self):
        # 1. Лист: "-3x50"
        self.re_sheet = re.compile(r'(\d+)\s+[-—]\s*(\d+)[xх](\d+)\s+(\d+)')
        # 2. Прямоугольник: "60x40x3"
        self.re_rect = re.compile(r'(\d+)\s+(\d+)[xх](\d+)[xх](\d+[.,]?\d*)\s+(\d+)')
        # 3. Квадрат: "20x2.0"
        self.re_sq = re.compile(r'(\d+)\s+(\d+)[xх](\d+[.,]?\d*)\s+(\d+)')
        # 4. Уголок: "L 50x5"
        self.re_angle = re.compile(r'(\d+)\s+L\s?(\d+)[xх]?(\d*)[xх]?(\d*)\s+(\d+)')

    def parse(self, pdf_path):
        data = {'sheets': [], 'profiles': {}}
        
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if not text: continue
                
                for line in text.split('\n'):
                    line = line.strip()
                    if not line or "Марка" in line: continue

                    # Поиск Листа
                    m = self.re_sheet.search(line)
                    if m:
                        data['sheets'].append({
                            'qty': int(m.group(1)), 'thickness': float(m.group(2)),
                            'width': float(m.group(3)), 'length': float(m.group(4))
                        })
                        continue

                    # Поиск Прямоугольной трубы
                    m = self.re_rect.search(line)
                    if m:
                        name = f"Труба {m.group(2)}x{m.group(3)}x{m.group(4).replace(',','.')}"
                        self._add_prof(data, name, float(m.group(5)), int(m.group(1)))
                        continue

                    # Поиск Квадратной трубы
                    m = self.re_sq.search(line)
                    if m:
                        s = m.group(2)
                        w = m.group(3).replace(',', '.')
                        name = f"Труба {s}x{s}x{w}"
                        self._add_prof(data, name, float(m.group(4)), int(m.group(1)))
                        continue

                    # Поиск Уголка
                    m = self.re_angle.search(line)
                    if m:
                        name = f"Уголок {m.group(2)}x{m.group(3) if m.group(3) else '?'}"
                        self._add_prof(data, name, float(m.group(5)), int(m.group(1)))
                        continue
                        
        return data

    def _add_prof(self, data, name, length, qty):
        if name not in data['profiles']: data['profiles'][name] = []
        data['profiles'][name].append({'length': length, 'qty': qty})