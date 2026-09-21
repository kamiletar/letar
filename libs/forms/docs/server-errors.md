# Server Error Mapping

Утилита `mapServerErrors()` автоматически маппит серверные ошибки на поля формы.

## Проблема

Каждый проект пишет обработку серверных ошибок вручную:

```tsx
// ❌ Ручной маппинг в каждой форме
const result = await createUser(value)
if (result.error === 'EMAIL_EXISTS') {
  setError('email', 'Этот email уже зарегистрирован')
} else if (result.error === 'VALIDATION_ERROR') {
  toaster.error({ title: 'Ошибка валидации' })
}
```

## Решение

```tsx
import { mapServerErrors, applyServerErrors } from '@letar/forms'

// ✅ Одна утилита для всех форматов
<Form schema={UserSchema} onSubmit={async ({ value }) => {
  try {
    await createUser(value)
  } catch (error) {
    const mapped = mapServerErrors(error, {
      fieldMap: {
        email: { field: 'email', message: 'Этот email уже зарегистрирован' },
      },
    })
    applyServerErrors(form, mapped)
  }
}}>
```

## Поддерживаемые форматы

### Prisma

```typescript
// P2002 (unique constraint) → маппинг meta.target на поле
{ code: 'P2002', meta: { target: ['email'] } }
// → fieldErrors: [{ field: 'email', message: 'email уже существует' }]

// P2002 (composite) → первое поле из target
{ code: 'P2002', meta: { target: ['organizationId', 'name'] } }
// → fieldErrors: [{ field: 'organizationId', message: 'Комбинация organizationId + name уже существует' }]

// P2003 (foreign key) → field_name
{ code: 'P2003', meta: { field_name: 'categoryId' } }
// → fieldErrors: [{ field: 'categoryId', message: 'Связанная запись не найдена' }]

// P2025 (not found) → глобальная ошибка
{ code: 'P2025' }
// → formErrors: ['Запись не найдена']

// P2014 (relation violation) → глобальная
{ code: 'P2014' }
// → formErrors: ['Невозможно удалить — есть связанные записи']
```

### ZenStack

```typescript
// Нарушение access policy
{ reason: 'rejected-by-policy' }
// → formErrors: ['Нет доступа для выполнения этой операции']

// cannot-read-back (операция прошла, но результат недоступен)
{ reason: 'rejected-by-policy', rejectedByPolicyReason: 'cannot-read-back' }
// → formErrors: ['Операция выполнена, но результат недоступен...']

// db-query-error с Prisma кодом → делегация Prisma парсеру
{ reason: 'db-query-error', code: 'P2002', meta: { target: ['email'] } }
// → fieldErrors: [{ field: 'email', message: 'email уже существует' }]
```

### Zod v4 flatten

```typescript
// Стандартный flatten() формат
{ formErrors: ['Пароли не совпадают'], fieldErrors: { email: ['Некорректный'] } }
// → formErrors: ['Пароли не совпадают'], fieldErrors: [{ field: 'email', message: 'Некорректный' }]
```

### ActionResult

```typescript
// Строковая ошибка
{ success: false, error: 'Пользователь уже существует' }
// → formErrors: ['Пользователь уже существует']

// Вложенный Zod flatten
{ success: false, error: { fieldErrors: { name: ['Обязательное'] }, formErrors: [] } }
// → fieldErrors: [{ field: 'name', message: 'Обязательное' }]

// Строковая ошибка с полем (ActionFailure, см. ниже)
{ success: false, error: 'Такой адрес уже занят', field: 'slug' }
// → fieldErrors: [{ field: 'slug', message: '…' }], formErrors: ['…']
```

### ActionFailureError

Исключение, в которое `unwrapActionResult` превращает отказ Server Action (см. раздел ниже).
Текст — в `message`, поле — в `field`. Разбирается отдельным парсером `parseActionFailureError`,
который стоит строго перед `parseErrorObject`: тот принимает любую `Error` и положил бы текст
только в `formErrors`, потеряв поле.

