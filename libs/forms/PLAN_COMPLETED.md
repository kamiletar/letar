# Выполненные задачи — @letar/forms

## 2026-08-26 — Проверка `forms-angular` на уязвимость react-hooks/rules-of-hooks — override не нужен

После фикса `forms-vue`/`forms-vue-shadcn` (см. запись в `PLAN.md` того же дня) проверена
третья headless-либа с идентичным незащищённым паттерном `eslint.config.mjs`
(`export default [...baseConfig]`, без override). Грепом по `libs/forms-angular/src` не найдено
ни одной функции `use*` — Angular-конвенция для переиспользуемой логики использует DI-сервисы
(`*.service.ts`, `inject()`), а не composables по имени `use*`, как в React/Vue. Превентивный
override решено не добавлять — вывод и обоснование зафиксированы в `PLAN.md`, коммит `ee09c9c3`.

## 2026-08-25 — Фикс eager JSX на верхнем уровне модуля: `nx db:seed` падал `React is not defined`

Репорт: `nx db:seed domwellbes` падал `ReferenceError: React is not defined` при импорте
`@letar/forms` с RichText-полем в схеме — до всякого рендера, прямо на этапе импорта.

**Root cause:** несколько мест в библиотеке создавали JSX-элемент на верхнем уровне модуля (при
вызове функции в момент импорта, не в `render`): `createLazyComponentBase(importFn, <Skeleton
.../>)` в `lazy-component.tsx`, `TOOLBAR_CONFIG` со значениями `icon: <LuBold />` в
`toolbar-config.tsx`, `createDocumentField({ icon: <LuFileText /> })` в 9 документных полях.
Next.js всегда собирает JSX через automatic runtime независимо от `tsconfig` — под приложением
незаметно. `tsx` (запускает `prisma/seed.ts`) резолвит JSX-трансформ по `tsconfig` вызывающего
приложения; Next.js-пресет держит `"jsx": "preserve"` (Next сам делает трансформ), а esbuild в
этом случае транспилирует JSX в classic `React.createElement(...)` — без `import React` падает
сразу при импорте. `TOOLBAR_CONFIG`/иконки реэкспортируются как значения из барреля
`form-fields/index.ts`, поэтому исполняются при обычном статическом импорте `@letar/forms`.

**Фикс:** `createLazyComponent` (`@letar/forms-react` v0.3.2, Chakra-обёртка `@letar/forms`
v2.7.4, оба места в `@letar/forms-shadcn` v0.33.5) принимает `fallback` как фабрику
(`() => ReactNode`), не готовый элемент. `ToolbarButtonConfig.icon`/`DocumentFieldConfig.icon` —
теперь `ComponentType`, инстанцируется в `render`.

**Проверено:** `nx db:seed domwellbes` — полный успешный прогон. `nx db:seed mandala` — прошёл
весь импорт `@letar/forms`, упал дальше на несвязанной ошибке БД (`EACCES` на `user.upsert`, не
относится к этому багу). `nx typecheck:tsgo`/`nx lint` на `forms`/`forms-react`/`forms-shadcn`/
`forms-core` зелёные. `nx test forms` — 2 спека (`field-rich-text.spec.tsx`,
`table-keyboard-commit.spec.tsx`) падают в полном параллельном прогоне, но проходят в изоляции —
предсуществующая флейкинесть прогона, не регрессия от этого фикса.

Разбор — [letar-forms-lazy-component-eager-jsx-seed-crash.md](/.claude/docs/letar-forms-lazy-component-eager-jsx-seed-crash.md).

## 2026-08-25 — Автоматизация регресс-гейта против eager JSX (`@letar/eager-jsx-check`)

Ручной grep, оставленный предыдущей сессией как единственная защита от регрессии бага выше,
заменён таргетом `eager-jsx-check`, подключённым к `lint`. Новая plain-JS библиотека
[`@letar/eager-jsx-check`](/libs/eager-jsx-check/README.md) (по образцу `@letar/theme-check`) —
три regex-правила (JSX как значение свойства объекта, top-level `const`-инициализатор, top-level
аргумент вызова) с исключениями под JSDoc, тернарники и generic-типы, 14 unit-тестов. Подключена
к `forms`, `forms-react`, `forms-shadcn` — регресс теперь ловится каждым `nx lint`.

**Первый же прогон нашёл реальный, ещё не исправленный экземпляр этого бага**:
`forms-shadcn`'s `document-field-base.tsx` и `rich-text-toolbar-config.tsx` не были переведены на
`ComponentType` вместе с Chakra-версией — 8 полей + `TOOLBAR_CONFIG` создавали иконку eagerly.
Исправлено (`forms-shadcn` v0.33.6).

**`forms-vue`/`forms-vue-shadcn`/`forms-angular` — сознательно не подключены**: в них нет ни
одного `.tsx`-файла (Vue — SFC `.vue` + `.ts`, Angular — только `.ts`), баг специфичен именно
JSX-трансформу — подключение было бы шумом без пользы. Обоснование зафиксировано в README гейта.

## 2026-08-21 — Фикс required-резолва `.optional().or(z.literal(''))` (v2.7.3 / forms-core v0.9.1)

Репорт: `apps/domwellbes/checkout` — поле `customerEmail` рендерилось с `*` (обязательное), хотя
схема `z.email().optional().or(z.literal(''))` допускает пустую строку.

**Root cause:** `.or()` оборачивает `ZodOptional` в `ZodUnion` — верхний уровень схемы становится
`'union'`, а не `'optional'`. И `isOptionalSchema`, и `unwrapSchemaWithRequired`
(`libs/forms-core/src/lib/schema/zod-utils.ts`) проверяли только буквальные типы
`'optional'`/`'nullable'` на верхнем уровне, поэтому весь union считался обязательным. Тот же
паттерн (опциональный email/сайт) используется в `apps/driving-school/onboarding`
(`schoolEmail`, `schoolWebsite`) — там тоже было ложное `required: true`.

**Фикс:** union теперь считается optional, если ровно одна ветка сама optional/nullable, а все
остальные ветки — литералы (`z.literal(...)`) — единственный случай, когда пустое значение
гарантированно валидно независимо от того, какая ветка его примет. `z.enum(...)` не задет — в
Zod v4 это отдельный `_zod.def.type === 'enum'`, не `'union'`.

Заодно найдена и устранена вторая, независимая copy-paste реализация той же логики required в
`schema-traversal.ts` (используется генерацией авто-полей для Vue/Angular/shadcn-скинов форм,
`libs/forms-vue/forms-angular/forms-shadcn`) — та же бы дала тот же баг при auto-generated формах.
Переведена на общий `unwrapSchemaWithRequired` вместо повторной реализации.

**Тесты:** новый `libs/forms-core/src/lib/schema/zod-utils.spec.ts` (паттерн `customerEmail`,
`.nullable().or(...)`, обычный union без optional-ветки, неоднозначный union из двух optional —
консервативно остаётся required, `z.enum` не задет) + кейс в `schema-traversal.spec.ts`.
`nx test forms-core` 479/479, `nx test forms` 720/722 (2 непричастных Tiptap rich-text флейка).

