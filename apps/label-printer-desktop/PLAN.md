# План разработки Label Printer Desktop

Electron desktop приложение для печати этикеток "Честный знак".

## Правила ведения плана

> **ВАЖНО:** Этот файл должен быть ВСЕГДА актуальным!

1. **Новые фичи** — добавляй сразу при получении запроса от пользователя
2. **В процессе** — отмечай `[~]` перед началом работы над задачей
3. **Выполнено** — отмечай `[x]` сразу после завершения задачи
4. **Версия** — обновляй при каждом релизе (см. также CHANGELOG.md)
5. **Дата** — обновляй "Последнее обновление" при любых изменениях

### Статусы задач

- `[ ]` — не начато
- `[~]` — в процессе
- `[x]` — выполнено

---

## Текущий статус

- **Версия:** 0.5.5
- **Цель:** v1.0.0
- **Последнее обновление:** 2026-02-05

## Приоритеты

1. **Фаза 3** — стабилизация и тесты
2. **Ключевые фичи:**
   - Батч-печать (CSV/TXT + **PDF с DataMatrix**)
   - Экспорт в Excel
   - База товаров (GTIN) с CRUDL
   - TSX шаблоны этикеток (Satori + resvg)
   - Красивая статистика (MetricCard, Charts)
   - Settings с Tabs

---

## Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ IPC Handlers: printer, settings, scanner, products      ││
│  │ Services: PrinterService, ImageGeneratorService         ││
│  │ NEW: TemplateRendererService (Satori + resvg)           ││
│  └─────────────────────────────────────────────────────────┘│
└──────────────────────┬──────────────────────────────────────┘
                       │ IPC Bridge (preload.ts)
┌──────────────────────▼──────────────────────────────────────┐
│                   Renderer Process (Next.js)                 │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Pages: /, /settings, /history, /stats, /products, /batch││
│  │ Components: StatusBar, MetricCard, Charts               ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## Завершённые фазы

### Фаза 1: Стабилизация (частично ✅)

- [x] Вынести сервисы в `@letar/label-printer-core`
- [x] Настроить Electron IPC handlers
- [x] Реализовать preload скрипты
- [x] Симуляция сканера для разработки без оборудования
- [x] Выбор шаблона этикетки в настройках
- [ ] Стабильная работа с USB сканером _(требует оборудование)_
- [ ] Тестирование печати на реальном принтере TSC _(требует оборудование)_

### Фаза 2: Улучшения UI ✅

- [x] Тёмная тема
- [x] Анимации переходов
- [x] Улучшенные уведомления
- [x] Индикатор прогресса печати

---

## Фаза 3: Стабилизация и тесты → v0.5.0

### 3.0 Next.js Standalone Server ✅

**Проблема (была):** Next.js собирался как static export, API роуты не работали в production.

**Решение:** Next.js сервер внутри Electron на динамическом порту

```
┌─────────────────────────────────────────────────────────────┐
│                     Electron App                            │
├──────────────────────┬──────────────────────────────────────┤
│    Main Process      │    Next.js Server (localhost:PORT)   │
│                      │    ├── /api/model/* (ZenStack)       │
│    port-finder.ts    │    ├── /api/* (custom routes)        │
│    fork() сервера    │    └── Pages (SSR/RSC)               │
│                      │                                      │
│    BrowserWindow ────┼───► http://127.0.0.1:PORT            │
└──────────────────────┴──────────────────────────────────────┘
```

- [x] Создать `main/utils/port-finder.ts` — поиск свободного порта
- [x] Изменить `renderer/next.config.js` — `output: 'standalone'`
- [x] Изменить `main/background.ts` — запуск Next.js сервера через `fork()`
- [x] Обновить `electron-builder.yml` — включить standalone build
- [x] Настроить путь к SQLite БД для production (`DATABASE_URL`)
- [x] Создать `renderer/app/api/model/[...path]/route.ts` — ZenStack API
- [x] Обновить `renderer/lib/db.ts` — динамический DATABASE_URL
- [x] Заменить nextron на custom build (webpack + next build)
- [x] Создать `main/webpack.config.js` — сборка main процесса

**Файлы:** `port-finder.ts`, `background.ts`, `next.config.js`, `electron-builder.yml`, `webpack.config.js`, `project.json`

### 3.1 Рефакторинг архитектуры ✅

**Проблемы (были):**

