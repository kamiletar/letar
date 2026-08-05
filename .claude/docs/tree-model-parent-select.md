# Self-referencing древовидные модели — parentId через NativeSelect

Модели с иерархией внутри самих себя (категория ссылается на родительскую категорию той же
модели: `MaterialCategory.parentId`, `WorkCategory.parentId` в `apps/domwellbes`) упираются в
ограничение HTML-формы: `<select>` не может выразить «значение не выбрано» через `undefined` — при
отсутствии родителя браузер всё равно отдаёт какую-то строку.

## Решение

Первая опция списка — синтетический сентинел «нет родителя» с пустым значением:

```tsx
const parentOptions = [
  { title: '— нет (корневая) —', value: '' },
  ...categories.map((c) => ({ title: c.name, value: c.id })),
]

<DomWellbesForm.Field.NativeSelect name="parentId" options={parentOptions} />
```

На сервере пустая строка нормализуется в `null` перед записью в БД — иначе Prisma получит `''`
вместо `null`/отсутствия поля:

```typescript
// src/lib/forms.ts
/** Native select не умеет отдавать `undefined` — пустая строка «нет значения» превращается в null */
export function emptyToNull(value: string | undefined) {
  return value ? value : null
}
```

```typescript
const category = await db.materialCategory.create({
  data: { ...data, parentId: emptyToNull(data.parentId) },
})
```

Тот же приём годится для любого self-referencing внешнего ключа с опциональной верхней точкой, не
только `parentId` буквально — например, `Work.houseSystemId` в domwellbes ссылается на узел дома,
а не на родителя той же модели, но сталкивается с той же проблемой пустого значения из
`<select>` и использует тот же `emptyToNull`.

## На edit-странице сущность исключается из списка родителей

Список опций для родителя строится без самой редактируемой записи — иначе можно выбрать себя
родителем:

```typescript
const parentOptions = allCategories.filter((c) => c.id !== currentId).map(...)
```

## Ограничение: не проверяет циклы глубже одного уровня

Исключение себя из списка защищает только от прямого самоссылания (`A.parentId = A.id`). Оно
**не** проверяет, что выбранный родитель сам не является потомком редактируемой записи
(`A.parentId = B.id`, `B.parentId = A.id`) — такой цикл текущая реализация допускает. Если модель
вырастет до глубины, где это станет проблемой (рекурсивные запросы дерева зависнут), нужна
отдельная проверка на сервере (обход вверх по `parentId` до корня или `NULL`, отказ при
обнаружении текущего `id`).

## Где встречается

Проверено 2026-08-05 по всему монорепо (`grep parentId`) — паттерн пока используется только в
`apps/domwellbes` (`MaterialCategory`, `WorkCategory`). Если появится в другом приложении — стоит
подумать о выносе `emptyToNull` в `libs/` (например `@letar/forms`) по правилу «shared-first» из
корневого `CLAUDE.md`; сейчас библиотечного выноса не делаем — один потребитель, три места внутри
одного приложения не оправдывают абстракцию для гипотетического будущего.
