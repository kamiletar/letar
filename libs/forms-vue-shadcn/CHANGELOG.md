# Changelog @letar/forms-vue-shadcn

## 0.23.0 (2026-09-29)

`Field.Combobox` — создание/правка записи справочника, Stage 4c (тред `forms-vue-angular-select-parity`,
паритет с React `field-combobox.tsx`).

- **Feature:** `onCreate`/`onUpdate` — тот же конвейер `useSelectionActionsState`, что у `Field.Select`
  (Stage 3b): `run()` даёт единый `pending`, закрытие списка перед окном приложения (`controlRef`),
  оптимистичный режим (`ctx.optimistic`, §16.7) с откатом по отказу/таймауту (`onSettleError` или
  встроенное сообщение `settleFailure` под полем). Работает поверх опций из ЛЮБОГО источника —
  статичных `options` или `loadOptions` (Stage 4b), созданные/правленые опции накладываются
  (`applyOptionOverlay`/`mergeCreatedOptions`) поверх того, что вернул текущий источник.
- **Feature:** служебный пункт «+ Добавить "<текст>"» в конце списка — подпись берётся из текста
  поля ввода (`inputValue`), а не из отдельного поля поиска, как у `Field.Select`: у Combobox
  «значение» и есть набранный текст. `createLabel`/`createItem` — те же пропы, что у Select.
- **Feature:** `pending`-опции (своя оптимистичная запись или помеченная приложением) приглушены и
  не выбираются — перенесено в `uikit/primitives/combobox.ts` (`ComboboxItem.disabled = opt.disabled
  || opt.pending`, тем же приёмом, что `select.ts`), не в поле: примитив уже показывал `Loader2`
  вместо `renderOptionActions` у `pending`-пункта (Stage 4b), не хватало только блокировки выбора.
- **Feature:** карандаш «Изменить» — у пункта списка (`renderOptionActions`) и у выбранного значения
  (`controlActions`, сосед поля ввода). Правка обновляет ОБА — значение поля и текст ввода
  (`syncedValue`) — согласованно, тем же приёмом, что уже даёт Stage 4a/4b для подписи
  `loadOptions`/`loadSelected`.
- **Extended:** `uikit/primitives/combobox.ts` — примитив переведён с плоской функции на
  Vue-компонент с `setup()` (`ComboboxImpl`, тот же приём, что `SelectImpl` в `select.ts`):
  персистентное состояние (`open`, `controlRef`) не может жить в теле функции, вызываемой заново на
  каждый рендер поля. Добавлены `controlRef` (`close`/`focusTrigger`) и `controlActions` (кнопка —
  сосед `<input>`, не внутри него) — были типизированы в `UIKitSelectionSlotProps`, но не
  реализованы в Reka-скине Combobox.
- Слоты `Form.Field.Combobox.EditButton`/`.CreateButton` — для своего `renderOption`/`listFooter`,
  тем же способом, что у `Field.Select` (`Object.assign`).
- **Fix:** подпись поля ввода для только что созданной/отредактированной записи иногда показывала
  сырое `value` вместо ярлыка — `options`, переданный в примитив, отфильтрован по тексту поиска и
  на момент пересчёта Reka `displayValue` мог не содержать свежую запись. `resolveOption` расширен
  на `optionByValue` (полную, нефильтрованную карту), а не только на источник `loadSelected`.
- **Fix:** `listFooter` не был объявлен как проп `Field.Combobox` и не прокидывался в примитив —
  `Field.Combobox.CreateButton`, переданный вручную при `createItem: false`, никогда не попадал в
  подвал списка. Добавлен по образцу `field-select.ts`.
- Не в этой стадии: `dependsOn` (4d), группировка (`option.group`, исключена из всего Этапа 4).

## 0.22.0 (2026-09-27)

Асинхронные источники опций Combobox, Stage 4b (тред `forms-vue-angular-select-parity`, паритет с
React `field-combobox.tsx`).

- **Feature:** `Field.Combobox` — `loadOptions` (промис-путь: server action, `fetch`, SDK) вместо
  статичного `options`. Ровно один источник опций: `options` теперь опционален, без него и без
  `loadOptions` поле пишет `console.error` с именем поля (проверяется в момент рендера, не бросает).
  Запрос дебаунсится (`debounce`, по умолчанию 300мс, `useDebounce` из `forms-vue/core`), уходит
  только когда список хоть раз открывали (`markOpened`/`everOpened`, привязано к `onOpenChange`
  примитива — Reka уже эмитила это событие, `combobox.ts` просто прокинут `ComboboxRoot`'s
  `update:open`) и набран порог `minChars` (по умолчанию 1). Новый запрос отменяет прошлый; при
  ошибке список показывает «Не удалось загрузить» и кнопку «Повторить» (новые извлечённые строки
  `loading`/`loadError`/`retry` в `selection-strings.ts`), автоповторов нет.
- **Feature:** `Field.Combobox` — `loadSelected`: догрузка записи текущего значения, когда её нет в
  выдаче `loadOptions` (форма открыта на редактирование записи вне первой страницы списка). Кэш на
  экземпляр поля (`useSelectedLoader`), запись показывается только в подписи поля ввода — в сам
  список (в отличие от опций приложения) не попадает.
- **Feature:** `getLabel`/`getValue`/`getTextValue`/`getDescription`/`getDisabled`/`getEditable`/
  `getPending` — конвертация сырой записи `loadOptions`/`loadSelected` в `FieldSelectOption`, тот
  же набор callback'ов, что у React `ComboboxFieldProps`. `FieldSelectOption` пополнен `textValue?`
  (используется, когда `getLabel` не даёт готового текста для поиска/подписи) — общее поле с Select,
  у статичных опций не нужно.
