import { useState } from "react";

const COLORS = {
  bg: "#0a0e17",
  surface: "#111827",
  surfaceHover: "#1a2332",
  border: "#1e2d3d",
  accent: "#00d4aa",
  accentDim: "#00d4aa33",
  accentGlow: "#00d4aa22",
  warning: "#f59e0b",
  warningDim: "#f59e0b33",
  danger: "#ef4444",
  dangerDim: "#ef444433",
  blue: "#3b82f6",
  blueDim: "#3b82f633",
  purple: "#a855f7",
  purpleDim: "#a855f733",
  text: "#e2e8f0",
  textDim: "#94a3b8",
  textMuted: "#64748b",
};

const tabs = [
  { id: "model", label: "Модель данных", icon: "⚙️" },
  { id: "flow", label: "Как работает AI", icon: "🧠" },
  { id: "solve", label: "Решение 3 болей", icon: "🎯" },
  { id: "action", label: "План действий", icon: "🚀" },
];

// ─── DATA MODEL TAB ───
function DataModelTab() {
  const [expanded, setExpanded] = useState(null);
  
  const entities = [
    {
      id: "project",
      name: "Проект / Заказ",
      color: COLORS.accent,
      icon: "📋",
      desc: "Верхний уровень. Один договор = один проект",
      fields: [
        { name: "id", type: "string", required: true, desc: "Уникальный ID" },
        { name: "name", type: "string", required: true, desc: "\"Склад Магнит Екб\"" },
        { name: "customer", type: "string", required: true, desc: "Заказчик" },
        { name: "tonnage_total", type: "number", required: true, desc: "Общий тоннаж, т" },
        { name: "deadline", type: "date", required: true, desc: "Дата отгрузки по договору" },
        { name: "priority", type: "1-5", required: true, desc: "1=критичный, 5=может подождать" },
        { name: "status", type: "enum", required: true, desc: "new | in_progress | done | paused" },
        { name: "kmd_ready_pct", type: "0-100", required: false, desc: "% готовности КМД" },
        { name: "margin_pct", type: "number", required: false, desc: "Маржинальность %" },
      ],
      source: "Ручной ввод → уже есть в ФЕРРУМ"
    },
    {
      id: "mark",
      name: "Отправочная марка",
      color: COLORS.blue,
      icon: "🏗️",
      desc: "Единица планирования. Марка = сборочная единица",
      fields: [
        { name: "id", type: "string", required: true, desc: "Код марки (Б-01, К-05...)" },
        { name: "project_id", type: "ref", required: true, desc: "→ Проект" },
        { name: "type", type: "enum", required: true, desc: "beam | column | truss | brace | plate | other" },
        { name: "weight_kg", type: "number", required: true, desc: "Масса, кг" },
        { name: "detail_count", type: "number", required: true, desc: "Кол-во деталей в марке" },
        { name: "quantity", type: "number", required: true, desc: "Кол-во одинаковых марок" },
        { name: "complexity", type: "1-3", required: false, desc: "1=простая, 3=сложная" },
        { name: "paint_area_m2", type: "number", required: false, desc: "Площадь окраски, м²" },
      ],
      source: "Импорт из Tekla/Advance Steel/Excel"
    },
    {
      id: "operation",
      name: "Операция (техмаршрут)",
      color: COLORS.warning,
      icon: "🔧",
      desc: "Конкретная работа по марке на конкретном участке",
      fields: [
        { name: "id", type: "string", required: true, desc: "Авто-генерация" },
        { name: "mark_id", type: "ref", required: true, desc: "→ Марка" },
        { name: "stage", type: "enum", required: true, desc: "cutting | assembly | welding | cleaning | painting | shipping" },
        { name: "sequence", type: "number", required: true, desc: "Порядок (1,2,3...)" },
        { name: "norm_hours", type: "number", required: true, desc: "Нормо-часы на операцию" },
        { name: "depends_on", type: "ref[]", required: false, desc: "→ ID операций-предшественников" },
        { name: "assigned_station", type: "ref", required: false, desc: "→ Рабочий пост / участок" },
        { name: "status", type: "enum", required: true, desc: "pending | in_progress | done" },
        { name: "progress_pct", type: "0-100", required: false, desc: "Факт. прогресс" },
        { name: "actual_hours", type: "number", required: false, desc: "Фактические часы" },
      ],
      source: "AI генерирует автоматически по типу марки + нормам"
    },
    {
      id: "resource",
      name: "Ресурс (участок / пост)",
      color: COLORS.purple,
      icon: "👷",
      desc: "Производственная единица с конечной мощностью",
      fields: [
        { name: "id", type: "string", required: true, desc: "\"welding-post-1\"" },
        { name: "name", type: "string", required: true, desc: "\"Сварочный пост №1\"" },
        { name: "stage", type: "enum", required: true, desc: "Какую операцию выполняет" },
        { name: "capacity_hours_day", type: "number", required: true, desc: "Доступных часов в сутки" },
        { name: "workers_count", type: "number", required: true, desc: "Кол-во рабочих" },
        { name: "efficiency_coeff", type: "0.0-1.0", required: false, desc: "Коэфф. эффективности (факт/норма)" },
        { name: "is_available", type: "boolean", required: true, desc: "Доступен ли сейчас" },
      ],
      source: "Ручной ввод один раз, потом обновляется редко"
    },
    {
      id: "material",
      name: "Материалы (опционально)",
      color: COLORS.danger,
      icon: "🪨",
      desc: "Блокиратор: нет металла — нельзя начать резку",
      fields: [
        { name: "mark_id", type: "ref", required: true, desc: "→ Марка" },
        { name: "profile", type: "string", required: true, desc: "\"Двутавр 30Б1\", \"Лист 10мм\"" },
        { name: "required_kg", type: "number", required: true, desc: "Потребность, кг" },
        { name: "in_stock", type: "boolean", required: true, desc: "Есть на складе?" },
        { name: "delivery_date", type: "date", required: false, desc: "Когда приедет (если нет)" },
      ],
      source: "Импорт из спецификации стали + ручная правка"
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ 
        padding: "16px 20px", 
        background: COLORS.accentGlow, 
        borderLeft: `3px solid ${COLORS.accent}`,
        borderRadius: 8,
        fontSize: 14,
        color: COLORS.text,
        lineHeight: 1.6,
      }}>
        <strong>5 сущностей</strong> — это всё, что нужно AI для планирования. Проект → содержит Марки → каждая Марка порождает Операции → Операции выполняются на Ресурсах. Материалы — блокиратор старта.
      </div>
      
      {entities.map((e) => (
        <div 
          key={e.id}
          style={{
            background: COLORS.surface,
            border: `1px solid ${expanded === e.id ? e.color : COLORS.border}`,
            borderRadius: 12,
            overflow: "hidden",
            transition: "border-color 0.2s",
          }}
        >
          <div
            onClick={() => setExpanded(expanded === e.id ? null : e.id)}
            style={{
              padding: "14px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 22 }}>{e.icon}</span>
              <div>
                <div style={{ fontWeight: 700, color: e.color, fontSize: 15 }}>{e.name}</div>
                <div style={{ fontSize: 12, color: COLORS.textDim, marginTop: 2 }}>{e.desc}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 11, color: COLORS.textMuted, background: COLORS.surfaceHover, padding: "3px 8px", borderRadius: 4 }}>
                {e.fields.length} полей
              </span>
              <span style={{ color: COLORS.textDim, fontSize: 18, transform: expanded === e.id ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▾</span>
            </div>
          </div>
          
          {expanded === e.id && (
            <div style={{ borderTop: `1px solid ${COLORS.border}` }}>
              <div style={{ padding: "8px 20px", background: COLORS.surfaceHover, fontSize: 11, color: COLORS.textMuted }}>
                📥 Источник: {e.source}
              </div>
              <div style={{ padding: "4px 0" }}>
                {e.fields.map((f, i) => (
                  <div key={i} style={{
                    display: "grid",
                    gridTemplateColumns: "140px 80px 36px 1fr",
                    padding: "6px 20px",
                    fontSize: 13,
                    alignItems: "center",
                    background: i % 2 === 0 ? "transparent" : COLORS.surfaceHover,
                  }}>
                    <code style={{ color: COLORS.accent, fontFamily: "monospace", fontSize: 12 }}>{f.name}</code>
                    <span style={{ color: COLORS.textMuted, fontSize: 11 }}>{f.type}</span>
                    <span style={{ fontSize: 10 }}>{f.required ? "🔴" : "⚪"}</span>
                    <span style={{ color: COLORS.textDim }}>{f.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
      
      <div style={{ 
        padding: 16, 
        background: COLORS.surface, 
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        fontSize: 13,
        color: COLORS.textDim,
        lineHeight: 1.7,
      }}>
        <div style={{ color: COLORS.accent, fontWeight: 700, marginBottom: 8, fontSize: 14 }}>💡 Связи между сущностями</div>
        <div><code style={{ color: COLORS.accent }}>Проект</code> <span style={{ color: COLORS.textMuted }}>1 → N</span> <code style={{ color: COLORS.blue }}>Марки</code> <span style={{ color: COLORS.textMuted }}>1 → N</span> <code style={{ color: COLORS.warning }}>Операции</code></div>
        <div style={{ marginTop: 4 }}><code style={{ color: COLORS.warning }}>Операция</code> <span style={{ color: COLORS.textMuted }}>N → 1</span> <code style={{ color: COLORS.purple }}>Ресурс</code> <span style={{ color: COLORS.textDim }}>(назначается AI-планировщиком)</span></div>
        <div style={{ marginTop: 4 }}><code style={{ color: COLORS.blue }}>Марка</code> <span style={{ color: COLORS.textMuted }}>1 → N</span> <code style={{ color: COLORS.danger }}>Материалы</code> <span style={{ color: COLORS.textDim }}>(блокируют начало первой операции)</span></div>
      </div>
    </div>
  );
}

// ─── AI FLOW TAB ───
function AIFlowTab() {
  const steps = [
    {
      num: "01",
      title: "Загрузка данных",
      color: COLORS.blue,
      icon: "📥",
      desc: "Вы загружаете ведомость марок из Tekla/Excel или вводите вручную. AI парсит и создаёт объекты Марок.",
      detail: "AI автоматически определяет тип конструкции по названию и сортаменту, подтягивает нормы трудоёмкости из справочника.",
      input: "Excel/Tekla XML → список марок",
      output: "Марки + авто-заполненные операции",
    },
    {
      num: "02",
      title: "Генерация техмаршрута",
      color: COLORS.accent,
      icon: "🔄",
      desc: "AI автоматически создаёт цепочку операций для каждой марки на основе типа и сложности конструкции.",
      detail: "Балка → резка(2ч) → сборка(4ч) → сварка(6ч) → зачистка(1ч) → окраска(2ч). Ферма → другая цепочка. Вы можете скорректировать.",
      input: "Тип марки + масса + сложность",
      output: "Набор операций с нормо-часами и зависимостями",
    },
    {
      num: "03",
      title: "Оптимизация расписания",
      color: COLORS.warning,
      icon: "🧠",
      desc: "Ядро AI. Алгоритм распределяет операции по ресурсам с учётом приоритетов, дедлайнов и мощностей.",
      detail: "Используется constraint optimization: минимизировать просрочки → максимизировать загрузку → минимизировать переналадки. Учитывает зависимости между операциями и доступность материалов.",
      input: "Все операции + ресурсы + приоритеты + материалы",
      output: "Ганtt-график с назначениями по дням и постам",
    },
    {
      num: "04",
      title: "Симуляция \"Что если?\"",
      color: COLORS.purple,
      icon: "🔮",
      desc: "AI моделирует сценарии: \"Берём новый заказ на 50т — что сдвинется?\" или \"Заболели 2 сварщика — какие сроки?\"",
      detail: "Вы меняете параметр → AI за секунды пересчитывает весь план → показывает новые даты и конфликты красным.",
      input: "Текущий план + изменённый параметр",
      output: "Новый план + diff: что сдвинулось и на сколько",
    },
    {
      num: "05",
      title: "Мониторинг и коррекция",
      color: COLORS.danger,
      icon: "📊",
      desc: "Мастер отмечает факт (\"Б-01 сварка готова\"). AI обновляет план и сигналит о рисках.",
      detail: "Если факт отстаёт от плана на >20%, AI автоматически предлагает варианты: перебросить ресурс, сдвинуть менее приоритетный проект, добавить смену.",
      input: "Факт. прогресс от мастеров",
      output: "Обновлённый план + алерты + рекомендации AI",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: "flex", gap: 16, position: "relative" }}>
          <div style={{ 
            display: "flex", flexDirection: "column", alignItems: "center", width: 48, flexShrink: 0,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: `${s.color}22`, border: `2px solid ${s.color}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, zIndex: 1,
            }}>{s.icon}</div>
            {i < steps.length - 1 && (
              <div style={{ width: 2, flexGrow: 1, background: COLORS.border, marginTop: 4, marginBottom: 4 }} />
            )}
          </div>
          
          <div style={{
            flex: 1,
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ color: s.color, fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>{s.num}</span>
              <span style={{ color: COLORS.text, fontWeight: 700, fontSize: 15 }}>{s.title}</span>
            </div>
            <p style={{ margin: 0, color: COLORS.text, fontSize: 13, lineHeight: 1.6 }}>{s.desc}</p>
            <p style={{ margin: "8px 0 0", color: COLORS.textDim, fontSize: 12, lineHeight: 1.5, fontStyle: "italic" }}>{s.detail}</p>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: COLORS.blueDim, color: COLORS.blue }}>📥 {s.input}</span>
              <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: COLORS.accentDim, color: COLORS.accent }}>📤 {s.output}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── SOLVE PAINS TAB ───
function SolvePainsTab() {
  const pains = [
    {
      pain: "Не вижу реальную загрузку участков",
      icon: "👁️",
      color: COLORS.danger,
      why: "Потому что данные о текущих работах \"в головах\" мастеров. Нет единого экрана, показывающего: пост №3 загружен на 95%, а покрасочный — простаивает.",
      solution: "Дашборд загрузки в реальном времени",
      how: [
        "Каждый ресурс (участок/пост) имеет capacity_hours_day",
        "AI суммирует назначенные операции на каждый день",
        "Показывает тепловую карту: зелёный (< 70%) → жёлтый (70-90%) → красный (> 90%)",
        "Мастер отмечает факт → загрузка пересчитывается",
      ],
      data_needed: "Ресурсы (участки) + Операции с назначениями + Факт. прогресс",
      result: "Видите узкие места ДО того, как они станут проблемой",
    },
    {
      pain: "Трудно оценить — возьмём ли новый заказ в срок",
      icon: "🤔",
      color: COLORS.warning,
      why: "Невозможно в голове сложить: текущие 5 проектов + их дедлайны + загрузку + новый заказ. Обычно берёте на глаз — и потом жалеете.",
      solution: "Симулятор \"Что если\" (What-If)",
      how: [
        "Вводите параметры нового заказа: тоннаж, тип МК, желаемый срок",
        "AI генерирует операции по нормам, добавляет в текущий план",
        "За секунды показывает: \"Возьмёте, но проект Х сдвинется на 5 дней\" или \"Не успеете — нужны 2 доп. сварщика\"",
        "Можно играть с приоритетами: \"А если этот проект подвинуть?\"",
      ],
      data_needed: "Полный текущий план + нормы трудоёмкости + параметры нового заказа",
      result: "Принимаете решение о заказе за 5 минут, а не за 2 дня",
    },
    {
      pain: "Срываю сроки из-за зависимостей между проектами",
      icon: "🔗",
      color: COLORS.purple,
      why: "Проект А ждёт покраску, но покрасочная занята проектом Б. Проект В не может начать сборку — нет металла. Цепочка задержек невидима, пока не грохнет.",
      solution: "Граф зависимостей + раннее предупреждение",
      how: [
        "AI строит граф: операция → зависит от → операция (внутри проекта и между проектами через общие ресурсы)",
        "Находит критический путь для каждого проекта",
        "Если операция на критическом пути отстаёт — красный алерт СЕЙЧАС, а не когда дедлайн",
        "Предлагает решение: перебросить с менее критичного проекта, добавить смену",
      ],
      data_needed: "Операции с depends_on + статусы + назначения на ресурсы",
      result: "Видите цепочки задержек за 2-3 дня до срыва",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {pains.map((p, i) => (
        <div key={i} style={{
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 12,
          overflow: "hidden",
        }}>
          <div style={{ 
            padding: "14px 20px",
            background: `${p.color}11`,
            borderBottom: `1px solid ${COLORS.border}`,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ fontSize: 24 }}>{p.icon}</span>
            <div>
              <div style={{ fontWeight: 700, color: p.color, fontSize: 14 }}>БОЛЬ: {p.pain}</div>
              <div style={{ fontSize: 12, color: COLORS.textDim, marginTop: 2 }}>{p.why}</div>
            </div>
          </div>
          
          <div style={{ padding: "16px 20px" }}>
            <div style={{ 
              color: COLORS.accent, fontWeight: 700, fontSize: 14, marginBottom: 10,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              ✅ Решение: {p.solution}
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
              {p.how.map((h, j) => (
                <div key={j} style={{ 
                  display: "flex", gap: 8, fontSize: 13, color: COLORS.text, lineHeight: 1.5,
                }}>
                  <span style={{ color: COLORS.accent, flexShrink: 0 }}>→</span>
                  <span>{h}</span>
                </div>
              ))}
            </div>
            
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div style={{ 
                fontSize: 11, padding: "4px 10px", borderRadius: 6,
                background: COLORS.blueDim, color: COLORS.blue,
              }}>
                📊 Данные: {p.data_needed}
              </div>
              <div style={{ 
                fontSize: 11, padding: "4px 10px", borderRadius: 6,
                background: COLORS.accentDim, color: COLORS.accent, fontWeight: 600,
              }}>
                🎯 {p.result}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── ACTION PLAN TAB ───
function ActionPlanTab() {
  const weeks = [
    {
      week: "Неделя 1-2",
      title: "Фундамент данных",
      color: COLORS.blue,
      tasks: [
        "Добавить в ФЕРРУМ таблицу \"Ресурсы\" — перечислить все участки/посты с мощностями",
        "Настроить импорт марок из Tekla XML → автоматическая генерация операций",
        "Создать справочник норм: тип МК → набор операций с нормо-часами",
        "Заполнить данные по текущим 3-5 проектам",
      ],
    },
    {
      week: "Неделя 3-4",
      title: "Базовый планировщик",
      color: COLORS.accent,
      tasks: [
        "Написать алгоритм назначения операций на ресурсы (жадный алгоритм — достаточно для старта)",
        "Визуализация: Ганtt-график по участкам (можно через библиотеку frappe-gantt или dhtmlxGantt)",
        "Тепловая карта загрузки: таблица участков × дни → цвет по % загрузки",
        "Проверить на реальных данных своего цеха",
      ],
    },
    {
      week: "Неделя 5-6",
      title: "AI-модуль",
      color: COLORS.warning,
      tasks: [
        "Подключить Claude/GigaChat API для анализа: \"Что будет, если добавить заказ 50т к 15 марта?\"",
        "Реализовать What-If симулятор: клон текущего плана → добавить заказ → показать diff",
        "Добавить алерты: операция на критическом пути отстаёт — уведомление",
        "Ввод факта мастером: простая форма \"Марка — Операция — % готовности\"",
      ],
    },
    {
      week: "Неделя 7-8",
      title: "Обкатка и продукт",
      color: COLORS.purple,
      tasks: [
        "Месяц работы на реальных данных → сбор обратной связи",
        "Калибровка норм: сравнить план vs факт, скорректировать коэффициенты",
        "Показать 2-3 коллегам с других заводов → первые пилоты",
        "Если работает — оформлять как SaaS-продукт",
      ],
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ 
        padding: "14px 20px", 
        background: COLORS.warningDim, 
        borderLeft: `3px solid ${COLORS.warning}`,
        borderRadius: 8,
        fontSize: 13,
        color: COLORS.text,
        lineHeight: 1.6,
      }}>
        <strong>Ключевой инсайт:</strong> Вам НЕ нужно ничего нового создавать с нуля. ФЕРРУМ — уже 80% пути. Нужно добавить 3 вещи: таблицу ресурсов, автогенерацию операций, и алгоритм назначения. Всё остальное — UI поверх существующих данных.
      </div>
      
      {weeks.map((w, i) => (
        <div key={i} style={{
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 12,
          padding: "16px 20px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ 
              background: `${w.color}22`, color: w.color, fontWeight: 700,
              padding: "4px 10px", borderRadius: 6, fontSize: 12,
            }}>{w.week}</span>
            <span style={{ color: COLORS.text, fontWeight: 700, fontSize: 15 }}>{w.title}</span>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {w.tasks.map((t, j) => (
              <div key={j} style={{ 
                display: "flex", gap: 10, fontSize: 13, color: COLORS.text, lineHeight: 1.5,
                padding: "6px 10px",
                background: j % 2 === 0 ? COLORS.surfaceHover : "transparent",
                borderRadius: 6,
              }}>
                <span style={{ color: w.color, flexShrink: 0, fontWeight: 700 }}>□</span>
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      
      <div style={{ 
        padding: "16px 20px", 
        background: `${COLORS.accent}11`, 
        border: `1px solid ${COLORS.accent}44`,
        borderRadius: 12,
        fontSize: 14,
        color: COLORS.text,
        lineHeight: 1.7,
        textAlign: "center",
      }}>
        <div style={{ fontSize: 22, marginBottom: 8 }}>⚡</div>
        <strong style={{ color: COLORS.accent }}>Через 2 месяца</strong> вы перестанете планировать в голове. AI будет делать это за вас, а вы будете принимать решения на основе данных.
      </div>
    </div>
  );
}

// ─── MAIN APP ───
export default function App() {
  const [activeTab, setActiveTab] = useState("model");

  const tabContent = {
    model: <DataModelTab />,
    flow: <AIFlowTab />,
    solve: <SolvePainsTab />,
    action: <ActionPlanTab />,
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: COLORS.bg,
      color: COLORS.text,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 13, letterSpacing: 3, color: COLORS.accent, fontWeight: 600, marginBottom: 6 }}>
            ФЕРРУМ × AI
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: COLORS.text, lineHeight: 1.2 }}>
            Архитектура AI-планировщика
          </h1>
          <p style={{ margin: "8px 0 0", color: COLORS.textDim, fontSize: 14 }}>
            Данные → Модель → Решение ваших 3 болей
          </p>
        </div>
        
        <div style={{ 
          display: "flex", gap: 4, marginBottom: 24, 
          background: COLORS.surface, borderRadius: 12, padding: 4,
          border: `1px solid ${COLORS.border}`,
        }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                flex: 1,
                padding: "10px 8px",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: activeTab === t.id ? 700 : 500,
                background: activeTab === t.id ? COLORS.accentDim : "transparent",
                color: activeTab === t.id ? COLORS.accent : COLORS.textMuted,
                transition: "all 0.2s",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span style={{ fontSize: 16 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
        
        {tabContent[activeTab]}
      </div>
    </div>
  );
}
