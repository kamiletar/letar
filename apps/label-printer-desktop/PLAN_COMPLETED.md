# Выполненные задачи

Детальное описание всех реализованных фич Label Printer Desktop.

## Вынос generate-icons в общую библиотеку @letar/icon-generator (2026-08-25)

При выносе трёх копий скрипта генерации иконок в общую библиотеку (`libs/icon-generator`,
`.claude/docs` — см. `animatrona/PLAN_COMPLETED.md` за полным разбором) обнаружено, что
`@resvg/resvg-js`, который использовал прежний `scripts/generate-icons.mjs`, вообще не был
установлен как зависимость (нет ни в `package.json`, ни в `bun.lock`) — первый же реальный
запуск после сборки упал бы `Cannot find module`. Переведён на `@letar/icon-generator` (движок
`sharp`, единый со всеми Electron-приложениями монорепо). Прогнан локально, `icon.ico` и PNG
сверены визуально.

## Миграция generate-icons.mjs: to-ico → png-to-ico, дописана генерация icon.ico (2026-08-25)

Задача пришла как «перевести три Electron-приложения с `to-ico` на `png-to-ico`». Здесь скрипт
вообще не генерировал `.ico` программно — только печатал инструкцию запустить
`npx png-to-ico resources/icon-256.png > resources/icon.ico` руками. Дописана прямая генерация
через `png-to-ico` (импорт + вызов по образцу `poster-microtext-desktop`/`animatrona`), скрипт
прогнан локально, `icon.ico` сверен визуально.

Заодно вычищена неиспользуемая зависимость `to-ico` из корневого `package.json`/`bun.lock` —
устраняет уязвимую транзитивную цепочку `request`→`form-data@2.3.3` (CVE-2025-7783).

## Обновление Electron 43.3.0 → 44.0.0 (2026-08-25)

Локальный пин расходился с корневым `package.json`, создавая физический дубль в `bun.lock`.
Приведён к корневой версии одним заходом со всеми Electron-приложениями монорепо
(`animatrona`, `poster-microtext-desktop`, `kami-key-the`) — сразу мажорный бамп 43→44 по
просьбе владельца. `nx typecheck:tsgo` и `nx lint` зелёные. Живой GUI-смоук не проводился
(сендбокс не поднимает Chromium) — проверить на первом реальном запуске.

## `nx lint` красный из-за вложенного `main/eslint.config.mjs` (2026-08-19)

Обнаружено попутно в другой сессии (фикс `eslint-plugin-react-hooks` в корневом
`eslint.config.mjs`): `nx lint label-printer-desktop` падал 3 ошибками
`no-restricted-syntax` на `main/background.ts:48,59` и `main/services/database.ts:23` — паттерн
`app.isPackaged || process.env.NODE_ENV === 'production'`.

Код был корректен — это легитимный fallback для Electron main-процесса, для которого в
корневом `eslint.config.mjs` уже заведён allow-list. Проблема была в резолве: у
`apps/label-printer-desktop/main/` есть свой `eslint.config.mjs` (спредит корневой
`baseConfig` + свои `ignores`), и ESLint находит именно его как ближайший конфиг для
`main/*.ts`. `basePath` для сопоставления всех `files`-паттернов при этом становится
`apps/label-printer-desktop/main/`, а не каталог приложения — оба варианта allow-list'а
(`main/**/*.ts`, `apps/*/main/**/*.ts`) ищут сегмент `main/`, которого относительно этого
`basePath` уже нет.

Фикс — локальный override третьим элементом в `apps/label-printer-desktop/main/eslint.config.mjs`
(`{ files: ['**/*.ts'], rules: { 'no-restricted-syntax': 'off' } }`), безопасный, потому что
этот файл управляет только поддеревом `main/`. В корневой allow-list третий вариант пути
добавить нельзя — тот массив переиспользуется на всех `basePath` разом, голый `**/*.ts` там
выключил бы правило для всего репозитория. Разбор — `.claude/docs/node-env-not-production-signal.md`
§ Случай 5.

⚠️ Тот же вложенный `main/eslint.config.mjs` есть у `apps/animatrona/main/` — латентно тот же
баг, не проверялось и не чинилось (вне scope этой сессии, отправлено отдельной задачей).

## Prisma 7 datasource url + недостающий Prisma Client (2026-08-17)

