# @letar/consent

Общий 152-ФЗ паттерн записи согласия на обработку персональных данных: SHA-256 хэш IP,
`ConsentLog`-подобная структура данных, готовый POST-обработчик для `CookieBanner` из `@letar/ui`.

Каждое приложение генерирует свою ZenStack-схему `ConsentLog` (иногда с доп. полями вроде
`anonymousId`), поэтому библиотека не завязана на конкретный Prisma/ZenStack клиент — вызывающий
всегда передаёт свою функцию сохранения (`saveConsentLog`/`save`).

## Установка

Библиотека уже включена в монорепозиторий.

## API

### `hashIp(request: Request): string` / `hashIpFromHeaders(headers: HeaderReader): string`

Хэширует IP SHA-256 (152-ФЗ: сырой IP не хранится). Берёт первый адрес из `x-forwarded-for`
(прокси/CDN), иначе `x-real-ip`, иначе `'unknown'`. `hashIp` — для Route Handlers (принимает
целиком `Request`); `hashIpFromHeaders` — для Server Actions, где под рукой только
`next/headers()` (`HeaderReader` — любой объект с `.get(name)`, `hashIp` — тонкая обёртка над ним).
Используй `hashIpFromHeaders` напрямую, если модель `ConsentLog` приложения не совпадает с
контрактом `createConsentRoute` (пример: `dsperevod` — своя схема с `formType`/nested-связями,
переиспользует только хэширование IP, не весь фасад).

### `CookieConsentSchema` / `CookieConsentInput`

Zod-схема тела запроса в формате `CookieConsentState` из `@letar/ui` `CookieBanner`
(`{ necessary: true, analytics, marketing, version, acceptedAt }`).

### `buildConsentLogData(input, request): ConsentLogData`

Чистая функция — добавляет `ipHash` и `userAgent` к переданным полям согласия.

### `recordConsent(input, request, save): Promise<void>`

Собирает `ConsentLogData` через `buildConsentLogData` и передаёt его в `save` — асинхронную
функцию, которую передаёт вызывающее приложение (обычно `(data) => prisma.consentLog.create({ data })`).

### `createConsentRoute(options): (request: Request) => Promise<Response>`

Фабрика `POST /api/consent` для приложений с `CookieBanner`. Принимает:

- `getUserId(request)` — извлекает id пользователя из своей сессии (или `null` для анонимного согласия)
- `saveConsentLog(data)` — сохраняет в `ConsentLog` конкретного приложения

```typescript
// apps/<app>/src/app/api/consent/route.ts
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createConsentRoute } from '@letar/consent'

export const POST = createConsentRoute({
  getUserId: async (request) => {
    const session = await auth.api.getSession({ headers: request.headers })
    return session?.user?.id ?? null
  },
  saveConsentLog: (data) => prisma.consentLog.create({ data }),
})
```

Возвращает `400 { error: 'invalid' }` при невалидном теле, иначе `200 { ok: true }`.
`acceptedFunctional` в фабрике всегда `true` (необходимые cookies нельзя отклонить).

## Команды

```bash
nx test consent
nx lint consent
nx typecheck:tsgo consent
```

## Подключение к приложению

Обязательное — одно: добавь `@letar/consent` в `nx.implicitDependencies` в `package.json`
приложения (если библиотеки нет в его `dependencies`). Это ребро графа Nx; сам импорт
`@letar/consent` резолвится и без настроек приложения.

Когда дополнительно нужны `paths` в его `tsconfig.json` и почему `nx sync` здесь не поможет —
[libs.md](/.claude/rules/libs.md#подключение-к-приложению).
