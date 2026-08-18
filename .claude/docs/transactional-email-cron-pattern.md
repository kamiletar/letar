# Паттерн cron-рассылок писем

Устоявшийся паттерн для фоновых задач вида «найти кандидатов в БД → отправить письмо →
пометить дедуп-полем → пропустить/залогировать ошибку». Реализован трижды дословно по структуре
в `apps/aboi`: `birthday-promo`, `abandoned-cart`, `review-request`. Общая часть — структура
цикла и обработка ошибок; SQL/Prisma-запрос кандидатов у каждой фичи свой и в общий код не
выносится (слишком разная форма условий).

## Форма lib-функции

```typescript
export interface XxxResult {
  sent: number
  /** Только для маркетинговых рассылок — см. ниже. */
  noConsent?: number
  errors: string[]
}

export async function sendXxxEmails(): Promise<XxxResult> {
  const candidates = await prismaAuth.<model>.findMany({ where: { /* специфично для фичи */ } })

  const result: XxxResult = { sent: 0, errors: [] }

  for (const candidate of candidates) {
    try {
      const emailResult = await sendGenericEmail({ to: candidate.email, /* ... */ })

      if (!emailResult.success) {
        reportEmailFailure({ type: 'generic', to: candidate.email, error: emailResult.error ?? 'unknown' })
        result.errors.push(`${candidate.email}: ${emailResult.error ?? 'send failed'}`)
        continue
      }

      await prismaAuth.<model>.update({
        where: { id: candidate.id },
        data: { <dedupField>: new Date() },
      })
      result.sent++
    } catch (err) {
      result.errors.push(`${candidate.email}: ${err instanceof Error ? err.message : 'unknown error'}`)
    }
  }

  return result
}
```

Ключевое: дедуп-поле (`abandonedEmailSentAt`, `reviewRequestEmailSentAt`,
`UserProfile.lastBirthdayPromoYear`) пишется **только после** успешной отправки — при ошибке
отправки запись не помечается, следующий прогон кандидата подхватит снова. Это делает cron
идемпотентным без отдельной защиты от повторного запуска.

Источники: [birthday-promo.ts](/apps/aboi/src/lib/birthday-promo.ts),
[abandoned-cart.ts](/apps/aboi/src/lib/abandoned-cart.ts),
[review-request.ts](/apps/aboi/src/lib/review-request.ts).

## Форма route.ts