`nx db:push` падал с P1012 («The datasource property `url` is no longer supported in schema
files»): `schema.zmodel` держал `url = "file:../../prisma/data/app.db"` прямо в `datasource`,
плагин `@core/prisma` переносил его буквально в сгенерённый `schema.prisma`, а Prisma 7 CLI
такое отклоняет — URL теперь только в `prisma.config.ts`.

Заодно раскрылась более глубокая проблема, ранее зафиксированная как «предсуществующая» в двух
записях этого файла (Electron 39→43, `tsconfig references`): `schema.zmodel` не содержал ни
`plugin typescript`, ни `generator client` — реальный `src/generated/prisma/` не генерировался
никогда, `renderer/**` и `prisma/seed.ts` импортировали несуществующий модуль. Причина, по
которой это не ловилось раньше, — `typecheck:tsgo` падал ещё раньше на P1012-подобных
сбоях/пропущенных шагах, а сами ошибки `TS2307` списывались на «несгенерённое», не проверяя,
почему оно не генерируется.

Фикс (по образцу `driving-school`, единственного приложения монорепо вне ZenStack-generated
`schema.prisma`, где `db:push` уже работал под Prisma 7):

- `datasource` в `schema.zmodel` — только `provider`, без `url`.
- Добавлен `apps/label-printer-desktop/prisma.config.ts`: `schema: './src/generated/schema.prisma'`,
  `datasource.url: 'file:./prisma/data/app.db'`.
- Добавлены `plugin typescript` (`@core/typescript`, output `./src/generated`) и
  `generator client` (`prisma-client`, output `./prisma` — относительно сгенерённого
  `schema.prisma`, т.е. `src/generated/prisma/`) — второй специально с явным output, совпадающим
  с директорией `@core/typescript`, как описано в
  [zenstack-generated-prisma-client.md](/.claude/docs/zenstack-generated-prisma-client.md).
- Таргет `zenstack:generate` в `project.json` был однокомандным (только `zenstack generate`);
  стал составным — `zenstack generate` → `prisma generate` → запись `index.ts` (реэкспорт
  `./client`), с `cwd: apps/label-printer-desktop`.
- Таргеты `db:push`/`db:migrate`/`db:studio`/`db:seed` получили `cwd: apps/label-printer-desktop`
  и избавились от `--schema <абсолютный-от-корня-путь>` — без `cwd` Prisma CLI искал
  `prisma.config.ts` в корне монорепо, где его нет.
- 3 ошибки `TS7006` (implicit any на `prev` в `setSettings((prev) => ...)`,
  `renderer/app/settings/page.tsx`) — не связаны с Prisma, но ранее маскировались отказом
  typecheck на более раннем шаге. Добавлена явная аннотация `AppSettings | null`.

Проверено: `nx zenstack:generate` создаёт `src/generated/{schema.ts,models.ts,prisma/*}`, `nx
db:push` создаёт `prisma/data/app.db` и синкает схему без ошибок, `nx typecheck:tsgo` —
зелёный без единой оставшейся ошибки (были все 3 из выше, `Cannot find module` пропал).

⚠️ **Не проверено закрытым:** `nx build` по записи выше падал на другом шаге
(`@zenstackhq/tanstack-query` — конфликт версий, отсутствующий `exports.main`) — не трогалось в
этой сессии, требует отдельного разбора.

## Electron 39.2.7 → 43.3.0 (2026-08-09)

Часть сессии-апдейта Electron разом во всех Electron-приложениях монорепо (см.
`apps/animatrona/PLAN_COMPLETED.md` за детали проверки и общий контекст). Самый большой скачок
версии среди четырёх приложений (3 мажора). `canvas` (native-модуль) проверен headless-запросом
`ELECTRON_RUN_AS_NODE=1 electron -e "require('canvas')"` под новым Node ABI — загружается без
ошибок. `nx typecheck:tsgo` зелёный (те же 17 предсуществующих ошибок на несгенерённые
`src/generated/*`, не связаны с этой правкой).

## tsconfig.json — убраны `references` на `libs/*` (смешанная модель, 2026-08-07)