**Не проверено вживую в браузере:** dev-БД `domwellbes` не имеет строки `ShopSettings`, поэтому
`retailStorefrontEnabled` выключен и «в корзину» на карточках материалов не рендерится — `/checkout`
недостижим в этом окружении без сидирования настроек магазина (вне рамок этого фикса). Схема
`customerEmail` покрыта юнит-тестом напрямую через ту же цепочку `getFieldMeta` →
`unwrapSchemaWithRequired`, которую использует `ChakraFormField`/`base-field.tsx` в реальном рантайме.

## 2026-08-20 — Аудит forms-vue/forms-vue-shadcn/forms-angular на тот же класс бага

Follow-up к фиксу `createLazyComponent` ниже: проверено, наступает ли тот же класс проблемы
(«сервер отдаёт плейсхолдер, раскрытие которого зависит от клиентского таймера, не гарантированного
в скрытой/фоновой вкладке») в двух других фреймворковых слоях библиотеки.

**Вывод: риска нет ни у одного.**

- `forms-vue`/`forms-vue-shadcn` — единственная точка ленивой загрузки (`FieldDataGrid`,
  `FieldRichText` в обеих) идёт через общий `createLazyField`
  (`libs/forms-vue/src/lib/core/create-lazy-field.ts`, `defineAsyncComponent` **без** `<Suspense>`).
  Без `<Suspense>` Vue SSR-рендерер дожидается async-загрузку как часть обычного
  promise-based рендера — не эмитит плейсхолдер и не полагается на отдельный клиентский
  reveal-скрипт вовсе. Итоговый HTML уже содержит резолвленную разметку.
- `forms-angular` — `FieldRichTextComponent` грузит реализацию через `import()` +
  `ViewContainerRef.createComponent()` в `ngAfterViewInit` (`FieldDataGridComponent` ленивой
  загрузки не использует вовсе, осознанно — см. комментарий в файле). Angular SSR не имеет
  аналога React-стриминга с плейсхолдер+reveal-скриптом: `renderApplication` дожидается
  `ApplicationRef` stability (все pending-микрозадачи, включая `ngAfterViewInit`) до сериализации
  HTML целиком, а не эмитит частичный HTML с последующим клиентским патчингом по таймеру кадра.

Паттерн специфичен именно реализации React 19 out-of-order streaming SSR (`$RC`/`$RB`/`$RV` +
rAF-батчинг) — ни один из двух других фреймворков его не реализует для async-компонентов вне
`<Suspense>` (Vue) / вне `@defer`-блоков (Angular, не используется здесь).

**Разбор:** дополнение в
`.claude/docs/letar-forms-lazy-component-ssr-stuck-suspense.md` (раздел «Проверено 2026-08-20»).

## 2026-08-20 — createLazyComponent: зависший SSR Suspense-boundary (v2.7.1)

Делегировано координатором `forms-coordinator-dev` (тред `form-example-table-editor-suspense-bug`,
исходный репорт — `apps/form-example`, 5 падающих e2e в `table-editor.spec.ts`, §18.7 M2 паттерн Б).

**Root cause:** не специфично `TableEditor` — общая инфраструктура `createLazyComponent`
(`libs/forms/src/lib/declarative/lazy-component.tsx`), используется также `DataGrid`, `RichText` и
`extraSelects`/`extraComboboxes`/`extraListboxes` из `createForm`. `LazyWrapper` монтировал
`<Suspense>` вокруг `React.lazy()`-компонента сразу, в том числе на сервере. React стримит
содержимое такого boundary в осиротевший `<div hidden id="S:N">` в конце `<body>`, а раскрытие
делает встроенный `$RC`/`$RB`/`$RV` reveal-script, который батчит DOM-swap через
`requestAnimationFrame` (условие `2===$RB.length` истинно уже после первого вызова, `push` кладёт
сразу два элемента — так что это касается любого одиночного boundary, не только нескольких сразу).
Если rAF не тикает (скрытая/фоновая вкладка — воспроизведено и в реальном headless Playwright, не
только в тестовом Browser pane инструменте), boundary виснет навсегда: DOM формально валиден,
computed CSS корректен, в консоли нет ни одной ошибки, но `getBoundingClientRect()=0`,
`offsetParent: null`.

**Фикс:** `LazyWrapper` монтирует `<Suspense>` только после клиентского маунта (гейт `mounted`
через `useState`+`useEffect`) — сервер отдаёт только `Skeleton`-заглушку, без Suspense-boundary
вообще. Ленивый импорт запускается и раскрывается целиком на клиенте обычным React-коммитом,
не через HTML-патчинг SSR-стрима — зависимость от `requestAnimationFrame` исчезает полностью.
Framework-agnostic (без `next/dynamic` — `@letar/forms` не имеет `next` в зависимостях).

**Тесты:** новый `lazy-component.spec.tsx` — SSR (`renderToString`) не содержит содержимого
ленивого компонента и не создаёт Suspense-placeholder (только `Skeleton`); клиентский рендер
раскрывает содержимое после маунта.

**Верификация:** `nx test @letar/forms` (lazy-component/field-rich-text/field-data-grid — зелёные),
`typecheck:tsgo`, `lint` — без ошибок. Реальные падавшие e2e —
`bunx playwright test --project=chromium apps/form-example-e2e/src/table-editor.spec.ts` (обходной
путь через ручной dev-сервер, `nx e2e` зависает на `dependsOn: dev`, см. `.claude/docs/e2e-testing.md`)
— все 3 теста файла зелёные. Визуально в Browser pane при `document.visibilityState: hidden`
подтверждено исчезновение `S:0`/`B:0` и появление реального `getBoundingClientRect()` у чекбоксов.

**Разбор:** `.claude/docs/letar-forms-lazy-component-ssr-stuck-suspense.md`.

## 2026-08-19 — DataGrid: редактирование enum/boolean-колонок (v2.7.0)

`EditableCell` в `field-data-grid.tsx` рендерил `<Input type="text"|"number">` для любого
`fieldType`, включая `enum`/`boolean` — не было ветвления, которое уже есть в соседнем
`EditingCell` (`TableEditor`, `table-cell.tsx`).

**Реализация:** перенесено ветвление из `table-cell.tsx` почти без изменений — `NativeSelect.Root`
для enum (список опций из `column.enumValues`), нативный `<input type="checkbox">` для boolean,
коммит на `onChange`. Единственное отличие от исходного `EditingCell` — `DataGrid` до этой задачи
получал в `EditableCell` только `value`/`fieldType`, не весь `ResolvedColumn`, поэтому добавлен
отдельный проп `enumValues?: string[]`, прокинутый из `resolved?.enumValues` в родительском
`FieldDataGrid` (тот же `resolvedCols.find(...)`, что уже резолвит `fieldType`). `table-cell.tsx`
не менялся.

**Тесты:** добавлен кейс в `field-data-grid.spec.tsx` — схема с `z.enum`/`z.boolean` полями
массива, клик по enum-ячейке рендерит `<select>` (`role="combobox"`), клик по boolean-ячейке —
чекбокс, оба коммитят значение сразу.

**Верификация:** `nx test @letar/forms -- field-data-grid.spec.tsx` — 9/9 зелёных.
`nx typecheck:tsgo @letar/forms` и `nx lint @letar/forms` — без ошибок.

## 2026-08-19 — Дедуп коэрсии значения ячейки таблицы + аудит DataGrid (v2.6.1)

Аудит по следам фикса `TableEditor` из v2.6.0: проверить, воспроизводится ли тот же баг
(размонтирование `<Input>` без нативного `blur` при клавиатурной навигации теряет введённое
значение) в `field-data-grid.tsx` (`EditableCell`), и оценить дедуп общей коэрсии значения.

