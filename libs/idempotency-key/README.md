# @letar/idempotency-key

Клиентский ключ идемпотентности одной попытки создания заказа/покупки.

Ключ генерируется в браузере (`crypto.randomUUID()`) и хранится в `sessionStorage`, а не в памяти
компонента — переживает `reload`/`back` той же вкладки, но не переживает закрытие вкладки
(короткоживущий "черновик попытки", не постоянный идентификатор). Один и тот же ключ на повторных
отправках одной формы гарантирует, что сервер (fast-path `findUnique` + `try{create}catch` на
`@unique`-нарушении) не создаст второй заказ из-за двойного клика или повторной отправки после
`reload`/`back`.

## Установка

```bash
npm i @letar/idempotency-key@beta
```

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

Приложение задаёт собственный `storageKey`, специфичный сценарию использования (checkout,
покупка билета на конкретное событие):

```typescript
const idempotencyStorageKey = `my-shop:ticket-idempotency-key:${eventSlug}`
const idempotencyKey = getOrCreateIdempotencyKey(idempotencyStorageKey)
// ...после успешной покупки:
clearIdempotencyKey(idempotencyStorageKey)
```
