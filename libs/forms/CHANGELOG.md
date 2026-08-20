# Changelog

Все значимые изменения в библиотеке @letar/forms документируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [2.7.2] - 2026-08-20

### Changed

- **`createLazyComponent` — общая логика вынесена в `@letar/forms-react`.** Устранено
  дублирование с `@letar/forms-shadcn` (`FieldDataGrid`/`FieldRichText`), где та же логика
  (mounted-гейт + Suspense) была скопирована руками. Здесь оставлен только Chakra `Skeleton`
  fallback, обёртка вокруг `createLazyComponent` из `@letar/forms-react`. Публичный API не
  изменился.

## [2.7.1] - 2026-08-20

### Fixed

- **Баг: `Form.Field.TableEditor`/`DataGrid` (и любое другое ленивое поле — `RichText`,
  `extraSelects`/`extraComboboxes`/`extraListboxes` из `createForm`) могли навсегда застрять в
  нераскрытом SSR-стриминг Suspense-boundary.** `createLazyComponent` монтировал `<Suspense>`
  вокруг `React.lazy()`-компонента сразу, в том числе на сервере — React отдавал реальную разметку
  в осиротевший скрытый `<div hidden id="S:N">` в конце `<body>`, а на месте поля оставлял
  нераскрытый `<template id="B:N">`. Раскрытие такого boundary React делает встроенным
  `$RC`/`$RB`/`$RV` reveal-script, который батчит swap через `requestAnimationFrame` — если rAF не
  тикает (свёрнутая/фоновая/скрытая вкладка, типичное состояние headless-браузера в e2e), boundary
  виснет навсегда: DOM формально валиден, computed CSS корректен, ошибок в консоли нет, но
  элементы имеют нулевой `getBoundingClientRect()`/`offsetParent: null`.
- **Фикс:** `LazyWrapper` теперь монтирует `<Suspense>` только после клиентского маунта (гейт
  `mounted` через `useState`+`useEffect`) — на сервере рендерится только `Skeleton`-заглушка без
  какого-либо Suspense-boundary. Ленивый импорт запускается и раскрывается целиком на клиенте
  обычным React-коммитом, не через HTML-патчинг SSR-стрима — зависимость от `requestAnimationFrame`
  исчезает полностью.
- Регресс-тест — `lazy-component.spec.tsx`: SSR-рендер (`renderToString`) не содержит содержимого
  ленивого компонента и не создаёт Suspense-плейсхолдер; клиентский рендер раскрывает содержимое
  после маунта.
- Найдено на `apps/form-example/src/app/examples/table-editor/page.tsx` (5 падающих e2e,
  `table-editor.spec.ts`, §18.7 M2 паттерн Б). Делегировано через agent-mail, тред
  `form-example-table-editor-suspense-bug`.

## [2.7.0] - 2026-08-19

### Added

- **`Form.Field.DataGrid` — редактирование enum/boolean-колонок.** `EditableCell` рендерил
  текстовый/числовой `<Input>` для любого `fieldType`, включая `enum` и `boolean` — значение
  можно было ввести только строкой, без выбора из допустимых вариантов и без чекбокса.
  Добавлено ветвление по образцу `EditingCell` из `TableEditor` (`table-cell.tsx`):
  `NativeSelect.Root`/`NativeSelect.Field` для `enum` (список берётся из `enumValues` резолвленной
  колонки, проброшен как новый проп `EditableCell.enumValues`), нативный `<input
  type="checkbox">` для `boolean`. Оба варианта коммитят значение сразу на `onChange`, как и в
  `TableEditor` — не ждут `blur`.

## [2.6.1] - 2026-08-19

### Changed

- **Дедуп коэрсии значения ячейки таблицы (`Number(localValue) || 0`).** Логика дублировалась в
  трёх местах `table-cell.tsx` (`TableEditor`) и двух местах `field-data-grid.tsx` (`DataGrid`).
  Вынесена в `useEditableCellValue` (`libs/forms/src/lib/declarative/form-fields/table/use-editable-cell-value.ts`)
  — общий `localValue`-стейт + `coerce()` по `fieldType`, используется обоими компонентами.
  Публичный контракт не менялся.
- **Аудит `field-data-grid.tsx` (`EditableCell`) на баг из v2.6.0** (клавиатурная навигация теряла
  значение при размонтировании инпута без `blur`, см. запись ниже про `TableEditor`) — сейчас не
  воспроизводится: `DataGrid` не имеет внешней клавиатурной навигации между ячейками, коммит идёт
  только изнутри инпута (`blur`/`Enter`). Если такая навигация появится — использовать тот же
  паттерн `commitEditingCellRef` (`TableEditorContextValue`), что уже есть в `TableEditor`.

## [2.6.0] - 2026-08-19

### Fixed

- **`Form.Field.TableEditor` — клавиатурная навигация (Tab/Enter/стрелки) теряла введённое
  значение.** Коммит ячейки был завязан только на нативный DOM `blur`
  (`EditingCell.onBlur` → `field.handleChange`), а `use-table-navigation.ts` выходил из ячейки
  через `setEditingCell(null)` напрямую — `<Input>` размонтировался без `blur`. Добавлен
  `commitEditingCellRef` в `TableEditorContextValue`: `EditingCell` регистрирует функцию коммита,
  навигация вызывает её перед сменой ячейки на Tab/Enter/стрелках. `Escape` намеренно НЕ коммитит —
  это отмена редактирования, а не сохранение (симметрично `field-data-grid.tsx`). Регресс-тесты —
  `table-keyboard-commit.spec.tsx`.
- **`Form.Field.Date` отдавал `string` в `onSubmit`, даже когда схема поля — `z.coerce.date()`.**
  `FieldDate` автоселектится `resolveFieldType()` только для схем с `zodType === 'date'`
  (`z.date()`/`z.coerce.date()`), но коммитил сырую строку из `<input type=date>` без обратного
  приведения к `Date` — выведенный TS-тип поля (`Date`) расходился с рантайм-значением
  (`string`), `values.field.toISOString()` падал в рантайме, `typecheck:tsgo` этого не ловил.
  Теперь `onChange` коммитит `new Date(raw)` (или `undefined` при пустом значении). Разбор —
  [letar-forms-field-date-runtime-string.md](/.claude/docs/letar-forms-field-date-runtime-string.md).
- **Post-submit `formApi.reset(dataToSubmit)` мог откатить поле к устаревшему `initialValue`.**
  `reset()` снимает `state.isTouched`; на следующем рендере TanStack Form (`useForm`'s layout
  effect → `FormApi.update()`) синхронизирует `state.values` с ЛЮБЫМ `defaultValues`, который
  родитель передал в `useAppForm`, если форма не touched — если `initialValue` вычисляется как
  статический дефолт, а не «то, что реально было отправлено», пользователь визуально терял только
  что сделанный выбор. Добавлен `usePostSubmitResetGuard` (`FormSimple`/`FormWithApi`) — запоминает
  отправленное значение и восстанавливает его один раз, если следующий рендер разошёлся. Разбор —
  [letar-forms-post-submit-reset-stale-initialvalue.md](/.claude/docs/letar-forms-post-submit-reset-stale-initialvalue.md).

## [2.5.3] - 2026-08-19

### Fixed

- **`Form.Field.Number`/`Form.Field.NumberInput` — select-on-focus вместо конкатенации с ведущим
  `0`.** Пустое числовое поле показывало `"0"`, и ввод без ручного выделения (Ctrl+A/triple-click)
  давал `"01500"` вместо `"1500"` — стандартное поведение нативного `<input type=number>`. Готового
  пропа в zag.js NumberInput под это нет. Добавлен `onFocus={(e) => e.currentTarget.select()}` на
  `NumberInput.Input` в обоих компонентах (`field-number.tsx`, `field-number-input.tsx`).

## [2.5.2] - 2026-08-17

### Changed

- **`use-table-columns.ts` — резолв колонок из schema вынесен в `resolveTableColumns()`
  (`@letar/forms-core/table`).** Та же логика дублировалась почти дословно в `@letar/forms-shadcn`,
  `@letar/forms-angular`, `@letar/forms-vue`. `useTableColumns` теперь тонкая `useMemo`-обёртка
  над общей функцией. Публичный контракт не изменился.

## [2.5.1] - 2026-08-17

### Changed

- **`fieldDataGridFeatures` вынесен в `@letar/forms-core/table` (`createDataGridTableFeatures()`).**
  `field-data-grid.tsx` больше не держит собственную конфигурацию `tableFeatures({...stockFeatures,
  ...})` — она дублировалась почти дословно в `@letar/forms-shadcn` и `@letar/forms-angular` после
  миграции на `react-table`/`table-core` v9 (см. `2.5.0`). Публичный контракт `Form.Field.DataGrid`
  не изменился.

### Added

- Тесты для `Form.Field.DataGrid` (`field-data-grid.spec.tsx`) — рендер, сортировка, текстовый
  фильтр (регистрация через `filterFns`), пагинация, `rowSelection` (включая indeterminate
  чекбокс «выбрать всё» и bulk-удаление), рендер `virtualized` без падения. Раньше компонент был
  прикрыт только typecheck.