**Вывод по багу:** сейчас не воспроизводится. `DataGrid` не имеет внешней клавиатурной навигации
между ячейками — аналога `use-table-navigation.ts` у него нет, `editingCell` меняется только
изнутри самого `EditableCell` (через `onSave`/`onCancel`), поэтому коммит всегда успевает
отработать (нативный `blur` или явный `Enter`) до того, как компонент размонтируют. Риск —
отложенный: если позже добавят клавиатурную навигацию между ячейками (аналог `TableEditor`),
нужно будет применить тот же паттерн `commitEditingCellRef` (`TableEditorContextValue`,
`table-types.ts`), а не полагаться на `blur`. Не стал заводить этот ref в `DataGrid` заранее —
сейчас его некому вызывать, это был бы мёртвый код.

**Дедуп:** `column.fieldType === 'number' ? Number(localValue) || 0 : localValue` дублировался
в трёх местах `table-cell.tsx` (`EditingCell`) и двух местах `field-data-grid.tsx`
(`EditableCell`). Вынесен в общий хук
`libs/forms/src/lib/declarative/form-fields/table/use-editable-cell-value.ts`
(`useEditableCellValue`) — `localValue`-стейт + `coerce()` по `fieldType`, используется обоими
компонентами. Не стал переиспользовать `coerceValue` из `@letar/forms-core/table` — та функция
заточена под вставку из буфера обмена (полный `ResolvedColumn`, trim/запятые/enum-строки) и
используется в 5 фреймворк-адаптерах (`forms`, `forms-shadcn`, `forms-angular`, `forms-vue`,
`forms-vue-shadcn`) — менять её сигнатуру ради этой задачи было бы избыточно широким изменением.

**Верификация:** `table-keyboard-commit.spec.tsx` и `field-data-grid.spec.tsx` изолированно —
зелёные. Полный `nx test @letar/forms` — 1 неродственный флейк на `field-rich-text.spec.tsx`
(Suspense/skeleton таймаут под нагрузкой полного прогона), не связан с изменением, подтверждено
изолированным перезапуском. `typecheck:tsgo`/`lint` — чисто. Версия `@letar/forms` 2.6.0 → 2.6.1,
публичный контракт не менялся. Коммит `efa10da7`.

## 2026-08-19 — Три бага из agent-mail backlog (v2.6.0)

Обработаны все три непрочитанных `forms-task`-репорта из inbox `forms-dev` (2 от `QuietRidge` за
aboi/domwellbes, 1 напрямую от `domwellbes-relay`).

**1. `Form.Field.TableEditor` — клавиатурная навигация теряла значение.** Коммит ячейки был
завязан только на нативный DOM `blur` (`EditingCell.onBlur`); `use-table-navigation.ts` на
Tab/Enter/стрелках выходил из режима редактирования через `setEditingCell(null)` напрямую —
`<Input>` размонтировался без `blur`, введённое значение терялось. Добавлен `commitEditingCellRef`
в `TableEditorContextValue`: `EditingCell` регистрирует функцию коммита, навигация вызывает её
перед сменой ячейки. `Escape` намеренно без коммита — отмена, а не сохранение, симметрично
`field-data-grid.tsx`. Регресс-тест — `table-keyboard-commit.spec.tsx`.

**2. `Form.Field.Date` отдавал `string` в `onSubmit`, даже когда схема — `z.coerce.date()`.**
`resolveFieldType()` автоселектит `FieldDate` только для `zodType === 'date'`, но компонент
коммитил сырую строку `e.target.value` — выведенный TS-тип (`Date`) расходился с рантайм-значением
(`string`), `typecheck:tsgo` этого не ловил. `onChange` теперь коммитит `new Date(raw)` (или
`undefined` при пустом значении).

**3. Post-submit `formApi.reset(dataToSubmit)` мог откатить поле к устаревшему `initialValue`.**
`reset()` снимает `state.isTouched`; на следующем рендере `@tanstack/react-form`'s `useForm`
(layout-эффект без deps → `FormApi.update()`) синхронизирует `state.values` с ЛЮБЫМ
`defaultValues`, который родитель передал, если форма не touched — если `initialValue` вычисляется
как статический дефолт, пользователь визуально терял только что сделанный выбор. Добавлен
`usePostSubmitResetGuard` (`libs/forms/src/lib/declarative/form-root/use-post-submit-reset-guard.ts`),
подключён в `FormSimple`/`FormWithApi` — запоминает отправленное значение, восстанавливает его один
раз при расхождении. Корень проблемы (per-render sync в `@tanstack/react-form`) вне контроля
`@letar/forms` — лечится симптом на границе библиотеки. Регресс-тест —
`post-submit-reset-stale-initialvalue.spec.tsx`, воспроизводит сценарий с `NativeSelect`.

**Верификация:** для каждого бага regression-тест подтверждён вручную (временно отключал фикс —
тест падал с воспроизведением исходного симптома). `nx typecheck:tsgo`/`nx lint` зелёные. Полный
`nx test @letar/forms` — 717–718/719 (1 неродственный флейк на lazy-loaded `FieldRichText` под
нагрузкой полного прогона, не связан с изменениями).

Ответил всем трём отправителям через `reply_message` (`QuietRidge` x2, `domwellbes-relay`).
Обновлены doc-разборы `.claude/docs/letar-forms-field-date-runtime-string.md` и
`.claude/docs/letar-forms-post-submit-reset-stale-initialvalue.md`. Коммит `4aab26d1`.

## 2026-08-13 — Фаза 9, Этап 5 (часть 2): Signature/Address/City на Vue

Продолжение Этапа 5 (тяжёлые peer-dep поля) для `@letar/forms-vue` (0.7.0→0.8.0, 36→39/61 полей) и
`@letar/forms-vue-shadcn` (0.8.0→0.9.0, 37→40/61 полей). `FieldRichText` сознательно отложен —
единственное оставшееся поле Этапа 5, требует нового peer-dep `@tiptap/vue-3` и `lazy()`-паттерна
по прецеденту `Form.Captcha`, архитектурно отдельный шаг.

**`FieldAddress`/`FieldCity`** — порт `field-address.tsx`/`field-city.tsx`. `@letar/forms-core/address`
(`createDaDataProvider`, `AddressProvider`, `AddressSuggestion`) уже framework-agnostic — портировать
саму интеграцию с DaData не потребовалось, только Vue-обвязку. Новый композабл
`useAddressSuggestions` (`libs/forms-vue/src/lib/core/use-address-suggestions.ts`): debounce через
ручной `setTimeout`/`clearTimeout`, `requestId`-счётчик против устаревших ответов, click-outside
через `document.addEventListener('mousedown', ...)` в `onMounted`/снят в `onBeforeUnmount`.

**`FieldSignature`** — порт `field-signature.tsx` (canvas-подпись, draw/typed режимы, PNG/SVG
экспорт). Новый композабл `useSignatureField` (`libs/forms-vue/src/lib/core/use-signature-field.ts`),
SVG-хелперы (`buildSvgString`, `buildTypedSvgString`, `escapeXml`, `svgToDataUri`) — 1:1 порт из
React, сознательно НЕ вынесены в `forms-core`: используются только этой парой Vue-полей.