Убраны 5 ссылок (`forms`, `query-provider`, `chakra-provider`, `label-printer-core`,
`electron-storage`) из `references` — тот же хрупкий редирект, что в `dashboard-agent` (0.11.1,
см. `.claude/rules/libs.md`). Оставлена ссылка на `./tsconfig.spec.json` (не библиотека).
Приложение уже использовало смешанную модель — те же 5 библиотек параллельно инлайнятся через
`include: ["../../libs/<lib>/src/**/*.ts"]`, это не тронуто. `nx typecheck:tsgo` зелёный (17
оставшихся ошибок — `TS7006`/`TS2307` на несгенерированные `src/generated/prisma` и
`src/generated/form-schemas`, не связаны с этой правкой, присутствовали и до неё). `nx build`
падает раньше typecheck, на шаге `zenstack:generate` (`@zenstackhq/tanstack-query` — конфликт
версий 3.9.0/2.22.3, нет `exports.main` в `package.json`) — тоже независимая от этой правки,
предсуществующая проблема окружения.

## Версия 0.5.x (Unreleased)

### Фикс антипаттерна `as="label"` в batch/page.tsx

`renderer/app/batch/page.tsx` использовал `<Text as="label">` с вложенным `<input type="file">`
внутри — запрещённый Chakra UI v3 проп `as` (см. `.claude/rules/components.md`) плюс вложенность
`<input>` в `<label>`, создающая риск повторного открытия системного файлового диалога. Заменено
на `<Text asChild><label htmlFor={fileInputId}>` с соседним `<input id={fileInputId} .../>`,
связь через `useId()`. Стилизация (`color`, `cursor`, `_hover`) сохранена без изменений.

### Реальные ассеты для TSX шаблонов

- **Логотип РОССТИЛЬ** — упрощённый SVG с звёздами, бриллиантом и названием бренда
- **Знак EAC** — знак соответствия Евразийского экономического союза
- **Иконки ухода ISO 3758:**
  - Стирка 30°C, 40°C
  - Отбеливание запрещено
  - Глажка (низкая, средняя температура)
  - Химчистка P, запрещена
  - Сушка в барабане, естественная сушка
- **Автовыбор иконок** — функция `getCareIconsByComposition()` выбирает набор иконок по составу ткани:
  - Полиэстер/синтетика → стандартный набор
  - Шерсть/шёлк/кашемир → деликатный набор
  - Кожа/замша → только химчистка
- **Шрифт Inter** — загружается из Google Fonts для корректного рендеринга кириллицы

### Unit тесты для assets

- 14 тестов для getCareIconsByComposition
- Проверка валидности всех base64 data URI
- Проверка количества иконок в наборах

**Файлы:**

- `libs/label-printer-core/src/templates/assets.ts`
- `libs/label-printer-core/src/templates/template-renderer.service.ts`
- `libs/label-printer-core/src/templates/template-renderer.service.spec.ts`

## Версия 0.3.0

### Интеграция с @letar/label-printer-core

- Вынесены общие сервисы в shared библиотеку
- GS1Parser для парсинга кодов маркировки
- ImageGeneratorService для генерации изображений
- TSPLService для команд принтера

### Electron IPC Architecture

- Реализованы IPC handlers для main process
- Настроен безопасный preload bridge
- Добавлена типизация для electron API

### UI компоненты

- StatusBar с отображением состояния принтера
- Страница настроек с формой конфигурации
- Интеграция с Chakra UI v3

## Версия 0.2.0

### База данных

- Интеграция ZenStack + Prisma
- SQLite для локального хранения
- Модели: PrintJob, Settings, Template

### Шаблоны этикеток

- Поддержка нескольких шаблонов
- Выбор шаблона в настройках
- Предпросмотр этикетки

## Версия 0.1.0

### Базовая функциональность

- Nextron структура проекта
- Ввод кодов маркировки
- USB сканер поддержка
- Генерация DataMatrix

---

**Последнее обновление:** 2025-12-25 (ассеты для шаблонов)

---

> Перенесено из PLAN.md: 2026-08-09

## Фаза 2: Улучшения UI ✅

- [x] Тёмная тема
- [x] Анимации переходов
- [x] Улучшенные уведомления
- [x] Индикатор прогресса печати

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

## Фаза 4 (часть): Расширенная функциональность → v0.6.0

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

### 4.6 Несколько принтеров ✅

- [x] Список принтеров в Settings (NativeSelect с автодетектом)
- [x] Быстрое переключение в StatusBar
- [x] Профили принтеров (CRUD, IPC handlers, UI вкладка в Settings)

**Файлы:** `schema.zmodel`, `main/ipc/printer.handlers.ts`

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

## Баг-фиксы

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

---

**Последнее обновление:** 2026-08-09