- Типы `AppSettings`, `PrintResult`, `PrinterStatus` дублировались в 3 местах
- Функция `getResourcesPath()` дублировалась в 2 файлах
- `DEFAULT_SETTINGS` дублировались в handlers и renderer
- Захардкоженные конфиги с TODO комментариями
- Линтинг включал скомпилированные файлы `app/`

**Решения:**

- [x] Создать `shared/types.ts` — единый источник IPC типов
- [x] Создать `main/utils/paths.ts` — утилиты путей (`getResourcesPath`, `getTemplatesPath`, `getUserDataPath`)
- [x] Создать `main/services/settings.service.ts` — SettingsService с кэшированием
- [x] Обновить `main/preload.ts` — импорт из shared/types
- [x] Обновить `renderer/types/electron.d.ts` — реэкспорт из shared/types
- [x] Обновить IPC handlers — использовать SettingsService
- [x] Обновить `renderer/app/settings/page.tsx` — skeleton loading, без DEFAULT_SETTINGS
- [x] Исправить `project.json` — исключить `app/` из линтинга

**Структура после рефакторинга:**

```
apps/label-printer-desktop/
├── shared/
│   └── types.ts                 # Единые IPC типы
├── main/
│   ├── services/
│   │   └── settings.service.ts  # SettingsService (JSON storage)
│   ├── utils/
│   │   ├── paths.ts             # Утилиты путей
│   │   └── port-finder.ts       # Поиск свободного порта
│   └── ipc/
│       └── *.handlers.ts        # Используют SettingsService
└── renderer/
    └── types/electron.d.ts      # Реэкспорт из shared/types
```

**Примечание:** JSON storage оставлен как временное решение до реализации 3.0 (Next.js Standalone Server), после чего можно мигрировать на Prisma.

**Файлы:** `shared/types.ts`, `main/services/settings.service.ts`, `main/utils/paths.ts`, `project.json`

### 3.2 Валидация кодов ✅

- [x] Добавить `print:validate` IPC handler
- [x] Типы `ValidationResult`, `ParsedMarkingCode` в `shared/types.ts`
- [x] Показывать ошибки валидации в UI (цветная карточка с деталями)
- [x] Детали кода (GTIN-13, GTIN-14, serial, crypto) в интерфейсе

**Файлы:** `main/ipc/print.handlers.ts`, `shared/types.ts`, `renderer/app/home/page.tsx`

### 3.3 Unit тесты ✅

- [x] Настроить oxlint для `label-printer-core`
- [x] Настроить Vitest для `label-printer-core`
- [x] Тесты для GS1Parser (24 теста)
- [x] Тесты для IPC handlers (11 тестов: print, settings)
- [x] Target: 80% coverage (достигнуто 83.74% statements, 84.69% lines)

**Файлы:** `libs/label-printer-core/src/parsers/gs1-parser.spec.ts`, `libs/label-printer-core/vitest.config.ts`, `libs/label-printer-core/project.json`

### 3.4 Тестовая печать ✅

- [x] Реализовать `printer:test` handler с полной интеграцией
- [x] Кнопка в Settings (с loading состоянием и toast уведомлениями)

**Файлы:** `main/ipc/printer.handlers.ts`, `renderer/app/settings/page.tsx`

---

## Фаза 4: Расширенная функциональность → v0.6.0

### 4.1 TSPLNativeService — нативные команды

- [x] Enum LabelPrintMode (BITMAP, NATIVE) в schema.zmodel
- [x] Поле labelPrintMode в Settings
- [x] UI переключатель в Settings (RadioCard)
- [x] RAW TSPL печать через winspool.drv (см. "RAW TSPL печать через winspool.drv" выше)
- [ ] NATIVE режим (DMATRIX + BARCODE вместо BITMAP) — для штрихкодов нативно на принтере

**Примечание:** BITMAP режим теперь работает через RAW TSPL (winspool.drv) — это основной способ печати. NATIVE режим (нативные TSPL команды DMATRIX/BARCODE) доступен через `TSPLNativeService.generatePrintJobNative()`, но требует тестирования качества.

**Файлы:** `schema.zmodel`, `shared/types.ts`, `main/services/settings.service.ts`, `renderer/app/settings/page.tsx`

### 4.2 Батч-печать ✅