- **Fix (архитектурный):** нативный `displayValue` Reka (`ComboboxInput.vue`) следит только за
  сменой самого значения поля (`watch(rootContext.modelValue)`) — если в момент этой смены запись
  `loadOptions`/`loadSelected` ещё не пришла, подпись не появляется сама, когда ответ придёт позже.
  Добавлена собственная синхронизация в `field-combobox.ts` (тот же приём, что `syncedValueRef` в
  React-скине): следит за `value`/`sourceOptions`/`selectedSourceOption` и подставляет найденную
  подпись в поле ввода, не перебивая уже набранный пользователем текст.
- **Extended:** `uikit/primitives/combobox.ts` (`RekaComboboxExtraProps`) — `resolveOption`
  (резервный поиск опции `loadSelected` для подписи, раз её нет в `options`), `loadError`/
  `onRetryLoad`/`loadingText`/`loadErrorText`/`retryText` для состояния списка, `onOpenChange`
  прокинут в `ComboboxRoot`'s `update:open`. Пункты списка получили `data-slot="combobox-item"`
  (тестируемость, тем же приёмом, что `combobox-item-description`).
- Новые framework-слой композаблы `useDebounce`/`usePromiseSearch`/`useSelectedLoader` — в
  `@letar/forms-vue` (`core.ts`), не здесь: они не завязаны на Reka и рассчитаны на переиспользование
  headless-скином `forms-vue` в Этапах 4e-4h.
- Не в этой стадии: `onCreate`/`onUpdate`/pending-действия (4c), `dependsOn` (4d), группировка
  (`option.group`, исключена из всего Этапа 4).

## 0.21.0 (2026-09-27)

Combobox паритет с React-скином, Stage 4a (начало Этапа 4 — `renderOption`/`renderValue`/
`description`, тред `forms-vue-angular-select-parity`).

- **Feature:** `Field.Combobox` — `renderOption` (своё содержимое пункта списка, получает опцию и
  `UIKitOptionRenderState`) и вторая строка пункта (`FieldSelectOption.description`, тот же общий
  тип, что и у `Field.Select`) — рисуется примитивом сама, только без своего `renderOption`.
  Реализовано в `uikit/primitives/combobox.ts` тем же приёмом, что `select.ts` (Stage 3a): опция
  формы приложения ищется по значению и передаётся в колбэк приложения, чтобы контравариантная
  разница `FieldSelectOption.label: string` vs `UIKitSelectOption<UINode>.label: UINode` не ломала
  типы (`field-combobox.ts`, как `optionByKey` в `field-select.ts`).
- **Feature:** `Field.Combobox` — `renderValue` (своя подпись выбранного значения). У Combobox
  нет отдельного триггера (значение — это и есть текст поля ввода): проброшен в нативный
  `displayValue` примитива Reka `ComboboxInput`. Без него `ComboboxInput.vue` (`resetSearchTerm`,
  вызывается при закрытии/блюре и на смену `modelValue`, в том числе на монтировании) подставляет
  в поле ввода сырое строковое `value` вместо подписи опции — заметно даже без своего `renderValue`
  (Reka сама вызывает `toString()` на выбранном значении). Контракта `renderValue` для Combobox нет
  в `forms-core` (только у `Field.Select`) — заведён локально в скине как `RekaComboboxExtraProps`
  (`combobox.ts`), тем же приёмом, что `ShadcnComboboxExtraProps` в React-скине; `field-combobox.ts`
  из-за этого импортирует примитив `Combobox` напрямую, в обход строго типизированного
  `rekaUIKit.Combobox`.
- **Fix (найдено этой сессией, побочный эффект `renderValue`/`displayValue`):** список Combobox
  фильтровался по подписи выбранного значения сразу после открытия, если та совпадала с текстом
  какой-то одной опции (Reka выставляет подпись в поле ввода сама, поле принимало её за активный
  поисковый запрос). Guard — «подпись выбранного значения в поле ввода, не запрос → список
  целиком», как `matchedOptions` в React `field-combobox.tsx`.
- ⚠️ **Не входит в 4a** (следующие срезы Этапа 4): `loadOptions`/`loadSelected` (4b),
  `onCreate`/`onUpdate`/`pending` (4c), `dependsOn` (4d).
- ⚠️ **Найдено разведкой, не расширено в этой сессии:** `UIKitSelectOption.group` (группировка
  по optgroup) не реализован ни в одном скине Select/Combobox, кроме отдельного, более старого
  Chakra-паттерна (`use-grouped-options.ts` в `forms`) — вне контекста паритета с `forms-shadcn`.

## 0.20.0 (2026-09-27)

Select паритет с React-скином, Stage 3c (завершение Этапа 3 — searchable + `dependsOn`, последняя
фича-срез перед публикацией в npm, тред `forms-vue-angular-select-parity`).

- **Feature:** `Field.Select` — `searchable` (`true`/`false`/`'auto'`/`{ threshold, filter,
  emptyMessage }`) и `searchInDescription`. Тонкая обвязка над готовым `useSelectionSearch`
  (`@letar/forms-vue/core`, Этап 2) — сама фильтрация, порог (10 опций по умолчанию) и допуск
  раскладки клавиатуры не менялись, только подключение к `field-select.ts`: список опций вынесен в
  `computed()` уровня `setup()` (нужен стабильный геттер для композабла), `search.visibleValues`
  композабла построен по сырым значениям опций и переотображён через тот же `toKey()`
  (`EMPTY_OPTION_TOKEN`), что и остальной список — иначе опция с пустым значением пропадала бы из
  видимых при активном поиске. Поле поиска и список — Popover-примитив
  (`uikit/primitives/select-searchable.ts`, уже существовал), не нативный Reka `SelectRoot`.
