# Configuration

Конфигурация Nx workspace через nx.json и project.json.

---

## nx.json — глобальная конфигурация

```json
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "cacheDirectory": ".nx/cache",

  // Именованные inputs для кэширования
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "production": ["default", "!{projectRoot}/**/*.spec.ts", "!{projectRoot}/tsconfig.spec.json"],
    "sharedGlobals": []
  },

  // Плагины с inferred targets
  "plugins": [
    {
      "plugin": "@nx/next/plugin",
      "options": {
        "buildTargetName": "build",
        "devTargetName": "dev"
      }
    }
  ],

  // Дефолты для targets
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "cache": true
    },
    "test": {
      "dependsOn": ["^build"],
      "inputs": ["default", "^production"]
    }
  },

  // Параллельность
  "parallel": 3,

  // Nx Cloud
  "nxCloudId": "...",

  // Daemon
  "daemon": { "enabled": true }
}
```

---

## project.json — конфигурация проекта

```json
{
  "name": "premium-rosstil",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "apps/premium-rosstil/src",
  "projectType": "application",
  "tags": ["type:app", "scope:premium"],
  "implicitDependencies": ["@letar/chakra-provider"],

  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "next build",
        "cwd": "apps/premium-rosstil"
      },
      "dependsOn": ["^build"],
      "cache": true,
      "inputs": ["production", "^production"],
      "outputs": ["{workspaceRoot}/apps/premium-rosstil/.next"]
    },

    "zenstack:generate": {
      "executor": "nx:run-commands",
      "options": {
        "command": "zenstack generate",
        "cwd": "apps/premium-rosstil"
      },
      "cache": true,
      "inputs": ["{projectRoot}/schema.zmodel"],
      "outputs": ["{projectRoot}/src/generated"]
    }
  }
}
```

---

## Поля target

| Поле                   | Описание                              |
| ---------------------- | ------------------------------------- |
| `executor`             | Исполнитель задачи                    |
| `options`              | Опции для исполнителя                 |
| `configurations`       | Именованные конфигурации (prod, dev)  |
| `defaultConfiguration` | Конфигурация по умолчанию             |
| `dependsOn`            | Зависимые задачи (`^` = deps проекта) |
| `cache`                | Кэшировать результаты                 |
| `inputs`               | Файлы влияющие на кэш                 |
| `outputs`              | Файлы генерируемые задачей            |
| `parallelism`          | Можно ли запускать параллельно        |

---

## Executors

### nx:run-commands

Универсальный executor для shell команд:

```json
{
  "targets": {
    "custom": {
      "executor": "nx:run-commands",
      "options": {
        "command": "echo 'Hello'",
        "cwd": "{projectRoot}",
        "env": { "NODE_ENV": "production" }
      }
    }
  }
}
```

### Специализированные executors

| Плагин     | Executor        | Назначение      |
| ---------- | --------------- | --------------- |
| @nx/next   | @nx/next:build  | Next.js сборка  |
| @nx/vite   | @nx/vite:build  | Vite сборка     |
| @nx/eslint | @nx/eslint:lint | ESLint проверка |
| @nx/jest   | @nx/jest:jest   | Jest тесты      |

---

## dependsOn

Определяет порядок выполнения задач:

```json
{
  "build": {
    // Сначала собрать все зависимости
    "dependsOn": ["^build"]
  },
  "test": {
    // Сначала lint этого проекта, потом build зависимостей
    "dependsOn": ["lint", "^build"]
  },
  "lint": {
    // Сначала oxlint (fast-fail), потом ESLint
    "dependsOn": ["oxlint"]
  }
}
```

**Синтаксис:**

- `^target` — target всех зависимостей проекта
- `target` — target этого же проекта
- `project:target` — конкретный target конкретного проекта

---

## configurations

Именованные конфигурации для разных окружений:

```json
{
  "build": {
    "executor": "@nx/next:build",
    "options": {
      "outputPath": "dist/apps/my-app"
    },
    "configurations": {
      "production": {
        "optimization": true,
        "sourceMap": false
      },
      "development": {
        "optimization": false,
        "sourceMap": true
      }
    },
    "defaultConfiguration": "production"
  }
}
```

Использование:

```bash
nx build my-app                      # production (default)
nx build my-app --configuration=development
nx build my-app -c development       # Короткая форма
```

---

## Переменные путей

| Переменная        | Значение                     |
| ----------------- | ---------------------------- |
| `{projectRoot}`   | Путь к проекту (apps/my-app) |
| `{projectName}`   | Имя проекта (my-app)         |
| `{workspaceRoot}` | Корень workspace             |

Пример:

```json
{
  "inputs": ["{projectRoot}/**/*", "{workspaceRoot}/tsconfig.base.json"],
  "outputs": ["{projectRoot}/dist", "{workspaceRoot}/dist/{projectName}"]
}
```

---

## targetDefaults

Глобальные настройки для targets в nx.json:

```json
{
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "cache": true,
      "inputs": ["production", "^production"]
    },
    "oxlint": {
      "executor": "nx:run-commands",
      "options": {
        "command": "bunx oxlint {projectRoot}/src --config .oxlintrc.json",
        "cwd": "{workspaceRoot}"
      },
      "cache": true,
      "inputs": ["default", "{workspaceRoot}/.oxlintrc.json"]
    }
  }
}
```

> Настройки из targetDefaults применяются ко всем проектам. project.json может их переопределить.

---

## См. также

- [caching.md](caching.md) — Подробнее о inputs/outputs
- [plugins.md](plugins.md) — Inferred targets от плагинов
- [project-structure.md](project-structure.md) — Теги и boundaries