```typescript
import { sendXxxEmails } from '@/lib/xxx'
import { verifyCronSecret } from '@letar/api-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await sendXxxEmails()
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    console.error('[Cron] xxx failed', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

Все три route-файла (`/api/cron/birthday-promo`, `/api/cron/abandoned-cart`,
`/api/cron/review-request`) отличаются только импортом lib-функции и текстом лога — не
рефакторится в общий helper, роут-файл слишком тонкий, чтобы оправдать абстракцию.

## Регистрация в dashboard-agent

Каждая задача — плоский объект `CronJob` в `DEFAULT_CRON_JOBS` в
[dashboard-agent/src/lib/cron.ts](/apps/dashboard-agent/src/lib/cron.ts):

```typescript
export interface CronJob {
  id: string
  name: string
  app: string
  endpoint: string
  schedule: string // cron-выражение
  description: string
  enabled: boolean
  server?: CronServer // на каком сервере выполнять
  timeoutMs?: number // по умолчанию — DEFAULT_TIMEOUT_MS
}
```

```typescript
{
  id: 'aboi-abandoned-cart',
  name: 'Abandoned Cart (aboi)',
  app: 'aboi',
  endpoint: '/api/cron/abandoned-cart',
  schedule: '0 * * * *', // почасовой прогон — порог брошенности 24ч, ловит почти сразу
  description: 'Письмо клиентам с непустой корзиной, не тронутой 24 часа',
  enabled: true,
  server: 's2',
},
```

Расписание подбирается по чувствительности дедуп-окна: `abandoned-cart` — почасовое (порог 24ч,
важно не давать письму опоздать намного), `birthday-promo`/`review-request` — суточное (порог
считается в днях, разброс в пределах суток не критичен).

Агент отправляет секрет per-app (`getAppCronSecret(job.app)`) заголовком `X-Cron-Secret`, его и
проверяет `verifyCronSecret()` на стороне приложения — секрет общий на всё приложение, не на
конкретную задачу.

## Транзакционное письмо vs маркетинговая рассылка

Неочевидный, но обязательный выбор при добавлении новой такой задачи: письмо требует консент-гейта
или нет. Критерий — не «это автоматическая рассылка» (все три автоматические), а **привязано ли
письмо к конкретному действию/заказу этого пользователя** (транзакционное, консент не нужен) или
**инициировано бизнесом безотносительно к текущему действию клиента** (маркетинг, нужен opt-in).

Юридическая рамка — 152-ФЗ и ст. 18 «О рекламе»: ограничения касаются именно рекламных
коммуникаций, не сервисных уведомлений о статусе уже совершённого пользователем действия. См.
также [personal-data.md](/.claude/docs/personal-data.md).

- **`birthday-promo`** — маркетинг (промокод не привязан к заказу, инициатива бизнеса) → гейт.
- **`abandoned-cart`** — маркетинг (побуждение вернуться и купить) → гейт.
- **`review-request`** — транзакционное (реакция на конкретный доставленный заказ, как письмо о
  смене статуса) → без гейта.

Маркетинговые lib-функции фильтруют кандидатов через
[`filterMarketingConsentedUserIds`](/apps/aboi/src/lib/marketing-consent.ts) **до** цикла
отправки, не внутри него:

```typescript
const consentedIds = await filterMarketingConsentedUserIds(candidates.map((c) => c.userId))
const noConsentCount = candidates.length - consentedIds.size
const consentedCandidates = candidates.filter((c) => consentedIds.has(c.userId))
```

`filterMarketingConsentedUserIds` берёт **последнюю** запись `ConsentLog` на пользователя
(`DISTINCT ON` + `ORDER BY consentedAt DESC` — таблица не уникальна по `userId`, согласие можно
переотправить). Пользователь без единой записи `ConsentLog` считается **не давшим** согласие —
рассылка только по явному opt-in, никогда по умолчанию.

`review-request.ts` этот фильтр не импортирует вовсе — это и есть обоснование в коде: заказ
`DELIVERED` с email покупателя достаточен, дополнительной проверки согласия не требуется.

## Тестовый паттерн

Vitest, мокаются `prismaAuth` (конкретная модель) и `@letar/email`:

```typescript
vi.mock('./prisma', () => ({
  prismaAuth: { cart: { findMany: vi.fn(), update: vi.fn() } }, // или order/promo — по модели
}))

vi.mock('@letar/email', () => ({
  sendGenericEmail: vi.fn(),
  reportEmailFailure: vi.fn(),
}))

// только для маркетинговых функций:
vi.mock('./marketing-consent', () => ({ filterMarketingConsentedUserIds: vi.fn() }))
```

`beforeEach` — `vi.clearAllMocks()`, для маркетинговых функций дефолтный мок
`filterMarketingConsentedUserIds` разрешает `Set` из всех переданных id (все согласны), в тесте на
отсутствие согласия переопределяется `mockResolvedValueOnce(new Set())`.

Обязательные кейсы (по образцу
[abandoned-cart.test.ts](/apps/aboi/src/lib/abandoned-cart.test.ts) и
[review-request.test.ts](/apps/aboi/src/lib/review-request.test.ts)):

1. **Пустой результат** — нет кандидатов → `sent: 0, errors: []`, `sendGenericEmail` не вызван.
2. **Успешная отправка + дедуп** — `sendGenericEmail` вызван с ожидаемым `to`/`buttonUrl`,
   `update` вызван с `{ where: { id }, data: { <dedupField>: expect.any(Date) } }`.
3. **Ошибка отправки не помечает дедуп** — `sendGenericEmail` возвращает
   `{ success: false, error: 'smtp down' }` → `errors[0]` содержит email, `reportEmailFailure`
   вызван, `update` **не** вызван.
4. **Точный shape `where`** — отдельный тест, сверяющий объект `where`, переданный в `findMany`,
   поле за полем (например `status: 'ACTIVE'`, `abandonedEmailSentAt: null`,
   `user: { isAnonymous: false }`) — ловит регрессии в условии выборки, которые проходят все
   остальные тесты благодаря замоканным данным.
5. **Для маркетинговых функций дополнительно** — исключение кандидата без согласия: мок
   `filterMarketingConsentedUserIds` возвращает пустой `Set`, ассерт `noConsent: 1`, email/update
   не вызваны.

`birthday-promo.ts` на момент написания документа не имеет `.test.ts` — паттерн тестов для новой
задачи по этому образцу переносится один в один, включая кейс 4.
