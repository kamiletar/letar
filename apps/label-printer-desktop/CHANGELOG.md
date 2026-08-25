# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [Unreleased]

## [0.5.11] - 2026-08-25

### Changed

- `scripts/generate-icons.mjs` переведён с `@resvg/resvg-js` (не был установлен как зависимость —
  скрипт падал бы `Cannot find module` при первом реальном запуске) на общую библиотеку
  `@letar/icon-generator` (движок `sharp`, как у остальных Electron-приложений монорепо).

## [0.5.10] - 2026-08-25

### Fixed

- `scripts/generate-icons.mjs` не генерировал `icon.ico` программно — только печатал инструкцию
  запустить `npx png-to-ico` вручную. Дописана прямая генерация через `png-to-ico`, как в
  остальных Electron-приложениях монорепо.

### Changed

- Убрана неиспользуемая зависимость `to-ico` из корневого `package.json`/`bun.lock` — устранена
  уязвимая транзитивная цепочка `request`→`form-data@2.3.3` (CVE-2025-7783).

## [0.5.9] - 2026-08-25

### Changed

- Electron `43.3.0` → `44.0.0` — приведён к версии из корневого `package.json`, устранён
  физический дубль в `bun.lock`.

## [0.5.8] - 2026-08-19

### Fixed

- `nx lint` падал 3 ошибками `no-restricted-syntax` на `NODE_ENV === 'production'` в
  `main/background.ts` и `main/services/database.ts` — код уже использовал легитимный
  `app.isPackaged`-паттерн, ошибка была в резолве allow-list'а из-за вложенного
  `main/eslint.config.mjs`. Фикс — локальный override в этом файле, подробности в
  `.claude/docs/node-env-not-production-signal.md` § Случай 5.

## [0.5.7] - 2026-08-17

### Fixed

- Prisma 7 отвергал инлайновый `url` в `datasource` внутри `schema.zmodel` (`db:push` падал с
  P1012). Убран `url` из `datasource`, добавлен `prisma.config.ts` (по образцу
  `driving-school`) с путём к SQLite-файлу `./prisma/data/app.db`.
- `schema.zmodel` не содержал `plugin typescript` и `generator client` — реальный
  Prisma Client (`src/generated/prisma/`) никогда не генерировался, из-за чего
  `typecheck:tsgo` падал на `Cannot find module '.../generated/prisma'`. Добавлены оба блока
  (по образцу `driving-school`), таргет `zenstack:generate` в `project.json` теперь
  дополнительно прогоняет `prisma generate` и пишет `index.ts`-реэкспорт.
- Таргеты `db:push`/`db:migrate`/`db:studio`/`db:seed` в `project.json` получили
  `cwd: apps/label-printer-desktop` — без него Prisma CLI искал `prisma.config.ts` в корне
  монорепо, а не рядом со схемой.
- 3 ошибки `implicitly has an 'any' type` в `renderer/app/settings/page.tsx` (параметр `prev`
  в `setSettings((prev) => ...)`) — добавлена явная аннотация `AppSettings | null`.

## [0.5.6] - 2026-08-09

### Changed

- Electron 39.2.7 → 43.3.0. `canvas` пересобран под новый ABI и проверен headless-запросом
  (`ELECTRON_RUN_AS_NODE=1 electron -e "require('canvas')"`).

## [0.5.5] - 2026-02-28

### Added

- Автопечать при сканировании
- Защита от дубликатов
- Настройки DataMatrix

### Fixed

- NSIS installer — Bun симлинки и standalone модули

## [0.5.4] - 2026-02-04

### Fixed

- **PowerShell печать: `System.Drawing.Printing` not found** — команда `powershell` вызывала PowerShell 7 (Core), где нет сборки System.Drawing. WMI/Get-Printer вызовы заменены на полный путь к Windows PowerShell 5.1
- **`PrintDocument.Print()` зависал навсегда** — блокировка на уровне драйвера/спулера TSC, процесс PowerShell оставался висеть. Заменён на `mspaint /pt` — стандартный Windows способ тихой печати изображений, без PowerShell
- Рефакторинг print pipeline: добавлена функция `printImageViaMspaint()`, убрана зависимость от `print-image.ps1` в методах `print` и `printDirect`

## [0.5.2] - 2026-02-04

### Fixed

- **Ложный статус принтера** — StatusBar показывал зелёный индикатор и «Готов» даже при отключённом принтере. Добавлена проверка через WMI `Win32_Printer.WorkOffline` (надёжнее для USB принтеров) и периодический опрос статуса каждые 15 секунд

