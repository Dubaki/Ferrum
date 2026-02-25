import { useState } from "react";

// ═══════════════════════════════════════════
// ПЛАН ИНТЕГРАЦИИ ПЛАНИРОВЩИКА В ФЕРРУМ
// Интерактивная карта: что менять, где, зачем
// ═══════════════════════════════════════════

const phases = [
  {
    id: "p1",
    num: "01",
    title: "Производственные участки",
    subtitle: "Новая коллекция shopResources",
    effort: "2-3 часа",
    color: "#58a6ff",
    why: "Сейчас resources — это сотрудники (Иванов, Петров). Но планировщику нужны УЧАСТКИ (пила, плазма, сварочный пост №1). Это разные сущности.",
    what: [
      {
        file: "🆕 src/hooks/useShopResources.js",
        action: "Создать",
        desc: "Хук для коллекции 'shopResources' в Firebase. CRUD для участков. Структура: { id, name, stage, hoursPerDay, isLarge, workerCount }",
      },
      {
        file: "🆕 src/utils/shopResourcesConfig.js",
        action: "Создать",
        desc: "Дефолтная конфигурация ваших 8 ресурсов (пила, плазма, 4 сварки, слесари, покраска). Инициализация при первом запуске.",
      },
      {
        file: "📝 src/utils/constants.js",
        action: "Расширить",
        desc: "Добавить SHOP_STAGES (cutting_profile, cutting_sheet, weld_assembly, fitting, painting) и маппинг операций на участки",
      },
      {
        file: "📝 src/types/index.ts",
        action: "Расширить",
        desc: "Добавить типы: ShopResource, SizeCategory, ScheduledOperation",
      },
    ],
    result: "Firebase коллекция shopResources с 8 записями. Админ может менять мощности.",
  },
  {
    id: "p2",
    num: "02",
    title: "Нормы и техмаршруты",
    subtitle: "Автогенерация операций из изделий",
    effort: "3-4 часа",
    color: "#d29922",
    why: "Сейчас операции добавляются ВРУЧНУЮ в каждое изделие. Для планировщика нужен автоматический расчёт: тип изделия + масса + габариты → цепочка операций с нормо-часами.",
    what: [
      {
        file: "🆕 src/utils/norms.js",
        action: "Создать",
        desc: "Справочник норм трудоёмкости (ч/т по операциям и сложности). 4 категории габаритов (small/medium/large/xlarge). Коэффициенты: кран ×1.4, перемещение 5-50%, сушка 2-8ч.",
      },
      {
        file: "🆕 src/utils/routeGenerator.js",
        action: "Создать",
        desc: "Функция generateRoute(product): по типу/массе/габаритам создаёт массив операций [{stage, hours, needsLargePost, dryingHours}]. Автоматический техмаршрут.",
      },
      {
        file: "📝 src/types/index.ts",
        action: "Расширить",
        desc: "Добавить поля в Product: weight_kg, sizeCategory, complexity. Добавить в Operation: shopStage, shopResourceId.",
      },
      {
        file: "📝 src/components/planning/AddProductModal.jsx",
        action: "Расширить",
        desc: "Добавить поля: масса, габариты, сложность. При добавлении — автоматически генерировать операции через routeGenerator.",
      },
    ],
    result: "Добавляете изделие → операции генерируются автоматически с нормами. Можно корректировать вручную.",
  },
  {
    id: "p3",
    num: "03",
    title: "Алгоритм планирования",
    subtitle: "Ядро: назначение операций на участки",
    effort: "4-5 часов",
    color: "#f85149",
    why: "Это МОЗГ планировщика. Берёт все операции из всех заказов, сортирует по приоритету/дедлайну, и назначает на участки с учётом мощностей, габаритов, зависимостей.",
    what: [
      {
        file: "🆕 src/utils/scheduler.js",
        action: "Создать",
        desc: "Основной алгоритм: sortOps() → assignToResources() → resolveConflicts(). Учитывает: приоритет, дедлайн, крупногабаритные посты, сушку, выходные. Возвращает план + загрузку по дням.",
      },
      {
        file: "🆕 src/hooks/useScheduler.js",
        action: "Создать",
        desc: "React-хук: принимает orders+products+shopResources → возвращает { schedule, loadMap, bottlenecks, alerts }. Пересчитывается при изменении данных.",
      },
      {
        file: "📝 src/hooks/useProductionData.js",
        action: "Расширить",
        desc: "Подключить useShopResources. Передать shopResources через actions. (минимальные изменения, ~10 строк)",
      },
    ],
    result: "Алгоритм: любое изменение заказа → мгновенный перерасчёт всего плана. Видно конфликты и узкие места.",
  },
  {
    id: "p4",
    num: "04",
    title: "UI: Вкладка «Планировщик»",
    subtitle: "Тепловая карта + Анализ + Что-если",
    effort: "5-6 часов",
    color: "#bc8cff",
    why: "Визуальный интерфейс — то, что вы видите каждый день. Тепловая карта загрузки, анализ узких мест, симулятор нового заказа.",
    what: [
      {
        file: "🆕 src/components/scheduler/SchedulerTab.jsx",
        action: "Создать",
        desc: "Главная вкладка: 3 подраздела (переключение табами). Стиль как в остальном ФЕРРУМ — slate/orange, Tailwind.",
      },
      {
        file: "🆕 src/components/scheduler/HeatmapView.jsx",
        action: "Создать",
        desc: "Тепловая карта: ресурсы × дни → % загрузки. Цвета: зелёный→жёлтый→красный. Тултипы с деталями.",
      },
      {
        file: "🆕 src/components/scheduler/BottleneckView.jsx",
        action: "Создать",
        desc: "Анализ узких мест: рейтинг ресурсов по загрузке, алерты, рекомендации.",
      },
      {
        file: "🆕 src/components/scheduler/WhatIfPanel.jsx",
        action: "Создать",
        desc: "Симулятор: ввод параметров нового заказа → мгновенный расчёт → показ влияния на текущие проекты.",
      },
      {
        file: "📝 src/components/Header.jsx",
        action: "Расширить",
        desc: "Добавить вкладку «Планировщик» в навигацию (между Гант и Финансы). Иконка: Target из lucide.",
      },
      {
        file: "📝 src/App.jsx",
        action: "Расширить",
        desc: "Добавить Route /scheduler → SchedulerTab. Передать shopResources и scheduler данные.",
      },
    ],
    result: "Новая вкладка в ФЕРРУМ. Открываете — видите загрузку всего цеха. Можете моделировать новые заказы.",
  },
  {
    id: "p5",
    num: "05",
    title: "Связка с существующим Гантт",
    subtitle: "Обогащение текущего графика",
    effort: "2-3 часа",
    color: "#3fb950",
    why: "У вас уже есть Гантт, но он не знает про участки. Добавим визуализацию: на каком посту что делается, и подсветку конфликтов.",
    what: [
      {
        file: "📝 src/hooks/useGanttData.js",
        action: "Расширить",
        desc: "Добавить в каждый ganttRow: shopResourceId, shopResourceName, isOverloaded. Данные берутся из scheduler.",
      },
      {
        file: "📝 src/components/gantt/GanttChart.jsx",
        action: "Расширить",
        desc: "Цветовая маркировка полосок по участку (пила=синий, сварка=оранжевый, покраска=красный). Подсветка конфликтов.",
      },
    ],
    result: "Существующий Гантт обогащается данными планировщика. Видно, какой пост занят чем.",
  },
];

