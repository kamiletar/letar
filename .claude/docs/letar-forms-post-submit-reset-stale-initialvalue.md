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

✅ Исправлено в `@letar/forms` 2.6.0 (2026-08-19) —
`usePostSubmitResetGuard` (`libs/forms/src/lib/declarative/form-root/use-post-submit-reset-guard.ts`)
запоминает значение, переданное в `reset(dataToSubmit)`, и на следующем рендере, если TanStack
Form успел откатить `state.values` к чужому `initialValue`, восстанавливает именно отправленные
данные — ровно один раз, без ремонта компонента. Обходной путь в domwellbes (мемоизация
`initialValue` с учётом `pendingSubmit`) больше не обязателен, но остаётся более надёжной практикой
для новых форм — сам фикс лечит симптом на уровне библиотеки, а не корневую причину (per-render
sync `defaultValues` в `@tanstack/react-form`, вне контроля `@letar/forms`).

## ✅ Пробел фикса закрыт (найден 2026-09-23, закрыт в тот же день, forms 2.16.10)

`usePostSubmitResetGuard`'ов корректирующий эффект был завязан на смену **ссылки**
`watchedDefaultValues` (`initialValue`) — `useEffect(() => {...}, [watchedDefaultValues])`. Если
между рендером, где случился `reset(dataToSubmit)`, и следующим рендером формы `initialValue` не
пересоздавался (стабильная ссылка — распространённый и в остальном правильный паттерн), этот
эффект **не перезапускался**, и откат к устаревшему `initialValue` (тот же механизм
`FormApi.update()`, описанный выше) оставался неисправленным.

Такой «пустой» re-render без смены `initialValue` возникает не только гипотетически: `handleSubmit()`
с включённой `persistence` вызывает `clearSavedData()`, чьи `setState` внутри `useFormPersistence`
сами перерендеривают форму — и именно на этом рендере `FormApi.update()` откатывал значения, а
guard не перепроверял. Найдено при написании интеграционного теста к
[исправлению воскресающего persistence-черновика](/libs/forms/PLAN_COMPLETED.md) (forms 2.16.8).

### Корневая причина — глубже, чем «неверные deps у эффекта»

`FormApi.reset(values)` (`@tanstack/form-core`) **без второго аргумента** всегда выполняет
`this.options = { ...this.options, defaultValues: values }` — то есть сам вызов
`form.reset(dataToSubmit)` в `commitPostSubmitReset` создаёт рассинхрон: `this.options.defaultValues`
становится `dataToSubmit`, а проп `initialValue` (если приложение не мемоизирует его синхронно с
отправленными данными) остаётся прежним. `useForm`'s layout effect
(`useIsomorphicLayoutEffect(() => { formApi.update(opts) })`) не имеет dependency array — вызывает
`formApi.update()` на **каждом** рендере компонента, а не только при смене пропов. Значит **любой**
следующий рендер формы (по любой причине, не только смена `initialValue`) заново триггерит откат.

Первая попытка фикса — просто убрать `[watchedDefaultValues]` из deps эффекта, оставив
«одноразовый» `lastSubmittedRef`, обнуляемый после первой проверки — не прошла новый
интеграционный тест: после ОДНОЙ успешной коррекции гвардом следовал ЕЩЁ один рендер (тот же
persistence-каскад), на котором `update()` откатывал значения ЗАНОВО, а `lastSubmittedRef.current`
был уже `null` — повторной коррекции не происходило. Причина — `form.reset(submitted)` САМОГО
гварда тоже перезаписывал `this.options.defaultValues`, заново создавая рассинхрон с неизменным
`initialValue`.

### Решение — устраняет корень, не только симптом

`commitPostSubmitReset` теперь вызывает `form.reset(dataToSubmit, { keepDefaultValues: true })` —
официальный параметр `FormApi.reset()`, задокументированный в `.d.ts` пакета. Он снимает
dirty-состояние (`isTouched`/`isDirty` вычисляются из `fieldMeta`, который `reset()` сбрасывает
независимо от этого флага) и подставляет `dataToSubmit` в `state.values`, но **не трогает**
`this.options.defaultValues` — тот остаётся тем, чем был до сабмита. На любом следующем рендере
`update()` сравнивает текущий `initialValue` с ЭТИМ ЖЕ значением — совпадение по построению,
`shouldUpdateValues` не срабатывает, откату неоткуда взяться. Легитимные будущие изменения
`initialValue`/`defaultValues` (например, перезагруженные данные записи в `FormWithApi` после
мутации) синхронизируются `update()` как обычно — фикс их не блокирует.

Корректирующий `useEffect` в `usePostSubmitResetGuard` оставлен как защита от края — переведён с
зависимости от смены ссылки `initialValue` на перепроверку на каждом рендере (без dependency
array) — но с `keepDefaultValues: true` он на практике больше не находит расхождений.

Регресс-тест на настоящем `<Form>` (стабильный `initialValue`, включённая `persistence`,
успешный сабмит) —
[post-submit-reset-persistence-stable-initialvalue.spec.tsx](/libs/forms/src/lib/declarative/form-root/post-submit-reset-persistence-stable-initialvalue.spec.tsx).
Полный разбор — `PLAN_COMPLETED.md` (запись 2026-09-23, forms 2.16.10).

⚠️ **Парная ловушка — 2.16.13:** после сабмита с ошибкой черновик правильно остаётся, но раньше не
удалялся, если значения затем вернули к исходным (окно восстановления на равных данных). Теперь
`useFormFeatures` удаляет такой черновик и при возврате значений, и при монтировании. Разбор —
`PLAN_COMPLETED.md` (запись 2026-09-24).
