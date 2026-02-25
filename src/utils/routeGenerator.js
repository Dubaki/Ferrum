import { NORMS, SIZE_PARAMS, roundHours } from './norms';

// ─────────────────────────────────────────────────────────────
// ГЕНЕРАТОР ТЕХМАРШРУТА
// Вход:  ShopMark (марка из КМД)
// Выход: массив GeneratedOperation (операции с нормо-часами)
//
// Маршрут: Резка → Сборка+Сварка → Зачистка → Покраска
// Резка профиля и резка листа идут ПАРАЛЛЕЛЬНО (разные ресурсы)
// ─────────────────────────────────────────────────────────────

/**
 * Сгенерировать технологический маршрут для марки
 *
 * @param {Object} mark
 * @param {string}  mark.id
 * @param {number}  mark.weight_kg          - масса одной марки, кг
 * @param {number}  mark.quantity            - количество одинаковых марок
 * @param {'simple'|'medium'|'complex'} mark.complexity
 * @param {'small'|'medium'|'large'|'xlarge'} mark.sizeCategory
 * @param {boolean} mark.hasProfileCut       - есть профильные элементы (пила)
 * @param {boolean} mark.hasSheetCut         - есть листовые элементы (плазма)
 * @param {boolean} mark.needsCrane          - деталь > 50 кг → кран → ×1.4
 * @param {boolean} [mark.needsRolling]      - тело из листа → вальцовка перед сваркой
 * @param {number}  [mark.sheetThicknessMm]  - толщина листа (если известна)
 *
 * @returns {GeneratedOperation[]}
 */
export function generateRoute(mark) {
  const {
    id,
    weight_kg = 0,
    quantity = 1,
    complexity = 'medium',
    sizeCategory = 'medium',
    hasProfileCut = true,
    hasSheetCut = false,
    needsCrane: crane = false,
    needsRolling = false,
    sheetThicknessMm = 8,
  } = mark;

  const ops = [];
  const s = SIZE_PARAMS[sizeCategory] || SIZE_PARAMS.medium;
  const cx = complexity;

  // Тоннаж ОДНОЙ марки (нормы считаются на марку, не на всю партию)
  const t = weight_kg / 1000;
  if (t <= 0) return ops;

  let seq = 1;

  // ── 1. РЕЗКА ПРОФИЛЯ (пила) ──────────────────────────────
  if (hasProfileCut) {
    const craneCoeff = crane ? NORMS.craneCoeff : 1.0;
    const hours = roundHours(NORMS.cut_profile * t * craneCoeff);
    ops.push({
      id: `${id}_cut_profile`,
      markId: id,
      stage: 'cutting_profile',
      label: 'Резка профиля',
      sequence: seq,
      hours,
      needsLargePost: false,
      preferredResourceId: 'bandsaw',
      dependsOnStages: [],
    });
  }

  // ── 1. РЕЗКА ЛИСТА (плазма) — параллельно с профилем ─────
  if (hasSheetCut) {
    const sheetNorm = getSheetNorm(sheetThicknessMm);
    const hours = roundHours(sheetNorm * t);
    ops.push({
      id: `${id}_cut_sheet`,
      markId: id,
      stage: 'cutting_sheet',
      label: 'Резка листа',
      sequence: seq,           // тот же seq → параллельно с профилем
      hours,
      needsLargePost: false,
      preferredResourceId: 'plasma',
      dependsOnStages: [],
    });
  }

  seq = 2;

  // ── 2. ВАЛЬЦОВКА (если тело корпуса из листа) ────────────
  if (needsRolling) {
    const rollingHours = roundHours((NORMS.rolling || 4.0) * t);
    ops.push({
      id: `${id}_rolling`,
      markId: id,
      stage: 'rolling',
      label: 'Вальцовка',
      sequence: seq,
      hours: rollingHours,
      needsLargePost: false,
      preferredResourceId: 'rolling',
      dependsOnStages: ['cutting_sheet'],
    });
    seq = 3;
  }

  // ── 3. СБОРКА + СВАРКА ───────────────────────────────────
  const waHours = roundHours((NORMS.weld_assembly[cx] || 13) * t);
  ops.push({
    id: `${id}_weld_assembly`,
    markId: id,
    stage: 'weld_assembly',
    label: 'Сборка + Сварка',
    sequence: seq,
    hours: waHours,
    needsLargePost: s.largePost,
    preferredResourceId: s.largePost ? 'weld_lg1' : 'weld_st1',
    dependsOnStages: needsRolling
      ? ['rolling']
      : getCuttingStages(hasProfileCut, hasSheetCut),
  });

  seq = needsRolling ? 4 : 3;

  // ── ЗАЧИСТКА + ПЕРЕМЕЩЕНИЕ + УПАКОВКА (слесари) ──────────
  const cleanH  = (NORMS.fitting_clean[cx] || 1.5) * t;
  const moveH   = cleanH * s.moveCoeff;
  const packH   = (NORMS.fitting_pack[cx]  || 1.0) * t;
  const fittingHours = roundHours(cleanH + moveH + packH);

  ops.push({
    id: `${id}_fitting`,
    markId: id,
    stage: 'fitting',
    label: 'Зачистка + Перемещение + Упаковка',
    sequence: seq,
    hours: fittingHours,
    needsLargePost: false,
    preferredResourceId: 'fitters',
    dependsOnStages: ['weld_assembly'],
  });

  seq = needsRolling ? 5 : 4;

  // ── ПОКРАСКА + СУШКА ─────────────────────────────────────
  const paintH = roundHours((NORMS.paint[cx] || 2.5) * t);
  const dryH   = NORMS.drying; // всегда 2 ч

  ops.push({
    id: `${id}_painting`,
    markId: id,
    stage: 'painting',
    label: 'Покраска + Сушка',
    sequence: seq,
    hours: roundHours(paintH + dryH),
    paintHours: paintH,
    dryingHours: dryH,
    needsLargePost: false,
    preferredResourceId: 'paint',
    dependsOnStages: ['fitting'],
  });

  return ops;
}

// ─────────────────────────────────────────────────────────────
// Вычислить суммарные нормо-часы для всей партии марок
// (для отображения в карточке заказа / тепловой карте)
// ─────────────────────────────────────────────────────────────
export function calcTotalHours(mark) {
  const ops = generateRoute(mark);
  // Параллельные операции (seq=1) считаем как MAX, а не сумму
  const parallelSeqs = {};
  let total = 0;

  ops.forEach(op => {
    if (op.dependsOnStages.length === 0) {
      // Параллельная — берём максимум из группы
      if (!parallelSeqs[op.sequence] || op.hours > parallelSeqs[op.sequence]) {
        parallelSeqs[op.sequence] = op.hours;
      }
    } else {
      total += op.hours;
    }
  });

  Object.values(parallelSeqs).forEach(h => { total += h; });
  return roundHours(total * (mark.quantity || 1));
}

// ─── Внутренние хелперы ──────────────────────────────────────

function getSheetNorm(thicknessMm) {
  if (!thicknessMm || thicknessMm <= 5)  return NORMS.cut_sheet.thin;
  if (thicknessMm <= 12)                 return NORMS.cut_sheet.medium;
  return NORMS.cut_sheet.thick;
}

function getCuttingStages(hasProfile, hasSheet) {
  const stages = [];
  if (hasProfile) stages.push('cutting_profile');
  if (hasSheet)   stages.push('cutting_sheet');
  return stages;
}
