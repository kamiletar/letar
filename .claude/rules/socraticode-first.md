# SocratiCode — Семантический поиск по кодовой базе

**ОБЯЗАТЕЛЬНО:** Перед использованием Grep/Glob для семантических вопросов — сначала спроси SocratiCode.

## Когда использовать SocratiCode

### `mcp__socraticode__codebase_search` — для семантических вопросов

Вызывай ДО Grep/Glob когда вопрос звучит как:

- «Где определена логика X?»
- «Как реализован Y?»
- «Где обрабатывается Z?»
- «Какой компонент отвечает за X?»
- «Где находится форма для Y?»
- «Где настроен OAuth?»
- «Как работает деплой?»

```typescript
mcp__socraticode__codebase_search({
  projectPath: 'C:/web/letar',
  query: 'логика отправки email верификации',
  limit: 10,
})
```

### `mcp__socraticode__codebase_context_search` — для архитектурных вопросов

Вызывай когда вопрос про схемы БД, конвенции, паттерны, правила:

- «Какой паттерн использовать для Z?»
- «Как выглядит схема модели X?»
- «Какие конвенции для именования?»
- «Какие access policies для ADMIN?»
- «Как добавить OAuth провайдер?»
- «Какие поля у модели User?»

```typescript
mcp__socraticode__codebase_context_search({
  projectPath: 'C:/web/letar',
  query: 'ZenStack access policy для ADMIN роли',
  limit: 10,
})
```

### `mcp__socraticode__codebase_symbol` — для точного поиска символа

Когда знаешь имя функции/компонента/типа:

```typescript
mcp__socraticode__codebase_symbol({
  projectPath: 'C:/web/letar',
  symbol: 'getEnhancedPrisma',
})
```

### `mcp__socraticode__codebase_impact` — перед рефакторингом

Перед изменением публичного API, хука, компонента из libs/:

```typescript
mcp__socraticode__codebase_impact({
  projectPath: 'C:/web/letar',
  filePath: 'libs/forms/src/index.ts',
})
```

### `mcp__socraticode__codebase_graph_query` — граф зависимостей

Для понимания что импортирует файл и кто его использует:

```typescript
mcp__socraticode__codebase_graph_query({
  projectPath: 'C:/web/letar',
  filePath: 'libs/forms/src/index.ts',
  direction: 'both',
})
```

## Правила приоритета

```
Архитектурный/конвенционный вопрос
  → codebase_context_search (шпаргалка из docs/skills/schemas)

Семантический вопрос про код
  → codebase_search (поиск по индексу кодовой базы)

Знаешь точное имя символа
  → codebase_symbol

Собираешься менять публичный API
  → codebase_impact сначала

Нужны точные строки/regex
  → Grep (после SocratiCode не дал ответа)

Нужен список файлов
  → Glob (после SocratiCode не дал ответа)
```

## Параметры по умолчанию

- `projectPath`: всегда `"C:/web/letar"`
- `limit`: 10 для search, 5 для context_search
- Индекс обновляется автоматически при изменении файлов (после `codebase_watch` start)

## Статус индекса

Если SocratiCode возвращает 0 результатов или ошибку — проверь:

```typescript
mcp__socraticode__codebase_status({ projectPath: 'C:/web/letar' })
```

Если индекс устарел после больших изменений:

```typescript
mcp__socraticode__codebase_update({ projectPath: 'C:/web/letar' })
```