## [2.5.0] - 2026-08-17

### Changed

- **`@tanstack/react-table` `8.21.3` → `9.1.2` (полная миграция, не shim).** Затронут только
  внутренний движок `field-data-grid.tsx` (`Form.Field.DataGrid`): `useReactTable` → `useTable`,
  обязательный `features: tableFeatures({...})` (используется `stockFeatures` — весь набор фич
  v8, минус ручной подбор per-feature), row model factories (`sortedRowModel`/`filteredRowModel`/
  `paginatedRowModel`) регистрируются в `tableFeatures()`, а не как опции `useTable`. Строковый
  `filterFn: 'auto'` теперь требует явной регистрации через `filterFns` — без неё в v9 молча
  резолвится в no-op (не ошибка типов, поведенческий баг), зарегистрирован полный реестр
  `filterFns`. Виртуализация: переключатель v8 «не передавать `getPaginationRowModel`» заменён на
  `manualPagination: virtualized` — в v9 row model factories статичны на инстанс таблицы, не
  передаются условно per-render. Публичный контракт (`DataGridColumnDef`, `Form.Field.DataGrid`
  props) не изменился — потребители библиотеки ничего не меняют.

## [2.4.3] - 2026-08-13

### Fixed

- **`useFormHistory`: гидратационный мисматч при `persist: true`** — `sessionStorage`
  читался прямо в инициализаторе `useState` вместо `useEffect`. На SSR-странице это тот же
  класс бага, что уже чинили в `useLocalStorage`: сервер и первый клиентский рендер должны
  совпадать, реальное значение из `sessionStorage` подставляется только после гидратации
  (см. `.claude/docs/ssr-hydration-persisted-state.md`). Живых вызовов с `persist: true` в
  SSR-контексте в монорепо не найдено — фикс превентивный.

## [2.4.2] - 2026-08-13

### Added

- Внутренняя compile-time проверка `assertSameKeys` (`src/lib/declarative/assert-same-keys.ts`) —
  ловит рассинхрон набора ключей между реализацией `FormField`/`FormDocument`/`FormButton`/
  `ListButton` и ручными типами в `form-compound-types.ts`, которые каст `as unknown as
  FormComponent` иначе не проверяет. Не влияет на публичный API.

## [2.4.1] - 2026-08-12

### Changed

- **Серверный код перенесён под `src/server/`** — `src/lib/captcha/verify.ts` →
  `src/server/captcha/verify.ts`, `src/lib/server-errors/*` → `src/server/server-errors/*`. Даёт
  реальную защиту `no-restricted-imports` (React/Chakra) для этих файлов — раньше правило
  матчило только `**/src/server/**` и их не видело. `exports["./server-errors"]` в
  `package.json` физически указывает на новый путь, имя экспорта не изменилось. Новый подпуть
  `exports["./captcha/server"]` — `verifyCaptcha` раньше был доступен только из корневого
  барreля без явного subpath, хотя документация уже (ошибочно) ссылалась на несуществующий
  `@letar/forms/captcha` — исправлено на `@letar/forms/captcha/server` везде. `paths` обновлены
  в 19 приложениях-потребителях. Публичный API не изменился — только физическое расположение.

## [2.4.0] - 2026-08-12

### Added

