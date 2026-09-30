# Project Structure

Организация проектов, теги и module boundaries.

---

## Структура Workspace

```
letar/
├── apps/                    # Приложения
│   ├── premium-rosstil/     # Next.js app
│   ├── imot/                # Next.js app
│   ├── dashboard/           # Next.js app
│   └── premium-rosstil-e2e/ # E2E тесты
├── libs/                    # Библиотеки
│   ├── chakra-provider/     # Shared Chakra config
│   ├── form-components/     # Form UI library
│   ├── ui/                  # Shared UI
│   └── format-utils/        # Utilities
├── nx.json                  # Nx конфигурация
├── tsconfig.base.json       # Базовый TS config
└── package.json             # Root dependencies
```

---

## Теги проектов

Теги — метки для классификации проектов.

### Объявление

```json
// apps/premium-rosstil/project.json
{
  "tags": ["type:app", "scope:premium"]
}

// libs/forms/project.json
{
  "tags": ["type:lib", "scope:shared"]
}
```

### Типичные теги

| Категория | Примеры                                              |
| --------- | ---------------------------------------------------- |
| type      | `type:app`, `type:lib`, `type:e2e`                   |
| scope     | `scope:shared`, `scope:premium`, `scope:admin`       |
| platform  | `platform:web`, `platform:electron`, `platform:node` |
| domain    | `domain:auth`, `domain:products`, `domain:orders`    |

---

## Module Boundaries

ESLint правило `@nx/enforce-module-boundaries` контролирует импорты между проектами.

### Конфигурация

```javascript
// eslint.config.mjs
import nxPlugin from '@nx/eslint-plugin'

export default [
  nxPlugin.configs['flat/base'],
  {
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: [],
          depConstraints: [
            {
              sourceTag: 'scope:shared',
              onlyDependOnLibsWithTags: ['scope:shared'],
            },
            {
              sourceTag: 'scope:premium',
              onlyDependOnLibsWithTags: ['scope:shared', 'scope:premium'],
            },
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: ['type:lib'],
            },
          ],
        },
      ],
    },
  },
]
```

### Правила

```
scope:shared → только scope:shared
scope:premium → scope:shared, scope:premium
type:app → только type:lib
```

### Ошибка нарушения

```
A project tagged with "scope:premium" can only depend on
projects tagged with "scope:shared" or "scope:premium"
```

---

## implicitDependencies

Явное указание зависимостей которые Nx не может определить автоматически.

### Когда нужны

- Runtime зависимости (не импортируются напрямую)
- Глобальные стили/конфиги
- Shared environment variables
- Внешние сервисы

### Объявление

```json
// apps/premium-rosstil/project.json
{
  "implicitDependencies": ["@letar/chakra-provider", "@letar/yandex-metrika"]
}
```

### Влияние

1. **Граф зависимостей** — связь видна в `nx graph`
2. **Affected** — изменение deps запускает affected
3. **Порядок сборки** — deps собираются первыми

---

## TypeScript Path Aliases

Для импортов между проектами используются path aliases.

### tsconfig.base.json

```json
{
  "compilerOptions": {
    "paths": {
      "@letar/ui": ["libs/ui/src/index.ts"],
      "@letar/forms": ["libs/forms/src/index.ts"],
      "@letar/chakra-provider": ["libs/chakra-provider/src/index.ts"]
    }
  }
}
```

### Использование

```typescript
// apps/premium-rosstil/src/components/Form.tsx
import { useAppForm } from '@letar/forms'
import { Button } from '@letar/ui'
```

---

## TypeScript References

Для правильной работы типов между проектами.

### tsconfig.json приложения

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true
  },
  "references": [{ "path": "../../libs/chakra-provider" }, { "path": "../../libs/forms" }, { "path": "../../libs/ui" }]
}
```

### Синхронизация references — только вручную

⛔ `nx sync` в этом репо не работает: генератор `@nx/js:typescript-sync` отключён в `nx.json`
(`sync.disabledTaskSyncGenerators`), в CI и хуках не вызывается. `references` правятся руками —
и обычно не требуют правки: их читает только `tsc --build`, которого у приложений нет.
Детали — [environment.md](/.claude/docs/environment.md#разработка-shared-библиотек).

---

## Добавление нового проекта

### Приложение

```bash
nx generate @nx/next:app my-app --directory=apps/my-app
```

Затем:

1. Добавь теги в project.json
2. Настрой implicitDependencies — это и есть ребро графа Nx
3. `references`/`paths` в `tsconfig.json` — по необходимости и вручную (`nx sync` отключён)

### Библиотека

```bash
nx generate @nx/react:lib my-lib --directory=libs/my-lib
```

Затем:

1. Добавь теги
2. Добавь path alias в tsconfig.base.json
3. Подключи к приложениям через `implicitDependencies` (`nx sync` тут не поможет — отключён)

---

## Организация библиотек

### По типу

```
libs/
├── ui/           # UI компоненты
├── utils/        # Утилиты
├── hooks/        # React hooks
├── types/        # Shared types
└── config/       # Configurations
```

### По домену

```
libs/
├── auth/         # Аутентификация
├── products/     # Товары
├── orders/       # Заказы
└── users/        # Пользователи
```

### Гибридный (рекомендуется)

```
libs/
├── shared/
│   ├── ui/
│   ├── utils/
│   └── hooks/
├── premium/
│   ├── products/
│   └── orders/
└── admin/
    └── dashboard/
```

---

## Best Practices

### 1. Мелкие библиотеки

```
❌ libs/utils/ (всё в одном)
✅ libs/format-utils/
✅ libs/validation-utils/
✅ libs/date-utils/
```

Преимущества:

- Точнее affected
- Лучше кэширование
- Понятнее зависимости

### 2. Правило зависимостей

```
Apps → Libs → Libs (shared)
  ↓       ↓
  └───────┴── никогда не импортирует Apps
```

### 3. Barrel exports

```typescript
// libs/ui/src/index.ts
export { Button } from './components/Button'
export { Card } from './components/Card'
export { Modal } from './components/Modal'
```

### 4. Feature библиотеки

```
libs/
├── products-ui/        # UI компоненты товаров
├── products-api/       # API клиент
├── products-types/     # TypeScript типы
└── products-utils/     # Утилиты
```

---

## См. также

- [affected.md](affected.md) — Как affected использует граф
- [configuration.md](configuration.md) — project.json
- [plugins.md](plugins.md) — Генераторы для создания проектов
