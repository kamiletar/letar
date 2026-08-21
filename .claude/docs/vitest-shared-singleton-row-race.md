# Общая singleton-строка настроек — гонка между файлами vitest, не внутри одного

Интеграционные тесты, читающие/пишущие singleton-строку конфигурации (`ShopSettings` с
`id="default"` в domwellbes, и любой аналог — единственная строка настроек всего приложения,
общая на все тесты и на dev-стенд) редко (замечено ~1 раз на 5–7 прогонов) флакуют именно под
полным прогоном `nx test <app>`, хотя изолированный запуск одного файла всегда зелёный.

## Причина

Vitest параллелит **файлы**, а не тесты внутри файла, по воркерам. Все они бьют в одну и ту же
dev-БД (не мокается, см. [unit-testing.md](/.claude/docs/unit-testing.md)). Если singleton-строку
меняет не только тестируемый файл, а ещё и соседний (например `shop-settings.spec.ts`, который
делает `deleteMany` по `'default'` — см. сам файл), между `beforeAll` одного файла (выставляет
режим один раз на весь `describe`) и фактическим вызовом тестируемой функции внутри `it()` другой
воркер успевает сбросить или поменять настройки. Окно гонки — вся длительность `describe`, а не
один вызов.

## Симптом

Нестабильно, не детерминированно, только под полным прогоном (`nx test <app>`, 79+ файлов).
Изолированный `vitest run <file>` или прогон одного `describe` всегда проходит. Не ловится ни
`typecheck`, ни `lint` — чисто рантайм-гонка на реальной БД.

## Фикс — три пункта, применённые в domwellbes (R8, `dispatch.spec.ts`, `pickup-handoff.spec.ts`)

1. **Переустанавливать нужные поля singleton-строки прямо перед вызовом тестируемой функции
   внутри каждого `it()`**, а не полагаться только на `beforeAll`. Сужает окно гонки с «вся
   длительность describe» до «один `await`»:

   ```typescript
   async function ensureMarkingBlockSettings() {
     await prisma.shopSettings.upsert({
       where: { id: 'default' },
       update: { markingEnabled: true, markingShipmentMode: 'BLOCK', markingOfdAutoWriteOff: true },
       create: { id: 'default', markingEnabled: true, markingShipmentMode: 'BLOCK', markingOfdAutoWriteOff: true },
     })
   }

   it('BLOCK-режим отклоняет отгрузку маркируемой строки без кодов', async () => {
     const delivery = await createDelivery({/* ... */})
     try {
       await ensureMarkingBlockSettings()
       await expect(departDelivery({/* ... */})).rejects.toThrow(DeliveryStateError)
       // ...assertions...
     } finally {
       // очистка
     }
   })
   ```

2. **Оборачивать тело `it()`, создающее временные сущности (Delivery, SalesOrder и т.п.), в
   `try/finally` с очисткой в `finally`.** Без этого при упавшем assertion (в том числе из-за
   самой гонки настроек) очистка пропускается — и оставшиеся FK-связанные строки ломают `afterAll`
   **следующего** теста в этом же файле. Это не просто флак одного теста, а порча состояния,
   влияющая на все последующие.

3. **В `afterAll` — чистить зависимые записи (`StockDocument` и т.п.) по всем созданным в файле
   пользователям** (`{ in: [userId, salesUserId] }`), а не только по основному. Иначе FK-ошибка
   при `user.delete`, если «негативный» тест на роль неожиданно прошёл успешно из-за гонки и
   создал документ от имени второго пользователя.

## Отдельно: singleton не удалять, а восстанавливать

Если `beforeAll` меняет singleton-строку, читай исходные значения перед изменением и восстанавливай
их (`upsert`/`update` в `afterAll`), а не просто `delete` — на время теста удаление обнулило бы
реальные настройки (`retailStorefrontEnabled` и т.п.) для любого, кто параллельно читает
`getShopSettings()` — не только для других тестовых файлов, но и для живого dev-стенда.

## Когда применимо

Любой тест, читающий или пишущий singleton-строку через `getXxxSettings()`/аналог, которую могут
менять другие тестовые файлы того же приложения — не специфично для domwellbes или для
`ShopSettings` конкретно.

## Ссылки

- [unit-testing.md](/.claude/docs/unit-testing.md) — общие правила интеграционных тестов на
  реальной dev-БД (без моков).
- [vitest-alias-prefix-matching.md](/.claude/docs/vitest-alias-prefix-matching.md),
  [vitest-unlinked-workspace-lib-imports.md](/.claude/docs/vitest-unlinked-workspace-lib-imports.md) —
  соседние vitest-ловушки этого репозитория, другой класс проблемы (резолв модулей, не гонка
  данных).