- [x] Новая страница `/batch`
- [x] Загрузка из CSV/TXT (drag & drop + file picker)
- [x] Очередь с прогрессом, пауза/отмена
- [x] Предпросмотр кодов с выбором (чекбоксы)
- [x] Статистика: всего, напечатано, ошибок, выбрано
- [x] Загрузка из PDF — парсинг DataMatrix (pdfjs-dist + @zxing/library)

**Файлы:** `renderer/app/batch/page.tsx`, `renderer/app/_components/sidebar.tsx`

### 4.3 Экспорт статистики ✅

- [x] Excel (xlsx) для истории
- [x] PDF для статистики
- [x] Выбор диапазона дат
- [x] Кнопки экспорта на страницах История и Статистика

**Файлы:** `main/ipc/export.handlers.ts`, `renderer/app/history/page.tsx`, `renderer/app/stats/page.tsx`

### 4.4 База товаров (GTIN) с CRUDL ✅

- [x] Новая модель `Product` в schema.zmodel
- [x] Новая страница `/products` — CRUD для товаров (Dialog формы, поиск, таблица)
- [x] Связь PrintJob → Product (по GTIN)
- [x] Навигация в Sidebar
- [x] При сканировании — автоматически находить товар по GTIN
- [x] Импорт товаров из CSV/Excel (drag-n-drop, xlsx/csv, превью, batch import)

**Файлы:** `schema.zmodel`, `renderer/app/products/page.tsx`, `renderer/app/_components/sidebar.tsx`

### 4.5 TSX шаблоны этикеток (Satori + resvg) ✅

**Проблема (была):** Шаблоны статичные PNG с захардкоженным текстом — не масштабируется!

**Решение:** TSX компоненты + рендеринг через Satori

- [x] Установить зависимости: `satori`, `@resvg/resvg-js` (в корневой package.json)
- [x] Создать типы шаблонов: `LabelData`, `ProductInfo`, `LabelDimensions`
- [x] Создать `TemplateRendererService` — рендеринг JSX → SVG → PNG
- [x] Создать TSX шаблон этикетки (RosstilLabelTemplate в template-renderer.service.ts):

```tsx
// libs/label-printer-core/src/templates/LabelTemplate.tsx
interface LabelProps {
  product: {
    name: string // "Галстук Детский"
    articleCode: string // "ГМ"
    composition: string // "100% полиэстер"
    color: string // "разноцветный"
  }
  dataMatrixBase64: string
  gtinBarcodeBase64: string
}

export function LabelTemplate({ product, dataMatrixBase64, gtinBarcodeBase64 }: LabelProps) {
  return (
    <div
      style={{
        width: 685,
        height: 461,
        background: 'white',
        fontFamily: 'Arial',
        position: 'relative',
        padding: 15,
      }}
    >
      {/* === ШАПКА === */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
        <img src={logoRosstilBase64} style={{ width: 70, height: 70 }} />
        <div>
          <div style={{ fontSize: 32, fontWeight: 'bold', letterSpacing: 2 }}>РОССТИЛЬ</div>
          <div style={{ fontSize: 14 }}>Сделано в России</div>
        </div>
      </div>

      {/* === ОСНОВНОЙ БЛОК === */}
      <div style={{ marginTop: 15 }}>
        <div style={{ fontSize: 22, fontWeight: 'bold' }}>{product.name}</div>
        <div style={{ fontSize: 16, marginTop: 8 }}>
          <div>
            <b>Артикул:</b> {product.articleCode}
          </div>
          <div>
            <b>Состав:</b> {product.composition}
          </div>
          <div>
            <b>Цвет:</b> {product.color}
          </div>
        </div>
        {/* Уход — символы */}
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
          <b style={{ fontSize: 16 }}>Уход:</b>
          <div style={{ display: 'flex', gap: 5, marginLeft: 10 }}>
            <img src={careWash40Base64} style={{ width: 24, height: 24 }} />
            <img src={careNobleachBase64} style={{ width: 24, height: 24 }} />
            <img src={careIronBase64} style={{ width: 24, height: 24 }} />
            <img src={careDrycleanBase64} style={{ width: 24, height: 24 }} />
            <img src={careDryBase64} style={{ width: 24, height: 24 }} />
          </div>
        </div>
      </div>

      {/* === ЗНАК ЕАС === */}
      <img src={eacBase64} style={{ position: 'absolute', left: 15, bottom: 60, width: 45 }} />

      {/* === ТЕХНИЧЕСКАЯ ИНФОРМАЦИЯ === */}
      <div style={{ position: 'absolute', bottom: 10, left: 15, fontSize: 10 }}>
        <div>ТР ТС 017/2011. ЕАЭС RU Д-RU.РА04.В.84763/24</div>
        <div>ИП Аксянова Е.Ю. ИНН 682701271521 rosstil.ru</div>
      </div>

      {/* === DATAMATRIX === */}
      <img src={dataMatrixBase64} style={{ position: 'absolute', right: 120, top: 160, width: 90 }} />

      {/* === GTIN БАРКОД (повёрнут -90°) === */}
      <img
        src={gtinBarcodeBase64}
        style={{
          position: 'absolute',
          right: 10,
          top: 10,
          width: 140,
          height: 440,
          transform: 'rotate(-90deg)',
          transformOrigin: 'center',
        }}
      />
    </div>
  )
}
```

