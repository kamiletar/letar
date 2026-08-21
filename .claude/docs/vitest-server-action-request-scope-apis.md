# Server action под vitest напрямую (без HTTP) — три request-scope грабли

Найдено в `domwellbes` (2026-08-21, checkout): захотелось протестировать `checkoutAction`
(`'use server'`) вызовом функции напрямую из спека, минуя Playwright/HTTP. Идея правильная —
Playwright для одной ветки бизнес-логики избыточен — но вне HTTP-запроса Next.js 16 App Router
у трёх стандартных API нет `request scope`, который они ожидают, и падают тремя разными
способами. Эталонный рабочий пример —
[checkout.action.spec.ts](/apps/domwellbes/src/app/checkout/_actions/checkout.action.spec.ts)
(коммит `6bcebd5` в submodule domwellbes).

## Не путать с vitest-unlinked-workspace-lib-imports.md

[vitest-unlinked-workspace-lib-imports.md](/.claude/docs/vitest-unlinked-workspace-lib-imports.md)
— про то, что резолвер vitest не видит `@letar/*`-либу без bun-симлинка (`Cannot find package`).
Эта дока — про другой класс ошибок: пакет резолвится нормально, но три конкретных API
(`headers`, `revalidatePath`, `redirect`) обращаются к Next.js request-scope стораджу
(`AsyncLocalStorage`), которого без реального HTTP-запроса просто нет. Симптом — не «не могу
найти модуль», а рантайм-throw внутри самого вызова.

## 1. `headers()` из `next/headers` — throwForMissingRequestStore

Вне request-scope `headers()` бросает через внутренний `throwForMissingRequestStore`. Фикс —
замокать сам модуль в спеке:

```ts
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
}))
```

## 2. `revalidatePath()` из `next/cache` — Invariant: static generation store missing

Та же причина, другое сообщение. Если server action вызывает `revalidatePath()` после мутации
(стандартный паттерн, см. [server-actions.md](/.claude/rules/server-actions.md)) — вне
request-scope это `Invariant: static generation store missing`. Фикс:

```ts
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))
```

## 3. `redirect()` из `next/navigation` — безопасен сам по себе, но ловушка в другом месте

В отличие от первых двух, `redirect()` **не требует мока** — внутри он делает optional chaining
на `actionAsyncStorage` и не падает вне request-scope. Это и делает возможным тестировать server
action, завершающийся редиректом, напрямую: он бросает `Error` с полем `.digest`, начинающимся
на `NEXT_REDIRECT;<type>;<destination>;<statusCode>;` (формат `redirect-error.js`).

Реальная ловушка — не сам `redirect()`, а то, что **`apps/<app>/vitest.setup.tsx` почти всех
Next.js-приложений монорепо глобально мокает весь модуль `next/navigation`** ради
`useRouter`/`usePathname`/`useSearchParams`, без экспорта `redirect`:

```ts
// типичный блок в vitest.setup.tsx (домвелбес, aboi, archetest, ...)
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), ... })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}))
```

Любой server action, вызывающий `redirect()`, под этим глобальным мокой получит `undefined`
вместо функции и упадёт с невнятной ошибкой на самом вызове — не с понятным «нет
request-scope», а просто `TypeError: redirect is not a function` или похожим.

Проверено грепом `next/navigation` по `apps/*/vitest.setup.tsx` (2026-08-21) — паттерн без
`redirect` в **12 приложениях**: `time`, `archetest`, `form-develop-app-shadcn`, `dsperevod`,
`aprel8008`, `domwellbes`, `svoichuzhie`, `pravda`, `grandslamcup`, `studio`, `aira-web`, `aboi`.
Любой server action с `redirect()` в этих приложениях наступит на ту же грабли при попытке
протестировать его напрямую.

### Фикс А — переопределить мок в самом спеке через `importOriginal`

```ts
vi.mock('next/navigation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/navigation')>()
  return { ...actual, redirect: actual.redirect }
})
```

Спек-файл переопределяет глобальный мок из `vitest.setup.tsx` своим — `vi.mock` в самом файле
теста имеет приоритет. `importOriginal` достаёт настоящую реализацию `next/navigation` в обход
и глобального, и локального мока, так что `redirect` остаётся настоящим, а
`useRouter`/`usePathname`/`useSearchParams`, если тест их не трогает, можно не трогать вовсе.

**Когда уместен:** тест где-то ещё импортирует что-то из `next/navigation` (например
`isRedirectError`/`getURLFromRedirectError` для более строгой проверки), или хочется явно
видеть в спеке, что модуль переопределён и почему.

### Фикс Б — не завязываться на `next/navigation` вообще, проверять `.digest` подстрокой

```ts
try {
  await someServerAction(input)
  throw new Error('someServerAction должен был бросить NEXT_REDIRECT')
} catch (err) {
  const digest = err instanceof Error ? (err as Error & { digest?: unknown }).digest : undefined
  if (typeof digest !== 'string' || !digest.startsWith('NEXT_REDIRECT')) { throw err }
  expect(digest).toContain('/expected/path')
}
```

Импортировать `isRedirectError`/`getURLFromRedirectError` из `next/navigation` в спеке — тоже
удар по тому же глобальному моку: без `importOriginal` они окажутся `undefined` точно так же,
как `redirect`. Проверка `.digest` напрямую обходит это полностью — модуль `next/navigation`
вообще не импортируется в спеке.

**Когда уместен:** если фикс А кажется избыточным (в спеке больше ничего из
`next/navigation` не нужно) — это более короткий путь, который к тому же не зависит от того,
что именно замокал `vitest.setup.tsx` этого конкретного приложения.

Эталонный пример использует именно фикс Б (см. `checkout.action.spec.ts` строки 46–49 и
174–195) — но держит закомментированный фикс А тоже, как альтернативу.

## Сводка: что мокать, что нет

| API                | Модуль            | Нужен мок? | Причина                                        |
| ------------------ | ----------------- | ---------- | ---------------------------------------------- |
| `headers()`        | `next/headers`    | Да         | `throwForMissingRequestStore`                  |
| `revalidatePath()` | `next/cache`      | Да         | `Invariant: static generation store missing`   |
| `redirect()`       | `next/navigation` | Нет*       | Optional chaining, безопасен вне request-scope |

\* Не нужен сам `redirect()` — но если `vitest.setup.tsx` приложения уже мокает весь
`next/navigation` (список 12 приложений выше), нужно явно вернуть настоящий `redirect` в спеке
одним из двух фиксов выше.