- **Feature:** `Field.Select` — `dependsOn`/`depsReady`/`clearOnParentChange`/
  `disableWhenParentEmpty`/`placeholderWhenDisabled` (§18). Обвязка над `useDependentField`
  (`@letar/forms-vue/core`, Этап 2) через новый `use-dependent-field-ui.ts` (подсказка «Сначала
  выберите «Страна»», `aria-describedby`, live-область объявления автоочистки) — портирован с
  React `useDependentFieldUi` (`forms-shadcn`) без изменения поведения. Подпись родителя для
  подсказки — реактивная карта `AppFormContext.labels` (`fullPath → label`, заполняется каждым
  полем через `useRegisterFieldLabel`), с откатом на `ui.title` схемы, если родитель ещё не
  отрендерился или не регистрирует подпись.
- **Fix (обнаружено этой сессией, не специфично для Select):** `AppForm`
  (`@letar/forms-vue`, `core/app-form.ts`) не вызывал `DependentsRegistry.handleFieldChange` нигде
  в продакшен-коде — реестр очистки (Этап 2) был протестирован только собственным изолированным
  unit-тестом, который зовёт `handleFieldChange` вручную. Без этой правки `dependsOn` в любой
  реальной Vue-форме тихо не работал бы: `useDependentField` регистрирует `clear()`-колбэк, но
  ничто не сообщало реестру, что родитель изменился. См. запись в CHANGELOG `@letar/forms-vue`
  0.21.0 — фикс сделан там, здесь только следствие (`dependsOn` теперь работает end-to-end).
- Осознанно не портирован `showUnknownValue` — его нет в framework-free контракте
  `UIKitSelectProps` (`@letar/forms-core/uikit`), а у Vue-скина нет `loadOptions`/асинхронных
  источников опций, для которых он нужен в React-версии (страховка от «опция ещё не подгрузилась»).

## 0.19.0 (2026-09-27)

Select паритет с React-скином, Stage 3b (продолжение Stage 3a — `onCreate`/`onUpdate`, `pending`,
провайдеры карандашей, оптимистичный отказ §16.7). Searchable + `dependsOn` — Stage 3c, отдельной
сессией.

- **Feature:** `Field.Select` — `onCreate(search, ctx)` (создание записи справочника без ухода из
  формы, служебный пункт «+ Добавить…»/`Field.Select.CreateButton` в своём `listFooter`) и
  `onUpdate(option, ctx)` (карандаш «Изменить» у пункта списка и у выбранного значения). Общий
  конвейер `useSelectionActionsState` (`@letar/forms-vue/core`, портирован в предыдущей сессии) —
  `pending`, наложение правок, оптимистичный режим и встроенное сообщение отказа `settleFailure`
  зеркалят React-скин без изменений контракта.
- **Feature:** `Field.Select` — новый проп `listFooter` (подвал списка, обычно
  `Field.Select.CreateButton`, для своего `renderOption` без встроенного пункта создания). Раньше
  проп существовал только у примитива (`uikit/primitives/select.ts`), но не был объявлен и не
  форвардился из `field-select.ts` — молча терялся.
- Провайдеры контекста карандашей — `SelectionActionsProvider`/`SelectionOptionProvider`
  (`selection-context.ts`, Vue `provide`/`inject` с `computed()`, чтобы значение оставалось
  реактивным между рендерами), кнопки `Field.Select.EditButton`/`Field.Select.CreateButton`
  (`selection-slots.ts`) и захардкоженные RU-строки (`selection-strings.ts` — в Vue-стеке ещё нет
  `FormI18nProvider`, портирование i18n вне объёма этой стадии).
- **Fix:** `SelectValue` (примитив, `uikit/primitives/select.ts`) больше не полагается на
  внутренний кеш текста Reka UI. Родной слот Reka ищет подпись по `optionsSet`, зарегистрированному
  DOM-элементами `SelectItem`, и не переоценивает её, если у уже выбранного пункта поменялся только
  `textContent` (тот же `value`, ровно случай `onUpdate` на текущем значении) — Vue-реактивность
  этой прямой мутации DOM не отслеживает. Теперь свой слот передаётся всегда, когда опция известна
  (не только при своём `renderValue`), и подпись читается из реактивного `options`, минуя кеш
  примитива.

## 0.18.0 (2026-09-27)

Select/Combobox паритет с React-скином (`@letar/forms-shadcn`) и Chakra-скином, Stage 3a
(из общего плана Этапа 3, разбитого по фичам вместо пакетов целиком — create/update/pending/
optimistic/`searchable`/`dependsOn` остаются в Stage 3b/3c, отдельными сессиями):

- **Feature:** `Field.Select` — новые пропы `renderOption(option, state)` (своё содержимое пункта
  списка; сигнатура и семантика зеркалят `UIKitSelectProps.renderOption` из `@letar/forms-core`,
  уже общий контракт с React-скином) и `renderValue(option)` (своя подпись выбранного значения в
  триггере; пустой результат откатывается на текст опции). `FieldSelectOption.description?: string`
  — вторая строка пункта списка под `label`, скрывается автоматически при своём `renderOption`
  (приложение рисует пункт целиком).
