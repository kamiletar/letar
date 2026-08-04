# Выполненные задачи

Детальное описание всех реализованных фич Label Printer Desktop.

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
