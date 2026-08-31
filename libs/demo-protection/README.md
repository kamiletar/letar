# @letar/demo-protection

Утилиты защиты демо-режима: rate-limiting и ограничение количества записей.

## Установка

```typescript
import { checkRateLimit, checkRecordLimit, getClientIp, getClientIpFromHeaders } from '@letar/demo-protection'
```

## API

- `getClientIp()` — определение IP клиента через `next/headers()` (Server Component / action без явного `Request`)
- `getClientIpFromHeaders(headers)` — то же самое, но синхронно, из уже имеющихся заголовков (Route Handler с явным `Request`)
- `checkRateLimit()` — проверка лимита запросов (возвращает `RATE_LIMIT_ERROR` при превышении)
- `checkRecordLimit()` — проверка лимита записей в БД (`DEFAULT_RECORD_LIMIT`)

---
