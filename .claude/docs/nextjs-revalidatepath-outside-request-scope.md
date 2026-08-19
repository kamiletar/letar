# `revalidatePath` вне request scope — Invariant в фоновых задачах

`revalidatePath()` (`next/cache`) требует активный static-generation store — контекст,
который Next.js создаёт только на время обработки HTTP-запроса. Вызов из кода без такого
контекста падает с:

```
Invariant: static generation store missing in revalidatePath /owner/time
```

## Когда это стреляет

Функция, вызывающая `revalidatePath`, обычно пишется как часть Server Action и получает
request scope бесплатно. Проблема начинается, когда ту же функцию переиспользуют из кода,
у которого request scope нет:

- фоновая задача `@letar/jobs` (pg-boss, тикает по расписанию внутри процесса приложения,
  без HTTP-запроса);
- любой другой вызов вне Next.js request lifecycle (worker, cron, ручной скрипт).

**Прецедент (studio, 2026-08-19):** `generateInvoiceFromHours()` в `src/lib/billing.ts`
вызывается и из owner-экшена (`_actions/invoices.action.ts`, request scope есть), и из
`src/jobs/biweekly-hourly-invoices.ts` (фоновая задача, scope нет). До перехода задач с
HTTP-ручек `/api/cron/*` на встроенный планировщик (`PLAN.md` §75, 2026-08-12) request scope
был всегда — ручку дёргал HTTP-запрос от `dashboard-agent`. После переезда на `@letar/jobs`
тот же код стал выполняться без него, и первый же прогон (16.08.26 09:00) уронил задачу.

## Фикс

Обернуть вызов в try/catch — если revalidate недоступен, страница получит свежие данные при
следующем обычном заходе (кеш просто протухнет на разумный срок, не навсегда):

```typescript
function safeRevalidatePath(path: string): void {
  try {
    revalidatePath(path)
  } catch {
    // вне HTTP-запроса (фоновая задача) — страница обновится сама при следующем заходе
  }
}
```

Применять к каждой функции, которая **может** вызываться и из Server Action, и из фоновой
задачи — не только к той, что уже сломалась. В `billing.ts` под этот критерий попали все три
экспортируемые функции (`generateInvoiceFromHours`, `createAdvanceInvoice`,
`grantBonusAdvance`), хотя на 2026-08-19 из задачи вызывается только первая — остальные две
имели тот же паттерн и с тем же риском для будущих задач.

## Как не наступить снова

Любая функция в `apps/<app>/src/lib/*`, которая переиспользуется и Server Action, и
`src/jobs/*.ts` (или другим кодом без request scope), не должна звать `revalidatePath`
напрямую. Либо `safeRevalidatePath`-обёртка рядом с функцией, либо (если revalidate нужен
только на стороне Server Action) — вынести вызов `revalidatePath` из общей функции наружу, в
сам экшен.
