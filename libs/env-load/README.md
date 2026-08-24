# @letar/env-load

Каскадная загрузка `.env`-файлов через `dotenv`, единая точка для паттерна, который был
скопирован в ~40 файлах монорепо (`apps/*/prisma.config.ts`, e2e `db.helpers.ts`, разовые
`scripts/*`) — см. `PLAN.md` §55.

## Использование

```ts
import { loadEnvCascade } from '@letar/env-load'

// cwd текущего процесса — как раньше `config({ path: '.env.local' })` без базовой директории
loadEnvCascade()

// явная базовая директория (e2e-хелперы, скрипты вне cwd приложения)
loadEnvCascade(projectDir)

// кастомный список файлов вместо .env.local → .env (например .env.docker для dashboard)
loadEnvCascade(undefined, ['.env.local', '.env.docker'])
```

Раньше указанный в списке файл побеждает — `dotenv.config()` не перезаписывает уже
установленные переменные, поэтому порядок аргументов задаёт приоритет.

## ⚠️ `prisma.config.ts` требует явную `dependencies`, не только `implicitDependencies`

Prisma CLI грузит `prisma.config.ts` собственным загрузчиком, который резолвит импорты через
обычный Node `require`/`import` по `node_modules`, а не через `tsconfig.json`/`paths` — путь-алиас
`customConditions` (см. `.claude/rules/libs.md`) здесь не помогает. Библиотека обязана быть
настоящей записью в `dependencies` приложения (`"@letar/env-load": "workspace:*"`), иначе
`prisma generate`/`db:push`/`db:migrate` падают с `Cannot find module '@letar/env-load'` даже при
верных `implicitDependencies` и `paths`. После добавления зависимости — `bun install` (создаёт
симлинк в `node_modules/@letar/env-load` у потребителя).

`paths` в `tsconfig.json` приложения по-прежнему нужен — для typecheck/IDE, не для рантайма
Prisma CLI.
