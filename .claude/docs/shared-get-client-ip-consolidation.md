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
