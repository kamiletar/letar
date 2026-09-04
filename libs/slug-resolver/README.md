# @letar/slug-resolver

Адрес живёт вечно — заповедь №25 студии (`.claude/private/WEBSTUDIO.md`). Переименованная
сущность отвечает постоянным редиректом на новый слаг, удалённая — честной страницей «было,
больше нет» (заповедь №23), а не безликим 404. Не завязана на ZenStack/Prisma — источники
данных передаются как произвольные async-колбэки, что внутри них (запрос к БД, таблица
редиректов, поле `previousSlugs`) решает приложение.

## Установка

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
странице, чтобы та отрисовала объяснение через `AppEmptyState` (заповедь №23).

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
сама страница-объяснение важнее кода статуса (см. текст заповеди №25).

## Статус (2026-09-05)

Спроектировано и покрыто тестами в изоляции — **интеграция ни в одно приложение ещё не
сделана**. Хранение истории слагов (`previousSlugs`/таблица редиректов) и soft-delete —
ответственность схемы каждого приложения, не этой библиотеки. См. `/commandments-check`.

## Команды

```bash
nx test slug-resolver
nx lint slug-resolver
nx typecheck:tsgo slug-resolver
```

## Подключение к приложению

Обязательное — одно: добавь `@letar/slug-resolver` в `nx.implicitDependencies` в `package.json`
приложения (если библиотеки нет в его `dependencies`). Это ребро графа Nx; сам импорт
`@letar/slug-resolver` резолвится и без настроек приложения.

Когда дополнительно нужны `paths` в его `tsconfig.json` и почему `nx sync` здесь не поможет —
[libs.md](/.claude/rules/libs.md#подключение-к-приложению).
