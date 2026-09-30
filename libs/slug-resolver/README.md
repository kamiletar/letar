# @letar/slug-resolver

Адрес живёт вечно. Переименованная
сущность отвечает постоянным редиректом на новый слаг, удалённая — честной страницей «было,
больше нет», а не безликим 404. Не завязана на ZenStack/Prisma — источники
данных передаются как произвольные async-колбэки, что внутри них (запрос к БД, таблица
редиректов, поле `previousSlugs`) решает приложение.

## Установка

```bash
npm i @letar/slug-resolver@beta
```

Peer-зависимость: `next` (>=15) — только для `@letar/slug-resolver/next`.

```typescript
import { resolveSlugOutcome } from '@letar/slug-resolver'
import { resolveSlugPage } from '@letar/slug-resolver/next'
```

## API

### `resolveSlugOutcome({ slug, findCurrent, findPreviousRedirect?, findGone? })`

Framework-agnostic ядро. Порядок проверок фиксирован и намеренный: текущая сущность → история
редиректов → gone-запись → `not-found`. Раньше найденное не переопределяется позже найденным —
если приложение допускает переиспользование слага, живая сущность всегда побеждает устаревшую
запись истории.

```typescript
const outcome = await resolveSlugOutcome({
  slug,
  findCurrent: (s) => db.house.findUnique({ where: { slug: s } }),
  findPreviousRedirect: (s) => db.houseSlugHistory.findUnique({ where: { oldSlug: s } }),
  findGone: (s) => db.house.findFirst({ where: { previousSlug: s, deletedAt: { not: null } } }),
})
// { kind: 'found', entity } | { kind: 'redirect', to } | { kind: 'gone', info } | { kind: 'not-found' }
```

### `resolveSlugPage({ ...то же самое, toHref })` (`@letar/slug-resolver/next`)

Next.js App Router обёртка. Сама вызывает `permanentRedirect(toHref(outcome.to))` при редиректе
и `notFound()` при полном отсутствии; `gone`-ветку не решает сама — возвращает `{ gone: info }`
странице, чтобы та отрисовала объяснение (например, компонентом пустого состояния).

```typescript
// app/houses/[slug]/page.tsx
const result = await resolveSlugPage({
  slug: params.slug,
  toHref: (s) => `/houses/${s}`,
  findCurrent: (s) => db.house.findUnique({ where: { slug: s } }),
  findGone: (s) => db.house.findFirst({ where: { previousSlug: s, deletedAt: { not: null } } }),
})
if ('gone' in result) { return <GoneExplanation info={result.gone} /> }
return <HousePage house={result.entity} />
```

⚠️ **Настоящий HTTP 410 из page-компонента не выставить** — App Router `notFound()` всегда
отдаёт 404. Для честного статуса `gone`-ответу нужен route handler/proxy поверх страницы;
сама страница-объяснение важнее кода статуса.

Хранение истории слагов (`previousSlugs`/таблица редиректов) и soft-delete — ответственность схемы приложения, не этой библиотеки.