const summary = {
  newFiles: 9,
  modifiedFiles: 8,
  totalFiles: 17,
  totalHours: "16-21 час",
  dbChanges: "1 новая коллекция (shopResources), расширение Product",
  noBreaking: "Все существующие функции продолжают работать",
};

const dataFlow = [
  { from: "Firebase: orders", arrow: "→", to: "Заказы с дедлайнами и приоритетами" },
  { from: "Firebase: products", arrow: "→", to: "Изделия с массой, габаритами, сложностью" },
  { from: "routeGenerator.js", arrow: "→", to: "Автоматические операции с нормо-часами" },
  { from: "Firebase: shopResources", arrow: "→", to: "Участки с мощностями (8ч/день, isLarge)" },
  { from: "scheduler.js", arrow: "→", to: "План: операция → участок → день → часы" },
  { from: "SchedulerTab.jsx", arrow: "→", to: "Тепловая карта + Узкие места + Что-если" },
];

function PhaseCard({ phase, isExpanded, onToggle }) {
  return (
    <div
      className="border rounded-xl overflow-hidden transition-all"
      style={{ borderColor: isExpanded ? phase.color + "88" : "#e2e8f0" }}
    >
      <div
        onClick={onToggle}
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-black text-sm"
            style={{ background: phase.color }}
          >
            {phase.num}
          </div>
          <div>
            <div className="font-bold text-slate-800 text-sm">{phase.title}</div>
            <div className="text-xs text-slate-500">{phase.subtitle}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold px-2 py-1 rounded-md bg-slate-100 text-slate-600">
            {phase.effort}
          </span>
          <span
            className="text-lg transition-transform"
            style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0)" }}
          >
            ▾
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-100">
          <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
            <div className="text-xs font-bold text-amber-700 mb-1">ЗАЧЕМ:</div>
            <div className="text-xs text-amber-900 leading-relaxed">{phase.why}</div>
          </div>

          <div className="p-4 space-y-2">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Файлы:
            </div>
            {phase.what.map((item, i) => (
              <div
                key={i}
                className="flex gap-3 p-2 rounded-lg text-xs"
                style={{ background: i % 2 === 0 ? "#f8fafc" : "transparent" }}
              >
                <div className="flex-shrink-0 w-48">
                  <code
                    className="font-mono text-xs font-semibold"
                    style={{
                      color: item.action === "Создать" ? "#16a34a" : "#d97706",
                    }}
                  >
                    {item.file}
                  </code>
                </div>
                <div className="text-slate-600 leading-relaxed">{item.desc}</div>
              </div>
            ))}
          </div>

          <div
            className="px-4 py-3 border-t"
            style={{ background: phase.color + "11", borderColor: phase.color + "33" }}
          >
            <div className="text-xs">
              <span className="font-bold" style={{ color: phase.color }}>
                Результат:
              </span>{" "}
              <span className="text-slate-700">{phase.result}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [expanded, setExpanded] = useState("p1");

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-xs font-black tracking-widest text-orange-500 mb-1">
            ФЕРРУМ × AI ПЛАНИРОВЩИК
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">
            План интеграции
          </h1>
          <p className="text-sm text-slate-500">
            5 фаз • {summary.totalFiles} файлов • {summary.totalHours} работы
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[
            { label: "Новых файлов", value: summary.newFiles, color: "#16a34a" },
            { label: "Изменённых", value: summary.modifiedFiles, color: "#d97706" },
            { label: "Трудоёмкость", value: summary.totalHours, color: "#58a6ff" },
            { label: "Breaking changes", value: "0", color: "#3fb950" },
          ].map((s, i) => (
            <div key={i} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">
                {s.label}
              </div>
              <div className="text-lg font-black" style={{ color: s.color }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Data flow */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-6">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            Поток данных (новое):
          </div>
          <div className="space-y-1.5">
            {dataFlow.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <code className="font-mono font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                  {d.from}
                </code>
                <span className="text-slate-300 font-bold">{d.arrow}</span>
                <span className="text-slate-600">{d.to}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Architecture note */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
          <div className="text-xs font-bold text-emerald-700 mb-2">
            ✅ СОВМЕСТИМОСТЬ
          </div>
          <div className="text-xs text-emerald-800 leading-relaxed space-y-1">
            <p>
              <strong>Нет ломающих изменений.</strong> Все текущие заказы, изделия,
              операции, Гантт, снабжение, отгрузки — продолжают работать как раньше.
            </p>
            <p>
              Планировщик <strong>читает</strong> существующие данные и{" "}
              <strong>добавляет</strong> слой расчётов поверх.
              Новые поля (weight_kg, sizeCategory) — опциональны. Изделия без них
              будут планироваться по estimatedHours (как сейчас).
            </p>
          </div>
        </div>

        {/* Phases */}
        <div className="space-y-2 mb-8">
          {phases.map((phase) => (
            <PhaseCard
              key={phase.id}
              phase={phase}
              isExpanded={expanded === phase.id}
              onToggle={() =>
                setExpanded(expanded === phase.id ? null : phase.id)
              }
            />
          ))}
        </div>

        {/* Recommended order */}
        <div className="bg-slate-900 text-white rounded-xl p-5">
          <div className="text-xs font-black tracking-wider text-orange-400 mb-3">
            РЕКОМЕНДУЕМЫЙ ПОРЯДОК
          </div>
          <div className="space-y-3">
            {[
              {
                step: "1",
                text: "Фаза 01 + 02 вместе",
                detail: "Участки + нормы. После этого можно вручную проверить: создал изделие → операции сгенерировались с часами.",
              },
              {
                step: "2",
                text: "Фаза 03 — алгоритм",
                detail: "Ядро планировщика. Тестируем на ваших реальных 5 заказах. Проверяем: нормы адекватные? Сроки совпадают с реальностью?",
              },
              {
                step: "3",
                text: "Фаза 04 — UI",
                detail: "Вкладка «Планировщик». Тепловая карта + «Что если». Вы начинаете использовать каждый день.",
              },
              {
                step: "4",
                text: "Фаза 05 — связка",
                detail: "Обогащение Гантта. Делаем когда основной планировщик уже обкатан и нормы откалиброваны.",
              },
            ].map((s, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-xs font-black flex-shrink-0">
                  {s.step}
                </div>
                <div>
                  <div className="font-bold text-sm">{s.text}</div>
                  <div className="text-xs text-slate-400 leading-relaxed mt-0.5">
                    {s.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-700 text-center">
            <div className="text-xs text-slate-400">
              Начинаем с Фазы 01+02? Или есть вопросы по плану?
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
