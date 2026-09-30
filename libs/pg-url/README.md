# @letar/pg-url

Разбор строки подключения PostgreSQL без зависимостей — корректно читает пароль с необработанными `/` и `+`.

## Установка

```bash
npm i @letar/pg-url@beta
```

```typescript
import { parsePostgresUrl } from '@letar/pg-url'
```

## API

### `parsePostgresUrl(url: string): ParsedPostgresUrl`

Ручной разбор строки `postgresql://user:password@host:port/db`, обходящий баг `new URL()`
(и `pg-connection-string`) на необработанном `/`/`+` в base64-пароле (например, сгенерированном
`openssl rand -base64 32`). Бросает `Error`, если строка
не матчится по формату.

```typescript
const { user, password, host, port, database } = parsePostgresUrl(process.env.DATABASE_URL)
new Pool({ user, password, host, port, database })
```
