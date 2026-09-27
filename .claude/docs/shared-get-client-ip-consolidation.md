# getClientIp: консолидация в `@letar/demo-protection`, driving-school осталась отдельно

2026-09-01: в `apps/aboi/src/app/api/auth/[...all]/route.ts` был исправлен локальный
`getClientIp` (брал первый, подделываемый клиентом хоп `x-forwarded-for` вместо последнего,
дописанного Traefik). Тот же фикс уже стоял в `libs/demo-protection/src/get-client-ip.ts` —
две независимые копии одной и той же логики, нарушение shared-first (корневой `CLAUDE.md`).

## Что сделано

`libs/demo-protection/src/get-client-ip.ts` разложен на два экспорта:

- `getClientIpFromHeaders(headers: HeaderReader): string` — синхронное ядро, принимает любой
  объект с `.get(name)` (подходит и Web `Headers` из `Request.headers`, и то, что отдаёт
  `next/headers()`). Вся логика «взять последний хоп `x-forwarded-for`, иначе `x-real-ip`,
  иначе `'unknown'`» — здесь, один раз.
- `getClientIp(): Promise<string>` — старая сигнатура, тонкая обёртка над `getClientIpFromHeaders`
  для Server Component/action без явного `Request` (сама вызывает `await headers()`).

`apps/aboi` переведён на `getClientIpFromHeaders(request.headers)` — своя локальная копия
удалена. Оба контекста (async без `Request` у domwellbes/form-example, sync с `Request` у aboi)
закрыты одной реализацией без потери типобезопасности ни для одного потребителя.

## Что НЕ унифицировано — `apps/driving-school/src/lib/api-logger.ts`

Третья копия той же «последний хоп x-forwarded-for» логики, найдена тем же грепом
(`getClientIp(request: Request): string | null`). Осознанно оставлена отдельной:

- **Другой контракт возврата.** `string | null` (null = IP не найден вовсе), а не `string` с
  фолбэком `'unknown'` — вызывающий код (`createApiLogger`) кладёт результат прямо в
  `ipAddress?: string | null` поле лога API-запроса, где `null` — осмысленное значение
  («IP не определён»), а не ошибка.
- **Дополнительный источник** — `cf-connecting-ip` (Cloudflare), которого нет ни у aboi, ни у
  demo-protection: architecture репозитория предполагает единственный edge-прокси Traefik
  (`infra/traefik/`), но `api-logger.ts` обслуживает публичный API driving-school и
  подстраховывается на случай, если запрос когда-то придёт через Cloudflare отдельно.

Слияние потребовало бы либо разошедшегося API (`options` с флагом за `cf-connecting-ip` и
флагом фолбэка `null` vs `'unknown'`), либо изменения поведения driving-school (потеря
`cf-connecting-ip` или подмена `null` на `'unknown'` в БД) — обе цены больше, чем актуальный
техдолг от одной сохранённой копии из ~15 строк. Если у driving-school в будущем появится
третий потребитель с идентичным контрактом — тогда стоит выносить `getClientIpFromHeaders` с
опциональным списком доверенных доп.заголовков в саму `@letar/demo-protection`.

## Проверено

`nx run-many -t lint,typecheck:tsgo,test --projects=aboi,demo-protection` +
`nx typecheck:tsgo --projects=domwellbes,form-example` (оба других потребителя
`@letar/demo-protection`, чтобы убедиться, что рефакторинг сигнатуры их не задел). Один
падающий тест `aboi:test` (`related-products.spec.ts` → `@letar/auth/server` не резолвится
под vitest) — предсуществующий, не связан с этой правкой (не трогает `prisma.ts`/`auth`,
воспроизводится и на исходном коде до правки).