## API

### mapServerErrors(error, config?)

```typescript
const mapped = mapServerErrors(error, {
  // Кастомный маппинг constraint → поле
  fieldMap: {
    email: { field: 'email', message: 'Email уже зарегистрирован' },
    organizationId_name: { field: 'name', message: 'Название занято' },
  },
  // Формат (по умолчанию auto)
  format: 'auto' | 'prisma' | 'zenstack' | 'zod' | 'action-result',
  // Locale для встроенных сообщений
  locale: 'ru' | 'en',
  // Fallback сообщение
  defaultMessage: 'Произошла ошибка',
})

// Результат: MappedServerErrors
mapped.fieldErrors // [{ field: 'email', message: '...' }]
mapped.formErrors // ['Глобальная ошибка']
```

### applyServerErrors(form, mapped)

```typescript
// Применяет ошибки к TanStack Form инстансу
applyServerErrors(form, mapped)
// fieldErrors → form.setFieldMeta(field, ...)
// formErrors → form.setErrorMap({ onSubmit: '...' })
```

## С декларативным `<Form>`

Пример выше использует низкоуровневый `useAppForm` — там `form` доступен напрямую из замыкания. Декларативная обёртка (`createForm()` → `<Form onSubmit={(data) => ...}>`) устроена иначе: её `onSubmit` получает только `data`, без инстанса формы, а обработка ошибок вынесена в `middleware.onError` — туда попадает то, что бросил сам `onSubmit`/Server Action (`FormSimple` перехватывает исключение и вызывает `middleware.onError`, см. `libs/forms/src/lib/declarative/form-root/form-simple.tsx`).

Чтобы применить `mapServerErrors`/`applyServerErrors` в этом случае, нужен доступ к инстансу формы снаружи `onSubmit` — для этого `useFormRef()`:

```tsx
import { applyServerErrors, mapServerErrors, useFormRef } from '@letar/forms'

function MaterialForm() {
  const formRef = useFormRef()

  async function handleSubmit(data: MaterialFormData) {
    // Server Action просто бросает ошибку (Prisma/ZenStack/Error) — оборачивать вручную не нужно
    await createMaterial(data)
  }

  return (
    <DomWellbesForm
      schema={MaterialSchema}
      initialValue={initialValue}
      onSubmit={handleSubmit}
      formRef={formRef}
      middleware={{
        onError: (error) => {
          const mapped = mapServerErrors(error, {
            fieldMap: { sku: { field: 'sku', message: 'Такой артикул уже используется' } },
          })
          if (formRef.current) {
            applyServerErrors(formRef.current, mapped)
          }
        },
      }}
    >
      <DomWellbesForm.Errors />
      <DomWellbesForm.Field.String name="sku" />
      <DomWellbesForm.Button.Submit>Сохранить</DomWellbesForm.Button.Submit>
    </DomWellbesForm>
  )
}
```

Ключевые моменты:

- `formRef` передаётся в `<Form>` **и** используется внутри `middleware.onError` — без него `applyServerErrors` некуда применять ошибки.
- Server Action, вызываемый из `onSubmit`, не должен ловить и оборачивать ошибку сам — `mapServerErrors` умеет разбирать «сырые» Prisma/ZenStack/Zod исключения; лишний try/catch в самом Server Action только всё усложнит.
- Не забудь `<Form.Errors />` в JSX — иначе `formErrors` (например `P2025`/`rejected-by-policy`) будут применены к форме, но нигде не отрисуются.
- Рабочий пример — `apps/domwellbes/src/app/(admin)/admin/materials/_components/material-form.tsx`.

## useFormServerAction — та же связка в один вызов

Пример выше даёт полный контроль, но требует завести `formRef`, подключить `middleware.onError`
и вызвать `mapServerErrors`/`applyServerErrors` руками в каждой форме — при большом количестве
однотипных форм ceremony оказывается выше порога, при котором тянутся к самопальному
pending/error-стейту вокруг `useState`. `useFormServerAction` — та же связка, обёрнутая в один
хук с pending-состоянием и опциональным toaster:

```tsx
import { useFormRef, useFormServerAction } from '@letar/forms'

function MaterialForm() {
  const formRef = useFormRef()
  const { run, pending } = useFormServerAction(formRef, {
    fieldMap: { sku: { field: 'sku', message: 'Такой артикул уже используется' } },
    toaster: adminToaster, // опционально — из createAppToaster() (@letar/ui) или совместимый
    successMessage: 'Материал сохранён', // опционально — без него toaster.success не вызывается
  })

  async function handleSubmit(data: MaterialFormData) {
    await run(() => createMaterial(data), () => router.push('/admin/materials/'))
  }

  return (
    <DomWellbesForm schema={MaterialSchema} initialValue={initialValue} onSubmit={handleSubmit} formRef={formRef}>
      <DomWellbesForm.Errors />
      <DomWellbesForm.Field.String name="sku" />
      <DomWellbesForm.Button.Submit loading={pending} />
    </DomWellbesForm>
  )
}
```

Ключевые моменты:

- `run(action, onSuccess?)` выполняет `action`, отслеживает `pending`, и при ошибке сам вызывает
  `mapServerErrors`/`applyServerErrors` через переданный `formRef` — `middleware.onError` не
  нужен вовсе, `action` просто бросает (как и в примере выше).
- При ошибке `run` применяет её к форме, показывает toast и **перебрасывает исходную ошибку**
  дальше (тип — `Promise<TData>`, не `Promise<TData | undefined>`) — это обязательно, не
  косметика: если бы `run` глотала ошибку, декларативный `<Form>` считал бы сабмит успешным и
  своим post-submit `reset()` стирал бы только что применённые field-level ошибки раньше, чем
  пользователь успевал бы их увидеть. Вызывающему коду свой `try/catch` всё равно не нужен —
  `<Form>` сам ловит исключение из `onSubmit` там же, где уже ловит `throw` из
  `middleware.onError`. При успехе `run` резолвится результатом `action`.
- `toaster` — опционален, минимальный контракт `{ create: (opts: { type: 'error' | 'success';
  title: string }) => void }`, совпадает с `createAppToaster()` из `@letar/ui`. Без него
  единственный канал ошибки — `<Form.Errors />` (для `formErrors`) и подсветка поля (для
  `fieldErrors`).
- `successMessage` — опционален; без него `toaster.create({ type: 'success' })` не вызывается
  (молчаливый успех — валидный случай, например когда сразу следует `router.push`).
- Низкоуровневый путь (`formRef` + `middleware.onError` вручную, пример выше) остаётся рабочим
  для тех, кому нужен полный контроль — например разное поведение `onError` в зависимости от
  типа ошибки. `useFormServerAction` не заменяет его, а снимает ceremony для типового случая.

## Отказ Server Action значением — `ActionFailure`

⚠️ **В production Next.js стирает текст любой ошибки, брошенной из Server Action** — клиент
получает «Minified React error» (код 441) вместо причины
([разбор](../../../.claude/docs/nextjs-server-action-thrown-error-message-stripped.md)).
Поэтому _ожидаемый_ отказ (бизнес-правило, дубль уникального значения) сервер возвращает
**значением**, а форма на клиенте превращает его обратно в исключение — клиентский `throw` не
стирается и доезжает до `mapServerErrors`. Настоящие неполадки по-прежнему бросаются: их текст
пользователю и не нужен, они идут в логи и трекер ошибок.

**Сервер** (Server Action). Импорт — из `@letar/forms/server-errors`: подпуть без React и Chakra.

