# @letar/demo-protection

Утилиты защиты демо-режима: rate-limiting и ограничение количества записей.

## Установка

```typescript
import { checkRateLimit, checkRecordLimit, getClientIp } from '@letar/demo-protection'
```

## API

- `getClientIp()` — определение IP клиента
- `checkRateLimit()` — проверка лимита запросов (возвращает `RATE_LIMIT_ERROR` при превышении)
- `checkRecordLimit()` — проверка лимита записей в БД (`DEFAULT_RECORD_LIMIT`)

---
