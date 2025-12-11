// src/utils/presets.js

// 1. ГАЗОВАЯ ПЕЧЬ
const GAS_FURNACE_OPS = [
    { name: 'Резка на лентопиле', minutes: 100 },
    { name: 'ЧПУ резка', minutes: 60 },
    { name: 'Сборка каркаса', minutes: 860 },
    { name: 'Зачистка каркаса', minutes: 240 },
    { name: 'Покраска каркаса', minutes: 180 },
    { name: 'Установка панелей', minutes: 960 },
    { name: 'Производство мест под горелку', minutes: 120 },
    { name: 'Производство газ коллектора', minutes: 120 },
    { name: 'Установка газовых горелок', minutes: 200 },
    { name: 'Установка Вент отверстий', minutes: 120 },
    { name: 'Клепание (уголки + герметик)', minutes: 240 },
    { name: 'Резка направляющих ЧПУ', minutes: 10 },
    { name: 'Покраска направляющих', minutes: 20 },
    { name: 'Производство замков', minutes: 60 },
    { name: 'Установка замков', minutes: 120 },
    { name: 'Установка направляющих', minutes: 240 },
    { name: 'Установка Шкафа управления', minutes: 480 },
    { name: 'Снятие плёнки', minutes: 300 },
    { name: 'Испытания + фото', minutes: 30 },
    { name: 'Чек лист + упаковка', minutes: 30 },
];

// 2. ЭЛЕКТРО ПЕЧЬ
const ELECTRIC_FURNACE_OPS = [
    { name: 'Резка на лентопиле', minutes: 100 },
    { name: 'ЧПУ резка', minutes: 60 },
    { name: 'Сборка каркаса', minutes: 860 },
    { name: 'Зачистка', minutes: 240 },
    { name: 'Покраска', minutes: 180 },
    { name: 'Установка панелей', minutes: 960 },
    { name: 'Установка Вент отверстий', minutes: 120 },
    { name: 'Отверстия под вытяжку', minutes: 60 }, // Время не было указано, поставил 60 как базу
    { name: 'Клепание (уголки + герметик)', minutes: 240 },
    { name: 'Резка направляющих ЧПУ', minutes: 10 },
    { name: 'Покраска направляющих', minutes: 20 },
    { name: 'Производство замков', minutes: 60 },
    { name: 'Установка замков', minutes: 120 },
    { name: 'Установка ТЭНового узла (гермет.)', minutes: 960 },
    { name: 'Установка ТЭНов', minutes: 120 },
    { name: 'Установка направляющих', minutes: 240 },
    { name: 'Установка Шкафа управления', minutes: 480 },
    { name: 'Снятие плёнки', minutes: 300 },
    { name: 'Испытания + фото', minutes: 30 },
    { name: 'Чек лист + упаковка', minutes: 30 },
];

// 3. КАМЕРА НАПЫЛЕНИЯ
const BOOTH_OPS = [
    { name: 'Резка Лентопил', minutes: 100 },
    { name: 'Резка ЧПУ', minutes: 60 },
    { name: 'Сборка каркаса + обварка', minutes: 1440 },
    { name: 'Покраска', minutes: 360 },
    { name: 'Обшивка Поликорбанатом', minutes: 480 },
    { name: 'Упаковка', minutes: 180 },
];

// 4. ТРАНСПОРТНАЯ СИСТЕМА
const TRANSPORT_OPS = [
    { name: 'Резка лентопил', minutes: 100 },
    { name: 'Резка ЧПУ', minutes: 60 },
    { name: 'Сборка обварка', minutes: 480 },
    { name: 'Тестовая сборка', minutes: 480 },
    { name: 'Покраска', minutes: 300 },
    { name: 'Упаковка', minutes: 120 },
];

// ЭКСПОРТ КОНФИГУРАЦИЙ
export const PRESETS = {
    // Единичные изделия
    gas_furnace: {
        name: 'Печь (Газовая)',
        items: [{ name: 'Печь полимеризации (Газ)', ops: GAS_FURNACE_OPS }]
    },
    electric_furnace: {
        name: 'Печь (Электро)',
        items: [{ name: 'Печь полимеризации (Электро)', ops: ELECTRIC_FURNACE_OPS }]
    },
    booth: {
        name: 'Камера напыления',
        items: [{ name: 'Камера напыления', ops: BOOTH_OPS }]
    },
    transport: {
        name: 'Транспортная система',
        items: [{ name: 'Транспортная система', ops: TRANSPORT_OPS }]
    },

    // КОМПЛЕКТЫ (ЛИНИИ)
    line_gas: {
        name: 'Линия Полная (Газ)',
        items: [
            { name: 'Печь полимеризации (Газ)', ops: GAS_FURNACE_OPS },
            { name: 'Камера напыления', ops: BOOTH_OPS },
            { name: 'Транспортная система', ops: TRANSPORT_OPS }
        ]
    },
    line_electric: {
        name: 'Линия Полная (Электро)',
        items: [
            { name: 'Печь полимеризации (Электро)', ops: ELECTRIC_FURNACE_OPS },
            { name: 'Камера напыления', ops: BOOTH_OPS },
            { name: 'Транспортная система', ops: TRANSPORT_OPS }
        ]
    }
};