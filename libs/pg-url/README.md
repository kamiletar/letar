# @letar/pg-url

pg-url — shared-библиотека монорепо letar

## Установка

Библиотека уже включена в монорепозиторий.

```typescript
import { parsePostgresUrl } from '@letar/pg-url'
```

## API

### `parsePostgresUrl(url: string): ParsedPostgresUrl`

Ручной разбор строки `postgresql://user:password@host:port/db`, обходящий баг `new URL()`
(и `pg-connection-string`) на необработанном `/`/`+` в base64-пароле (см. §98 в
`PLAN-INFRA-4.md` и `security.md` про `openssl rand -base64 32`). Бросает `Error`, если строка
не матчится по формату.

```typescript
const { user, password, host, port, database } = parsePostgresUrl(process.env.DATABASE_URL)
new Pool({ user, password, host, port, database })
```

## Команды

```bash
nx test pg-url
nx lint pg-url
nx typecheck:tsgo pg-url
```

## Подключение к приложению

Обязательное — одно: добавь `@letar/pg-url` в `nx.implicitDependencies` в `package.json`
приложения (если библиотеки нет в его `dependencies`). Это ребро графа Nx; сам импорт
`@letar/pg-url` резолвится и без настроек приложения.

Когда дополнительно нужны `paths` в его `tsconfig.json` и почему `nx sync` здесь не поможет —
[libs.md](/.claude/rules/libs.md#подключение-к-приложению).