```typescript
'use server'
import { actionFailure, catchActionFailure, UserFacingError } from '@letar/forms/server-errors'

export async function createCategory(input: CategoryInput) {
  return catchActionFailure(async () => {
    if (await isNameReserved(input.name)) {
      throw new UserFacingError('Это название зарезервировано', 'name') // поле — необязательно
    }
    return db.category.create({ data: input, select: { id: true } })
  }, {
    // свои тексты при дубле: ключ — поле или поля через «_» для составного ограничения
    uniqueMessages: { slug: 'Такой адрес уже занят — задайте другой' },
  })
}

// Отказ можно вернуть и напрямую, без исключения:
//   return actionFailure('Нельзя удалить: есть заказы', 'id')
```

`catchActionFailure` ловит **только** `UserFacingError` и нарушение unique (SQLSTATE `23505`);
всё остальное пробрасывает как есть.

**Клиент.** Два пути, оба кладут причину под поле и в `<Form.Errors />`:

```tsx
// 1. useFormServerAction: run сам узнаёт отказ-значение и бросает ActionFailureError
const { run, pending } = useFormServerAction(formRef, { toaster })
await run(() => createCategory(data), () => router.push('/admin/categories/'))

// 2. Низкоуровневый путь: unwrapActionResult + middleware.onError
const { formRef, middleware } = useActionFormErrors()
<MyForm formRef={formRef} middleware={middleware}
  onSubmit={async (data) => { unwrapActionResult(await createCategory(data)) }}>
  <MyForm.Errors />
```

При отказе `onSuccess` и тост успеха не вызываются.

### Маркер и ложные срабатывания

Отказ — это значение вида `{ success: false, error: string, field?: string }`. Маркер
`success: false` явный: успешный результат с полем `error`
(`{ items, error: 'часть строк пропущена' }`) отказом **не** считается. Значение собирай
фабрикой `actionFailure(error, field?)`, а не литералом.

⚠️ Если action уже возвращала `{ success: false, error: '…' }` (ActionResult-соглашение) и
вызывалась через `run`, теперь такое значение считается отказом: `run` бросит
`ActionFailureError` вместо резолва с этим значением. Раньше вызывающий код обязан был проверять
`result.success` сам, теперь форма делает это за него.

### Дубль уникального значения: какое поле

Prisma называет ограничение `<Table>_<field>[_<field>…]_key`. Поле выводится **только когда имя
однозначно** — три части (`MaterialCategory_slug_key` → `slug`). Составной ключ
(`WorkMaterialNorm_workId_materialId_effectiveFrom_key`), таблица с `@@map("snake_case")`,
колонка с `@map` — поля не будет: разделитель `_` не отличает их от подчёркивания внутри имени, и
ошибка под чужим полем хуже, чем общее сообщение. Пользователь получает общий текст
(`Такая запись уже существует` / `This record already exists`, язык — `locale`), а свой текст
подключается через `uniqueMessages`: ключ сверяется с хвостом имени ограничения (`…_<ключ>_key`),
при нескольких подходящих берётся самый длинный. Имя не по схеме (частичный индекс,
`@@unique(name: …)`, имя, усечённое Postgres до 63 символов) — тоже общий текст.

Определение нарушения unique от ORM не зависит: проверяется SQLSTATE в `dbErrorCode`
(ZenStack v3) и в `cause.code` (исходная pg-ошибка). Prisma-код `P2002` в `isUniqueViolation`
не входит — его разбирает `parsePrismaError`
([коды ZenStack v3](../../../.claude/docs/zenstack-v3-orm-error-codes.md)).

### Как соотносится с Better Auth throw-bridge

`assertAuthOk` (следующий раздел) решает ту же задачу с другой стороны: ответ Better Auth —
значение `{ error }` на клиенте, его нужно _бросить_, чтобы форма увидела. `ActionFailure` —
для собственных Server Action: там значение возвращает сервер, а бросает клиент.

**Vue и Angular.** Обёртки под `useFormServerAction` там нет (в Vue/Angular нет такого хука).
`ActionFailure`, `unwrapActionResult`, `catchActionFailure` и парсеры — framework-free, в
`@letar/forms-core/server-errors`, и работают в любом скине.

