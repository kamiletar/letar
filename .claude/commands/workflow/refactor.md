---
description: Refactor - Рефакторинг кода с учётом архитектуры монорепо
arguments:
  - name: target
    description: Файл, компонент или модуль для рефакторинга (опционально)
    required: false
---

# /workflow:refactor — Рефакторинг кода

Улучши структуру кода без изменения его поведения.

## Когда использовать

- Код сложно читать или поддерживать
- Много дублирования
- Нарушены принципы SOLID
- Устаревший API (Chakra v2 → v3)
- Перед добавлением новой функциональности

## Агент для рефакторинга

**ВАЖНО:** Используй агента `refactor-expert` для выполнения рефакторинга:

```
→ Task: refactor-expert
```

Агент знает:

- Структуру Nx монорепо
- Паттерны React 19 + Next.js 16
- Chakra UI v3 compound components
- ZenStack модели и access policies
- TanStack Form + Zod v4
- Правильные импорты проекта

## Шаги

### 1. Определи scope

**Если указан `$ARGUMENTS`:**

- Найди файл: `$ARGUMENTS`
- Проанализируй его структуру

**Если не указан:**

- Спроси что рефакторить
- Или проанализируй текущий контекст

### 2. Убедись в наличии тестов

```bash
nx test <app> --coverage
```

- Если тестов нет — сначала напиши их (используй `/workflow:test-write`)

### 3. Запусти агента рефакторинга

```
→ Task: refactor-expert
   Задача: Рефакторинг <описание>
   Файлы: <список файлов>
```

Агент выполнит:

- Анализ текущего кода
- Определение типа рефакторинга
- Пошаговые изменения
- Проверку после каждого шага

### 4. Финальная проверка

```bash
nx run-many -t format --projects=<app>
nx lint <app>
nx typecheck:tsgo <app>
nx test <app>
```

## Типы рефакторинга

| Тип                | Описание                  | Агент                 |
| ------------------ | ------------------------- | --------------------- |
| **Компоненты**     | Extract, memo, forwardRef | `refactor-expert`     |
| **UI (Chakra)**    | Миграция v2→v3, compound  | `component-refactor`  |
| **Хуки**           | Extract custom hook       | `refactor-expert`     |
| **Server Actions** | Выделение в \_actions/    | `refactor-expert`     |
| **Схемы**          | Централизация Zod         | `refactor-expert`     |
| **Модели БД**      | ZenStack policies         | `db-schema-assistant` |

## Чеклист

- [ ] Тесты проходят до рефакторинга
- [ ] Тесты проходят после рефакторинга
- [ ] Поведение не изменилось
- [ ] Код стал проще/читаемее
- [ ] TypeScript типы корректны
- [ ] Комментарии на русском
- [ ] Документация обновлена (если нужно)

## Типичные рефакторинги

### Extract Component

```tsx
// До: большой компонент
// После: разбит на мелкие переиспользуемые части
```

### Extract Hook

```tsx
// До: логика в компоненте
// После: логика в useCustomHook
```

### Simplify Conditionals

```tsx
// До: вложенные if/else
// После: early return или switch
```

### Chakra v2 → v3

```tsx
// До: isLoading, isDisabled, colorScheme
// После: loading, disabled, colorPalette
```

## После завершения

1. Запусти полный набор тестов
2. Обнови CHANGELOG.md если значительные изменения
3. Коммит: `refactor(<scope>): <описание>`