- [x] Сервис рендеринга TSX → PNG (renderToSvg, renderToPng, renderToBase64)
- [x] Статичные ассеты в base64 (логотип РОССТИЛЬ, EAC, иконки ухода ISO 3758)

**Файлы:**

- `libs/label-printer-core/src/templates/template-renderer.service.ts` (шаблон + сервис)
- `libs/label-printer-core/src/templates/types.ts`

### 4.6 Несколько принтеров

- [x] Список принтеров в Settings (NativeSelect с автодетектом)
- [x] Быстрое переключение в StatusBar
- [x] Профили принтеров (CRUD, IPC handlers, UI вкладка в Settings)

**Файлы:** `schema.zmodel`, `main/ipc/printer.handlers.ts`

---

## Фаза 5: UI/UX улучшения → v0.7.0

### 5.1 Компоненты визуализации ✅

- [x] MetricCard (адаптирован из imot, с поддержкой тёмной темы)
- [x] ProgressCircle (UI компонент-обёртка)
- [x] MetricsChart — Recharts (переиспользуемый компонент с градиентом)
- [x] Empty States (AppEmptyState для History, Products)

### 5.2 Улучшенная Stats ✅

- [x] MetricCard вместо Stat
- [x] Иконки для каждой метрики
- [x] Цветовое кодирование метрик
- [x] График печати по дням (AreaChart)
- [x] Сравнение периодов

### 5.3 Settings с Tabs ✅

- [x] Вкладки: Принтер | Этикетка | Поведение | О приложении
- [x] Skeleton loading
- [x] Tooltips для секций
- [x] Сброс к умолчаниям (кнопка во вкладке Поведение)

### 5.4 Улучшенная History ✅

- [x] Фильтры по дате, статусу, GTIN
- [x] Поиск по серийному номеру
- [x] Пагинация
- [x] Bulk actions (выбор, удаление)

---

## Фаза 6: E2E и автообновление → v0.8.0

### 6.1 E2E тесты Playwright ✅

- [x] Настроить Playwright для Electron
- [x] Тесты: навигация, настройки, статистика, история

**Файлы:** `apps/label-printer-desktop-e2e/`

### 6.2 Error handling ✅

- [x] Глобальная обработка uncaughtException/unhandledRejection
- [x] Диалог ошибки для критических ошибок
- [x] Logger сервис для логирования
- [x] Retry с exponential backoff для ошибок печати

### 6.3 Автообновление ✅

- [x] electron-updater + GitHub Releases
- [x] UpdaterService с IPC handlers
- [x] Preload API для renderer
- [x] UI проверки обновлений в Settings (кнопка)

---

## Фаза 6.5: Оптимизация производительности → v0.5.1 ✅

### Bundle Size

- [x] Динамический импорт xlsx (~1.3 MB) в products/page.tsx
- [x] Динамический импорт Recharts (~500 KB) в stats/page.tsx — вынесен в отдельный компонент stats-chart.tsx с `next/dynamic`

### React Rendering

- [x] React.memo для MetricsChart
- [x] React.memo для StatsChart (новый компонент)
- [x] React.memo для PrintJobRow в history/page.tsx
- [x] React.memo для QueueItemRow в batch/page.tsx
- [x] React.memo для ProductRow в products/page.tsx

### ZenStack Queries

- [x] Добавлен `select` в хуки useFindManyProduct, useFindManyPrintJob, useFindManyTemplate

**Результат:**

- Уменьшение initial bundle на ~1.8 MB (xlsx + recharts загружаются только при использовании)
- Снижение ререндеров при скролле таблиц
- Возможность загружать только нужные поля из БД

