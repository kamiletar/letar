# После успешного сабмита форма откатывает поле к устаревшему `initialValue`

## Симптом

Форма на `@letar/forms` после успешного `onSubmit` (например `handleCalc` в
двухшаговом сценарии «рассчитать → создать») визуально откатывает поле (в
наблюдавшемся случае — `<select>` склада) к значению «по умолчанию», хотя
пользователь явно выбрал другое значение и это значение было отправлено в
`onSubmit`.

Наблюдалось в
[create-delivery-form.tsx](/apps/domwellbes/src/app/(admin)/admin/sales-orders/[id]/_components/create-delivery-form.tsx)
(поле `warehouseId`), задокументировано в `apps/domwellbes/PLAN_LOGISTICS.md`
§6 L4.5 как некритичный косметический баг.

## Почему это не про NativeSelect и не про React key/ссылку

Первая гипотеза — что `initialValue` пересоздаётся инлайн в теле компонента
на каждый рендер (`const initialValue = { warehouseId: ... }` без
`useMemo`), и форма ресетится по смене **ссылки**. Это неверно: TanStack Form
(`FormApi.update`, `node_modules/.bun/@tanstack+form-core@*/.../FormApi.js:94`)
сравнивает `options.defaultValues` не по ссылке, а через `evaluate()` —
глубокое равенство. Новый литерал с теми же значениями — no-op.

`NativeSelect` тоже ни при чём — это обычное controlled-поле через
`field.state.value`/`field.handleChange`, без собственной логики вокруг
`initialValue` ([field-native-select.tsx](/libs/forms/src/lib/declarative/form-fields/)).

## Настоящая причина

Комбинация трёх вещей:

1. После успешного `onSubmit` `FormSimple`/`FormWithApi`
   ([form-simple.tsx:148](/libs/forms/src/lib/declarative/form-root/form-simple.tsx),
   [form-with-api.tsx:160](/libs/forms/src/lib/declarative/form-root/form-with-api.tsx))
   вызывает `formApi.reset(dataToSubmit)`, чтобы снять dirty-состояние.
   `reset()` переустанавливает `options.defaultValues = dataToSubmit` **и
   сбрасывает `state.isTouched = false`**.
2. Guard в `FormApi.update()` пропускает перезапись значений формы только при
   `!this.state.isTouched` (строка 94). Пока форма touched — новый
   `defaultValues` игнорируется. Сразу после `reset()` этот guard снят.
3. Если `initialValue`, который передаёт приложение, вычисляется как
   **статический дефолт**, а не как «то, что реально было отправлено» —
   например `warehouseOptions[0]?.value ?? ''` вместо
   `pendingSubmit?.warehouseId ?? warehouseOptions[0]?.value` — то следующий
   ре-рендер родителя (а их после сабмита обычно несколько: `setOptions`,
   `setDistanceKm`, `setSelectedTariffId` и т.п.) пересчитывает
   `initialValue` с тем же статическим дефолтом. Он не совпадает (по
   значению) с тем, что было в `dataToSubmit`, guard `!isTouched` пройден —
   и `update()` реально перезаписывает `state.values` этим устаревшим
   значением.

Это бьёт по **любому полю формы**, чей `initialValue` — статический дефолт,
не отражающий реально отправленные данные, а не специфика `NativeSelect`.
Поля, где `initialValue` случайно совпадает с отправленным значением (в
наблюдавшемся случае — `qty_*`, остаток к отгрузке не меняется), эффекта не
показывают, что маскирует общую природу проблемы.

## Обходной путь на стороне приложения

Вычислять `initialValue` не как «дефолт по списку», а мемоизированно и с
учётом уже отправленных данных:

```tsx
// ❌ статический дефолт — на любом ре-рендере после reset() перетрёт выбор пользователя
const initialValue = { warehouseId: warehouseOptions[0]?.value ?? '' }

// ✅ актуальное состояние, стабилизировано между рендерами
const initialValue = useMemo(
  () => ({ warehouseId: pendingSubmit?.warehouseId ?? warehouseOptions[0]?.value ?? '' }),
  [pendingSubmit, warehouseOptions],
)
```

`useMemo` здесь не лечит корень (сравнение в `FormApi.update` и так по
значению, не по ссылке) — но обеспечивает, что мемоизированное значение
**совпадает** с тем, что было реально отправлено, а не с исходным дефолтом.

## Статус

Не исправлено ни в domwellbes (некритично, см. PLAN_LOGISTICS.md), ни в
`libs/forms`. Кандидат для делегации `forms-dev`/координатору форм
(`QuietRidge`) через `.claude/rules/form-delegation.md`: `reset(dataToSubmit)`
после сабмита не должен полагаться на то, что следующий проход рендера даст
`initialValue`, совпадающий с уже отправленными данными — это неявный
контракт, нигде не описанный в `libs/forms/README.md` или
[forms.md](/.claude/docs/forms.md).