## Better Auth — throw-bridge

`@letar/forms` (и `mapServerErrors`/`applyServerErrors`) требует, чтобы `onSubmit` **бросал**
ошибку — низкоуровневый `useAppForm` ловит её напрямую, декларативный `<Form>` через
`middleware.onError` (см. выше). Методы клиента Better Auth (`authClient.signIn.email`,
`signUp.email`, `resetPassword`, `requestPasswordReset`, ...) так не работают — они возвращают
`{ data, error }` и никогда не бросают сами.

Канонический мост — `assertAuthOk` из `@letar/auth/client`:

```ts
import { assertAuthOk } from '@letar/auth/client'

async function handleSubmit(data: SignUpData) {
  const result = await authClient.signUp.email(data)
  assertAuthOk(result, 'Ошибка регистрации')
  setDoneEmail(data.email)
}
```

Какой текст увидит пользователь (`@letar/auth` ≥ 0.16.0): `messages[code]` → серверный `message`
на кириллице → `defaultMessage` (для ошибок с `code`: их `message` — английская заготовка Better
Auth, «Invalid email or password») → серверный `message` (ошибка без `code`, например rate-limit)
→ «Произошла ошибка». Для ru-приложений есть готовый словарь кодов:

```ts
import { assertAuthOk, AUTH_ERROR_MESSAGES_RU } from '@letar/auth/client'

assertAuthOk(result, { defaultMessage: 'Ошибка регистрации', messages: AUTH_ERROR_MESSAGES_RU })
```

`mapServerErrors` дальше разбирает обычный `Error`/строку как `ActionResult`-формат (см. раздел
выше) — отдельного парсера под Better Auth не требуется, сообщение уйдёт в `formErrors`. Если
нужен field-level маппинг конкретных `result.error.code` — передай `fieldMap`, как для любого
другого источника ошибок.

`assertAuthOk` не заменяет ветвление по конкретному `result.error.code` (например показ кнопки
повторной отправки письма при `EMAIL_NOT_VERIFIED`) — такую проверку по-прежнему нужно делать
до вызова, сама функция только устраняет финальный `if (result.error) throw new Error(...)`:

```ts
const result = await authClient.signIn.email(data)
if (result.error?.code === 'EMAIL_NOT_VERIFIED') {
  setShowResend(true)
  throw new Error('Email не подтверждён. Отправьте письмо повторно и перейдите по ссылке.')
}
assertAuthOk(result, 'Ошибка входа')
```

## fieldMap — кастомный маппинг

Ключи fieldMap:

- Имя поля (`'email'`) — маппит P2002 с `meta.target: ['email']`
- Составной ключ (`'organizationId_name'`) — маппит P2002 с `meta.target: ['organizationId', 'name']`
- Имя FK (`'categoryId'`) — маппит P2003 с `meta.field_name: 'categoryId'`

```typescript
const config = {
  fieldMap: {
    // P2002: email unique → поле email
    email: { field: 'email', message: 'Этот email уже зарегистрирован' },
    // P2002: composite unique → поле name
    organizationId_name: { field: 'name', message: 'Такое название уже занято' },
    // P2003: FK categoryId → поле categoryId
    categoryId: { field: 'categoryId', message: 'Выберите существующую категорию' },
  },
}
```

## Импорт

```typescript
// Из основного пакета
import { applyServerErrors, mapServerErrors } from '@letar/forms'

// Или из subpath (tree-shakeable)
import { applyServerErrors, mapServerErrors } from '@letar/forms/server-errors'

// Отдельные парсеры (для кастомных пайплайнов)
import { parsePrismaError, parseZenStackError } from '@letar/forms/server-errors'

// Отказ Server Action значением — сервер (без React) и клиент
import { useActionFormErrors, useFormServerAction } from '@letar/forms'
import { actionFailure, catchActionFailure, unwrapActionResult, UserFacingError } from '@letar/forms/server-errors'
```
