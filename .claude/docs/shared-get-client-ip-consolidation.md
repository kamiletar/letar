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

## ⚠️ 2026-09-27: `libs/consent/src/lib/hash-ip.ts` — четвёртая копия, найдена с тем же дефектом

`@letar/consent`'s `hashIpFromHeaders`/`hashIp` (используются в записи согласий по 152-ФЗ минимум
в ~13 приложениях через `createConsentRoute`/`recordConsent`, плюс напрямую в `dsperevod` и
`flora`) брали **первый** элемент `x-forwarded-for` — тот самый баг, что был у `aboi` до
2026-09-01: произвольная строка, которую клиент указывает сам в запросе, хэшировалась и
записывалась как «IP согласия». Юридическая цена здесь выше, чем у rate-limit: запись согласия
существует именно как доказательство для проверки РКН — с фиктивным IP она доказывает связь
согласия с личностью не больше, чем её отсутствие.

**Что сделано:** исправлена логика `hashIpFromHeaders` на «последний элемент `x-forwarded-for`»
(тот же алгоритм, что в `getClientIpFromHeaders` — см. выше), результат хэшируется SHA-256 как и
раньше. **Осознанно НЕ переведено на делегирование в `@letar/demo-protection`:** в отличие от
трёх приложений в первом инциденте, `@letar/consent` тянут ~13 приложений через
`createConsentRoute`, часть из них (`animatrona-tracker`, `archetest`, `driving-school`,
`grandslamcup`, `kami`, `studio`, `svoichuzhie`, `time`, `dsperevod`) не имеют
`@letar/demo-protection` в `dependencies` вовсе — добавление зависимости раздуло бы точечный фикс
одного файла в правки `package.json`/`bun install` по девяти приложениям сразу, каждое из которых
пришлось бы дополнительно тайпчекать и (по правилам `deploy-coordination.md`) собирать
(`nx build`) перед деплоем. Сохранённая копия логики — тот же компромисс, что и у driving-school
выше, только с бо́льшим числом потребителей на другой чаше весов.

**Как найти такую же ловушку в другом месте:** грепом на паттерн разбора без взятия последнего
элемента —

```bash
grep -rn "x-forwarded-for" --include="*.ts" libs apps | grep -v "@letar/demo-protection\|get-client-ip"
```

и вручную проверить каждое совпадение: если код берёт `.split(',')[0]` (первый элемент) вместо
последнего — это тот же дефект, не rate-limit-специфичный: он ломает и авторизацию по IP, и
логирование, и юридически значимые записи согласия одинаково, потому что первый элемент
`x-forwarded-for` в любом контексте — это данные, которые прислал сам клиент, а не то, что
установил единственный доверенный edge-прокси репозитория (Traefik).

Проверено: `nx test consent` (16/16), `nx typecheck:tsgo consent`, `nx typecheck:tsgo domwellbes`,
`nx typecheck:tsgo dsperevod`, `nx typecheck:tsgo flora` — все зелёные без изменений в
приложениях-потребителях (сигнатуры `hashIp`/`hashIpFromHeaders` не менялись, только внутренняя
логика выбора IP).

## Проверено

`nx run-many -t lint,typecheck:tsgo,test --projects=aboi,demo-protection` +
`nx typecheck:tsgo --projects=domwellbes,form-example` (оба других потребителя
`@letar/demo-protection`, чтобы убедиться, что рефакторинг сигнатуры их не задел). Один
падающий тест `aboi:test` (`related-products.spec.ts` → `@letar/auth/server` не резолвится
под vitest) — предсуществующий, не связан с этой правкой (не трогает `prisma.ts`/`auth`,
воспроизводится и на исходном коде до правки).

## ✅ 2026-09-27: полный грепом-аудит `x-forwarded-for` по монорепо — 7 мест исправлено

Грепом `x-forwarded-for` по `apps`+`libs` (за вычетом `hash-ip.ts`/`get-client-ip.ts` и
`.spec.`/`.test.`) найдено 12 мест для ручной проверки. Итог:

**Исправлено (7 мест, все брали первый элемент вместо последнего):**

| Приложение       | Файл                                                         | Контекст                                                    | Делегировано в `@letar/demo-protection`?                                              |
| ---------------- | ------------------------------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `dsperevod`      | `src/lib/action-helpers.ts` (`logAudit`)                     | 152-ФЗ журнал доступа, `ipAddress` в `AuditLog`             | Нет — локальный хелпер (1 место, нет зависимости на демо-protection ради него одного) |
| `svoichuzhie`    | `order.action.ts`, `ticket.action.ts`, `subscribe.action.ts` | ключ rate-limit (`order:${ip}` и т.п.)                      | Да — добавлен как реальная зависимость (3 места)                                      |
| `aboi`           | `src/lib/checkout.ts` (проверка пина сертификата)            | `hashIp(clientIp)` для `validateCertificate`                | Да — `getClientIpFromHeaders` уже был импортирован, использован не везде              |
| `domwellbes`     | `src/lib/render-agent/route-auth.ts`                         | rate-limit устройства рендер-агента                         | Да — уже был реальной зависимостью                                                    |
| `driving-school` | `register.action.ts`, `accept-oauth-consent.action.ts`       | `ipAddress` в записи принятия оферты/политики (юр. значимо) | Да — добавлен как реальная зависимость (2 места)                                      |

Для `svoichuzhie` и `driving-school` добавление `@letar/demo-protection` в реальные
`dependencies` потребовало три места (см. [libs.md](/.claude/rules/libs.md) — dependencies +
`tsconfig.json` paths + `next.config` `transpilePackages`), по образцу `domwellbes`. Для
`dsperevod` (единственное место в приложении) заведён локальный хелпер вместо новой
workspace-зависимости — то же решение, что уже описано выше для `driving-school`/`api-logger.ts`
и `@letar/consent`: цена подключения новой либы ради одного call site выше пользы.

**Проверены и оставлены без изменений — уже корректны:**

- `apps/auth-hub/src/lib/geo.ts` — уже использует `getClientIp()` из `@letar/demo-protection`,
  комментарий соответствует коду.
- `apps/auth-hub/src/app/(auth)/sign-in/page.tsx` — только упоминание в JSDoc-комментарии, разбора
  заголовка в коде нет.

**Осознанно не тронуто (не в скоупе этого аудита):**

- `apps/domwellbes/src/lib/auth.ts`, `libs/auth/src/server/create-auth/index.ts` — `ipAddressHeaders:
  ['x-forwarded-for', ...]` это опция конфигурации Better Auth (framework сам решает алгоритм
  выбора хопа), не самописный парсинг.
- `apps/flora/src/modules/identity/server/auth.ts` — тот же случай, `advanced.ipAddress.ipAddressHeaders`.
- `apps/driving-school/src/lib/api-logger.ts` — см. раздел выше, третья копия с другим контрактом
  (`cf-connecting-ip`, `string | null`).

Проверено на каждое затронутое приложение: `nx typecheck:tsgo`, `nx test`
(`dsperevod`/`svoichuzhie`/`aboi`/`domwellbes`/`driving-school` — все зелёные), `nx lint`
(без новых предупреждений/ошибок), `nx build` для `svoichuzhie` (успешно) и `driving-school`
(упал OOM на этой машине — `nextjs-build-worker-count-oom-shared-host.md`, к резолву импорта
`@letar/demo-protection` не относится: тайпчек уже подтвердил резолв через project references,
и тот же патторн уже работает в собранном `domwellbes`).