- Опция со значением `''` (служебный токен `EMPTY_OPTION_TOKEN` внутри примитива Reka, см.
  комментарий в `field-select.ts`) больше не течёт в колбэки приложения — `renderOption`/
  `renderValue` всегда получают исходную опцию с настоящим `value`, как `optionByValue` в
  shadcn-React-скине.
- `libs/forms-vue-shadcn/src/lib/uikit/primitives/select.ts` реализует уже существовавший в
  `UIKitSelectProps<TNode>` (`@letar/forms-core/uikit`) контракт — тип не менялся, только его
  реализация на Reka UI.

## 0.17.0 (2026-09-21)

- **Feature:** `FormStepsNavigation` принимает пропсы кнопок `prevProps`/`nextProps`/`submitProps`/
  `skipProps` (паритет с `@letar/forms` 2.14.22) — `data-*` и атрибуты нативной `<button>`.
  `onClick`/`disabled`/`type`/`class` исключены из типа и перекрываются компонентом.
  Экспортируется `FormStepsNavigationButtonProps`.

## 0.16.1 (2026-08-17)

- **Fix:** `@tiptap/vue-3` пинился на точную `3.29.2`, тогда как `@tiptap/starter-kit`/
  `@tiptap/extension-placeholder` резолвились в `3.30.1` — тот же дубль версий `@tiptap/core`,
  что в `@letar/forms-vue` (см. её CHANGELOG). Все `@tiptap/*` подняты до `3.30.1`.

## Unreleased

Фаза 9, Этап 7/0 (form-docs P7, «единый источник кода примеров») — `demo/` разбит с одного
файла `App.ts` (все 6 полей сразу) на отдельные примеры, читаемые с диска по одному (будущий
Этап 1 P7 будет парсить их напрямую, минуя дублирование кода в MDX). Версия пакета не поднята —
`demo/` не публикуется в npm (нет в `exports`/`.npmignore` не нужен).

- `demo/examples/{string,number,select,combobox,textarea,checkbox,table-editor}-demo.ts` — по
  одному файлу на поле (`FieldString`/`FieldNumber`/`FieldSelect`/`FieldCombobox`/`FieldTextarea`/
  `FieldCheckbox`/`FieldTableEditor`), каждый самодостаточен: своя Zod-схема, свой `AppForm`,
  рендерится в изоляции. `demo/examples/index.ts` — реестр `demoExamples` (id/title/component).
  `table-editor-demo.ts` добавлен 2026-08-13 (form-docs P7 Этап 2) — те же данные/колонки, что
  React-пример `table-editor-demo/page.tsx`, читается напрямую `SkinCodeFile` в
  `apps/form-docs/content/docs/guides/table-editor.mdx`.
- `demo/App.ts` — теперь только навигационная оболочка: `<select>` + `ref` переключают активный
  пример из реестра, без роутер-либы (харнесс маленький, роутер избыточен).
- Проверено: `bunx vite build demo --config demo/vite.config.ts` зелёный (2548 модулей, тот же
  набор чанков, что и до разбиения). `nx run-many -t lint typecheck:tsgo test
  --projects=@letar/forms-vue-shadcn` зелёный — `demo/` вне scope этих таргетов
  (`tsconfig.lib.json`/`oxlint` покрывают только `src/`), поведение то же, что и до правки.

## 0.16.0 (2026-08-13)

Фаза 9, Этап 8 (часть 2, финал) — оставшиеся 14 полей: полный паритет с React-скином, **61/61**.

- **Select-семейство (9):** `FieldAutocomplete`, `FieldCombobox` (уже существовал
  незаэкспортированным, добавлен экспорт), `FieldListbox`, `FieldCascadingSelect`,
  `FieldCheckboxCard`, `FieldRadioCard`, `FieldSegmentedGroup`, `FieldImageChoice`, `FieldTags`.
  `FieldCheckboxCard`/`FieldRadioCard` делят новую `lib/utils/card-class.ts`.
- **Специализированные (5):** `FieldAuto`, `FieldCalculated`, `FieldEditable`,
  `FieldPasswordStrength`, `FieldSchedule` — редактор недельного расписания с Reka
  `SwitchRoot`/`SwitchThumb` для day-toggle, копированием понедельника на будни, валидацией
  `close > open`.
- `FieldSegmentedGroup` без React-референса в `forms-shadcn` (только Chakra-оригинал) —
  портирован напрямую с Reka-примитивами по тому же контракту, что и остальные select-поля.
- Новых peer-зависимостей не потребовалось.
- Тесты — `app-form.stage8-part2.spec.ts`.
- Проверено: `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-vue,@letar/forms-vue-shadcn`
  зелёный на обоих пакетах.

## 0.15.0 (2026-08-13)

Фаза 9, Этап 8 (часть 1) — три документных поля, пропущенных при исходной декомпозиции на 7
этапов (47 полей, было 44). Найдены сверкой полного списка `docs/fields.md` с фактической
реализацией — предыдущий отчёт «Фаза 9 завершена всеми 7 этапами» был неверным, см. поправку в
`libs/forms/PLAN.md`.

- **`FieldForeignPassport`/`FieldDepartmentCode`** — 1:1 порт через `createDocumentField`.
- **`FieldBirthCertificate`** — БЕЗ маски, свободный ввод с нормализацией на `blur`,
  `onErrorCaptured`+`rekaUIKit.ErrorFallback` (тот же паттерн защиты рендера, что у `FieldPassword`).
