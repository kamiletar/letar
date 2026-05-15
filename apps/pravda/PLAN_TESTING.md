# Pravda - План тестирования

## Текущее покрытие

| Тип тестов  | Файлов | Тестов | Статус    |
| ----------- | ------ | ------ | --------- |
| Unit        | 2      | 33     | ✅ Готово |
| Integration | 4      | 56     | ✅ Готово |
| E2E         | 4      | 30     | ✅ Готово |

**Общее покрытие:** ~65%+ (критичные компоненты покрыты)

## Unit тесты

### src/lib/documents.test.ts

- getDocumentBySlug — 3 теста
- getDocumentsByCategory — 5 тестов
- getAllDocuments — 2 теста
- getTitleMap — 3 теста
- getCategoryFromPath — 4 теста
- Целостность данных — 5 тестов

### src/hooks/use-bookmarks.test.ts

- Инициализация — 1 тест
- CRUD операции — 6 тестов
- localStorage — 3 теста

### src/hooks/use-search.test.ts

- Загрузка индекса — 2 теста
- Поиск — 4 теста

## Integration тесты

### src/app/\_components/bookmark-button.test.tsx

- Рендеринг — 4 теста
- Взаимодействие — 2 теста
- Проверка isBookmarked — 2 теста

### src/app/\_components/header.test.tsx

- Рендеринг — 7 тестов
- Keyboard shortcuts — 4 теста
- Взаимодействие — 1 тест
- Cleanup — 1 тест

### src/app/\_components/command-palette.test.tsx

- Рендеринг — 6 тестов
- Сброс при открытии — 2 теста
- Ввод поиска — 1 тест
- Keyboard navigation — 4 теста
- Клик по результату — 1 тест

### src/app/\_components/toc.test.tsx

- Рендеринг — 5 тестов
- IntersectionObserver — 3 теста
- Scroll progress — 2 теста
- Клик по заголовку — 2 теста

## E2E тесты (Playwright)

### apps/pravda-e2e/src/navigation.spec.ts

- Главная страница — 2 теста
- Категории документов — 1 тест
- Навигация — 5 тестов

### apps/pravda-e2e/src/bookmarks.spec.ts

- Добавление закладки — 2 теста
- localStorage — 2 теста
- Страница /bookmarks — 2 теста

### apps/pravda-e2e/src/search.spec.ts

- Command Palette — 4 теста
- Поиск — 2 теста
- Keyboard navigation — 2 теста

### apps/pravda-e2e/src/documents.spec.ts

- Загрузка документов — 4 теста
- TOC — 4 теста
- Прогресс чтения — 2 теста

## Команды

```bash
# Unit/Integration тесты
nx test pravda

# С покрытием
nx test pravda -- --coverage

# E2E тесты
nx e2e pravda-e2e

# E2E только Chromium
nx e2e pravda-e2e -- --project=chromium
```

---

**Последнее обновление:** 2025-12-28
