# @letar/idempotency-key

Клиентский ключ идемпотентности одной попытки создания заказа/покупки — паттерн монорепо, см.
[`.claude/docs/client-idempotency-key-order-creation.md`](/.claude/docs/client-idempotency-key-order-creation.md).

Ключ генерируется в браузере (`crypto.randomUUID()`) и хранится в `sessionStorage`, а не в памяти
компонента — переживает `reload`/`back` той же вкладки, но не переживает закрытие вкладки
(короткоживущий "черновик попытки", не постоянный идентификатор). Один и тот же ключ на повторных
отправках одной формы гарантирует, что сервер (fast-path `findUnique` + `try{create}catch` на
`@unique`-нарушении) не создаст второй заказ из-за двойного клика или повторной отправки после
`reload`/`back`.

## Установка

Библиотека уже включена в монорепозиторий:

```typescript
import { clearIdempotencyKey, getOrCreateIdempotencyKey } from '@letar/idempotency-key'
```

## API

### `getOrCreateIdempotencyKey(storageKey: string): string`

Читает ключ из `sessionStorage[storageKey]`, если он уже есть — возвращает его. Иначе генерирует
новый `crypto.randomUUID()`, сохраняет и возвращает его.

`sessionStorage` может быть недоступен (приватный режим и т.п.) — в этом случае функция не бросает
исключение, а возвращает свежий `crypto.randomUUID()` без сохранения (ключ не переживёт `reload`,
но заказ всё равно оформится).

### `clearIdempotencyKey(storageKey: string): void`

Удаляет ключ из `sessionStorage[storageKey]`. Вызывать после успешного завершения заказа/покупки —
на странице успеха, не в самом server action (action может не успеть отработать до конца из-за
`redirect()`). Новая попытка должна получить новый ключ.

## Использование

Каждое приложение задаёт собственный `storageKey`, специфичный сценарию использования (checkout,
merch, покупка билета на конкретное событие):

```typescript
// apps/svoichuzhie/src/app/_components/buy-ticket-form.tsx
const idempotencyStorageKey = `svoichuzhie:ticket-idempotency-key:${eventSlug}`
const idempotencyKey = getOrCreateIdempotencyKey(idempotencyStorageKey)
// ...после успешной покупки:
clearIdempotencyKey(idempotencyStorageKey)
```

## Команды

```bash
nx test idempotency-key
nx lint idempotency-key
nx typecheck:tsgo idempotency-key
```

## Подключение к приложению

Обязательное — одно: добавь `@letar/idempotency-key` в `nx.implicitDependencies` в `package.json`
приложения (если библиотеки нет в его `dependencies`). Это ребро графа Nx; сам импорт
`@letar/idempotency-key` резолвится и без настроек приложения.

Когда дополнительно нужны `paths` в его `tsconfig.json` и почему `nx sync` здесь не поможет —
[libs.md](/.claude/rules/libs.md#подключение-к-приложению).