- `useFormPersistence`/`persistence` (проп `<Form>`) — новая опция `excludeFields: string[]`.
  Поля из списка (пароль, номер карты, CVV, срок действия) никогда не попадают в снимок
  localStorage — вычищаются перед сериализацией (shallow omit), при восстановлении просто
  отсутствуют в `savedData`, форма их не перезаписывает. Зафиксировано как обязательное правило
  в `.claude/rules/forms.md` (принцип [Ководство §188](https://www.artlebedev.ru/kovodstvo/sections/188/)).
- `useFormPersistence` задокументирован в `libs/forms/README.md` (новый раздел «Черновики форм»)
  — раньше был только JSDoc в самом файле, на практике не подключался, потому что про него не
  вспоминали.

## [2.3.1] - 2026-08-12

### Fixed

- **`FormComponent['Document']` (тип, на который кастуется `Form`) не содержал три поля из
  Этапа 5** (`ForeignPassport`, `DepartmentCode`, `BirthCertificate`) — рантайм-объект
  `FormDocument` их содержал, но ручной интерфейс в `form-compound-types.ts` не обновили при их
  добавлении в 2.3.0. Следствие: TS-потребители `@letar/forms` не могли написать
  `<Form.Document.ForeignPassport />` — `TS2339`. Найдено при обновлении демо-страницы
  `apps/form-develop-app/documents-demo`. Заодно убран фантомный `OGRNIP` — типовая запись без
  соответствующего поля (никогда не было реализовано).

### Added

- Гайд по движку масок в `apps/form-docs` (`docs/guides/masks`, en+ru): модель токенов,
  режимы форматирования (`live`/`blur`/`off`), критерий «когда маска не нужна» (переменная
  длина), обязательные a11y-требования `Form.Field.MaskedInput`.
- `libs/form-mcp` — регрессионный тест против реального `libs/forms/docs/fields.md`
  (`field-registry.integration.spec.ts`), закрывающий класс инцидента «49 vs 56 полей» из
  бэклога: `list_fields`/`get_field_props`/`get_field_example` уже читали данные из markdown
  корректно (код не менялся), тест — только страховка от будущего рассинхрона.
- Демо документных полей (`apps/form-example/examples/documents`,
  `apps/form-develop-app/documents-demo`) дополнены пятью полями Этапа 5/6:
  `CorrAccount`, `Passport`, `ForeignPassport`, `DepartmentCode`, `BirthCertificate`.
- `libs/forms/README.md` — раздел «Маски ввода» со ссылкой на `MASK_ENGINE.md`.

Закрывает Фазу 8, Этап 7 (документация/MCP) — PLAN.md.

### Changed

- **`FieldPhone`/`FieldCreditCard` — форматтеры переведены на общий движок
  `@letar/forms-core/mask`** (закрывает хвост Фазы 8, Этапа 4). `formatPhoneNumber` и
  `formatCardNumber`/`formatExpiry` (`@letar/forms-core`, 0.6.0→0.6.1) теперь раскладывают
  цифры по слотам маски через `format()` вместо собственных ручных циклов — устранена
  дублирующая логика. Поведение не изменилось (все pre-existing тесты прошли без правок), UI
  компонентов не тронут. **Живой DOM-контроллер движка (`useMaskField`) сознательно не
  используется** ни для телефона (trunk-префикс `8` требует ретроактивной перетрактовки уже
  принятой цифры — несовместимо с посимвольным DOM-заполнением слотов), ни для банковской
  карты (compound-компонент с авто-переходом между полями и smart-expiry — не задача
  маскирования). Известная нерешённая проблема: каретка при редактировании середины номера
  телефона по-прежнему прыгает в конец (MASK_ENGINE.md §4) — требует того же DOM-контроллера,
  который несовместим с trunk-логикой.

## [2.3.0] - 2026-08-12

### Added

- **Фаза 8, Этап 5 — три новых документных поля** (MASK_ENGINE.md §7.1):
  `Form.Document.ForeignPassport` (загранпаспорт, `99 9999999`), `Form.Document.DepartmentCode`
  (код подразделения, `999-999`) — оба на движке `@letar/forms-core/mask`; и
  `Form.Document.BirthCertificate` (свидетельство о рождении) — **без маски** (переменная длина
  римской части серии, критерий §5.3), свободный ввод с нормализацией гомоглифов и разделителей
  на потере фокуса (`|||`→`III`, позиционное разведение латиница/кириллица `X`/`Х`).
- Три новых `zRu`-валидатора: `zRu.foreignPassport()`, `zRu.departmentCode()`,
  `zRu.birthCertificate()` (+ `normalizeBirthCertificate` для прямого использования).

## [2.0.5] - 2026-08-12

### Fixed

- **`document-fields.spec.ts` не тестировал реальные документные поля** — все 8
  `describe`-блоков (ИНН, БИК, ОГРН, СНИЛС, КПП, паспорт, расчётный/корр. счёт) держали
  собственные локальные копии `validate`, местами разошедшиеся с продовым кодом: ИНН-12 и
  СНИЛС вообще не проверяли контрольную сумму (`return undefined // Упрощённая проверка`),
  ОГРН считал контрольную сумму заново через `BigInt(...) % 11n` вместо `validateOgrn`, КПП —
  своей регуляркой вместо `validateKpp`. Ни один компонент (`FieldINN`, `FieldSNILS` и т.д.) не
  импортировался и не рендерился — реальное поведение полей (маска, рендер, отображение
  ошибки) не было покрыто вовсе.
  - Переписан в `document-fields.spec.tsx` (сменил расширение — тестам нужен JSX):
    рендерит настоящие `Form.Document.*` через `@testing-library/react` +
    `@testing-library/user-event`, значения для валидных/невалидных случаев проверены напрямую
    через `validateInn10`/`validateInn12`/`validateOgrn`/`validateSnils`/`validateBik`/
    `validateKpp` из `@letar/forms-core/validators/ru` (те же контрольные значения, что и в
    `libs/forms-core/.../validators/ru/__tests__/*.spec.ts`).
  - ⚠️ Найдено при вводе: маска `*` (любой символ, `Form.Document.KPP`) заполняет
    незаполненные позиции placeholder-символом уже при фокусе — `value` всегда 9 символов,
    поэтому короткий ввод не отличить от невалидного формата через `length`-проверку. Тест на
    длину заменён на ввод заведомо невалидного 9-символьного значения (`ABCD01001`, буквы в
    первых 4 позициях).
  - `FieldPassport`/`FieldBankAccount`/`FieldCorrAccount` не импортируют реальные
    `validatePassport`/`validateBankAccountWithBik` (сами поля их не вызывают — только проверка
    длины/префикса) — тесты проверяют фактическое поведение компонента, не выдуманную
    интеграцию с валидатором, которого там нет.
- **`field-masked-input.spec.tsx` проверял только рендер, не маскирование** — добавлена
  проверка реального форматирования через `use-mask-input` (посимвольный ввод с цифровой и
  буквенной маской, отклонение символов вне маски, форматирование начального значения по
  фокусу).

## [2.0.4] - 2026-08-12

### Fixed

- **`Form.Field.Phone` терял цифру при вводе номера с ведущей `8`.** Самый привычный для России
  способ набора (`89185568172`) давал `+7 (891) 855-68-17` вместо `+7 (918) 556-81-72`: восьмёрка
  занимала первую позицию кода региона, а последняя цифра молча отбрасывалась. Ошибки при этом не
  показывалось — маска выглядела полностью заполненной, поэтому подмену нельзя было заметить.
  Затрагивало и Chakra-, и shadcn-скин (общий форматтер `@letar/forms-core/phone`).
  - Исправлено в `formatPhoneNumber`: междугородний префикс снимается по таблице
    `TRUNK_PREFIXES` (`'7' → '8'`, покрывает РФ и Казахстан).
  - ⚠️ Префикс снимается **только при переполнении маски**, а не по первой же цифре — иначе
    пострадали бы коды регионов, которые сами начинаются с восьмёрки (812 Санкт-Петербург,
    843 Казань, 861 Краснодар, 8482 Тольятти). Отличить `8`-префикс от `8`-в-коде можно только
    по общему числу цифр.
  - 7 новых тестов в `format-phone.spec.ts`, включая регресс-защиту на питерский номер и на
    страну без trunk-префикса (США: `8005551234` → `+1 (800) 555-1234`).
  - Проверено в браузере на `form-develop-app`: `89185568172` → `+7 (918) 556-81-72`,
    `8123456789` → `+7 (812) 345-67-89`.
  - Найдено при исследовательской сессии по mask-движку, разбор — [MASK_ENGINE.md](./MASK_ENGINE.md) §4.

## [2.0.3] - 2026-08-11

### Changed

- **Изолированы тяжёлые peer-deps четырёх полей через `lazy()` + dynamic `import()`** — паттерн
  `Form.Captcha` (`captcha-field.tsx`) применён к `FieldRichText`, `FieldMaskedInput`,
  `Form.Document.*` (`createDocumentField`) и `FieldDataGrid`/`FieldTableEditor`. До этого
  форма с двумя простыми полями (например строка + пароль) требовала резолва `@tiptap/*` в
  графе сборки — `FieldRichText` и `FieldMaskedInput` лежали в одном tsup-entry `fields/text`,
  что `use-mask-input` для `Form.Document.*` резолвился для ЛЮБОГО потребителя `@letar/forms`
  (реэкспорт из корневого barrel `lib/declarative/index.ts`), а `@tanstack/react-table`/
  `@tanstack/react-virtual` — для любого потребителя `FieldTableEditor`, даже не использующего
  `FieldDataGrid` (общий барrel `form-fields/table/index.ts`).
  - `FieldRichText`: реализация вынесена в `field-rich-text-impl.tsx`, экспорт —
    `createLazyComponent()` (общий хелпер `lazy-component.tsx`, ранее использовался только в
    `createForm`'s `extraSelects`/`extraComboboxes`).
  - `FieldDataGrid`/`FieldTableEditor`: та же обёртка в `form-fields/table/index.ts`.
  - `FieldMaskedInput`/`createDocumentField`: компонент лёгкий (обычный `Input`), поэтому вместо
    `React.lazy`+`Suspense` — точечный dynamic `import('use-mask-input')` внутри ref-колбэка
    (маска применяется на первый рендер асинхронно, без визуальной задержки самого поля).
  - Публичный API не изменился — импорт `Form.Field.RichText`/`Form.Field.DataGrid`/
    `Form.Field.TableEditor`/`Form.Document.*` тот же, пропсы те же.
  - Тесты, синхронно проверявшие DOM сразу после `render()` (`field-rich-text.spec.tsx`,
    `table-selection.spec.tsx`), переведены на `waitFor`/`findBy` — резолв ленивого чанка
    занимает как минимум один микротаск.

## [2.0.2] - 2026-08-10

### Changed

- **`FormSteps`: логика навигации/состояния/персистенции шагов (`use-step-state.ts`,
  `use-step-navigation.ts`, `use-step-persistence.ts`) переехала в `@letar/forms-react`
  (0.2.1) — было продублировано почти дословно в `@letar/forms-shadcn` при портировании
  `FormSteps` на shadcn-скин (0.16.0). Единственное реальное отличие между версиями —
  `hiddenFields`-интеграция с `Form.When`, которой нет в shadcn-скине — сохранено:
  `hiddenFields` в `useStepNavigation` теперь опциональный параметр (по умолчанию пустое
  множество), `useStepState` по-прежнему всегда несёт `hiddenFields`/`hideFieldsFromValidation`/
  `showFieldsForValidation` — скины без Form.When просто их не используют. Публичный API
  `@letar/forms` не изменился: `StepInfo`/`StepDirection` из `form-steps-context.tsx`
  реэкспортируются из `@letar/forms-react`, `index.ts` пакета — без изменений.

## [2.0.1] - 2026-08-10

### Fixed

- **`FieldAddress`/`FieldCity`: убран React-warning «Cannot update a component while rendering a
  different component» на непустых `defaultValues`.** Тот же баг, что был найден и исправлен в
  `@letar/forms-shadcn` 0.13.2 (симметричный код в Chakra-версии, не унаследован, обнаружен
  отдельно) — синхронный `setInputValue()` в теле `render()` переехал в `useEffect` на верхнем
  уровне `useFieldState`, куда теперь прокидывается `form`/`fullPath` через новый параметр
  `@letar/forms-react`'s `useFieldState` (CHANGELOG `@letar/forms-react` 0.2.0). Поведение полей
  не изменилось.

## [2.0.0] - 2026-08-10

### Breaking

- **`BaseFieldProps`, публично экспортируемый из `@letar/forms`, теперь другой тип.** Старый
  легаси-тип (`src/lib/types.ts`, минимальный набор полей старого `ChakraFormField`-API:
  `label?: string`, без `tooltip`/`asyncValidate`) переименован в `LegacyFieldProps`. Имя
  `BaseFieldProps` освобождено под реальный тип, от которого фактически наследуются все
  56 полей библиотеки (`label?: ReactNode`, `tooltip`, `asyncValidate` и т.д.) — он и раньше
  использовался внутри (`StringFieldProps extends BaseFieldProps` и т.д.), но публично не
  экспортировался под этим именем, из-за чего `BaseFieldProps` и реальные field-props типы были
  структурно несовместимы (нельзя было присвоить `StringFieldProps` в `BaseFieldProps`).
  Потребители, импортирующие `BaseFieldProps` напрямую из `@letar/forms` для типизации старого
  `ChakraFormField`-API — используйте `LegacyFieldProps`. Проверено: ни одно приложение
  монорепо не импортирует `BaseFieldProps` из `@letar/forms` напрямую.

## [1.6.0] - 2026-08-09

### Changed

- **Композиционный слой вынесен в `@letar/forms-react` (Фаза 7.3, шаги 3-4).** `createField`,
  `FieldWrapper`, `FieldErrorBoundary`, контекст формы, `FormGroup`, хуки поля
  (`useResolvedFieldProps`, `useAsyncFieldValidation`, `useAsyncSearch`, `useDebounce`),
  React-часть i18n и не зависящие от UI типы (`BaseFieldProps`, `DeclarativeFormContextValue`)
  переехали в новый пакет — React и TanStack Form там есть, UI-библиотеки нет. `@letar/forms`
  стал тонким потребителем: связывает слой со своим `chakraUIKit` одной строкой в
  `form-fields/base/primitives.ts`.
- **Публичный API не изменился.** Все старые пути импорта работают: на местах переехавших
  модулей оставлены реэкспорт-шимы, поэтому ни одно из 56 полей не правилось. Проверено на
  потребителях (`form-develop-app`, `form-docs`, `dashboard`, `form-example`, `archetest`,
  `grandslamcup`, `mandala`, `kami`, `auth-hub`, `animatrona*`, `label-printer-desktop` и шесть
  приватных приложений) — `typecheck:tsgo` зелёный.
- **Ядро не зависит от нового слоя.** `type:core` теперь не зависит ни от `type:ui`, ни от
  `type:core-react`; у самого `forms-react` своя линт-граница против UI-библиотек. Обе проверены
  негативной пробой.

### Fixed

- **Потребители получили полный набор `paths` на подпути `@letar/forms-core`.** Было прописано
  9 подпутей из 15 — недостающие (`/uikit`, `/i18n`, `/address`, `/table`, `/phone`,
  `/credit-card`) всплыли сразу, как только композиционный слой начал их импортировать.
  Дописаны во все 17 приложений-потребителей, чтобы следующее такое использование не ломало их
  заново.

- **Починена публикация типов: `.d.ts` больше не ссылаются на внутренние `@letar/*`.**
  `noExternal` инлайнит внутренние пакеты только в JS-бандл — декларации собирает отдельный
  проход, и в `dist/*.d.ts` оставались импорты `@letar/forms-core/...`, которых в npm нет
  (дефект существовал с Фазы 7.1, `forms-react` его только унаследовал). Причина того, что
  флаг `dts: { resolve: [...] }` выглядел неработающим: tsup строит `external` для dts-прохода
  как `dependencies + peerDependencies`, всё оттуда rollup помечает внешним **до** плагинов, и
  резолвер не вызывается вовсе. `@letar/forms-core`/`@letar/forms-react` переехали в
  `devDependencies` — это внутренние слои, а не npm-пакеты, потребитель их не устанавливает.
  Проверено установкой `npm pack`-тарбола в чистый проект вне монорепо: `tsc --noEmit` зелёный,
  негативный контроль (`name={42}`) даёт `TS2322` — типы настоящие, а не `any`.

### Known issues

- **Два разных `BaseFieldProps` в библиотеке.** Наружу из `@letar/forms` экспортируется legacy-тип
  из `src/lib/types.ts` (`label?: string`, без `tooltip`/`asyncValidate`) — он существует с первого
  коммита и относится к старому API `ChakraFormField`. Поля же используют другой `BaseFieldProps`
  (из `@letar/forms-react`, `label?: ReactNode`). Присвоение `StringFieldProps` → `BaseFieldProps`
  у внешнего потребителя не проходит. Не регресс, но переименование публичного типа — breaking
  change, поэтому вынесено отдельным решением.

## [1.5.0] - 2026-08-09

### Changed

- **UIKit-контракт расширен и доведён до композиционного слоя (Фаза 7.3, шаги 1-2).** Аудит
  перед стартом shadcn-скина показал, что Этап 4 Фазы 7.1 закрыл только слой контролов: сборка
  формы ниже уровня поля по-прежнему импортировала Chakra напрямую, в обход контракта. Найдено
  9 таких точек; закрыты пять из них — `FieldWrapper`, `FieldErrorBoundary`, `FieldLabel` и обе
  кнопки массива (`Form.Group.List.Button.Add`/`.Remove`) теперь рендерят через
  `chakraUIKit`, а не через собственные импорты Chakra.
- **Стилевые детали убраны из контракта в адаптер.** Два места протаскивали конкретные
  Chakra-токены сквозь границу: `FieldWrapper` красил рамку через `css`-проп
  (`borderColor: 'blue.200'`), кнопка удаления несла `colorPalette="red"`. Заменены на
  семантику — `validating?: boolean` у `FieldRoot` и `tone: 'danger'` у кнопок; как это
  выглядит, решает реализация контракта.
- **`useGroupedOptions` расслоён.** Хук смешивал чистую группировку опций с построением
  `createListCollection` — рантайм-структуры Ark UI. Логика группировки вынесена в
  `@letar/forms-core/uikit` (`groupOptions`, `hasGroups`, `getOptionLabel` — framework-free,
  12 тестов), построение коллекции остаётся деталью Chakra-адаптера. Это была протечка на
  уровне **данных**, а не рендера: shadcn-скин не имеет `createListCollection` вовсе, и
  подменить её примитивом UIKit было невозможно.

### Added

- Новые примитивы контракта: `Tooltip`, `RequiredIndicator`, `ErrorFallback`, расширенные
  `Button`/`IconButton` (`type`/`variant`/`size`/`tone`), тип `UIKitTone`.
- `libs/forms-core/src/lib/uikit/group-options.ts` + 12 тестов.
- Тесты на `FieldErrorBoundary` (4) — компонент не был покрыт вовсе, хотя именно он решает,
  увидит ли пользователь сломанное поле или потерю всей формы.

### Notes

- Публичный API `@letar/forms` не изменился — правки внутренние.
- Оставшиеся точки связанности композиционного слоя (`create-field.tsx` с его дефолтным
  `FieldError`-хелпером, `field-tooltip.tsx`, `selection-field-label.tsx`) ждут решения по
  размещению React-слоя — см. `PLAN.md`, Фаза 7.3.

## [1.4.9] - 2026-08-09

### Fixed

- **`build:npm` мог опубликовать пакет со старой версией.** `dist/package.json` копировался
  голым `cp` из `package.publish.json`, у которого было собственное поле `version`, независимое
  от `libs/forms/package.json` — на момент находки разошлись на два минора (`1.2.0` против
  `1.4.8`). Тот же класс ошибки, что и рассинхрон `paths`/vitest-alias/tsconfig — вручную
  синхронизируемое поле рано или поздно расходится. Фикс — `version` убрано из
  `package.publish.json` вовсе, `dist/package.json` теперь собирает
  `scripts/write-publish-package-json.mjs` (мёржит шаблон `package.publish.json` с актуальной
  версией из `package.json`), рассинхрон структурно невозможен.

## [1.4.8] - 2026-08-09

### Fixed

- **`build:npm` был сломан — публикация на npm не проходила.** `tsconfig.publish.json` не
  обновлялся вместе с ростом subpath-экспортов `forms-core` за Фазу 7.1 (`paths` покрывал 8 из
  15, `rootDir: "src"` исключал `forms-core` из программы) — отдельный проход
  `tsc --project tsconfig.publish.json` в `build:npm` падал на 80 ошибках TS6059/TS6307,
  `.d.ts` не генерировались вовсе. Найдено диагностикой Фазы 7.2 (standalone-проверка вне
  монорепо — TS-потребитель получал `TS7016: Could not find a declaration file`).
  Фикс — декларации теперь генерирует сам `tsup` (`dts: true`) синхронно со списком `entry`,
  отдельный `tsc`-проход убран из `build:npm`; `composite`/`outDir`/`rootDir` в
  `tsconfig.publish.json` больше не нужны (они принадлежали tsc-project-build режиму).
  Рассинхрон `paths` со списком subpath-экспортов `forms-core` теперь структурно невозможен —
  тот же принцип, что и у vitest-alias фикса в 1.4.7.

## [1.4.7] - 2026-08-09

### Changed

- **UIKit-контракт `forms-core` + пруф на 3 полях (Фаза 7.1, Этап 4) — завершает расслоение
  ядра.** Новый subpath `@letar/forms-core/uikit` — типы-only интерфейс (~20 примитивов из
  аудита связанности 2026-07-05), описывающий, что полю нужно от UI-библиотеки: `FieldRoot`,
  `FieldLabel`, `FieldError`, `Input`, `Checkbox`, `Select` реализованы и используются;
  `NumberInput`, `NativeSelect`, `Combobox`, `RadioGroup`, `SegmentGroup`, `PinInput` и layout
  (`Box`/`HStack`/`VStack`/`Text`/`Button`/`IconButton`) — типизированы, но пока без адаптера
  (не мигрировали поля). `Form.Field.String`, `Form.Field.Checkbox`, `Form.Field.Select`
  переведены на потребление контракта через `chakraUIKit` (`libs/forms`) вместо прямого импорта
  Chakra — это единственное место, где контракт связывается с конкретной UI-библиотекой; будущий
  `forms-shadcn` реализует тот же контракт без изменений в самих полях. Публичный API
  `@letar/forms` не изменился, 750/750 тестов зелёные.
- **Fix:** `libs/forms/vitest.config.ts` резолвил `@letar/forms-core/*` через ручной
  per-subpath alias-список, рассинхронизировавшийся при добавлении нового subpath (падало 66/98
  тестов, см. 1.4.6). Заменено на программную генерацию из `forms-core/package.json` → `exports`
  — рассинхрон теперь структурно невозможен. Попутно найден и исправлен второй баг того же
  участка: `rollup-plugin-alias` матчит объектные алиасы по префиксу, и ключ `@letar/forms-core`
  без подпути обязан сортироваться после всех подпутей — иначе перехватывает `/schema`, `/utils`
  и т.д. раньше их собственной записи.

## [1.4.6] - 2026-08-09

### Changed

- **Внутренний рефакторинг (Фаза 7.1, Этап 3в-3г) — без изменений публичного API и поведения.**
  Chakra/React-free утилиты `credit-card` (luhn, detectBrand, formatExpiry, formatCardNumber,
  creditCardSchema), `format-phone`, `table-utils` (+ чистые типы из `table-types`), DaData
  address provider и `create-form-error-map` вынесены в `@letar/forms-core` (dependency-free
  ядро). Все прежние пути импорта (`@letar/forms`, `@letar/forms/i18n`, локальные `./providers`,
  `./table-types`/`./table-utils`) продолжают работать — реэкспорт-шимы.

## [1.4.5] - 2026-08-09

### Added

- **Провайдер Yandex SmartCaptcha для `Form.Captcha`.** Запрошено для `svoichuzhie` (152-ФЗ —
  Turnstile/reCAPTCHA/hCaptcha отправляют IP и телеметрию браузера на зарубежные серверы,
  SmartCaptcha хранит данные в РФ). `provider="smartcaptcha"` + новый файл
  `captcha/providers/smartcaptcha.tsx` (лениво грузит `smartcaptcha.cloud.yandex.ru/captcha.js`,
  тот же паттерн explicit-render, что у `hcaptcha.tsx`). Серверная верификация через
  `verifyCaptcha({ provider: 'smartcaptcha', ... })` — нормализует нестандартный формат ответа
  SmartCaptcha (`{status, message, host}` вместо `{success, 'error-codes', hostname}`) и другие
  имена полей запроса (`secret`+`token`+`ip` вместо `secret`+`response`+`remoteip`) под общий
  `CaptchaVerifyResult`, прозрачно для потребителя.

## [1.4.4] - 2026-08-09

### Fixed

- **`Form.Field.Phone` не работал в WebKit при посимвольном вводе.** Компонент использовал
  `use-mask-input` (imask) — библиотека мутирует DOM-элемент напрямую в обход React, и это
  конфликтовало с controlled `value` конкретно при быстром посимвольном вводе в WebKit
  (Chromium/Firefox проходили). Найдено в `apps/dsperevod-e2e/src/callback-drawer.spec.ts` —
  все 4 теста падали на шаге ввода телефона (`--project=webkit`). Фикс — маска теперь
  форматируется чистым JS на каждый `onChange` (новый `specialized/utils/format-phone.ts`),
  без сторонних DOM-мутирующих библиотек — тот же паттерн, что уже используется в
  `credit-card-field.tsx`. Добавлен регрессионный тест на посимвольный ввод через
  `userEvent.type` в `field-phone.spec.tsx`.

## [1.4.3] - 2026-07-22

### Fixed

- **Утечка подписки `form.store` при рассинхроне версий `@tanstack/store`.** В установленной у части
  приложений версии (`@tanstack/store@^0.11.0`, тянется транзитивно через `@tanstack/form-core@1.33.x`)
  `subscribe()` возвращает объект `{ unsubscribe }`, а не bare-функцию (как в `0.7.x`/`0.9.x`). Три
  места в `libs/declarative/` (`form-subscribe.tsx`, `use-active-filters-count.ts`,
  `use-form-url-sync.ts`) и одно в `libs/history/use-form-history.ts` вызывали/возвращали результат
  `subscribe()` так, будто это всегда функция — `as any`-каст скрывал ошибку типов, но в рантайме
  cleanup либо не вызывался (подписка утекала на каждый mount/unmount), либо кидал
  `TypeError: ... is not a function`. `form-steps-step.tsx` был асимметричен в обратную сторону —
  предполагал только объектную форму. Найдено при разборе краша вкладки браузера в `apps/mandala`
  (см. `apps/mandala/PLAN_COMPLETED.md`), где точно такой же баг сидел в двух компонентах
  `@letar/admin-ui` (`SlugField`/`SeoField`, коммит `a5893e7c`). Все 6 мест приведены к одному
  безопасному паттерну (проверка `typeof subscription === 'function'`).
- **Новый `useFormStoreSubscribe(form, callback, deps)`** (`libs/forms/src/lib/utils/`, экспортирован
  из корневого `index.ts`) — общий хелпер для подписки на `form.store` внутри `useEffect`, инкапсулирует
  проверку формы возврата `subscribe()`. Один источник правды вместо копипасты этой проверки по коду;
  используется в `use-active-filters-count.ts`. Остальные затронутые файлы оставлены с инлайн-фиксом —
  у них есть дополнительная логика в cleanup (debounce-таймеры), не покрываемая общим хелпером.

## [1.4.2] - 2026-07-16

### Fixed

- **GET-утечка данных в URL до hydration:** `method="post"` на корневом `<form>` в `FormSimple` и
  `FormWithApi` (`src/lib/declarative/form-root/`). Без гидрации React форма сабмитится нативным
  GET — чувствительные поля (пароли и т.п.) попадают в URL/history/Referer/access-логи. Найдено
  кросс-приложенческим аудитом логин-форм монорепо. Чисто аддитивный атрибут, без breaking changes.

## [1.4.0] - 2026-05-22 — Form as State Manager

### Added

- **`Form.Subscribe`** — компонент подписки на значения формы с опциональным debounce:
  - `<Form.Subscribe>{(values, state) => ...}</Form.Subscribe>` — немедленная подписка (live preview)
  - `<Form.Subscribe debounce={300}>{(filters) => ...}</Form.Subscribe>` — debounced (фильтры → API-запросы)
  - `state.isDirty` / `state.isSubmitting` доступны в render prop
- **`Form.UrlSync`** — renderless-компонент двусторонней синхронизации формы с URL-параметрами:
  - Размещается внутри `<Form>`, подписывается на изменения, пишет в URL с debounce
  - Пропускает поля с дефолтными значениями — URL остаётся чистым
  - Сохраняет сторонние параметры (`utm_*`, `ref`, etc.)
  - Поддержка Next.js `router.replace` через проп `router`
- **`useFormUrlSync(options)`** — хук для чтения initial values из URL при маунте:
  - Умная типизация: `number` → `Number()`, `boolean` → `=== 'true'`, `string[]` → повторяющиеся params
  - Whitelist полей — защита от инъекций через URL
- **`readUrlValues(fields, defaults, searchParams?)`** — чистая функция (тестируема без React)
- **`useFormRef()`** — создаёт ref для доступа к инстансу формы снаружи дерева `<Form>`:
  - Передаётся как `<Form formRef={ref}>` → `ref.current.reset()`, `ref.current.setFieldValue()` и др.
- **`useActiveFiltersCount(defaults)`** — возвращает количество полей, отличающихся от дефолтов:
  - Поддерживает массивы (сравнение без учёта порядка), объекты, примитивы
  - Используется для бейджей «Фильтры (3)»
- **`onSubmit` теперь опциональный** — `<Form initialValue={...}>` без `onSubmit` работает как state-контейнер
- **`formRef` prop** на `<Form>` — передаёт инстанс TanStack Form во внешний ref после инициализации

### Documentation

- Новая статья [`libs/forms/articles/14-forms-as-state.md`](./articles/14-forms-as-state.md)
- Новый docs-гайд [`guides/filters-state.mdx`](../../apps/form-docs/content/docs/guides/filters-state.mdx) (EN + RU)
- Обновлены `MAPPING.md` и `PLAN.md`

## [1.3.0] - 2026-04-10 — Testing Utilities + URL Prefill

### Added

- **@letar/forms/testing** — новый entry point с хелперами для тестирования форм:
  - `renderForm()` — рендер в ChakraProvider + привязанные хелперы
  - `fillField()` — заполнение полей по data-field-name (text, number, checkbox)
  - `submitForm()` — поиск и клик кнопки сабмита
  - `expectFieldError()` / `expectNoFieldError()` / `expectFieldValue()` — ассерты
  - `goToStep()` / `expectActiveStep()` — мультистеп хелперы
  - `addItem()` / `removeItem()` / `expectItemCount()` — массивы
  - `renderComparison()` / `renderReadOnlyView()` — утилитарные компоненты
  - `TestWrapper` — централизованный ChakraProvider wrapper
- **useUrlPrefill()** — хук для автозаполнения формы из URL-параметров (whitelist, маппинг, массивы, вложенные объекты, cleanUrl)
- **generatePrefillUrl()** — генерация маркетинговых ссылок с предзаполненными параметрами

### Documentation

- Обновлены GitHub READMEs: letar-forms (56 fields, новые фичи), zenstack-form-plugin (бейджи), letar-form-mcp (56 fields)
- Добавлены MDX guides (EN+RU) и демо-страницы в form-docs для testing-utilities и url-prefill
- Добавлены примеры в form-example с навигацией

## [0.84.3] - 2026-04-04 — Fix: TableEditor checkbox selection

### Fixed

- **TableEditor selectable** — клик по чекбоксу одной строки выделял все строки. Причина: Chakra Checkbox без уникального `id` и `Checkbox.Indicator` внутри `Checkbox.Control` вызывал коллизии label-input привязок. Добавлены уникальные `id` и `Checkbox.Indicator`.

### Added

- **table-selection.spec.tsx** — 3 unit-теста для проверки изолированного выделения строк

## [0.84.2] - 2026-04-04 — Аудит документации: 56 полей задокументированы

### Added

- **docs/analytics.md** — полная документация аналитики форм (useFormAnalytics, 4 адаптера, AnalyticsPanel, события)
- **docs/fields.md** — добавлены 17 недокументированных полей: Document (7), Survey (3), YesNo, TableEditor, DataGrid, Hidden, Calculated, Signature, CreditCard
- **docs/form-level.md** — добавлены секции: Captcha, Analytics.Panel, History.Controls, Comparison, ReadOnlyView, Skeleton, DependsOn
- **docs/api-reference.md** — добавлены: useFormHistory, useFormAnalytics, useFormAutosave, mapServerErrors, applyServerErrors, deepEqual, safeStringify

### Improved

- **README.md** — обновлён счётчик полей: "50+" → "56"
- **docs/fields.md** — обновлён счётчик: "40 типов" → "56 типов", добавлены 6 новых категорий полей

## [0.84.1] - 2026-04-04 — Аудит качества: unit-тесты ядра и документных полей

### Added

- **create-form.spec.tsx** — 10 unit-тестов для фабрики createForm (extraSelects, extraComboboxes, extraListboxes, extraFields, комбинирование)
- **form-autosave.spec.ts** — 12 unit-тестов для useFormAutosave (saveNow, loadDraft, localStorage fallback, callbacks, HTTP метод, draftId)
- **document-fields.spec.ts** — 27 unit-тестов для валидации документных полей (ИНН, БИК, ОГРН, СНИЛС, КПП, паспорт, р/с, корр. счёт)

### Improved

- **TESTING_PLAN.md** — актуализированы метрики (109 файлов, 1074 теста; убраны завышенные планируемые числа)
- Метрики: 112 тестовых файлов, 1074 теста (было 109/1020)

## [0.84.0] - 2026-04-04 — P3 тесты + документация DX-фич

### Added

- **5 unit-тестов P3**: creditCardSchema, KPP validator, table-utils (6 функций), captcha verify (3 провайдера), useConversationalState
- **5 MDX guides** (form-docs): comparison, depends-on, readonly-view, form-skeleton, debug-values
- **4 demo pages** (form-docs): comparison, depends-on, debug-values, form-templates
- **3 example pages** (form-example): comparison, depends-on, debug-values

### Improved

- Навигация form-example: +3 ссылки (Comparison Diff, DependsOn, Debug Values)
- meta.json form-docs: +5 guide slugs
- Метрики: 109 тестовых файлов, 1020 тестов (было 104/951)

## [0.83.0] - 2026-04-04 — DragHandle, SVG export, async validation Spinner

### Added

- **Signature SVG Export** — новый проп `exportFormat: 'png' | 'svg'` для поля подписи
  - Draw mode: запись stroke-координат → SVG `<path>` элементы
  - Typed mode: SVG `<text>` элемент с курсивным шрифтом
  - Векторный формат для печати без потери качества
  - XSS-защита через `escapeXml()` для typed mode
  - По умолчанию `'png'` — полная обратная совместимость
  - 10 unit-тестов для SVG утилит

### Improved

- **TableEditor DragHandle** — заменён текстовый ⋮ на полноценный `DragHandle` компонент из @dnd-kit с keyboard support, aria-label и grab/grabbing курсором
- **Async Validation Spinner** — заменён текст "⟳ Проверяю..." на Chakra `Spinner` компонент + синяя рамка на input при валидации (`data-validating` атрибут)

## [0.82.0] - 2026-04-04 — P2 тесты, lint/typecheck фиксы, E2E инфраструктура

### Fixed

- **honeypot.tsx** — tabIndex вынесен из style в JSX prop (TS2353)
- **field-file-upload.tsx** — добавлен generic FileUploadFieldState в createField (TS2322/TS2349)
- **field-signature.tsx** — placeholder/disabled из resolved вместо componentProps (TS2339)
- **rate-limiter.ts** — убрана неиспользуемая переменная attemptVersion (TS6133)
- **map-server-errors.ts** — `==` → `===` (eqeqeq)

### Tests

- 8 новых P2 unit-тестовых файлов: SegmentedGroup, Tags, CheckboxCard, RadioCard, Schedule, Address, RichText, City
- 828 тестов в 81 файле (100% проходят)
- E2E инфраструктура: form-example-e2e с Playwright (5 тестов: basic, validation, multi-step, conditional, groups)

## [0.81.0] - 2026-04-04 — Баг-фиксы, типобезопасность, тестовое покрытие

### Fixed

- **AbortController в FieldAddress** — отмена in-flight запросов при новом вводе и unmount, устранён race condition
- **deepEqual()** — замена JSON.stringify на корректное глубокое сравнение в FormComparison и RelationFieldProvider
- **safeStringify()** — безопасная сериализация объектов с circular refs в FormComparison и FormReadOnlyView

### Improved

- **Типобезопасность** — RelationConfig: `any` → `unknown`, убраны eslint-disable комментарии

### Tests

- 8 новых тестовых файлов: deepEqual, safeStringify, Rating, PinInput, OTPInput, ColorPicker, Editable, NumberInput, Autocomplete, Listbox
- 802 теста в 73 файлах (100% проходят)

## [0.80.0] - 2026-04-04 — DX фичи: Analytics, History, ServerErrors, ReadOnly, Skeleton, Comparison, DependsOn

### Added

- **mapServerErrors()** — автоматический маппинг серверных ошибок на поля формы
  - Автодетект формата: Prisma P2002/P2003/P2025/P2014, ZenStack policy/db-query, Zod flatten, ActionResult
  - `applyServerErrors(form, mapped)` для TanStack Form
  - Кастомный fieldMap для constraint → поле маппинга
  - Locale: ru/en, subpath `@letar/forms/server-errors`
  - 24 unit-теста, bench: 10M+ ops/sec
- **useFormHistory()** — Undo/Redo для форм (Ctrl+Z/Ctrl+Y)
  - Debounced structuredClone снапшоты
  - Keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y)
  - HistoryControls — визуальные кнопки ↩/↪
  - Persist в sessionStorage (опционально)
- **Form.Analytics** — встроенная field-level аналитика форм
  - useFormAnalytics() — focus/blur/error/correction/abandon/complete
  - AnalyticsPanel — dev-only live-панель
  - 4 адаптера: Umami, Яндекс Метрика, GA4, PostHog
  - Subpath `@letar/forms/analytics`, bench: 25M+ ops/sec
- **FormReadOnlyView** — отображение данных формы в режиме чтения
  - Автоматические labels из Zod .meta({ ui: { title } })
  - exclude/include, compact mode, кастомные formatters
- **FormSkeleton** — loading state из Zod-схемы
  - Автоопределение количества полей из schema
  - showSubmit, configurable fieldHeight/gap
- **FormComparison** — diff-view (было → стало)
  - Подсветка изменённых полей, onlyChanged mode
  - Labels из Zod .meta(), exclude, кастомные labels
- **FormDependsOn** — каскадный рендеринг по значению поля
  - cases map: значение → children, fallback

### Tests

- 59 новых unit/render тестов + 13 E2E + 16 бенчмарков

## [0.78.0] - 2026-04-03 — Captcha + CreditCard (Фазы 29-30)

### Added

- **Form.Captcha** — CAPTCHA для защиты форм (Cloudflare Turnstile, Google reCAPTCHA, hCaptcha)
  - Провайдер-абстракция с lazy loading
  - Серверная верификация через `verifyCaptcha()`
  - Интеграция с `createForm({ captcha: {...} })`
- **Form.Field.CreditCard** — ввод данных банковской карты
  - Авто-форматирование номера (4-4-4-4 / 4-6-5 для Amex)
  - Определение бренда по BIN (Visa, MC, Amex, МИР, JCB, Discover, UnionPay, Maestro)
  - Luhn валидация, MM/YY expiry
  - Готовая Zod-схема `creditCardSchema()`
  - SVG иконки брендов (inline)
  - Accessibility: role="group", aria-label, inputMode="numeric"

### Dependencies

- `@marsidev/react-turnstile` — peer dependency для Turnstile

## [0.77.0] - 2026-04-03

### Improved

- **DataGrid** — column reordering: drag заголовки колонок для изменения порядка
- **DataGrid** — diff highlighting: изменённые ячейки подсвечиваются жёлтым
- **MatrixChoice** — keyboard навигация: стрелки для перемещения между ячейками, Enter/Space для выбора

## [0.76.0] - 2026-04-03

### Improved

- **DataGrid** — виртуализация 1000+ строк через @tanstack/react-virtual (`virtualized` prop)
  - Автоматический scroll-container с фиксированной высотой
  - Пагинация автоматически отключается при виртуализации
  - overscan: 10 строк для плавной прокрутки
- **DataGrid** — column resizing: drag границы колонок (`columnResizing` prop)
  - Визуальный индикатор resize при перетаскивании
- **DataGrid** — расширенные фильтры уже поддерживают text (range, select, date — через кастомные filterFn)
- **MatrixChoice** — подсветка незаполненных строк красным при required + ошибке валидации
- **Async Validation** — loading indicator "Проверяю..." в FieldError при isValidating
- **TableEditor** — DnD сортировка строк через SortableWrapper (@dnd-kit)
- **TableEditor** — responsive mobile card view (карточки на sm breakpoints)

## [0.75.0] - 2026-04-03

### Added

- **`Form.Field.DataGrid`** — редактируемая таблица данных на TanStack Table (Фаза 16.2)
  - TanStack Table v8 под капотом
  - Сортировка по клику на заголовок (↑↓)
  - Текстовые фильтры по колонкам
  - Пагинация (кнопки Назад/Далее, номер страницы)
  - Inline editing: клик по ячейке → Input
  - Row-level save (`onRowSave` callback)
  - Чекбокс-выбор строк + bulk delete
  - Diff от TableEditor: DataGrid — для существующих данных с фильтрацией/сортировкой/пагинацией

### Changed

- Убраны из плана Фаза 16.3 (Spreadsheet) и 16.4 (Bulk Entry) — нишевые, избыточные

## [0.74.0] - 2026-04-03

### Added

- **Conversational Mode** — Typeform-стиль: одно поле за раз с анимацией
  - `ConversationalMode` компонент-обёртка для полей формы
  - Анимация fade-in-up при переходе между полями
  - Progress bar и номер вопроса ("Вопрос 3 из 7")
  - Enter → следующее поле, Alt+стрелки для навигации
  - Кнопки Назад/Далее/Отправить
  - Welcome screen и Completed screen
  - `useConversationalState` хук для кастомного UI
  - Keyboard-first UX

## [0.73.0] - 2026-04-03

### Added

- **Autosave to Server** — серверное автосохранение форм
  - `useFormAutosave(form, config)` хук: периодическое POST/PUT с debounce
  - `AutosaveIndicator` компонент: статус "Сохраняю..." / "Сохранено" / "Ошибка"
  - Fallback на localStorage при отсутствии сети
  - Восстановление черновиков: `loadDraft()` (сервер → localStorage)
  - Не отправляет если данные не изменились
  - AbortController-совместимый

## [0.72.0] - 2026-04-03

### Added

- **Form Templates** — 10 готовых шаблонов форм для быстрого старта
  - `Form.FromTemplate` — компонент автоматической генерации формы из шаблона
  - **Auth:** loginForm, registerForm, forgotPasswordForm
  - **Feedback:** contactForm, feedbackForm
  - **Survey:** npsForm
  - **Business:** companyRegistration (ИНН, КПП, ОГРН, реквизиты)
  - **E-commerce:** orderForm (клиент, адрес, товары)
  - **Profile:** profileForm (имя, email, телефон)
  - **Address:** addressForm (страна, город, улица, дом, индекс)
  - Headless: `templates.xxx.schema` + `templates.xxx.defaultValues`
  - Override: `exclude`, `fields` для кастомизации
  - `FormTemplate<T>` интерфейс для создания собственных шаблонов

## [0.71.0] - 2026-04-03

### Added

- **Async Validation** — асинхронная валидация полей через props или Zod `.meta()`
  - `asyncValidate` prop на любом поле: `<Form.Field.String asyncValidate={checkEmail} />`
  - Декларативно через `.meta({ asyncValidate, asyncDebounce, asyncTrigger })`
  - Debounce (по умолчанию 500мс), AbortController для отмены предыдущего запроса
  - Кэширование результатов (не перепроверяет уже валидированные значения)
  - Offline-safe: пропускает async-валидацию при отсутствии сети
  - Триггер: `onBlur` (по умолчанию) или `onChange`
  - Интеграция через TanStack Form `validators.onBlurAsync`/`onChangeAsync`
  - `useAsyncFieldValidation` хук для кастомного использования

## [0.70.0] - 2026-04-03

### Added

- **`Form.Field.ImageChoice`** — выбор из картинок (grid карточек с изображениями)
  - Single/multiple selection, hover + selected overlay
  - Responsive grid (1→2→N колонок)
- **`Form.Field.Likert`** — шкала Лайкерта (5-7 точек с текстовыми якорями)
  - Горизонтальная шкала (десктоп), вертикальный список (мобайл)
  - Опциональная нумерация точек
- **`Form.Field.YesNo`** — бинарный выбор (два больших блока)
  - Варианты: `buttons`, `thumbs` (👍👎), `emoji` (😊😞)
  - Зелёный/красный highlight при выборе

## [0.69.0] - 2026-04-03

### Added

- **`Form.Field.MatrixChoice`** — матричный выбор для опросников и NPS-форм
  - Таблица "вопрос × вариант ответа" (как в Google Forms, SurveyMonkey)
  - 3 варианта: `radio` (одиночный), `checkbox` (множественный), `rating` (звёзды)
  - Responsive: на мобильных — карточки вместо таблицы
  - Row hover highlight, keyboard navigation
  - Значение: `Record<string, string | string[]>`

## [0.68.0] - 2026-04-03

### Added

- **`Form.Field.TableEditor`** — инлайн-редактируемая таблица для array-полей
  - Авто-колонки из Zod schema `.meta({ ui: { title } })` или кастомные через `columns` prop
  - Клик по ячейке → inline editing (Input, NativeSelect, Checkbox в зависимости от типа)
  - Tab/Enter навигация между ячейками, Enter в последней → новая строка
  - Escape → выход из редактирования
  - Стрелки вверх/вниз для перемещения между строками
  - Computed columns — вычисляемые readonly колонки
  - Footer aggregates — SUM, AVG, COUNT, MIN, MAX по колонкам
  - Copy-paste из Excel/Sheets (парсинг TSV через Clipboard API)
  - Чекбокс-выбор строк + массовое удаление
  - Cell-level Zod валидация (ошибки прямо в ячейке)
  - Пустое состояние с placeholder текстом
  - `sortable`, `selectable`, `clipboard`, `striped` props
  - Хуки: `useTableColumns`, `useTableNavigation`, `useTableClipboard`, `useTableEditorContext`
  - Утилиты: `parseTSV`, `buildTSV`, `coerceValue`, `computeAggregate`, `formatCellValue`

## [0.67.0] - 2026-04-03

### Added

- **Russian Documents** — `zRu` Zod-валидаторы + `Form.Document.*` UI-компоненты
  - **Валидаторы** (`@letar/forms/validators/ru`): zRu.inn(), zRu.kpp(), zRu.ogrn(), zRu.ogrnip(), zRu.bik(), zRu.bankAccount(), zRu.corrAccount(), zRu.snils(), zRu.passport()
  - Контрольные суммы: ИНН (взвешенная mod 11), ОГРН (mod 11), ОГРНИП (mod 13), СНИЛС (mod 101), банковский счёт (контрольный ключ с БИК)
  - Варианты ИНН: `zRu.inn.legal()` (10 цифр), `zRu.inn.individual()` (12 цифр)
  - Transform: автоматическая очистка от пробелов/дефисов
  - **UI-компоненты** (`Form.Document.*`): INN, KPP, OGRN, BIK, BankAccount, CorrAccount, SNILS, Passport
  - Маска ввода (use-mask-input), иконки, realtime-валидация контрольных сумм
  - `createDocumentField` — фабрика для кастомных документных полей
  - Subpath export: `@letar/forms/validators/ru` для headless использования
- 46 unit-тестов для валидаторов

## [0.66.0] - 2026-04-03

### Added

- **`Form.Field.Signature`** — поле цифровой подписи
  - Draw mode: рисование мышью и пальцем (touch) на Canvas
  - Typed mode: ввод имени курсивным шрифтом, отрисовка на Canvas
  - Переключение режимов через SegmentedControl (Draw / Type)
  - Кнопка очистки подписи
  - Placeholder поверх пустого canvas
  - Responsive: canvas адаптируется к ширине контейнера
  - Touch support: `touchAction: none` для предотвращения scroll
  - Accessibility: `role="img"`, `aria-label`, Tab focus, typed mode как keyboard fallback
  - Dark mode support через props `strokeColor`/`backgroundColor`
  - Значение: data URI строка (image/png base64)
  - Props: `width`, `height`, `strokeColor`, `strokeWidth`, `backgroundColor`, `clearLabel`, `placeholder`, `allowTyped`, `typedFont`
- 7 unit-тестов для FieldSignature

## [0.65.0] - 2026-04-03

### Added

- **Security Patterns** — три механизма защиты форм
  - **Honeypot** — ловушка для ботов: `<Form honeypot={true}>`, скрытое поле блокирует submit ботов
  - **Rate Limiting** — клиентский лимит: `<Form rateLimit={{ maxSubmits: 3, windowMs: 60000 }}>`, обратный отсчёт, sessionStorage persistence
  - **Secure File Upload** — расширение FileUpload: `<Form.Field.FileUpload security={{ ... }}>`:
    - `maxSize` — проверка размера ('10MB', '500KB')
    - `allowedTypes` — проверка MIME по magic bytes (не по расширению)
    - `stripMetadata` — удаление EXIF через Canvas API
    - `renameFile` — замена имени на UUID (защита от path traversal)
- `parseFileSize()`, `validateMimeType()`, `sanitizeFileName()` — утилиты безопасности
- `useRateLimit()` — хук клиентского rate limiting
- `FileSecurityConfig`, `RateLimitConfig` — типы конфигурации
- 21 unit-тест для security модуля

## [0.64.0] - 2026-04-03

### Added

- **`Form.Field.Calculated`** — вычисляемое поле формы с автоматическим пересчётом
  - `compute(values)` — функция вычисления значения из всех полей формы
  - `format(value)` — форматирование отображения (например, `1 500 ₽`)
  - `deps` — список зависимых полей для оптимизации пересчёта
  - `debounce` — дебаунс вычислений для тяжёлых формул
  - `hidden` — скрытый режим (вычисляет без отображения, как Hidden)
  - Защита от циклических зависимостей (runtime detection)
  - Работает внутри `Form.Group` (group-aware paths)
  - Значение readonly, сохраняется в form state при submit
- `useComputedValue` — хук реактивного вычисления (подписка на form.store)
- 8 unit-тестов для FieldCalculated
- Демо-страница calculated-demo в form-develop-app

## [0.63.0] - 2026-04-03

### Added

- **`Form.InfoBlock`** — информационный блок внутри формы (info/warning/error/success/tip), на базе Chakra Alert
  - Props: `variant`, `title`, `appearance`, `size`
  - Интеграция с `Form.When` для условного отображения
- **`Form.Divider`** — разделитель секций формы с опциональной меткой и иконкой, на базе Chakra Separator
  - Props: `label`, `icon`, `variant` (solid/dashed/dotted), `size`, `colorPalette`
- **`Form.Field.Hidden`** — скрытое поле формы (не рендерится в DOM, только в form state)
  - Реактивная синхронизация `value` prop с form state
  - Полезно для UTM-меток, referral кодов, внутренних ID
- 10 unit-тестов для новых компонентов

## [0.62.0] - 2026-04-03

### Added

- **Smart Autofill** — автоматическое проставление HTML `autocomplete` атрибутов по имени поля (+30% конверсии, WCAG 1.3.5)
  - 30+ маппингов: email, phone, firstName, lastName, password, address, city, zip, country, company, username...
  - Override через `.meta({ ui: { autocomplete: '...' } })` или prop `autoComplete`
  - Приоритет: prop > meta > авто-определение
  - Поддержка dot-path (address.city → autocomplete="address-level2")
  - `autocomplete` в `FieldUIMeta` для ZenStack-генерации
- Поле `autocomplete` в `ResolvedFieldProps` — доступно всем field-компонентам
- 22 unit-теста для маппинга autocomplete

## [0.61.0] - 2026-04-03

### Added

- **`onFieldChange` prop** на `<Form>` — реактивные побочные эффекты при изменении полей (автогенерация slug, пересчёт итогов, синхронизация зависимых полей)
- **`<Form.Watch>`** — renderless compound component для отслеживания изменений поля внутри формы (group-aware, резолвит пути относительно `Form.Group`)
- **`FieldChangeApi`** — интерфейс с `setFieldValue`, `getFieldValue`, `getValues` для callbacks
- **`useFieldChangeListeners`** — хук подписки на изменения полей через `form.store.subscribe()` с `Object.is` сравнением
- 7 unit-тестов для нового функционала

### Fixed

- `FormRoot` теперь прокидывает `middleware` и `addressProvider` в `FormSimple`/`FormWithApi` (ранее терялись)

## [1.1.0] - 2026-04-01

### Added

- **size-limit** CI: bundle size проверка перед каждым npm publish (20 KB brotli full)
- **Категорийные entry points**: `@letar/forms/fields/{text,number,datetime,selection,boolean,specialized}`
- **Бенчмарк ре-рендеров**: 10 полей, ввод в одно → 0 лишних рендеров у остальных
- **FieldErrorBoundary**: ErrorBoundary для каждого field-компонента (fallback при ошибке рендеринга)
- **Type-тесты**: DeepKeys, DeepValue, useTypedFormSubscribe (vitest expectTypeOf)
- `loadingText` prop в `Form.Button.Submit` для кастомного текста при загрузке
- `City` и `sortable` в FormFieldComponents/FormGroupListComponent типах

### Fixed

- Race condition в Form.Steps — все шаги получали index=0
- Число полей "49" → "40" во всех 12 статьях и README

### Changed

- tsup entry points расширены с 3 до 9 (code splitting для categories)
- Bundle Size секция в README с актуальными метриками
- `package.publish.json` exports map с 6 category entry points

## [0.58.0] - 2026-03-31

### Added

- Pluggable `AddressProvider` interface for `Form.Field.Address` and `Form.Field.City`
- `createDaDataProvider()` — built-in DaData provider (Russia)
- `createForm({ addressProvider })` — set address provider once for all fields
- Provider resolution: field prop → createForm context → token fallback → env
- `addressProvider` prop on `Form` root component
- `CityFieldProps` exported from types
- `README.en.md`: Address Provider + createForm sections

### Changed

- All JSDoc, comments, runtime errors translated to English (118 files, ~3000 lines)
- Default UI strings: "Save", "Reset", "Unsaved changes", "Leave", "Stay", etc.
- `AddressValue.data` generalized to `Record<string, unknown>` (was DaData-specific)
- `AddressFieldProps.token` is now optional (use `provider` instead)
- `DaDataSuggestion` marked as deprecated
- `build:npm` copies `README.en.md` as `README.md` + `README.ru.md` for npm

## [0.56.0] - 2026-03-23

### Added

- `Form.DebugValues` — интерактивный JSON-инспектор значений формы (скрыт в production)
- `debug` prop на `Form` для автоматического отображения DebugValues
- Инфраструктура публикации `@letar/forms` на npm

### Fixed

- Совместимость с `@tanstack/store` 0.9+ (Subscription API)
- Исправлен баг `destroy` в `form-steps`

## [0.54.1] - 2026-01-05

### Fixed

- `FieldNumber`: для опциональных полей не передаём min/max в NumberInput когда значение пустое — убрана красная рамка для пустых опциональных полей

## [0.54.0] - 2026-01-03

### Added

- `form-from-schema.spec.tsx` — unit тесты для `FormFromSchema` (~15 тестов)
- `form-with-api.spec.tsx` — unit тесты для `FormWithApi` (~12 тестов)
- Покрытие тестами всех критичных компонентов схемогенерации

### Changed

- Deprecated type aliases централизованы в `form-fields/index.ts`
- Удалены локальные deprecated экспорты из 7 selection компонентов
- `field-select.tsx` использует `BaseOption<string | number>[]` вместо `SelectOption`

### Improved

- Общее покрытие тестами: +27 unit тестов
- Обратная совместимость сохранена через централизованный реэкспорт deprecated типов

## [0.53.0] - 2025-12-31

### Added

- Оптимизация производительности форм
- Улучшенная мемоизация в form-fields

## [0.51.0] - 2025-12-24

### Added

- `useAsyncSearch` — общий хук для async поиска с debounce (Combobox, Autocomplete)
- `AsyncQueryFn`, `AsyncQueryResult` — типы для async запросов
- Persistence TTL — опция `ttl` для времени жизни черновика
- `ClearDraftButton` — компонент кнопки очистки черновика
- `savedAt` — timestamp сохранения черновика в `FormPersistenceResult`

### Changed

- `FieldCombobox` и `FieldAutocomplete` используют `useAsyncSearch` вместо дублирования логики
- `useFormPersistence` теперь сохраняет данные в новом формате с метаданными (version, savedAt)
- Обратная совместимость со старым форматом сохранённых данных

## [0.50.0] - 2025-12-24

### Added

- `SelectionFieldLabel` — общий компонент для label+tooltip в selection полях
- `useGroupedOptions` — хук группировки опций (Combobox, Listbox, Select)
- `getOptionLabel` — утилита для получения label опции
- `zod-utils.ts` — централизованные функции `unwrapSchema`, `unwrapSchemaWithRequired`
- `LinkPopover` — модальное окно для ввода URL вместо `window.prompt()`
- Защита от циклических схем в `schema-traversal` (WeakSet + MAX_DEPTH=20)
- `SWITCH_STYLES` константы в `field-schedule.tsx`

### Changed

- `extractConstraints` рефакторинг с generic handler pattern
- `FormSteps` декомпозиция на хуки: `useStepState`, `useStepPersistence`, `useStepNavigation`
- Selection поля используют общие компоненты вместо дублирования

### Fixed

- `field-rich-text`: добавлен try/catch для JSON.parse

### Removed

- ~500 строк дублирующегося кода

## [0.49.0] и ранее

История изменений до v0.50.0 не документировалась.