- Тесты — новый файл `app-form.stage8.spec.ts`.
- Проверено: `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-vue,@letar/forms-vue-shadcn`
  зелёный на обоих пакетах.

## 0.14.0 (2026-08-13)

Фаза 9, Этап 6 (часть 4, финал) — `Form.Group`/`Form.Steps`. Закрывает Этап 6 целиком (44 поля,
счётчик не меняется — это form-level compound-компоненты, не поля).

- **`Form.Group`/`useFormGroup`** — без своего файла, реэкспорт из `@letar/forms-vue/core` одной
  строкой (`export { FormGroup, useFormGroup, ... } from '@letar/forms-vue/core'`). Та же логика,
  что у React `@letar/forms` (реэкспорт `FormGroup`/`useFormGroup` из `@letar/forms-react` без
  файла в `@letar/forms-shadcn`) — `FormGroup` не имеет визуального представления, второй скин ей
  не нужен.
- **`Form.Steps` (`lib/steps/*.ts`)** — Tailwind-разметка, Vue-порт `@letar/forms-shadcn`
  (`FormStepsRoot`/`FormStepsStep`/`FormStepsIndicator`/`FormStepsNavigation`/
  `FormStepsCompletedContent`). Композиционная логика (`useStepState`/`useStepNavigation`/
  `useStepPersistence`/`provideFormSteps`/`extractFieldNames`) не своя — целиком из
  `@letar/forms-vue/core`, тот же экспорт использует headless-версия `@letar/forms-vue`. Разбор
  Vue-специфичных упрощений относительно React-хуков (`setup()` вместо `useRef`, без гонки
  debounce-таймеров персистенции) — `libs/forms-vue/CHANGELOG.md` 0.13.0, идентичен обоим пакетам.
- Своя — только Tailwind-классы: индикатор (`lucide-vue-next` `Check` по умолчанию для
  завершённого шага, тот же паттерн иконок, что у `FieldRating`/`FieldTableEditor`), кнопки
  навигации (`cn(buttonBase, ...)`).
- Те же beta-упрощения, что у React shadcn-скина: без `Form.When`, без анимаций перехода.
- Тест `app-form.stage6d.spec.ts` — тот же набор сценариев, что в headless-пакете
  (`FieldString` вместо `FieldInput`, индикатор ищется по `ol.flex button`, а не по BEM-классу
  headless-версии). `vitest.setup.ts`/`localStorage`-полифилл — свой (тот же код, что у
  `libs/forms-vue`), нужен для теста персистенции шага в этом пакете отдельно.

## 0.13.0 (2026-08-13)

Фаза 9, Этап 6 (часть 3) — тот же `FieldDataGrid`, что в headless `forms-vue` 0.12.0,
Reka/Tailwind-скин. Итог: 45 полей (было 44). Этап 6 (поля) завершён — остаются только
`Form.Group`/`Form.Steps` (form-level компоненты, не поля).

- Табличный wiring (`useVueTable`, обвязка `useField(mode:'array')`, сортировка/фильтр/
  пагинация/row-selection, CSV-экспорт) переиспользован из `@letar/forms-vue/core`
  (`use-data-grid.ts`) — не дублирован, тот же экспорт использует и headless-версия. Находки
  про API `@tanstack/vue-table` (нет функции `flexRender`, реактивность через геттеры, ручная
  распаковка `updater`) и про `useField(mode:'array')` (нечувствительность `_arrayVersion` к
  точечным правкам скаляра) — см. `libs/forms-vue/CHANGELOG.md` 0.12.0, идентичны обоим пакетам
  (общая композабл-логика).
- Своя — только Tailwind-разметка: заголовки/ячейки/чекбоксы (`rekaUIKit.Checkbox`), инлайн-
  input (кастомные компактные классы, не `rekaUIKit.Input` — тот же выбор, что в React
  shadcn-версии), `rekaUIKit.FieldRoot`/`FieldLabel`/`FieldError`, `onErrorCaptured` →
  `rekaUIKit.ErrorFallback` (тот же паттерн защиты рендера, что у остальных полей Этапа 6).
- Те же сохранённые beta-упрощения, что у headless-версии: без виртуализации, без
  resize/drag-reorder колонок, `columns` обязателен явно, фильтр только текстовый contains.
- Тест `app-form.stage6c.spec.ts` (тот же набор сценариев, что в headless-пакете, через
  `setupRekaPolyfills()`; row-selection проверяется через `[role="checkbox"]`, не `input[type=checkbox]`
  — `rekaUIKit.Checkbox` рендерит `CheckboxRoot`, кнопку, а не нативный чекбокс).

## 0.12.0 (2026-08-13)

Фаза 9, Этап 6 (часть 2) — тот же `FieldTableEditor`, что в headless `forms-vue` 0.11.0,
Reka/Tailwind-скин. Итог: 44 поля (было 43).

- Логика (резолв колонок, навигация клавиатурой, тип контроллера) переиспользована из
  `@letar/forms-vue/core` — `resolveTableColumns`/`useTableNavigation`/`createTableContainerRef`/
  `TableEditorController` не дублированы, тот же экспорт использует и headless-версия. Своя —
  только Tailwind-разметка подкомпонентов (`lib/fields/table/table-{header,row,footer,toolbar,cell}.ts`)
  и главный `field-table-editor.ts` (Reka `FieldRoot`/`FieldLabel`/`FieldError`, `onErrorCaptured`
  - `rekaUIKit.ErrorFallback` — тот же паттерн защиты рендера, что у остальных полей Этапа 6).