**Файлы:** `products/page.tsx`, `stats/page.tsx`, `stats/_components/stats-chart.tsx`, `history/page.tsx`, `batch/page.tsx`, `_components/metrics-chart.tsx`, `lib/hooks.ts`

---

## Фаза 7: Продакшен → v1.0.0

- [x] Иконка приложения (placeholder — принтер с этикеткой)
- [x] Splash screen (gradient + анимация загрузки)
- [x] Документация (README обновлён)
- [x] FAQ (FAQ.md)
- [ ] CI/CD: GitHub Actions, code signing

---

## Баг-фиксы (текущие)

### Сборка Windows ✅

- [x] Webpack externals для нативных модулей (@resvg/resvg-js, canvas, pdfjs-dist)
- [x] Регенерация иконок приложения (PNG, ICO)
- [x] Исправление Logger — ленивая инициализация (getLogger())
- [x] Исправление isProd — использовать app.isPackaged
- [x] electron-builder: копирование node_modules из standalone

### Ложный статус принтера ✅

- [x] **StatusBar показывал «Готов» при отключённом принтере** — добавлен периодический опрос (15 сек) + WMI `WorkOffline` проверка

### Production БД миграции ✅

- [x] **`no such column: Settings.autoUpdate`** — legacy БД не содержала колонку autoUpdate. Создана отдельная ALTER TABLE миграция `20260204210000_add_auto_update`
- [x] **Baseline логика помечала ВСЕ миграции** — исправлено: теперь baseline помечает только init миграцию, ALTER TABLE миграции применяются к legacy БД
- [x] **Migration runner не обрабатывал "duplicate column"** — добавлена обработка безопасных ошибок (duplicate column name, already exists)
- [x] **Логирование пути к БД** — добавлен вывод используемого файла БД при инициализации

### API route в production ✅

- [x] **`NextRequest is not defined`** — `import type { NextRequest }` не импортировал конструктор в production. Исправлено на `import { NextRequest }`
- [x] **Отсутствующий импорт LuCheck** — добавлен в settings/page.tsx

### PowerShell печать ✅

- [x] **`System.Drawing.Printing` not found** — `powershell` вызывал PowerShell 7 (Core), где нет System.Drawing. Все PS-вызовы (WMI, Get-Printer) заменены на полный путь к Windows PowerShell 5.1
- [x] **`PrintDocument.Print()` зависал** — блокировка на уровне драйвера/спулера TSC. Заменён на `mspaint /pt` — стандартный Windows способ тихой печати изображений
- [x] **`mspaint /pt` тоже блокировался** — драйвер TSC блокирует ВСЕ GDI-вызовы. Заменён на RAW TSPL через `winspool.drv`

### RAW TSPL печать через winspool.drv ✅

**Проблема:** Драйвер TSC TE300 блокирует все Windows GDI вызовы (`PrintDocument`, `mspaint /pt`). Печать зависала или не работала.

**Решение:** PNG → монохромный BITMAP → бинарный TSPL → `winspool.drv` (RAW)

**Что сделано:**

- [x] Исправлен баг `bitmap.width` → `bitmap.bytesPerRow` в `TSPLService.generatePrintJob()`
- [x] Добавлен `TSPLService.generateBinaryPrintJob()` — PNG → бинарный TSPL Buffer
- [x] Исправлена инверсия цветов — TSPL: `0` = печатать (чёрный), `1` = не печатать (белый)
- [x] Исправлен порядок строк — TSPL ожидает сверху вниз (не как BMP снизу вверх)
- [x] `WindowsPrinterService.print()` и `printDirect()` теперь используют `sendRawToWinspool()`
- [x] Удалена функция `printImageViaMspaint()` — больше не нужна
- [x] Оставлен `printRaw()` для ручной отправки произвольных TSPL команд

**Архитектура печати (новая):**

```
PNG изображение
  → TSPLService.generateBinaryPrintJob()
    → imageToTSPLBitmap() (Jimp: greyscale → threshold → pack bits)
    → TSPL setup commands (SIZE, GAP, SPEED, DENSITY...)
    → BITMAP 0,0,bytesPerRow,height,0,<binary_data>
    → PRINT copies,1
  → Buffer (бинарный, ~50% меньше чем hex)
  → temp .bin файл
  → print-raw.ps1 (BinaryReader → winspool.drv WritePrinter)
  → Принтер получает RAW данные мгновенно
```

