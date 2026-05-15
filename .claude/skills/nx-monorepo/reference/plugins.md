# Plugins

Nx плагины и Project Crystal (inferred targets).

---

## Project Crystal (Nx 18+)

Project Crystal — концепция где плагины автоматически определяют targets на основе конфиг-файлов.

### Принцип работы

1. Плагин находит конфиг-файл (next.config.js, eslint.config.mjs)
2. Создаёт targets с правильными inputs/outputs
3. project.json содержит минимум конфигурации

### Пример

Если есть `next.config.js`, плагин `@nx/next/plugin` создаёт:

- `build` — сборка Next.js
- `dev` — dev сервер
- `start` — production сервер

---

## Плагины в проекте Lena

| Плагин                  | Конфиг-файл            | Создаёт targets   |
| ----------------------- | ---------------------- | ----------------- |
| `@nx/js/typescript`     | `tsconfig.json`        | typecheck         |
| `@nx/next/plugin`       | `next.config.js`       | build, dev, start |
| `@nx/eslint/plugin`     | `eslint.config.mjs`    | lint              |
| `@nx/playwright/plugin` | `playwright.config.ts` | e2e               |

---

## Конфигурация плагинов

В nx.json:

```json
{
  "plugins": [
    {
      "plugin": "@nx/js/typescript",
      "options": {
        "targetName": "typecheck",
        "typecheck": {
          "targetName": "typecheck:tsc"
        },
        "build": {
          "targetName": "build:tsc"
        }
      }
    },
    {
      "plugin": "@nx/next/plugin",
      "options": {
        "buildTargetName": "build",
        "devTargetName": "dev",
        "startTargetName": "start"
      }
    },
    {
      "plugin": "@nx/eslint/plugin",
      "options": {
        "targetName": "lint"
      }
    },
    {
      "plugin": "@nx/playwright/plugin",
      "options": {
        "targetName": "e2e"
      }
    }
  ]
}
```

---

## Просмотр inferred targets

```bash
# Все targets проекта (включая inferred)
nx show project premium-rosstil

# В JSON формате
nx show project premium-rosstil --json

# Открыть в браузере
nx show project premium-rosstil --web
```

---

## Кастомизация inferred targets

### Через targetDefaults

Глобальные настройки для всех проектов:

```json
{
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "cache": true
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    }
  }
}
```

### Через project.json

Переопределение для конкретного проекта:

```json
{
  "targets": {
    "build": {
      // Переопределяет/дополняет inferred target
      "cache": false,
      "dependsOn": ["zenstack:generate", "^build"]
    }
  }
}
```

---

## Свои targets в targetDefaults

Можно создавать targets которые будут доступны всем проектам:

```json
{
  "targetDefaults": {
    "oxlint": {
      "executor": "nx:run-commands",
      "options": {
        "command": "bunx oxlint {projectRoot}/src --config .oxlintrc.json",
        "cwd": "{workspaceRoot}"
      },
      "cache": true,
      "inputs": ["default", "{workspaceRoot}/.oxlintrc.json"]
    },
    "dprint": {
      "executor": "nx:run-commands",
      "options": {
        "command": "bunx dprint fmt --config {workspaceRoot}/dprint.json \"{projectRoot}/**/*.{ts,tsx,js,jsx,json,md}\"",
        "cwd": "{workspaceRoot}"
      },
      "cache": false
    },
    "typecheck:tsgo": {
      "executor": "nx:run-commands",
      "options": {
        "command": "bunx tsgo --project {projectRoot}/tsconfig.json",
        "cwd": "{workspaceRoot}"
      },
      "cache": true,
      "inputs": ["default", "^default", "{workspaceRoot}/tsconfig.base.json"]
    }
  }
}
```

---

## Миграция на inferred targets

### Автоматическая миграция

```bash
# Next.js проекты
nx g @nx/next:convert-to-inferred

# ESLint
nx g @nx/eslint:convert-to-inferred

# Playwright
nx g @nx/playwright:convert-to-inferred
```

### Что происходит

1. Удаляются explicit targets из project.json
2. Плагин начинает infer их из конфиг-файлов
3. Остаются только кастомные targets

### До миграции

```json
{
  "targets": {
    "build": {
      "executor": "@nx/next:build",
      "options": { "outputPath": "dist/apps/my-app" },
      "dependsOn": ["^build"]
    },
    "dev": {
      "executor": "@nx/next:dev",
      "options": { "port": 3000 }
    }
  }
}
```

### После миграции

```json
{
  "targets": {
    // build и dev теперь inferred от @nx/next/plugin
    // Только кастомные targets остаются
    "zenstack:generate": {
      "executor": "nx:run-commands",
      "options": { "command": "zenstack generate" }
    }
  }
}
```

---

## Создание своего плагина

### Структура

```
libs/my-plugin/
├── src/
│   ├── index.ts           # Export точка
│   └── plugins/
│       └── plugin.ts      # Inferred targets logic
├── package.json
└── project.json
```

### Простой плагин

```typescript
// libs/my-plugin/src/plugins/plugin.ts
import { CreateNodesV2 } from '@nx/devkit'

export const createNodesV2: CreateNodesV2 = [
  '**/my-config.json', // Файлы которые ищем
  async (configFiles, options, context) => {
    return await Promise.all(
      configFiles.map(async (configFile) => {
        const projectRoot = dirname(configFile)
        return {
          projects: {
            [projectRoot]: {
              targets: {
                'my-target': {
                  executor: 'nx:run-commands',
                  options: {
                    command: 'echo "Hello from my target"',
                  },
                },
              },
            },
          },
        }
      })
    )
  },
]
```

---

## Доступные плагины

### Официальные (@nx/\*)

| Плагин         | Для чего              |
| -------------- | --------------------- |
| @nx/next       | Next.js               |
| @nx/react      | React                 |
| @nx/js         | TypeScript/JavaScript |
| @nx/eslint     | ESLint                |
| @nx/playwright | Playwright E2E        |
| @nx/jest       | Jest тесты            |
| @nx/vite       | Vite                  |
| @nx/webpack    | Webpack               |

### Просмотр доступных

```bash
# Все доступные плагины
nx list

# Детали плагина
nx list @nx/next
```

---

## См. также

- [configuration.md](configuration.md) — nx.json, targetDefaults
- [caching.md](caching.md) — inputs/outputs для targets
- [commands.md](commands.md) — Команды генераторов