- Иконки — `lucide-vue-next` (`GripVertical` для drag handle, `X` для кнопки удаления строки),
  тот же набор, что у React shadcn-версии.
- Те же упрощения объёма, что у headless-версии (см. `libs/forms-vue/CHANGELOG.md` 0.11.0): без
  отдельного мобильного вида, native HTML5 DnD вместо `@dnd-kit`.
- Тест `app-form.stage6b.spec.ts` (тот же набор сценариев, что в headless-пакете, через
  `setupRekaPolyfills()`).

## 0.11.0 (2026-08-13)

Фаза 9, Этап 6 (часть 1) — тот же `FieldLikert`/`FieldMatrixChoice`, что в headless `forms-vue`
0.10.0, Reka/Tailwind-скин. Итог: 43 поля (было 41).

- Портированы 1:1 из `libs/forms-shadcn/src/lib/fields/{field-likert,field-matrix-choice}.tsx` —
  те же Tailwind-классы, что в React-версии.
- **`FieldLikert`** — `FieldWrapper` из `../uikit/primitives`, ряд кнопок-точек с
  `hover:scale-110`, `flex-wrap`, `showNumbers`.
- **`FieldMatrixChoice`** — `<table>` в `FieldWrapper`, три варианта (`radio`/`checkbox`/`rating`).
  Звезда в варианте `rating` — `lucide-vue-next` `Star`, тот же примитив, что уже используется в
  `FieldRating`, а не собственный SVG.
- `onErrorCaptured` + `rekaUIKit.ErrorFallback` — тот же паттерн защиты рендера, что у остальных
  полей пакета. `disabled` — явный проп поля, тот же принцип, что у `FieldRadioGroup`/
  `FieldCreditCard`.
- Тесты — новый файл `app-form.stage6.spec.ts`.
- Проверено: `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-vue,@letar/forms-vue-shadcn`
  зелёный на обоих пакетах.

## 0.10.0 (2026-08-13)

Фаза 9, Этап 5 закрыт целиком — тот же `FieldRichText`, что в headless `forms-vue` 0.9.0,
Reka/Tailwind-скин. Итог: 41 поле (было 40).

- Переиспользует `useRichTextField`/`RICH_TEXT_ACTIONS`/`DEFAULT_RICH_TEXT_BUTTONS`/
  `RICH_TEXT_BUTTON_LABELS` из `@letar/forms-vue/core` — здесь только Tailwind-разметка тулбара
  (иконки `lucide-vue-next` вместо текстовых глифов headless-пакета) и содержимого редактора.
  `createLazyField` тоже из `@letar/forms-vue/core` — тот же ленивый паттерн, без дублирования.
  `onErrorCaptured` + `rekaUIKit.ErrorFallback` — тот же паттерн защиты рендера, что у остальных
  полей пакета.
  `@tiptap/extension-link`/`@tiptap/extension-underline` убраны из зависимостей — дублировали
  расширения, уже включённые в `@tiptap/starter-kit` v3 (см. подробности в CHANGELOG
  `@letar/forms-vue` 0.9.0).
- Тесты — новый файл `app-form.stage5b.spec.ts`: загрузка + рендер тулбара/редактора, клик по
  кнопке «Полужирный» переключает `aria-pressed`, `toolbarButtons` сужает набор кнопок. Те же две
  ловушки ожидания, что у headless-пакета — двойной `requestAnimationFrame` после клика
  (`editor.state` за debounced `customRef`) и цикл реальных `setTimeout` вместо одного
  `flushPromises()` для резолва ленивого `import()`.
- Проверено: `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-vue,@letar/forms-vue-shadcn`
  зелёный на обоих пакетах.

## 0.9.0 (2026-08-13)

Фаза 9, Этап 5 (часть 2) — те же 3 поля, что в headless `forms-vue` 0.8.0, Reka/Tailwind-скин:
`FieldSignature`, `FieldAddress`, `FieldCity`. Итог: 40 полей (было 37). Остался только
`FieldRichText` из восьми полей Этапа 5.

- Переиспользуют `useSignatureField`/`useAddressSuggestions` из `@letar/forms-vue/core` — здесь
  только Tailwind-разметка (тулбар draw/typed, дропдаун подсказок вместо `letar-field__address-*`
  классов headless-пакета).
- `onErrorCaptured` + `rekaUIKit.ErrorFallback` — тот же паттерн защиты рендера, что у остальных
  полей пакета.
- Тесты — `app-form.spec.ts`, блок «Этап 5 (часть 2)».
- Проверено: `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-vue,@letar/forms-vue-shadcn`
  зелёный на обоих пакетах.

## 0.8.0 (2026-08-13)

Фаза 9, Этап 5 (часть 1) — те же 4 поля, что в headless `forms-vue` 0.7.0, Reka/Tailwind-скин:
`FieldPinInput`, `FieldOTPInput`, `FieldColorPicker`, `FieldFileUpload`. Итог: 37 полей (было 33).

- PIN/OTP переиспользуют `usePinInputField`/`splitPinChars` из `@letar/forms-vue/core` — здесь
  только Tailwind-разметка ячеек, тот же приём, что у `FieldCreditCard`.
- `FieldColorPicker`/`FieldFileUpload` не входят в `ImplementedExtendedPrimitives` (см.
  `uikit-reka.ts`) — рисуются вне UIKit-контракта напрямую на Tailwind, тот же выбор, что у
  `FieldSwitch`/`FieldSlider`/`FieldRating`.
