---
paths: 'apps/kami/**/*'
---

# Kami — CMS на Keystatic

## Описание

Kami — система управления контентом на базе Keystatic. Используется для статических сайтов с Git-based контентом.

## Архитектура

```
apps/kami/
├── app/
│   ├── keystatic/        # Keystatic admin UI
│   ├── (site)/           # Публичный сайт
│   │   ├── blog/         # Блог
│   │   ├── docs/         # Документация
│   │   └── pages/        # Статические страницы
│   └── api/
│       └── keystatic/    # Keystatic API
├── keystatic.config.ts   # Конфигурация Keystatic
├── content/              # Markdown контент
│   ├── posts/
│   ├── docs/
│   └── pages/
└── schema.zmodel         # (опционально для доп. данных)
```

## Keystatic конфигурация

```typescript
// keystatic.config.ts
import { collection, config, fields } from '@keystatic/core'

export default config({
  storage: {
    kind: 'local', // или 'github' для production
  },
  collections: {
    posts: collection({
      label: 'Посты',
      slugField: 'title',
      path: 'content/posts/*',
      schema: {
        title: fields.slug({ name: { label: 'Заголовок' } }),
        content: fields.document({ label: 'Контент' }),
      },
    }),
  },
})
```

## Особенности

- **Git-based** — контент хранится в репозитории
- **Markdown/MDX** — rich text редактор
- **Типизация** — автогенерация TypeScript типов

## Правила

- **MUST** использовать `fields.document()` для rich text
- **SHOULD** настроить `storage: 'github'` для production
- **NEVER** коммитить секреты в content/

## Документация

- См. `apps/kami/README.md`
- Keystatic docs: https://keystatic.com/docs