**Ключевые детали TSPL BITMAP:**

- Порядок бит: `0` = печатать точку (чёрный), `1` = не печатать (белый) — инверсное!
- Порядок строк: сверху вниз (НЕ как BMP снизу вверх)
- `bytesPerRow = Math.ceil(width / 8)` — в BITMAP команде, НЕ width в пикселях
- Бинарный mode 0 экономит ~50% vs hex (40 KB vs 78 KB для этикетки 685×461)

**Файлы:**

- `libs/label-printer-core/src/services/tspl.service.ts` — баг bytesPerRow, generateBinaryPrintJob, инверсия, порядок строк
- `libs/label-printer-core/src/services/printer.service.windows.ts` — sendRawToWinspool, удалён mspaint

### Автопечать и защита от дубликатов ✅

- [x] Переключатель «Печатать сразу» на странице сканирования (localStorage)
- [x] Переключатель «Разрешить дубликаты» (выключен по умолчанию, localStorage)
- [x] Автоматическая печать после успешного HID-сканирования (при включённом флаге)
- [x] Проверка дубликатов через PrintJob.fullCode при каждом сканировании
- [x] Запись PrintJob в БД после успешной печати (upsert)
- [x] Визуальное предупреждение о дубликатах (оранжевый бейдж, блокировка кнопки)
- [x] Блокировка автопечати для дубликатов (если не разрешены)

**Файлы:** `_actions.ts`, `_hooks/use-scans.ts`, `_hooks/use-scanner.ts`, `page.tsx`, `_components/scan-card.tsx`, `_components/scan-list.tsx`

### Баги UI

- [ ] **Страница добавления товара** — исправить форму добавления/редактирования Product

## Идея из соседнего приложения (2026-07-28)

- [ ] **Расчётная модель читаемости мелкого текста — потенциально применима и здесь.**
      В `poster-microtext-desktop` появилась `shared/visibility-model.ts`: угловой
      размер и критический кегль (Legge & Bigelow, 2011), запас контраста (Whittaker &
      Lovie-Kitchin, 1993), тонопередача печати через Dmax бумаги — общие законы зрения,
      не завязанные на конкретный продукт. У label-printer-desktop тоже печать мелкого
      текста на этикетках и тот же вопрос «читается ли это с рабочей дистанции при
      данном кегле и контрасте». Не выносить в `libs/` заранее — второго реального
      потребителя пока нет, это лишь пометка на случай, если здесь возникнет похожая
      задача (не дублировать написанное, а взять/вынести общую часть).

---

## Версионирование

| Версия | Фаза | Ключевые изменения                                      |
| ------ | ---- | ------------------------------------------------------- |
| 0.5.0  | 3    | Settings в БД, валидация, unit тесты                    |
| 0.5.1  | 6.5  | Оптимизация bundle, React.memo, select в ZenStack       |
| 0.5.3  | fix  | Фикс миграций БД, NextRequest, baseline логики          |
| 0.5.4  | fix  | Фикс PowerShell печати (PS5.1, StandardPrintController) |
| 0.5.5  | feat | Автопечать, защита от дубликатов, запись PrintJob       |
| 0.6.0  | 4    | TSX шаблоны, база товаров, батч-печать, экспорт         |
| 0.7.0  | 5    | UI/UX: MetricCard, Charts, Tabs                         |
| 0.8.0  | 6    | E2E тесты, автообновление                               |
| 1.0.0  | 7    | Продакшен релиз                                         |

**Оценка:** 8-9 недель при активной разработке

---

## Зависимости

| Библиотека                | Версия | Описание              |
| ------------------------- | ------ | --------------------- |
| @letar/label-printer-core | 0.1.0  | Shared сервисы печати |
| Electron                  | 39.x   | Desktop framework     |
| Next.js                   | 16.x   | UI framework          |
| Chakra UI                 | 3.x    | UI компоненты         |
| ZenStack                  | 2.x    | ORM с access control  |
| satori                    | —      | JSX → SVG (NEW)       |
| @resvg/resvg-js           | —      | SVG → PNG (NEW)       |

## Команды

```bash
# Разработка
nx dev label-printer-desktop

# Сборка
nx build:win label-printer-desktop
nx build:linux label-printer-desktop

# База данных
nx zenstack:generate label-printer-desktop
nx db:push label-printer-desktop
```

---

**Обновлено:** 2026-02-04