- `onErrorCaptured` + `rekaUIKit.ErrorFallback` — тот же паттерн защиты рендера, что у остальных
  полей пакета.
- Тесты — `app-form.spec.ts`, блок «Этап 5 (часть 1)».
- Проверено: `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-vue,@letar/forms-vue-shadcn`
  зелёный на обоих пакетах.

## 0.7.0 (2026-08-13)

Фаза 9, Этап 3 (продолжение) — `FieldCreditCard` (compound-поле, отложено с основного захода
Этапа 3), Reka/Tailwind-скин. Итог: 33 поля (было 32).

- Логика полностью переиспользована из `useCreditCardField`/`cardBrandIcon`
  (`@letar/forms-vue/core`) — здесь только Tailwind-разметка на голых `<input>` (мульти-part
  виджет не укладывается в `UIKitInputProps`, тот же приём, что у документных полей Этапа 3).
- `onErrorCaptured` + `rekaUIKit.ErrorFallback` — тот же паттерн защиты рендера, что у остальных
  полей пакета.
- Тесты — `app-form.spec.ts`, блок «Этап 3 (продолжение)»: те же сценарии, что в headless-версии.
- Проверено: `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-vue,@letar/forms-vue-shadcn`
  зелёный.

## 0.6.1 (2026-08-13)

Рефакторинг без изменения публичного API: та же дедупликация, что в `forms-vue` 0.5.1 — общие
хелперы дата/число-виджетов вынесены в `@letar/forms-core/field-widgets`, локальные копии удалены.

## 0.6.0 (2026-08-13)

Фаза 9, Этап 4 — дата/число-виджеты (5 новых полей), Reka-скин: `FieldDateRange`,
`FieldDateTimePicker`, `FieldDuration`, `FieldSlider`, `FieldRating`. См. CHANGELOG `forms-vue`
0.5.0 — находка про отсутствие внешней библиотеки дат в этой группе полей общая для обоих
пакетов.

- `FieldDateRange`/`FieldDateTimePicker`/`FieldDuration` — те же пропсы и логика, что в headless,
  рисуют сырой `<input>` в обход `rekaUIKit.Input` (тот же приём, что у документных полей из
  Этапа 3) либо переиспользуют существующий `NumberInput`-примитив (`FieldDuration`).
- `FieldSlider` — `reka-ui` `SliderRoot`/`SliderTrack`/`SliderRange`/`SliderThumb`, не входит в
  UIKit-контракт (нет `Slider` в `UIKitExtendedPrimitives`) — тот же принцип, что у `FieldSwitch`.
- `FieldRating` — ряд кнопок-звёзд на иконке `Star` из `lucide-vue-next` (уже peer dependency
  пакета), тоже вне UIKit-контракта.
- Итог: 32 поля (было 27).
- Тесты — `app-form.spec.ts`, блок «Этап 4»: те же сценарии, что в headless-версии, плюс
  клавиатурное управление `Slider` (`ArrowRight` на сфокусированном `SliderThumb`).
- Проверено: `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-vue,@letar/forms-vue-shadcn`
  зелёный.

## 0.5.0 (2026-08-13)

Фаза 9, Этап 3 — маски/документы (10 новых полей), Reka-скин поверх нового
`useMaskField` из `@letar/forms-vue/core` (см. CHANGELOG `forms-vue` 0.4.0 — composable общий,
здесь только стилизация).

- `document-field-base.ts` (Reka-версия `createDocumentField`) + 10 полей: `FieldMaskedInput`,
  `FieldPassport`, `FieldINN`, `FieldKPP`, `FieldOGRN`, `FieldSNILS`, `FieldBIK`,
  `FieldBankAccount`, `FieldCorrAccount`, `FieldPhone`.
- Как и `FieldPassword`, эти поля рисуют сырой `<input>` в обход `rekaUIKit.Input` (стилизация
  `NATIVE_INPUT_CLASS`) — `'live'`-режим `useMaskField` неконтролируемый, а `UIKitInputProps`
  требует `value`/`onChange`. `FieldPhone` — исключение, использует `rekaUIKit.Input` напрямую
  (контролируемое поле, форматтер `forms-core/phone`, не `useMaskField`).
- Каждое поле — `onErrorCaptured` + `rekaUIKit.ErrorFallback`, тот же паттерн, что у остальных
  полей пакета, собранных напрямую (не через `createField`).
- Итог: 27 полей (было 17). `FieldCreditCard` отложен — см. CHANGELOG `forms-vue` 0.4.0.
- Тесты — `src/lib/app-form.spec.ts`, блок «Этап 3»: те же сценарии, что в headless-версии,
  через `rekaUIKit`/`FieldWrapper`.

## 0.4.0 (2026-08-13)

Фаза 9, Этап 2 — select-family на `rekaUIKit`: `FieldRadioGroup`, `FieldNativeSelect`,
`FieldSwitch` (три поля, отложенные с Этапа 1). Закрывает недостающие 3 из 14→17 полей —
теперь весь набор Этапа 1 полностью портирован и на Reka-скин, не только на headless.

- Новые Reka-примитивы UIKit-контракта: `RadioGroup` (`RadioGroupRoot`/`RadioGroupItem`/
  `RadioGroupIndicator` из `reka-ui`, паритет разметки с React `radio-group.tsx`) и
  `NativeSelect` (обычный `<select>`, паритет с React `native-select.tsx`) —
  `ImplementedExtendedPrimitives` в `uikit-reka.ts` расширен с 3 до 5.