## [0.5.1] - 2025-12-29

### Changed

- Оптимизация bundle и рендеринга производительности
- Миграция на @letar/hooks и @letar/query-provider
- Замена better-sqlite3 на sql.js для лучшей совместимости
- Улучшение архитектуры и качества кода

### Fixed

- Исправления форм

## [0.5.0] - 2025-12-27

### Fixed

- **Сборка для Windows** — исправлена конфигурация webpack externals для нативных модулей (@resvg/resvg-js, canvas, pdfjs-dist)
- **Иконки приложения** — регенерированы PNG и ICO файлы из SVG через sharp

### Added

- **Реальные ассеты для этикеток** — логотип РОССТИЛЬ (SVG), знак EAC, иконки ухода по ISO 3758 (стирка, отбеливание, глажка, химчистка, сушка) с автовыбором по составу ткани
- **Загрузка шрифта Inter** — для корректного рендеринга кириллицы в этикетках через Satori
- **FAQ документ** — ответы на частые вопросы (установка, сканер, печать, база данных, ошибки, разработка)
- **Retry с exponential backoff** — автоматические повторные попытки при временных ошибках принтера (configurable: maxAttempts, delays, jitter)
- **Парсинг DataMatrix из PDF** — извлечение кодов маркировки из PDF документов через pdfjs-dist + @zxing/library
- **Test coverage 80%+** — достигнуто 83.74% statements, 84.69% lines (добавлены тесты для retry, assets)
- **Кнопка тестовой печати** — в настройках принтера, с loading состоянием и toast уведомлениями
- **База товаров** — модель Product, страница /products с CRUD операциями, поиск, Dialog формы
- **Связь PrintJob → Product** — товары связаны с историей печати по GTIN
- **Пакетная печать** — страница /batch с drag&drop загрузкой CSV/TXT, очередью печати с прогрессом и паузой
- **Экспорт истории в Excel** — библиотека xlsx, выбор диапазона дат, автоширина колонок
- **Экспорт статистики в PDF** — генерация через Electron printToPDF, красивый HTML шаблон
- **Фильтры по дате** — на страницах История и Статистика для выборки данных
- **TSX шаблоны этикеток** — TemplateRendererService (Satori + resvg) для динамической генерации этикеток
- **MetricCard компонент** — красивые карточки метрик с иконками, цветами и hover эффектами
- **Улучшенная статистика** — страница Stats теперь использует MetricCard вместо простых Stat
- **Tabs в настройках** — страница Settings разделена на 4 вкладки: Принтер, Этикетка, Поведение, О приложении
- **Улучшенная история** — поиск по GTIN/серийному номеру, пагинация, сброс фильтров
- **Глобальная обработка ошибок** — uncaughtException/unhandledRejection с диалогом ошибки
- **Автообновление** — electron-updater для автоматических обновлений с GitHub Releases

## [0.4.0] - 2025-12-25

### Added

- **Симуляция сканера** — панель на странице Home для тестирования без физического USB сканера
- **Выбор шаблона этикетки** — RadioCard в настройках для выбора между шаблонами
- **Тёмная тема** — кнопка переключения темы в sidebar
- **Улучшенные уведомления** — toast с loading spinner, action кнопками и closable
- **Анимации переходов** — плавное появление контента при навигации между страницами
- **Индикатор прогресса печати** — анимированный Progress bar при печати на страницах Home и Manual

### Changed

- Улучшенная архитектура компонента Toaster
- Sidebar получил flex layout для переключателя темы внизу
- Layout обёрнут в PageTransition для анимаций

## [0.3.0] - 2025-12-25

### Added

- Интеграция с `@letar/label-printer-core` — shared библиотека сервисов
- Electron IPC handlers для работы с принтером и настройками
- Preload скрипты для безопасного взаимодействия между процессами
- Status bar компонент с отображением состояния принтера

### Changed

- Рефакторинг архитектуры: сервисы вынесены в `@letar/label-printer-core`
- Улучшенная страница настроек принтера

## [0.2.0] - 2025-12-20

### Added

- ZenStack + Prisma интеграция с SQLite
- Шаблоны этикеток
- История и статистика печати
- Настройки принтера и этикетки

## [0.1.0] - 2025-12-15

### Added

- Первый релиз
- Nextron (Electron + Next.js) структура
- Chakra UI v3 интеграция
- Базовый UI для ввода кодов маркировки
- Автоматическое чтение с USB сканера
