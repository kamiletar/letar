# Tri-state паттерн для каскадных nullable-boolean флагов

Применим, когда поле — `boolean | null` в БД, и `null` имеет собственную семантику
«не задано явно, унаследовать значение по цепочке» (например, от родительской категории), а не
просто «неизвестно» или «false по умолчанию». HTML/native select не умеет отдавать три состояния
напрямую (`checked`/`unchecked` — это два), поэтому третье состояние моделируется отдельным
строковым представлением.

## Устройство

Три части, всегда вместе:

1. **Zod-схема поля** — обычная строка, не enum-объект: `z.string().optional()`. Три значения на
   уровне формы — `''` (наследовать), `'true'`, `'false'`.
2. **`NativeSelect`** с тремя опциями `{ title, value }`, где `value: ''` — вариант «наследовать».
3. **Пара конвертеров** на границе формы и БД:
   - `booleanToTriState(value: boolean | null | undefined): string` — из БД в `initialValue`
     формы (`true → 'true'`, `false → 'false'`, `null/undefined → ''`).
   - `triStateToBoolean(value: string | undefined): boolean | null` — из формы обратно в БД
     (`'true' → true`, `'false' → false`, всё остальное, включая `''` → `null`).

## Единственный текущий пример

`apps/domwellbes/src/lib/forms.ts` — `triStateToBoolean`/`booleanToTriState`. Использование:
`Material.isRetailAvailable/isReturnable/isMarked` и одноимённые поля `MaterialCategory` (см.
`apps/domwellbes/PLAN_INDEX.md` Задача №1, `apps/domwellbes/PLAN_SHOP_MARKING.md` §2.7.4) — товар
без явного значения наследует флаг от своей категории по цепочке родителей.

## Статус: не в @letar/forms

Паттерн реализован вручную в приложении, не как переиспользуемый компонент библиотеки — на
2026-08-18 у него один клиент (`domwellbes`). Появится такая же задача (nullable boolean с явным
«наследовать») во втором приложении — не изобретать заново: либо скопировать идею напрямую, либо,
если применений уже 2+, оформить запрос координатору форм (`forms-coordinator-dev`) на добавление field-компонента
в `libs/forms` по `.claude/rules/form-delegation.md`.