**Находка (тот же класс, что в Этапе 5 часть 1):** композаблы на `ref()` обязаны вызываться ровно
один раз в `setup()`, не внутри render-колбэка `withFieldValidation` — иначе состояние теряет
стабильную идентичность между рендерами. Черновик `field-address.ts` наступил на эту грабли (звал
`useAddressSuggestions` в render-колбэке), пойман до прогона тестов, исправлен: композабл — в
`setup()`, запись значения — через `form.setFieldValue()` напрямую (не через `field.handleChange`
из render-замыкания, которое из `setup()` не видно).

**Оба Vue-пакета** зеркалят структуру: headless-логика в `forms-vue` (composables + raw DOM),
Tailwind-скин в `forms-vue-shadcn` (те же composables, `NATIVE_INPUT_CLASS`/`cn()` из
`@letar/tailwind-utils`, `onErrorCaptured`/`rekaUIKit.ErrorFallback`).

**Тесты:** jsdom не реализует canvas 2D context — `HTMLCanvasElement.prototype.getContext`/
`toDataURL` застаблены в `beforeEach`. Debounce с `debounceMs: 0` всё равно использует реальный
`setTimeout` (макротаск) — `nextTick()` (только микротаски) его не дожидается, тесты ждут явно:
`await new Promise((resolve) => setTimeout(resolve, 0))`.

Верификация: `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-vue,@letar/forms-vue-shadcn`
— зелено (35/35 тестов в каждом пакете). Публичный API `@letar/forms` (React) не затронут.

Коммиты: `7e723a4e`, `7d077957`, `50eb5f55`.

## 2026-08-13 — Compile-time проверка рассинхрона `form-compound-types.ts`

Задача Ками напрямую: `libs/forms/src/lib/declarative/index.ts` собирает `Form` через
`Object.assign(FormRoot, {...}) as unknown as FormComponent` — каст полностью отключает
структурную проверку TypeScript. Уже стреляло дважды: Фаза 8 Этап 7 (`ForeignPassport`/
`DepartmentCode`/`BirthCertificate` были в реализации `FormDocument`, но не в типе) и фантомный
`OGRNIP` (тип обещал поле, которого в реализации не было никогда).

**Решение:** `libs/forms/src/lib/declarative/assert-same-keys.ts` — compile-time-only
`AssertSameKeys<Impl, Declared>` (сравнивает `keyof` двух типов, не форму пропсов по каждому
полю) + generic-функция `assertSameKeys<AssertSameKeys<...>>()`, вызов которой не типизируется,
если ключи разошлись — ошибка `TS2344` указывает точный список разошедшихся ключей
(`onlyInImplementation`/`onlyInDeclaredType`) прямо в месте вызова.

Подключено для `FormField`, `FormDocument`, `FormButton`, `ListButton` (`Group.List.Button`) —
плоских compound-объектов без call signature. `Group`/`Steps`/сама форма исключены сознательно:
у них реальная сигнатура (forwardRef/generic-обёртки) может расходиться с упрощённым inline-типом
не по вине рассинхрона полей — точное сравнение дало бы шум на корректном коде.

Проверено негативным тестом: временное удаление `ForeignPassport` из `FormDocument` валит
`typecheck:tsgo` с точным указанием поля; возврат поля — снова зелено.

Коммит: `0fdea746`.

## 2026-08-12 — Фаза 7.8 → Поток 1+2: Reka UI-скин для Vue + гайды по портированию

