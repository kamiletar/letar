# Next.js Server Actions: Decimal нельзя вернуть клиенту

## Симптом

Server Action мутирует ZenStack-модель с полем типа `Decimal` (приходит из Prisma/ZenStack при
работе с числовыми полями `Decimal` в `schema.zmodel`) и возвращает из `db.<model>.create()`/
`update()` результат без `select` — то есть полный объект модели. При каждом сохранении через
форму в консоли сервера падает ошибка:

```
Only plain objects can be passed to Client Components from Server Components. Decimal objects are not supported.
```

Ошибка возникает **при каждом** сабмите формы, но сама мутация в БД проходит успешно — это ошибка
только про сериализацию возвращаемого значения, не про запись данных.

## Причина

Next.js Server Actions сериализуют возвращаемое значение через границу Server Action → Client
Component по RSC-протоколу — том же механизме, что несёт данные из Server Component в Client
Component. Этот протокол принимает только plain objects (и ограниченный набор встроенных типов).

`Decimal` из `decimal.js` — это class-инстанс с приватным внутренним состоянием и методами, а не
plain object. Как только `db.<model>.create()`/`update()` без `select` возвращает объект модели с
хотя бы одним `Decimal`-полем, и этот объект долетает до `return` в Server Action — сериализация
падает, даже если вызывающий клиентский код никак не использует возвращаемое значение.

## Решение

Если вызывающий код (обычно `handleSubmit` в `*-form.tsx` клиентском компоненте) не использует
возвращаемое значение — сузить `select` до того, что реально нужно, и не возвращать модель целиком:

```typescript
// ❌ Полный объект модели — Decimal-поля падают на сериализации
export async function updateMaterial(id: string, data: Partial<MaterialFormData>) {
  return db.material.update({
    where: { id },
    data,
  })
}

// ✅ select только на нужные поля — Decimal в ответ не попадает
export async function updateMaterial(id: string, data: Partial<MaterialFormData>) {
  await db.material.update({
    where: { id },
    data,
    select: { id: true },
  })
}
```

Если возвращаемое значение всё же нужно вызывающему коду — не убирать `Decimal`-поля из `select`,
а явно привести их к `Number`/`string` перед `return`, чтобы наружу ушёл plain object:

```typescript
export async function updateMaterial(id: string, data: Partial<MaterialFormData>) {
  const material = await db.material.update({
    where: { id },
    data,
    select: { id: true, unitRatio: true },
  })
  return { ...material, unitRatio: Number(material.unitRatio) }
}
```

## Известные случаи в монорепо

- **`domwellbes`** (2026-08-06) — три server action-файла в
  `apps/domwellbes/src/app/(admin)/admin/_actions/`: `material.action.ts` (поля `unitRatio`,
  `defaultWastePct`, `markupPct` модели `Material`), `material-category.action.ts` (`markupPct`
  модели `MaterialCategory`), `house.action.ts` (`totalAreaM2`, `footprintLengthM`,
  `footprintWidthM` модели `House`). Во всех трёх — один и тот же паттерн: `create`/`update` без
  `select` возвращал полный объект модели, а вызывающий `handleSubmit` возвращаемое значение не
  использовал. Фикс — `select: { id: true }` во всех трёх файлах.
