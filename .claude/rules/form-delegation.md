---
paths: apps/**/*form*, apps/**/*Form*, libs/forms/**, libs/zenstack-form-plugin/**
---

# Делегация задач для form-components и zenstack-form-plugin

## Когда делегировать

Ты **ОБЯЗАН** делегировать задачу агенту `/forms-dev` если:

1. **Нет нужного поля** — проверил `form-mcp` → `list_fields` и поля нет
2. **Нет нужной @form.\* директивы** — проверил `form-mcp` → `get_directives` и директивы нет
3. **Нужна новая фича** в form-components (новый паттерн, offline feature, валидация, и т.д.)
4. **Баг в библиотеке** — компонент работает не так, как описано в документации

⚠️ **ЗАПРЕЩЕНО** писать кастомную реализацию поля/фичи! Делегируй и жди.

## Алгоритм делегации

### 1. Проверь form-mcp

```
form-mcp → list_fields        # Есть ли нужное поле?
form-mcp → get_directives     # Есть ли нужная директива?
form-mcp → get_field_props    # Может, поле есть но с другим названием?
```

### 2. Отправь запрос forms-coordinator через agent-mail

```typescript
send_message({
  project_key: 'C:/web/letar',
  sender_name: '<твоё имя агента>',
  to: ['forms-coordinator'], // координатор форм (НЕ broadcast!)
  topic: 'form-feature-request',
  importance: 'high',
  ack_required: true,
  subject: '[form-components] <Что нужно>',
  // или: "[zenstack-form-plugin] <Что нужно>"
  // или: "[form-mcp] <Что нужно>"
  body_md: `## Что нужно
<Описание компонента/директивы/фичи>

## Зачем
<В каком контексте понадобилось, какую задачу решает>

## Приложение
<Название приложения, где нужно>

## Предлагаемый API
\`\`\`tsx
<Как бы ты хотел использовать это>
\`\`\`

## Ссылки
- Похожий компонент: <путь к аналогу>
- Задача: <описание текущей задачи>
`,
})
```

### 3. Запиши в PLAN.md

Добавь запись в `libs/forms/PLAN.md` → секция `## Backlog (запросы от агентов)`:

```markdown
### [<дата>] <Что нужно> (от <приложение>)

- **Запросил:** <имя агента>
- **Приоритет:** high
- **Описание:** <кратко>
- **Статус:** ожидание
```

### 4. Жди ответ

```typescript
// Каждые ~30 секунд проверяй inbox
fetch_inbox({
  project_key: 'C:/web/letar',
  agent_name: '<твоё имя>',
  topic: 'form-feature-request',
  include_bodies: true,
})
```

**Timeout:** 10 минут. Если ответа нет — спроси пользователя:

> "Отправил запрос на добавление <фичи> в form-components. Ответа пока нет. Хотите подождать или реализовать временный workaround?"

## Что включает ответ от forms-dev

Агент `/forms-dev` при реализации фичи обязан обновить:

- `libs/forms/` — сам компонент/фича
- `apps/form-develop-app/` — демо-страница
- `apps/form-docs/` — документация (MDX + интерактивные демо)
- `apps/form-example/` — showcase пример

## Что НЕ делегировать

- Создание Select/Combobox для своего приложения (это `extraSelects`/`extraComboboxes` в `createForm`)
- Написание Server Actions
- Настройка валидации через Zod `.strip()`
- Использование существующих компонентов из `list_fields`