Задача Ками через координатора `QuietRidge` (тред `forms-phase7-3-shadcn`, письмо #61) —
продолжение письма #58 (Vue-пруф границы, `libs/forms-vue`): полноценный Reka UI-скин + гайд по
портированию на свой фреймворк/стили.

**Поток 1 — `libs/forms-vue-shadcn` (`@letar/forms-vue-shadcn` 0.1.0).** Vue-аналог
`@letar/forms-shadcn`: `UIKit`-контракт из `forms-core` реализован на Reka UI (бывший Radix Vue) +
Tailwind + cva, 6 полей (Input/Number/Checkbox/Textarea/Select/Combobox).

- **Контракт не потребовал изменений.** `UIKitCorePrimitives<TNode>`/`UIKitExtendedPrimitives<TNode>`
  в `forms-core` уже были обобщены (`TNode = unknown`) — инстанцированы как
  `UIKitCorePrimitives<UINode>`, `UINode = VNode | string | null` (единственная типовая деталь,
  специфичная Vue: `VNode`, в отличие от React-овского `ReactNode`, не включает `string`).
- Примитивы (`rekaUIKit`) — обычные функции `(props) => VNode`, не `defineComponent`: контракт
  `(props) => TNode` совпадает буквально, без обёртки под компонент.
- Композиционный слой (`createFieldPrimitives`) — не копия React-версии: ошибку рендера поля ловит
  `onErrorCaptured` в `setup()`, не классовый `ErrorBoundary` (паттерна которого в Vue нет).
  `FieldSelect`/`FieldCombobox` (доп. проп `options`, вне контракта фабрики) собраны напрямую по
  `useAppFormContext`.
- Тесты — vitest + `@vue/test-utils`, 5 сценариев. Полифиллы `ResizeObserver`/
  `hasPointerCapture`/`scrollIntoView` — стандартный минимум для Radix/Reka-компонентов в jsdom.
- Демо — минимальный dev-харнесс на голом Vite (`nx run @letar/forms-vue-shadcn:demo`, порт 5173,
  `.claude/launch.json`), не Nx-приложение. Продакшн-сборка чистая (2322 модуля).

**Поток 2 — гайды в `apps/form-docs`** (`content/docs/guides/custom-uikit.mdx` +
`porting-framework.mdx`, оба EN+RU). Первый — как реализовать `UIKit`-контракт голым HTML/CSS без
Chakra/shadcn. Второй — честный процессный разбор переноса на Vue (решения из Потока 1 как есть,
включая то, что не перенеслось 1:1 — error boundary, обход `createField` для Select/Combobox).
Проверено в Browser pane — все 4 страницы рендерятся.

Коммиты: `a5c494bf` (forms-vue-shadcn), `ff993569` (гайды form-docs), `f8aa4cb8` (PLAN.md).

## 2026-08-11 (2) — Фаза 7.6: `llms.txt` + фикс `form-mcp`/`docs/fields.md`

Задача координатора `QuietRidge` (тред `forms-phase7-3-shadcn`, msg #54), два независимых потока.

**`form-mcp` v1.0.3.** `field-registry.ts` → `CATEGORY_MAP` ждал ключ `'Российские документы'`,
реальный заголовок секции в `docs/fields.md` — `## Документные поля (Россия)`. Несовпадение строк
молча роняло всю секцию из парсера — `list_fields`/`get_field_props`/`get_field_example` (общий
`fieldRegistry`) не знали про `INN`/`KPP`/`OGRN`/`BIK`/`BankAccount`/`SNILS`/`Passport`. Заодно
найдено: `FieldCity` отсутствовал в `docs/fields.md` целиком, хотя экспортируется как
`Form.Field.City` — не парсер-баг, поле не было задокументировано. Добавлена строка в
«Специализированные», счётчик в шапке файла поправлен 56 → 57. Ручная проверка (`bun run` с
реальными путями): `total: 57, has city/inn/bik: true, document count: 7`.

**`llms.txt` для `apps/form-docs`** — см. `apps/form-docs/PLAN_COMPLETED.md`, сессия
2026-08-11 (2).

Коммиты: `9d2b9fc5` (form-mcp), `a029f6f9` (forms docs/PLAN), `043f764c` (form-docs llms.txt),
`e258912c` (launch.json).

## 2026-08-10 — Фаза 7.3, шаги 3-5: `@letar/forms-react`, фикс публикации типов, подготовка shadcn

Thread `forms-phase7-1-core-split`. Коммиты `858a000b`, `7fbd1b5d`, `d1c755fa` + шесть коммитов
внутри приватных submodule (по одному `tsconfig.json` в каждом).

### Шаги 3-4 — композиционный слой вынесен в новый пакет (`858a000b`, v1.6.0)

Блокер прошлой сессии снят решением Ками: заводим третий пакет, правило «`forms-core` не
импортирует ни один фреймворк» (2026-07-08) не ослабляем. Инструкция координатора «перенести
`createField` в `forms-core`» была невыполнима как написана — это React-код.

```
forms-core  →  forms-react  →  forms (Chakra) / forms-shadcn
```

**Переехало:** `createField`, `FieldWrapper`, `FieldErrorBoundary`, контекст формы, `FormGroup`,
хуки поля (`useResolvedFieldProps`, `useDeclarativeField`, `useAsyncFieldValidation`,
`useAsyncSearch`, `useDebounce`), `field-utils`, `autocomplete-map`, React-часть i18n,
UI-независимые типы (`BaseFieldProps`, `DeclarativeFormContextValue`, `ResolvedFieldProps`).

**Осталось в скине сознательно** (отклонение от буквы задания, координатор одобрил задним
числом, письмо 1452): `uikit-chakra.tsx`, `field-label.tsx`, `field-tooltip.tsx`,
`selection-field-label.tsx`, `field-error.tsx` (вынесен из `create-field.tsx`, чтобы развязать
цикл с `uikit-chakra`), `use-grouped-options.ts`, `form-group-list-sortable.tsx`. Это Chakra-код,
он и есть реализация контракта — в UI-library-free пакет он физически не может переехать.

**Механизм связывания — фабрика `createFieldPrimitives(uikit)`, вызываемая один раз на уровне
модуля скина** (`form-fields/base/primitives.ts`). Не контекст и не проп: компоненты должны быть
стабильны по ссылке, иначе React размонтирует поддерево поля на каждой перерисовке формы.
`FieldPrimitivesUIKit` намеренно уже полного `UIKit` — скину хватит четырёх примитивов
(`FieldRoot`/`FieldLabel`/`FieldError`/`ErrorFallback`), остальные он подключает по мере
миграции своих полей.

**Ни одно из 56 полей не правилось** — реэкспорт-шимы на местах переехавших модулей, публичный
API не изменился.

**Граница `forms-react`** — тег `type:core-react` (`depConstraints`) + `no-restricted-imports`
против `@chakra-ui/*`, `@ark-ui/*`, `@radix-ui/*`, иконок и против самих скинов. Обе половины
подтверждены негативной пробой. Ядро закрыто и от нового слоя: `type:core` не зависит ни от
`type:ui`, ни от `type:core-react`.

**Проверки:** 678 тестов `forms` + 76 `forms-react` (было 754 в одном; файлов 99 → 95 + 4 —
сходится файл-в-файл); `typecheck:tsgo` зелёный на 20 потребителях, включая шесть приватных;
живая проверка в Chromium на `form-develop-app` — рендер `fields-demo`, валидация
(`data-invalid` + `error-text`), async-путь (`Username занят`).

### Побочно закрыт техдолг 7.1 — неполные `paths` у потребителей

Приложения держали 9 подпутей `forms-core` из 15. Пока библиотека их не импортировала, всё было
зелёное; первое же использование `/uikit`, `/i18n`, `/address` из нового слоя положило всех
разом. Диагностика при этом вводит в заблуждение: где тип попадает в сигнатуру поля, `TS2307`
превращается в каскад `TS2322` вида «`{ name: string }` не совместим с `StringFieldProps`».

Дописан полный набор во все 17 приложений. Попутно выяснено: симлинк создаёт `bun install` и
лежит он в `<пакете>/node_modules/@letar/` (корневого `node_modules/@letar` в репо нет вовсе); а
приложения на «смешанной модели» `include` (`animatrona`, `label-printer-desktop`) требуют ещё и
glob, иначе `TS6307`. Записано в `.claude/rules/libs.md` — это общая механика монорепо.

### Фикс публикации типов (`7fbd1b5d`)

Дефект жил с Фазы 7.1: `noExternal` инлайнит внутренние `@letar/*` только в JS-бандл, а в
`dist/*.d.ts` оставались импорты `@letar/forms-core/...`, которых в npm нет. Сборка при этом
успешна — ломается только установка опубликованного пакета, поэтому 7.2 его не заметила.

**Почему `dts: { resolve: [...] }` выглядел неработающей опцией:** tsup строит `external` для
dts-прохода как `dependencies + peerDependencies` (`getProductionDeps`), и всё оттуда rollup
помечает внешним **до** плагинов — резолвер не вызывается вовсе. Подтверждено замером: под
`DEBUG=tsup:ts-resolve` в логе на 1310 строк нет ни одного bare-пакета, только относительные
пути.

**Фикс structural:** `@letar/forms-core`/`@letar/forms-react` переехали в `devDependencies` —
это внутренние слои, а не npm-пакеты, потребитель их не устанавливает. Пока они в
`dependencies`, любой флаг резолва мёртв.

**Проверено путём настоящего потребителя:** `npm pack` → установка тарбола в чистый проект вне
монорепо → `tsc --noEmit` зелёный. Позитивный контроль — внешние зависимости остались импортами;
негативный — `name={42}` даёт `TS2322`, то есть типы настоящие, а не `any`. Nx-граф цел (рёбра
строятся по импортам в коде).

### Шаг 5 — подготовка (`d1c755fa`)

Установлены десять Radix-примитивов + `class-variance-authority`, `clsx`, `tailwind-merge`
(`tailwindcss` 4.3.3 и `lucide-react` уже были). Проверено компиляционной пробой с негативным
контролем (`tone="rainbow"` → `TS2322`).

Решение по организации скина — прямые Radix + `cva`/`tailwind-merge`, **не** `shadcn` CLI;
обоснование, цена (потребителю нужен Tailwind 4 + `@source` на путь пакета) и порядок работ
записаны в `PLAN.md` §7.3.

### Открытые вопросы (ждут решения координатора/Ками)

1. **Два разных `BaseFieldProps`.** Наружу экспортируется legacy-тип из `src/lib/types.ts`
   (`label?: string`, существует с первого коммита, от старого `ChakraFormField`-API), а поля
   используют другой — из `forms-react`. Внешний потребитель не может присвоить
   `StringFieldProps` в `BaseFieldProps`. Не регресс; переименование — breaking change.
2. **Площадка для shadcn-демо.** `form-docs` уже на Tailwind 4 (Fumadocs), `form-develop-app` и
   `form-example` на Chakra и потребуют отдельной настройки.

## 2026-08-09 — Фикс рассинхрона версии в build:npm (dist/package.json vs package.json)

Найдено при диагностике Фазы 7.2 (сессия forms-dev), зафиксировано отдельно от самого фикса
`.d.ts`-генерации: `build:npm` копировал `package.publish.json` → `dist/package.json` голым
`cp`, а у `package.publish.json` было своё поле `version` (`1.2.0`), не связанное с
`libs/forms/package.json` (`1.4.8`) — прямая публикация ушла бы на npm с устаревшей версией.

**Фикс.** `version` убрано из `package.publish.json`. `dist/package.json` теперь собирает
`scripts/write-publish-package-json.mjs` — читает `version` из `package.json` (источник истины)
и мёржит его с шаблоном `package.publish.json`. Шаг в `project.json` (`build:npm`) заменён с
`cp package.publish.json dist/package.json` на `node scripts/write-publish-package-json.mjs`.

**Проверено:** `nx run "@letar/forms:build:npm" --skip-nx-cache` зелёный целиком (tsup + DTS +
все `cp`-шаги), `dist/package.json` содержит `version: "1.4.9"`, совпадающую с
`libs/forms/package.json`.

## 2026-08-09 — Фаза 7.2: standalone-проверка вне монорепо + фикс сломанной npm-публикации

Thread `forms-phase7-1-core-split`, логическое продолжение Фазы 7.1.

**Диагностика.** Собрала `@letar/forms` в npm-виде (`nx run "@letar/forms:build:npm"`), запаковала
через `npm pack`, установила в чистый scratch-проект вне монорепо (свой `node_modules`, без
`@letar/source` condition) и написала минимальную форму с `Form.Field.Phone` (тянет
`@letar/forms-core/phone`). Рантайм (JS) резолвится из коробки — `noExternal: ['@letar/forms-core']`
в `tsup.config.ts` полностью инлайнит `forms-core` в бандл `forms`, живой Node ESM-импорт
`@letar/forms/fields/specialized` подтверждён. Но нашла реальный баг: `build:npm` падал на шаге
`tsc --project tsconfig.publish.json` (80 ошибок TS6059/TS6307) — `tsconfig.publish.json` не
обновлялся вместе с ростом subpath-экспортов `forms-core` за Фазу 7.1 (8 путей из нынешних 15,
`rootDir: "src"` исключал `forms-core` из программы). Публикация на npm не проходила бы вообще, а
при частичном прогоне ушёл бы пакет без единого `.d.ts` — TS-потребитель получил бы `TS7016`.
Не чинила сходу — архитектурный вопрос, зафиксировала два варианта решения, передала
координатору/Ками.

**Фикс (решение Ками — вариант б).** Декларации теперь генерирует сам `tsup` (`dts: true`)
синхронно со списком `entry`, вместо отдельного `tsc`-прохода — рассинхрон `paths` больше
невозможен структурно. Убран `tsc`-шаг из `build:npm`, из `tsconfig.publish.json` убраны
`composite`/`outDir`/`rootDir` (принадлежали tsc-project-build режиму, tsup их не использует),
`paths` догнан до всех 15 subpath-экспортов. Побочная находка при отладке: сразу после включения
`dts: true` (ещё с `composite: true`) всплыл второй, независимый TS6307 — по соседним файлам
внутри самого `libs/forms/src` (composite требует явный файл-лист даже для tsup-мульти-entry
прохода). Снятие `composite` закрыло оба класса ошибок разом.

**Проверено:** `build:npm` целиком зелёный (все 12 `.d.ts`, все `cp`-шаги отработали),
`typecheck:tsgo` и весь тестовый набор `forms` зелёные. Финальная проверка — тот же scratch-проект:
`npm pack` → чистая переустановка → `tsc --noEmit` без ошибок; негативный контроль (заведомо
неверный проп на `Form.Field.Phone`) даёт `TS2322` — типы настоящие, не `any`-заглушка.

Изменённые файлы: `tsup.config.ts`, `project.json`, `tsconfig.publish.json`. v1.4.8.

## 2026-08-09 — Фаза 7.1: расслоение forms-core, Этапы 4–5 (завершение фазы)

Продолжение (thread `forms-phase7-1-core-split`). Закрывают Фазу 7.1 целиком.

**Этап 4** — зафиксирован TS-интерфейс `UIKit` под `@letar/forms-core/uikit` (~20 примитивов из
аудита связанности 2026-07-05). Реализованы и используются (`UIKitCorePrimitives`): `FieldRoot`,
`FieldLabel`, `FieldError`, `Input`, `Checkbox`, `Select`. Типизированы, но без адаптера
(`UIKitExtendedPrimitives`, опциональны в составе `UIKit`): `NumberInput`, `NativeSelect`,
`Combobox`, `RadioGroup`, `SegmentGroup`, `PinInput`, layout-примитивы. Три показательных поля
(`Field.String` — текстовое, `Field.Checkbox` — бинарное, `Field.Select` — выборное со сложным
compound-API и порталом) переведены на потребление контракта вместо прямого импорта Chakra;
`chakraUIKit` (`libs/forms/.../base/uikit-chakra.tsx`) — единственное место, где контракт
связывается с конкретной UI-библиотекой. Публичный API `@letar/forms` не изменился, 750/750
тестов зелёные, `nx run-many -t typecheck:tsgo --projects=forms,forms-core` зелёный.

**Побочная находка и фикс** (не про Этап 4 напрямую, но обнаружена при работе с той же
`vitest.config.ts`): предыдущая сессия закоммитила (`ad318324`) вычисление `formsCoreAlias` из
`forms-core/package.json` → `exports`, но не подключила его — старый ручной alias-список
остался активным, а вычисленная переменная висела неиспользуемой (ESLint warning). При
подключении (`...formsCoreAlias` вместо ручного списка) вскрылась вторая, более глубокая
проблема: `rollup-plugin-alias` (через который Vite резолвит объектные `resolve.alias`) матчит
по префиксу, и ключ `@letar/forms-core` без подпути обязан идти **после** всех подпутей — иначе
перехватывает `/schema`, `/utils` и т.д. до того, как до них доходит очередь. `Object.entries`
на `exports` даёт `.` первым (объект exports так и оформлен), поэтому наивное подключение
`formsCoreAlias` без сортировки ломало 70 из 98 тестовых файлов разом. Фикс — сортировка по
длине ключа по убыванию перед сборкой alias-объекта.

**Этап 5** — документация: `libs/forms/README.md` (раздел «Архитектура: framework-free ядро +
Chakra-адаптер»), `libs/forms/CHANGELOG.md` + версия 1.4.7, `libs/forms-core/README.md`
(написан с нуля — генератор оставил только заглушку `<!-- Опиши публичный API здесь -->`, README
описывает архитектурный принцип, таблицу всех 15 subpath-экспортов и раздел про UIKit-контракт).
`apps/form-develop-app`/`form-docs`/`form-example` не тронуты — Этап 4 внутренний рефакторинг
без нового пользовательского API, наглядного демо-эффекта нет.

## 2026-08-09 — Фаза 7.1: расслоение forms-core, Этапы 1–3б

Делегировано `forms-coordinator` (thread `forms-phase7-1-core-split`). Создан новый Nx-проект
`libs/forms-core` — dependency-free ядро `@letar/forms` (Clean Architecture / DIP, решение Ками
2026-07-08). Три этапа закрыты, каждый отдельным коммитом с полным гейтом
(`typecheck:tsgo`/`test`/`lint` + `nx run-many -t typecheck:tsgo --all` по всему монорепо).

**Этап 1** — каркас `libs/forms-core` (теги `scope:shared`/`type:core`/`owner:letar`), пилотный
модуль `validators/ru` (476 строк, 9 файлов) перенесён целиком. Граница ядра держится на двух
ESLint-правилах: `depConstraints` (`type:core notDependOnLibsWithTags: ['type:ui']`) +
`no-restricted-imports` на `**/forms-core/src/**/*.ts` против `react`/`@chakra-ui/*`/
`@tanstack/react-*` — подтверждена негативной пробой (временный импорт Chakra в ядро валит
`nx lint forms-core`, без него — зелёный).

**Этап 2** — Zod-мета-движок (~2030 строк, 9 файлов: `schema-constraints`, `schema-traversal`,
`constraint-hints`, `common-meta`, `with-ui-meta`, `schema-meta`, `zod-utils`, `types/meta-types`,
`types/size-types`) под `@letar/forms-core/schema`. Карго-культный `'use client'` снят со всех —
чистые TS-функции без единого runtime-импорта фреймворка.

**Этап 3а/3б** — `server-errors/`, `utils/` (deepEqual+safeStringify), `security/file-security.ts`,
`offline/` (offline-service+types), `captcha/` (verify+types), `analytics/` (types+4 адаптера).
React-зависимые части (хуки, компоненты) остались в `libs/forms`.

**Ключевые находки** (детали и объяснения — в `PLAN.md` § Фаза 7.1):

- резолв `@letar/forms-core` в приложениях-потребителях требует ДВА независимых механизма
  одновременно: `paths` в `tsconfig.json` (~20 приложений) И реальная workspace-зависимость
  `"@letar/forms-core": "workspace:*"` в `libs/forms/package.json` + `bun install` — приложения
  вроде `dashboard` резолвят `@letar/forms` вообще без `paths`, только через `customConditions`;
- «framework-free» ≠ «platform-free»: `file-security.ts` (DOM API — Image/document/canvas) и
  `offline-service.ts` (динамический `await import('idb-keyval')`, не пойманный статическим
  грепом аудита) — framework-free, но требуют `lib: dom` в tsconfig ядра и `fake-indexeddb/auto`
  в его vitest-окружении, которого у `forms-core` изначально не было вовсе;
- ловушка TS6307 у приложений со «смешанной моделью» `include` (`animatrona`,
  `label-printer-desktop`) — нужен явный glob на `../../libs/forms-core/src/**/*.ts`.

Публичный API `@letar/forms` не изменился — все перенесённые модули стали тонкими
реэкспорт-шимами. Побочно найден и зафиксирован отдельной задачей (уже закрыт, см. запись выше)
баг Rules of Hooks в `document-field-base.tsx`.

**Остаток Фазы 7.1** (записан в `PLAN.md`, следующая сессия `/forms-dev`): Этапы 3в-3г
(credit-card/format-phone/table-utils/dadata «хвост», `i18n/create-form-error-map.ts`), Этап 4
(UIKit-контракт ~20 примитивов + перевод 3 пилотных полей), Этап 5 (документация 6 групп +
отчёт координатору).

## 2026-08-09 — Фаза 7.1: расслоение forms-core, Этап 3в-3г

Продолжение (thread `forms-phase7-1-core-split`). Перенесены пять оставшихся Chakra-free/React-free
модулей под новые subpath-экспорты `@letar/forms-core`:

- `./credit-card` — `luhn`, `detectBrand`/`getBrandInfo`, `formatExpiry`/`isExpiryValid`,
  `formatCardNumber`/`stripCardNumber`/`maxFormattedLength`, `creditCardSchema`. В `libs/forms`
  остались только Chakra-компоненты `CreditCardField`/`CardBrandIcon` (импортируют утилиты из
  `@letar/forms-core/credit-card` напрямую).
- `./phone` — `format-phone.ts` (чистый JS форматтер по маске, добавлен в v1.4.4 для фикса
  WebKit-бага с DOM-мутирующими mask-библиотеками). `field-phone.tsx` импортирует из
  `@letar/forms-core/phone`.
- `./table` — `table-utils.ts` целиком + Chakra/React-free часть `table-types.ts` (`TableColumnDef`,
  `CellFieldType`, `ResolvedColumn`, `TableFooterDef`, `CellCoord`, `TableNavigationState`).
  `TableEditorFieldProps`/`TableEditorContextValue` (используют `ReactNode`) остались в
  `libs/forms` и реэкспортируют чистые типы обратно — то же разделение, что и раньше для похожих
  React+Chakra компонентов.
- `./address` — `createDaDataProvider` + `AddressProvider`/`AddressSuggestion`/`SuggestionOptions`.
  `providers/index.ts` в `libs/forms` стал тонким реэкспорт-шимом (потребители `field-address.tsx`/
  `field-city.tsx`/`create-form.tsx` не поменялись — импортируют из локального `./providers`).
- `./i18n` — `createFormErrorMap` + `TranslateFunction`/`TranslateParams` (тип функции перевода).
  React Context (`FormI18nProvider`/`useFormI18n`) остался в `libs/forms/i18n`, импортирует типы и
  `createFormErrorMap` из `@letar/forms-core/i18n` и реэкспортирует их для обратной совместимости
  публичного пути `@letar/forms/i18n`.

**Находка:** `libs/forms/vitest.config.ts` резолвит `@letar/forms-core/*` НЕ через `node_modules`
(там симлинка вообще нет — резолв в приложениях идёт через `customConditions`/`exports`, но
`vitest.config.ts` библиотеки использует явный `resolve.alias` per-subpath), а вручную прописанным
`resolve.alias` на каждый subpath. Добавление нового subpath-экспорта в `forms-core/package.json`
без зеркальной записи в этом alias-массиве ломает **все** тесты `libs/forms` разом (66 из 98 файлов
упали на одной ошибке `Failed to resolve import "@letar/forms-core/i18n"") — потому что почти
каждый спек транзитивно тянет`libs/forms/src/index.ts`, а тот тянет`i18n`. Починка — добавить
alias`'@letar/forms-core/<subpath>': resolve(__dirname, '../forms-core/src/lib/<subpath>/index.ts')`одновременно с добавлением subpath в`forms-core/package.json`. Гейт:`nx run-many -t
typecheck:tsgo,test --projects=forms,forms-core` — 750/750 тестов, typecheck зелёный.

Публичный API `@letar/forms` не изменился — реэкспорт-шимы. Остаток: Этап 4 (UIKit-контракт) и
Этап 5 (документация 6 групп).

## 2026-08-09 — Техдолг: rules-of-hooks в document-field-base.tsx (не false-positive)

- **`createDocumentField`** (`document/document-field-base.tsx`, используется FieldInn/FieldOgrn/
  FieldBik/FieldSnils/FieldKpp) вызывал `useCallback` прямо в теле render-callback, переданного в
  `createField()` — та же категория нарушения Rules of Hooks, что и в `FieldDataGrid`
  (2026-07-07, см. запись ниже), только для одной хук-функции (`maskRef`), а не пяти.
- Запись от 2026-07-07 называла это «известным false-positive» — неверно: `oxlint`
  (`react-hooks(rules-of-hooks)`) указывал на реальную проблему, просто раньше её не чинили.
- Фикс — по паттерну "Field with local state" из JSDoc `create-field.tsx`: `maskRef` вынесен в
  `useFieldState` (второй параметр `createField()`, вызывается ДО `form.Field`, hooks-safe),
  наружу передаётся через `fieldState.maskRef`.
- Верификация: `nx lint forms` — `rules-of-hooks` для файла ушла (остались только
  предсуществующие `curly`, не в скоупе этой правки); `nx test forms` — зелёный; публичный API
  `createDocumentField`/`DocumentFieldConfig` не менялся.

## 2026-07-08 — Стратегия дистрибуции (Фаза 7) + Clean Architecture

Планировочная сессия (без изменений кода). Определено направление распространения `@letar/forms`
на широкую OSS-аудиторию — зафиксировано в `PLAN.md` → **Фаза 7** и в memory (`project_forms_distribution`).

- **Анализ рынка (веб):** рынок ушёл в Tailwind/shadcn (дефолт новых проектов); RHF доминирует форм-стейт;
  ниша schema-first zod→form открыта. **Chakra-лок = потолок охвата**, несовместим с целью «все React-devs».
- **Аудит связанности по коду:** вся Chakra в `declarative/` (153/177), 54/66 файлов полей тянут её напрямую;
  обёртка поля уже централизована в `form-fields/base/`. UIKit-интерфейс ≈ 20 примитивов. ~50 файлов уже
  Chakra-free (`validators` 9/9 чистый — идеальный первый кандидат в core).
- **Центральное решение (Clean Architecture / DIP):** `forms-core` **не импортирует ни один фреймворк** —
  фреймворк это деталь, зависимость идёт внутрь. React-адаптер — первый плагин.
- **Vue:** делаем **тонкий пруф-адаптер** (5–8 полей поверх `@tanstack/vue-form`) как тест на фальсификацию
  границы (второй потребитель доказывает, что абстракция настоящая), НЕ полный порт. Противовес записан:
  SOLID — слуга, не господин; предохранитель от speculative generality.
- **Roadmap:** 7.1 расслоение core → 7.2 standalone вне монорепо → 7.3 shadcn-beta (20 полей) → 7.4 замер →
  7.5 docs+SEO → 7.6 llms.txt/MCP → 7.7 open-core сервис → 7.8 Vue-пруф (после 7.1). Модель — open-core.
- **Следующий шаг:** 7.1 — TS-контракт UIKit + вынести `validators` в dependency-free core.

**Доработка воркфлоу (`.claude/commands/forms-dev.md`, коммит 6b38a76):** разбор показал, что `/forms-dev` не
лишний (концурренси-замок на `libs/forms` при многих параллельных сессиях), но устарел и не видел roadmap.
Исправлено: обязать читать `libs/forms/PLAN.md` целиком (не только Backlog) → активная фаза; расширить
file-reservations на будущие пакеты Фазы 7 (`forms-core` + скины + Vue); явно выделить, что доки
(`form-docs`) и примеры (`form-example`) — отдельные аппы и обязательны; версия 0.56→1.4, 40+→56 полей.

## 2026-07-07 — Техдолг: rules-of-hooks в FieldDataGrid

- **`field-data-grid.tsx`** — `useMemo`/`useReactTable`/`useRef`/`useVirtualizer` вызывались внутри
  `{(arrayField) => {...}}` render-prop callback `<form.Field mode="array">` — реальное нарушение
  Rules of Hooks, не только придирка линтера. Заменено на `useField({ form, name, mode: 'array' })`
  верхнего уровня (тот же хук, на котором построен сам `<form.Field>`, поведение идентично) —
  все хуки теперь на верхнем уровне компонента.
- Заодно `eqeqeq`: `value != null` → явное сравнение с `null`/`undefined`.
- Обнаружено при аудите техдолга после планового `bun update` (сравнение typecheck/lint до/после
  показало, что ошибка предсуществующая, не от обновления зависимостей).
- Верификация: `nx run @letar/forms:oxlint` — чисто (кроме известного false-positive в
  `document-field-base.tsx`, не в этом файле), `typecheck:tsgo` и `test` — чисто.
- Публичный API (`DataGridFieldProps`) не менялся.

## v0.80.0 (2026-04-04) — DX фичи (Фаза 6)

- mapServerErrors() — автомаппинг Prisma/ZenStack/Zod ошибок (24 теста, 10M+ ops/sec)
- useFormHistory + HistoryControls — Undo/Redo Ctrl+Z/Y (3 теста)
- Form.Analytics — field-level аналитика + 4 адаптера (9 тестов, 25M+ ops/sec)
- FormReadOnlyView — режим чтения (9 render-тестов)
- FormSkeleton — loading state из Zod-схемы (5 тестов)
- FormComparison — diff-view (8 тестов)
- FormDependsOn — каскадный рендеринг

## v0.78.0 — Captcha + CreditCard

- Form.Captcha (Turnstile/reCAPTCHA/hCaptcha)
- Form.Field.CreditCard (brand detection, Luhn, SVG)

## v0.58.0 — Англификация + Address Provider

- 118 файлов переведены на английский
- Pluggable AddressProvider + DaData

## v0.50.0 — DRY/SOLID рефакторинг

- ~500 строк дублирования устранено
- SelectionFieldLabel, useGroupedOptions, zod-utils

## Фазы 1-5 (v0.1.0 — v0.50.0)

- 50+ field компонентов
- 20+ form-level компонентов
- Offline support, i18n, localStorage persistence
- TanStack Form DevTools интеграция
- createForm() фабрика с extraSelects/Comboboxes/Fields

### Дедуп createLazyComponent между @letar/forms и @letar/forms-shadcn (2026-08-20)

SSR Suspense/rAF-баг (см. запись «Баг: `Form.Field.TableEditor`/`DataGrid`…» выше и в
`PLAN.md` Backlog) был найден и исправлен дважды независимо — в `@letar/forms` (Chakra) как
`createLazyComponent`, и вручную скопирован в `@letar/forms-shadcn`
(`FieldDataGrid`/`FieldRichText`) без переиспользования, потому что `forms-shadcn` — сестринский
пакет, не тянущий `@letar/forms`.

Общая логика (mounted-гейт + `<Suspense>`) вынесена в новый подпуть
`@letar/forms-react/lib/lazy/create-lazy-component.tsx` — `fallback` передаётся снаружи как
`ReactNode` (не хардкодится), поскольку этот слой не знает ни одной UI-библиотеки.

- `@letar/forms` — тонкая обёртка вокруг общего хелпера с Chakra `Skeleton` fallback (2.7.1 →
  2.7.2, публичный API не менялся).
- `@letar/forms-shadcn` — `FieldDataGrid`/`FieldRichText` вызывают общий хелпер напрямую со
  своим div-fallback (0.33.3 → 0.33.4).
- `@letar/forms-react` — новый экспорт `createLazyComponent` (0.3.0 → 0.3.1), первый
  `CHANGELOG.md`.
- Проверено: `typecheck:tsgo`/`lint`/`test` зелёные на всех трёх пакетах (722 теста, 99 файлов).
- Коммит `7661a4d5` (multi-scope: три библиотеки одной осознанной правкой).

### Фикс типа Form.Field.Signature (2026-08-04)

`form-compound-types.ts`: тип поля `Signature` был вручную выписанным литералом,
разошедшимся с реальным `SignatureFieldProps` (объявлял несуществующие `penColor`/`mode`/
`readOnly`, не знал про рабочие `strokeColor`/`strokeWidth`/`allowTyped`/`typedFont`/
`exportFormat`). Рантайм-привязка была верной, ломался только typecheck потребителей
(`form-develop-app`). Заменён на прямую ссылку на `SignatureFieldProps`.

---

**Последнее обновление:** 2026-08-04