- `FieldSwitch` — **не через UIKit-контракт** (`Switch` не входит в `UIKitExtendedPrimitives`,
  тот же вывод, что и в React `forms-shadcn/field-switch.tsx`): рисуется напрямую на
  `SwitchRoot`/`SwitchThumb` из `reka-ui`, стилизация 1:1 с React-версией.
- `FieldRadioGroup`/`FieldNativeSelect` собраны как `FieldSelect` — `options` вне контракта
  `createField`, `useAppFormContext`/`resolveFieldMeta`/`withFieldValidation` напрямую.
- Тесты — `src/lib/app-form.spec.ts`, блок «Этап 2»: рендер контролов, клик по
  radio-опции, выбор в native `<select>`, переключение `Switch`.

## 0.3.0 (2026-08-13)

Фаза 9, Этап 1 (продолжение) — 8 новых полей на `rekaUIKit`, подмножество нового набора
`@letar/forms-vue` (полностью: `FieldNumberInput`, `FieldPassword`, `FieldDate`, `FieldTime`,
`FieldCurrency`, `FieldPercentage`, `FieldHidden`, `FieldYesNo`). `FieldSwitch`/`FieldRadioGroup`/
`FieldNativeSelect` отложены на Этап 2 — нужны новые Reka UI-примитивы
(`Switch`/`RadioGroup`/`NativeSelect`), которых пока нет в `rekaUIKit`.

- Поля без своего Reka-примитива переиспользуют уже существующие (`Input` → Password/Date/Time,
  `NumberInput` → NumberInput/Currency/Percentage).
- `FieldPassword` — единственное поле, которому нужен локальный `ref` (видимость), поэтому оно
  не через `createField` (нет `useFieldState`), а напрямую через `resolveFieldMeta`/
  `withFieldValidation` + собственный `onErrorCaptured`, как `FieldSelect`.
- `FieldHidden`/`FieldYesNo` не используют `rekaUIKit` вовсе (нет визуального контрола/своя
  вёрстка на Tailwind-классах) — тот же выбор, что в headless-версии.
- Тесты — `src/lib/app-form.spec.ts`, блок «Этап 1»: рендер контролов всех 8 полей,
  переключение видимости пароля.

## 0.2.0 (2026-08-13)

Фаза 9 (`libs/forms/PLAN.md`, тред `forms-vue-parity-phase9`), Этап 1.

- ⚠️ **Ломающее изменение (пакет в beta, внешних потребителей нет — согласовано координатором):**
  `useAppFormContext`, `AppForm` и вся композиционная логика теперь берутся из
  `@letar/forms-vue/core`, не из корневого `@letar/forms-vue`. `createFieldPrimitives` (в
  `field/create-field-primitives.ts`) и поля `FieldSelect`/`FieldCombobox` (собранные напрямую,
  не через фабрику) переиспользуют `resolveFieldMeta`/`withFieldValidation` из `forms-vue/core`
  вместо копии той же логики — дублирование обвязки (разбор Zod-меты, обёртка `form.Field`,
  извлечение ошибки валидации) устранено.
- Публичный API самого `@letar/forms-vue-shadcn` (`createField`, `FieldWrapper`, 6 полей,
  `rekaUIKit`) не изменился — поменялся только внутренний источник композиционной логики.

Первый релиз — Поток 1 письма координатора форм `QuietRidge` (тред `forms-phase7-3-shadcn`,
письмо #61): полноценный Reka UI-скин `UIKit`-контракта из `forms-core` для Vue, аналог
`@letar/forms-shadcn` для React.

- `rekaUIKit` — реализация `UIKit`-контракта на [Reka UI](https://reka-ui.com) + Tailwind + cva:
  core-примитивы (`FieldRoot`/`FieldLabel`/`FieldError`/`Input`/`Checkbox`/`Select`) + минимум
  extended (`NumberInput`/`Combobox`/`ErrorFallback`), нужный 6 полям.
- `createFieldPrimitives(uikit)` — Vue-версия композиционного слоя из `@letar/forms-react`
  (Фаза 7.3), не копия 1:1: ошибку рендера поля ловит `onErrorCaptured` в `setup()`, а не
  классовый `ErrorBoundary` (паттерна которого в Vue нет).
- 6 полей: `FieldString`, `FieldNumber`, `FieldCheckbox`, `FieldTextarea`, `FieldSelect`,
  `FieldCombobox`.
- Каждый примитив `rekaUIKit` — обычная функция `(props) => VNode`, не `defineComponent`:
  контракт `(props) => TNode` совпадает с сигнатурой плоской функции буквально, композиционный
  слой вызывает примитивы напрямую внутри чужого render-контекста.
- Тесты — vitest + `@vue/test-utils`, `src/lib/app-form.spec.ts` (метки из схемы, ошибка
  валидации, блокировка сабмита, чекбокс по клику, успешный сабмит, guard «поле вне `<AppForm>`»).
  Полифиллы `ResizeObserver`/`hasPointerCapture`/`scrollIntoView` — стандартный минимум для
  тестирования Radix/Reka-компонентов в jsdom.
- Минимальный dev-харнесс на голом Vite (`nx run @letar/forms-vue-shadcn:demo`, порт 5173,
  `.claude/launch.json`) — не Nx-приложение, в монорепо нет Vue+Vite приложений.
- **Находка задачи:** UIKit-контракт (`forms-core/uikit/types.ts`) уже полностью
  framework-agnostic (`TNode` — обобщённый параметр) — Vue-версия контракта заводить не
  потребовалось, только реализация под конкретный TNode (`VNode | string | null`).
