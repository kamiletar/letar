# @letar/forms-angular

**Статус: proof-of-concept, не для продакшена.**

Разведочный headless-адаптер `@letar/forms-core` для Angular — третий фреймворк-пруф после React
(`@letar/forms-react`/`forms-shadcn`) и Vue (`@letar/forms-vue`/`forms-vue-shadcn`, Фаза 9). Цель —
не порт форм, а проверка архитектурной границы: framework-free ядро (`@letar/forms-core/schema`,
Zod-мета-движок `.meta({ ui: {...} })`) должно читаться в Angular без единой правки в самом ядре, а
валидация — подключаться через нативные примитивы `@angular/forms` (Reactive Forms), не через
имитацию `@tanstack/angular-form`.

Пруф подтверждён: `forms-core` не потребовал ни одной правки. 58/61 полей закрыто:

- **Этап 1–2** (зеркало Vue-порта): String, Textarea, Number, Password, Checkbox, Switch,
  RadioGroup, NativeSelect, Date, YesNo.
- **Stage A** (Фаза 11, +7 самых простых полей): NumberInput, Currency, Percentage, Slider,
  Rating, Hidden, Time.
- **Stage B** (Фаза 11, +11 документных полей РФ — движок масок): INN, BIK, OGRN, SNILS, KPP,
  Passport, BankAccount, CorrAccount, ForeignPassport, DepartmentCode, BirthCertificate.
- **Stage C** (Фаза 11, +1 поле — чистый JS-форматтер вместо движка масок): Phone.
- **Stage D** (Фаза 11, +4 поля с составным значением): DateRange, DateTimePicker, Duration,
  Schedule.
- **Stage E** (Фаза 11, +8 полей семейства «выбор»): Select, CascadingSelect, Combobox,
  Autocomplete, Listbox, RadioCard, SegmentedGroup, ImageChoice.
- **Stage F** (Фаза 11, +2 поля): CheckboxCard, Tags.
- **Stage G** (Фаза 11, +8 полей категории "special"): PinInput, OTPInput, ColorPicker,
  FileUpload, Address, City, Signature, CreditCard.
- **Stage H** (Фаза 11, +3 поля): PasswordStrength, Editable, RichText (ленивая загрузка Tiptap).
- **Stage I** (Фаза 11, +4 поля survey/table категорий): Likert, MatrixChoice, TableEditor,
  DataGrid (`@tanstack/table-core`, без ленивой загрузки — см. ниже).

## Поля

| Компонент                        | Селектор                        | Доп. `@Input()` сверх `name`/`label`/`placeholder`                                                                                                                             |
| -------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `FieldStringComponent`           | `letar-field-string`            | —                                                                                                                                                                              |
| `FieldTextareaComponent`         | `letar-field-textarea`          | —                                                                                                                                                                              |
| `FieldNumberComponent`           | `letar-field-number`            | —                                                                                                                                                                              |
| `FieldNumberInputComponent`      | `letar-field-number-input`      | `min`, `max`, `step`                                                                                                                                                           |
| `FieldCurrencyComponent`         | `letar-field-currency`          | `currency` (по умолчанию `RUB`), `min`, `max`, `step` (по умолчанию `0.01`)                                                                                                    |
| `FieldPercentageComponent`       | `letar-field-percentage`        | `min` (0), `max` (100), `step` (1)                                                                                                                                             |
| `FieldSliderComponent`           | `letar-field-slider`            | `min` (0), `max` (100), `step` (1), `showValue`                                                                                                                                |
| `FieldRatingComponent`           | `letar-field-rating`            | `count` (5)                                                                                                                                                                    |
| `FieldHiddenComponent`           | `letar-field-hidden`            | `value` — без label/error UI, без рендера DOM                                                                                                                                  |
| `FieldTimeComponent`             | `letar-field-time`              | `min`, `max`, `step`                                                                                                                                                           |
| `FieldPasswordComponent`         | `letar-field-password`          | —                                                                                                                                                                              |
| `FieldCheckboxComponent`         | `letar-field-checkbox`          | —                                                                                                                                                                              |
| `FieldSwitchComponent`           | `letar-field-switch`            | —                                                                                                                                                                              |
| `FieldRadioGroupComponent`       | `letar-field-radio-group`       | `options: FieldRadioGroupOption[]`                                                                                                                                             |
| `FieldNativeSelectComponent`     | `letar-field-native-select`     | `options: FieldNativeSelectOption[]`                                                                                                                                           |
| `FieldDateComponent`             | `letar-field-date`              | —                                                                                                                                                                              |
| `FieldYesNoComponent`            | `letar-field-yes-no`            | —                                                                                                                                                                              |
| `FieldInnComponent`              | `letar-field-inn`               | — (`formatMode: 'off'`, без группировки — длина переменная, 10 или 12)                                                                                                         |
| `FieldBikComponent`              | `letar-field-bik`               | —                                                                                                                                                                              |
| `FieldOgrnComponent`             | `letar-field-ogrn`              | —                                                                                                                                                                              |
| `FieldSnilsComponent`            | `letar-field-snils`             | —                                                                                                                                                                              |
| `FieldKppComponent`              | `letar-field-kpp`               | —                                                                                                                                                                              |
| `FieldPassportComponent`         | `letar-field-passport`          | — (без контрольной суммы — паспорт РФ её не несёт)                                                                                                                             |
| `FieldBankAccountComponent`      | `letar-field-bank-account`      | —                                                                                                                                                                              |
| `FieldCorrAccountComponent`      | `letar-field-corr-account`      | — (доп. проверка префикса `"301"`)                                                                                                                                             |
| `FieldForeignPassportComponent`  | `letar-field-foreign-passport`  | —                                                                                                                                                                              |
| `FieldDepartmentCodeComponent`   | `letar-field-department-code`   | —                                                                                                                                                                              |
| `FieldBirthCertificateComponent` | `letar-field-birth-certificate` | — (без маски — свободный ввод + нормализация гомоглифов на `blur`)                                                                                                             |
| `FieldPhoneComponent`            | `letar-field-phone`             | `country` (по умолчанию `RU`), `autoUnmask` (по умолчанию `false`)                                                                                                             |
| `FieldDateRangeComponent`        | `letar-field-date-range`        | `startLabel` (`С`), `endLabel` (`По`), `min`, `max`, `presets`, `orientation` (`horizontal`)                                                                                   |
| `FieldDateTimePickerComponent`   | `letar-field-datetime-picker`   | `minDateTime`, `maxDateTime`, `timeStep` (15)                                                                                                                                  |
| `FieldDurationComponent`         | `letar-field-duration`          | `format` (`HH:MM`/`minutes`), `min` (0), `max` (1440), `step` (15)                                                                                                             |
| `FieldScheduleComponent`         | `letar-field-schedule`          | `dayNames`, `defaultSchedule`, `days`, `showCopyToWeekdays` (`true`), `offLabel`, `copyToWeekdaysLabel`, `defaultOpenTime` (`09:00`), `defaultCloseTime` (`18:00`)             |
| `FieldSelectComponent`           | `letar-field-select`            | `options: FieldSelectOption[]` (`placeholder` рендерится пустой опцией — в отличие от `NativeSelect`)                                                                          |
| `FieldCascadingSelectComponent`  | `letar-field-cascading-select`  | `dependsOn`, `loadOptions`, `initialOptions`, `clearOnParentChange` (`true`), `disableWhenParentEmpty` (`true`), `placeholderWhenDisabled`                                     |
| `FieldComboboxComponent`         | `letar-field-combobox`          | `options: FieldComboboxOption[]`, `minChars` (0)                                                                                                                               |
| `FieldAutocompleteComponent`     | `letar-field-autocomplete`      | `suggestions: string[]`, `minChars` (1)                                                                                                                                        |
| `FieldListboxComponent`          | `letar-field-listbox`           | `options: ListboxOption[]`, `selectionMode` (`single`/`multiple`)                                                                                                              |
| `FieldRadioCardComponent`        | `letar-field-radio-card`        | `options: RadioCardOption[]`, `orientation` (`horizontal`)                                                                                                                     |
| `FieldSegmentedGroupComponent`   | `letar-field-segmented-group`   | `options: SegmentedGroupOption[]`, `orientation` (`horizontal`)                                                                                                                |
| `FieldImageChoiceComponent`      | `letar-field-image-choice`      | `options: ImageChoiceOption[]`, `columns` (3), `multiple` (`false`)                                                                                                            |
| `FieldCheckboxCardComponent`     | `letar-field-checkbox-card`     | `options: CheckboxCardOption[]`, `orientation` (`horizontal`)                                                                                                                  |
| `FieldTagsComponent`             | `letar-field-tags`              | `maxTags`, `minTagLength` (1)                                                                                                                                                  |
| `FieldPinInputComponent`         | `letar-field-pin-input`         | `count` (4), `mask`, `otp`, `type` (`numeric`/`alphanumeric`/`alphabetic`), `onComplete`                                                                                       |
| `FieldOtpInputComponent`         | `letar-field-otp-input`         | `length` (6), `type`, `mask`, `autoSubmit`, `resendTimeout` (60), `onResend`                                                                                                   |
| `FieldColorPickerComponent`      | `letar-field-color-picker`      | `swatches: string[]` (12 дефолтных)                                                                                                                                            |
| `FieldFileUploadComponent`       | `letar-field-file-upload`       | `accept`, `maxFiles` (1), `security: FileSecurityConfig`                                                                                                                       |
| `FieldAddressComponent`          | `letar-field-address`           | `provider`, `token`, `minChars` (3), `debounceMs` (300), `valueOnly`                                                                                                           |
| `FieldCityComponent`             | `letar-field-city`              | `provider`, `token`, `minChars` (2), `debounceMs` (300)                                                                                                                        |
| `FieldSignatureComponent`        | `letar-field-signature`         | `width` (400), `height` (150), `strokeColor`, `strokeWidth` (2), `backgroundColor`, `clearLabel`, `placeholder`, `allowTyped` (`true`), `exportFormat` (`png`/`svg`)           |
| `FieldCreditCardComponent`       | `letar-field-credit-card`       | `brands: CardBrand[]`, `showBrandIcon`, `layout` (`inline`/`stacked`), `disabled`, `readOnly`, `numberPlaceholder`, `expiryPlaceholder`, `cvcPlaceholder`                      |
| `FieldPasswordStrengthComponent` | `letar-field-password-strength` | `requirements: PasswordRequirement[]`, `showRequirements` (`true`), `defaultVisible` (`false`)                                                                                 |
| `FieldEditableComponent`         | `letar-field-editable`          | `multiline`, `activationMode` (`click`/`none`), `submitOnBlur` (`true`)                                                                                                        |
| `FieldRichTextComponent`         | `letar-field-rich-text`         | `minHeight` (`150px`), `maxHeight`, `showToolbar` (`true`), `toolbarButtons: RichTextButton[]`, `outputFormat` (`html`/`json`) — ленивая загрузка, см. ниже                    |
| `FieldLikertComponent`           | `letar-field-likert`            | `anchors: string[]`, `showNumbers` (`false`), `disabled`                                                                                                                       |
| `FieldMatrixChoiceComponent`     | `letar-field-matrix-choice`     | `rows: MatrixRow[]`, `columns: MatrixColumn[]`, `variant` (`radio`/`checkbox`/`rating`), `disabled`                                                                            |
| `FieldTableEditorComponent`      | `letar-field-table-editor`      | `columns: TableColumnDef[]`, `addLabel`, `sortable`, `selectable`, `footer: TableFooterDef[]`, `maxRows`, `minRows`, `clipboard` (`true`), `emptyText`, `disabled`, `readOnly` |
| `FieldDataGridComponent`         | `letar-field-data-grid`         | `columns: DataGridColumnDef[]`, `pageSize` (20), `rowSelection`, `onRowSave`, `disabled`                                                                                       |

Разметка у всех — голый HTML, без CSS: классы `letar-field`, `letar-field__label`,
`letar-field__control`, `letar-field__error` (тот же принцип, что у `libs/forms-vue`, раздел
«Что НЕ входит в скоуп» его README).

## Архитектурные решения

- **Реактивность — Angular signals** (`signal`/`computed`/`effect`), не Zone.js. Приложение
  рендерится через `provideZonelessChangeDetection()` (Angular 20+) — `zone.js` не в зависимостях.
- **`FormRootService`** (`src/lib/core/form-root.service.ts`) — Angular-эквивалент `AppFormContext`
  из `@letar/forms-vue`, но через Angular DI (`providers: [FormRootService]` на `<letar-app-form>`,
  а не Vue `provide`/`inject`). `providers` (в отличие от `viewProviders`) видны и содержимому,
  спроецированному через `<ng-content>` — на этом держится связь «поле знает про форму».
- **`getFieldMeta`/`unwrapSchema`** (`@letar/forms-core/schema`) читаются напрямую в
  `field-meta.ts` — тот же контракт, что у React/Vue-скинов, без адаптации.
- **Валидатор поля** (`zod-validator.ts`) — нативный Angular `ValidatorFn` поверх
  `schema.safeParse()`, подключается как обычный validator `FormControl`. Не имитация
  `@tanstack/angular-form`.
- **`@Input()`/`@Output()` (legacy-декораторы), не сигнальные `input()`/`output()`** — находка
  разведки: в JIT-режиме (без `ngtsc`/AOT) сигнальные inputs не резолвятся на границе компонента,
  потребляемого другим standalone-компонентом через property binding
  (`NG0303: Can't bind to 'schema'...`). Внутри полей (`FieldBase`) сигналы используются свободно
  (`computed`/`effect`) — проблема только в JIT-извлечении метаданных `inputs`/`outputs` из
  initializer API на границе. См. комментарии в `app-form.component.ts`/`field-base.ts`.
- **`DocumentFieldBase`** (`src/lib/core/document-field-base.ts`, Stage B) — abstract-база 10 из
  11 документных полей (не `BirthCertificate` — у него нет структурной маски). Angular-эквивалент
  Vue-фабрики `createDocumentField(config)`, но не функция-фабрика (Angular компонент обязан быть
  классом с `@Component`) — конфиг распался на `abstract readonly mask` + `readonly formatMode` +
  `readonly maxLength` + `@Input() override placeholder` (свой default в каждом наследнике) +
  `abstract validateDocument()`. Общая разметка десяти наследников — не копия в каждом файле, а
  одна константа `DOCUMENT_FIELD_TEMPLATE`, подставляемая в `template:` каждого. Ключевое отличие
  от остальных `Field*` — НЕ `[formControl]="ctrl"`: `MaskController` (`@letar/forms-core/mask`)
  пишет напрямую в DOM через `setRangeText`, источник истины — `<input>`, а не Angular
  `ControlValueAccessor` (иначе в `FormControl` попадало бы отформатированное значение, а не raw).
  Подробности и почему двойной источник ошибки (Zod-схема формы + собственная контрольная сумма
  поля) — комментарий класса в `document-field-base.ts`.
- **`FieldPhoneComponent`** (`src/lib/fields/field-phone.component.ts`, Stage C) — единственное
  «масочное» поле во всех трёх скинах (React/Vue/Angular), которое сознательно обходит движок
  масок целиком: форматирует через чистый JS-форматтер `@letar/forms-core/phone`
  (`formatPhoneNumber`/`stripPhoneNumber`), не через `MaskController` — тот не может ретроактивно
  распознать междугородний trunk-префикс (ведущая `8` в РФ), см. комментарий в
  `format-phone.ts`. Как и документные поля — не `[formControl]`, а `@ViewChild('inputEl')` +
  ручной `(input)`/`(blur)`, но проще: без `MaskController` весь пересчёт (`stripPhoneNumber` →
  `formatPhoneNumber` → запись в DOM и в контрол) — в одном обработчике `input`, без отдельного
  `ngAfterViewInit`-attach. Контракт `autoUnmask` — 1-в-1 с Vue/React (не как у
  `DocumentFieldBase`, где `FormControl` всегда получает raw): `false` (default) — контрол хранит
  форматированную строку; `true` — только цифры.
- **Stage D — составное значение поля в одном `FormControl`, не `FormGroup`** (DateRange
  `{start,end}`, DateTimePicker — ISO-строка из двух инпутов, Duration — минуты из HH+MM,
  Schedule — `WeeklySchedule` из 7 дней). `FieldBase.control` изначально рассчитан на один
  `FormControl` на всё значение поля независимо от того, примитив это или объект — Stage D просто
  использует это буквально, без отдельного механизма. Все четыре поля НЕ используют
  `[formControl]="ctrl"` ни на одном под-инпуте (каждый инпут отражает только часть составного
  значения, `FormControlDirective` этого не умеет) — вместо этого свой `signal`, синхронизируемый
  через `effect()` + `ctrl.events.subscribe()` (тот же приём, что `FieldRatingComponent`/
  `FieldSliderComponent`, Stage A), и ручные `ctrl.setValue()`/`ctrl.markAsTouched()` по
  `input`/`change`/`click`. `FieldScheduleComponent` — самое сложное поле пакета: типы
  `WeeklySchedule`/`ScheduleDaySchedule`/`DayOfWeek` и константы (дни недели, дефолтный график)
  портированы локально (как и в Vue-версии — они не вынесены в `forms-core`, живут в каждом скине
  отдельно), логика toggle/copy-to-weekdays/`close>open`-предупреждение — 1-в-1 с
  `libs/forms-vue/src/lib/fields/field-schedule.ts`.
- **Stage E — семейство «выбор», 8 полей.** `FieldSelectComponent` — единственное поле стадии на
  чистом `[formControl]="ctrl"` (обычный `<select>`, тот же примитив, что `FieldNativeSelectComponent`
  — разница только в опциональной пустой опции из `resolvedPlaceholder()`). Остальные семь — те же
  два приёма, что и в Stage A/D: `[formControl]` там, где значение контрола совпадает с тем, что
  показывает единственный нативный элемент (`FieldCascadingSelectComponent`,
  `FieldAutocompleteComponent` — `<select>`/`<input>` напрямую), и свой `signal` + ручной
  `ctrl.setValue()` там, где отображаемое состояние (текст поиска, набор выбранных карточек) не
  совпадает 1:1 со значением контрола (`FieldComboboxComponent`, `FieldListboxComponent`,
  `FieldRadioCardComponent`, `FieldSegmentedGroupComponent`, `FieldImageChoiceComponent`).
  - **`FieldCascadingSelectComponent`** — единственное поле пакета, которому нужно значение ДРУГОГО
    поля формы. Vue-версия читает его через `form.useStore(selector)` (`@tanstack/vue-form` даёт
    полностью реактивный snapshot всех значений формы) — у Angular `FormGroup` такого снапшот-сигнала
    нет. Вместо правки `FormRootService` — подписка на `formRoot.form.valueChanges`:
    `FormGroup.addControl` сам вызывает `updateValueAndValidity()` (эмитит `valueChanges` по
    умолчанию), поэтому одна подписка на value changes всей формы ловит и «поле-родитель
    (`dependsOn`) ещё не смонтировано на момент конструирования этого поля» (порядок конструкторов
    content-projected детей не гарантирован — см. `field-base.ts`), и «родитель сменил значение» —
    без ручного опроса графа полей. Disable-состояние — `ctrl.disable()`/`ctrl.enable()`, не
    `[attr.disabled]`: смешивать нативный атрибут с `[formControl]` Angular считает ошибкой
    конфигурации (консольное предупреждение), disabled — прерогатива самого контрола в Reactive
    Forms.
  - **`FieldListboxComponent`** (multi/single) и `FieldImageChoiceComponent` (multi/single) —
    контрол держит `string | string[]` целиком, тот же принцип, что Stage D (один `FormControl` на
    составное значение). Кнопки-опции (`role="option"`/`role="checkbox"`) не имеют нативного
    `ControlValueAccessor`, поэтому синхронизация — тот же `effect()` + `ctrl.events.subscribe()`,
    что у `FieldDateRangeComponent`, а не имитация чек-листа через несколько `FormControl`.
- **Stage F — 2 поля, без новых приёмов.** `FieldCheckboxCardComponent` — тот же `signal` +
  `effect()`/`ctrl.events.subscribe()`, что `FieldRadioCardComponent` (Stage E), но значение
  `string[]` и `role="checkbox"` на каждой карточке вместо `role="radio"` в `role="radiogroup"` —
  карточки независимы, поэтому обёртка — `role="group"`, не `role="radiogroup"`.
  `FieldTagsComponent` — черновик ввода в отдельном `signal('')`, НЕ связанном с `FormControl`
  (сам `<input>` не поле формы, источник текста для следующего тега); список тегов — тот же
  синхронизируемый `signal<string[]>`, что у остальных полей с составным/множественным значением.
  Enter добавляет тег из черновика (с проверкой `minTagLength`/`maxTags`/дубликатов), Backspace на
  пустом черновике удаляет последний тег — 1-в-1 с `libs/forms-vue/src/lib/fields/field-tags.ts`.
- **Stage G — 8 полей категории "special", самый архитектурно тяжёлый этап.**
  `FieldPinInputComponent`/`FieldOtpInputComponent` — N ячеек `<input maxlength="1">`
  (Backspace/стрелки/paste — `../core/pin-input-utils.ts`, общий для обоих полей); OTP добавляет
  таймер повторной отправки (`signal`+`setInterval`+`ngOnDestroy`) и `autoSubmit` через
  `elementRef.nativeElement.closest('form')?.requestSubmit()` — Angular-эквивалент вызова
  `form.handleSubmit()` в Vue-composable (TanStack Form API, для которого у `FormRootService` нет
  прямого аналога; нативный DOM submit достигает того же результата другим механизмом триггера).
  `FieldColorPickerComponent` — то же Vue-идиоматичное упрощение относительно Ark UI
  `ColorPicker.Root` (Chakra-скин): нативный `<input type="color">` + hex-инпут + свотчи.
  `FieldFileUploadComponent` — `<input type="file">` + drag&drop-зона, `File[]`,
  `processFileWithSecurity` (`@letar/forms-core/security`) переиспользован без порта.
  - **`FieldAddressComponent`/`FieldCityComponent`** — общий контроллер подсказок
    `createAddressSuggestions()` (`../core/address-suggestions.ts`), Angular-эквивалент Vue
    composable `useAddressSuggestions`; `createDaDataProvider`/`AddressProvider`
    (`@letar/forms-core/address`) framework-agnostic, порт не потребовался. Единственная находка,
    специфичная для Angular: `createAddressSuggestions()` вызывается один раз как инициализатор
    поля класса, а Angular заполняет `@Input()` (`minChars`/`debounceMs`) только ПОСЛЕ возврата из
    конструктора (то же ограничение, что у `name`/`label`/`placeholder` в `field-base.ts`).
    Захватить `this.debounceMs` по значению в момент создания контроллера значило бы навсегда
    зафиксировать дефолт (`300`), даже если шаблон передал `[debounceMs]="0"` — поэтому опции
    контроллера принимают `getMinChars`/`getDebounceMs` как геттеры, читаемые лениво в момент
    вызова (`handleInput`), когда Angular уже применил биндинг. Click-outside — через
    `document.addEventListener('mousedown', …)` + `DestroyRef.onDestroy()` (Angular-эквивалент
    `onMounted`/`onBeforeUnmount` в Vue-composable), регистрируется из `ngAfterViewInit` (не
    конструктора — `@ViewChild`-ref контейнера ещё не существует до первого рендера DOM).
  - **`FieldSignatureComponent`** — canvas-подпись (рисование мышью/тачем + typed-режим),
    `@ViewChild('canvasEl')` + `ngAfterViewInit` для 2D-контекста (тот же паттерн, что
    `DocumentFieldBase` — canvas требует прямого DOM-доступа, не декларативного биндинга).
    Экспорт в PNG (`canvas.toDataURL`) или SVG data URI по записанным штрихам — чистые функции
    (`buildSvgString`/`buildTypedSvgString`/`escapeXml`/`getCoords`) — 1:1 порт из
    `use-signature-field.ts` (Vue), не вынесены в `forms-core` — единственный потребитель.
    ⚠️ В jsdom (vitest) `canvas.getContext('2d')` обычно возвращает `null` — все методы,
    работающие с контекстом, no-op на ранней проверке, тест ограничен регистрацией контрола и
    базовым рендером кнопки очистки, не полноценным рисованием (тот же выбор, что у React/Vue-тестов
    этого поля).
  - **`FieldCreditCardComponent`** — составное значение `{ number, expiry, cvc }` в одном
    `FormControl` (тот же принцип, что `FieldDateRangeComponent`, Stage E — `control()` всегда
    один `FormControl` на всё значение поля, вложенный `FormGroup` не заводится). Форматтеры и
    валидаторы (`formatCardNumber`/`luhn`/`detectBrand`/`isExpiryValid`/...) — 1:1 переиспользование
    `@letar/forms-core/credit-card`. Иконка бренда карты (SVG, Simple Icons) не портирована — Vue
    строит её через `h()` (`card-brand-icon.ts`), Angular-эквивалент потребовал бы набора inline-SVG
    шаблонов без явной пользы для headless-пруфа; вместо иконки — `data-brand`/текстовая подпись,
    вся логика определения бренда и валидации полнофункциональна. Как и в Vue, поле не читает
    начальное значение `ctrl.value` в display-сигналы при монтировании — сознательное упрощение
    исходного composable, не Angular-специфичный пробел.
- **Stage H — 3 поля, самый архитектурно интересный этап пруфа.**
  `FieldPasswordStrengthComponent`/`FieldEditableComponent` — те же приёмы, что и в предыдущих
  стадиях (свой `signal` + `effect()`/`ctrl.events.subscribe()` для синхронизации с `control()`),
  логика расчёта силы пароля (`checkRequirement`/`calculateStrength`/`getStrengthLabel`) — 1:1
  порт `field-password-strength.ts` (Vue). `defaultVisible`/`activationMode` инициализируются в
  `ngOnInit()`, не в конструкторе/field-инициализаторе — Angular присваивает `@Input()`-поля
  между конструктором и `ngOnInit()`, в отличие от Vue `setup()`, который получает уже заполненные
  `props`.
  - **`FieldRichTextComponent` — ленивая загрузка Tiptap.** WYSIWYG-редактор — тяжёлый peer-dep
    (`@tiptap/*`), нужный только этому полю; остальные text-поля не обязаны его резолвить.
    Реализация (`field-rich-text-impl.component.ts`) вынесена из обёртки (`field-rich-text.component.ts`)
    и подгружается явным `import()` внутри `ngAfterViewInit()`, компонент монтируется вручную через
    `ViewContainerRef.createComponent()` (Ivy не требует `NgModule`/`ComponentFactoryResolver` для
    standalone-компонентов) + `ComponentRef.setInput()` — единственный API, который и присваивает
    значение `@Input()`-полю, и вызывает `ngOnChanges()` на созданном экземпляре (обычное
    `ref.instance.x = y` этого не делает, а на `ngOnChanges` держится реактивность
    `FieldBase.meta`). **Не `@defer`**: этот встроенный Angular 17+ примитив ленивой загрузки —
    трансформация шаблонного компилятора, которую выполняет сборка **потребителя** библиотеки, а
    `forms-angular` раздаётся как сырой TS-исходник (`customConditions: ["@letar/source"]`) —
    код-сплиттинг библиотечного поля не должен зависеть от того, включил ли и как настроил
    `@defer`-трансформ конкретный потребитель. Явный `import()` — рантайм-примитив ES-модулей,
    переносимый под любой бандлер; тот же принцип, что `createLazyField`/`defineAsyncComponent` в
    `@letar/forms-vue` и `React.lazy`/`Form.Captcha` в React-скине — третий раз в этой библиотеке
    форм, каждый раз на примитиве своего фреймворка. Сама реализация редактора использует
    `@tiptap/core` напрямую (не `@tiptap/vue-3`/`@tiptap/react` — у Tiptap нет официального
    Angular-биндинга): `Editor` из `@tiptap/core` framework-agnostic и монтирует
    `contenteditable`-DOM сам, получив `element` в конструктор. Активность кнопок тулбара не
    эмитится реактивно самим Tiptap — `onTransaction` инкрементирует сигнал-«тик», от которого
    читает `isActive()` в шаблоне (тот же приём, что `hasError`/`errorMessage` в `FieldBase`
    используют `ctrl.events.subscribe()`, а не `computed` напрямую от `control()`).
- **Stage I — 4 поля survey/table категорий, все с составным значением.**
  `FieldLikertComponent`/`FieldMatrixChoiceComponent` — один `FormControl` на весь
  вопрос/матрицу (`number` и `Record<string, string | string[]>` соответственно), логика 1:1
  портирована из `@letar/forms-vue`. `FieldTableEditorComponent`/`FieldDataGridComponent` — тоже
  один `FormControl` на весь массив строк (тот же принцип, что `FieldTagsComponent`, Stage F, уже
  применяет к `string[]`) — не отдельный `FormControl` на ячейку, как в React/Vue-версиях (там
  каждая ячейка — свой `form.Field`); add/remove/move строк и правка ячейки — `ctrl.setValue([...])`
  целым новым массивом. Резолв колонок из Zod-схемы (`resolveTableColumns`,
  `src/lib/core/table-columns.ts`) — точный порт одноимённого модуля `@letar/forms-vue`: сам код
  framework-free (использует только `traverseSchema`/`getZodConstraints` из `@letar/forms-core`), но
  скопирован, а не импортирован — `@letar/forms-vue` не публикует этот файл через свои `exports`.
  DOM `FieldTableEditorComponent`/`FieldMatrixChoiceComponent` — `<tr>` строго прямые дети
  `<tbody>`, без `<div>`-обёрток внутри строки/ячейки (известный баг Chakra-версии `TableEditor` —
  невалидный HTML именно из-за такой обёртки).
  - **`FieldDataGridComponent` — без ленивой загрузки, в отличие от `FieldRichTextComponent`.**
    `@tanstack/table-core` — framework-agnostic ядро без собственных `dependencies` в
    `package.json`, на порядок легче ProseMirror-стека Tiptap; тот же движок уже подключён
    статически (не лениво) в `@tanstack/vue-table`/`@tanstack/react-table` — асимметрия с этими
    двумя скинами той же библиотеки была бы немотивированной. `createTable()` вызывается напрямую
    (нет официального Angular-адаптера, в отличие от `useVueTable`/`useReactTable`) внутри
    `computed()`, пересобираясь целиком при каждом изменении `rows`/`sorting`/`columnFilters`/
    `rowSelectionState`/`pagination` — состояние держат Angular-сигналы, а не мутируемый table-core
    instance между рендерами (тот же принцип управления состоянием снаружи, что у
    `@tanstack/svelte-table`). Заголовки/фильтры/пагинация рендерятся из `resolvedColumns()`
    напрямую, не через `table.getHeaderGroups()` — `table-core` используется только как чистый
    движок сортировки/фильтрации/пагинации (`table.getRowModel().rows`), без
    `flexRender`-подобного слоя рендер-функций колонок (в Angular таких общепринятых адаптеров для
    `table-core` нет).

## Тестирование без Karma

Разведка (главный технический риск задачи): в репозитории тесты идут через Vitest
(`@nx/vitest`), а Angular-компоненты обычно тестируются через `TestBed` + Karma/Jest + zone.js.
Связка **`provideZonelessChangeDetection()` + `TestBed` + Vitest + jsdom** реально работает —
подтверждено 70 зелёными тестами (`nx test forms-angular`), без Karma-раннера и без `zone.js` в
зависимостях. Реальный Tiptap-редактор (`@tiptap/core`) тоже рендерится и тестируется в jsdom —
`FieldRichTextComponent`'s тест кликает по кнопке тулбара и проверяет `aria-pressed`, без моков
редактора (тот же прецедент, что уже подтверждён для `@tiptap/vue-3` в `forms-vue`).

Две находки по пути:

1. **Angular-декораторы нельзя объявлять инлайн в `*.spec.ts`.** Vitest 4/Vite 8 транформируют
   файлы теста через отдельный от обычного модульного графа путь (непохоже на `esbuild`/`oxc`,
   не понимает decorator-синтаксис вовсе) — `@Component`/`@Injectable` прямо в `*.spec.ts` валят
   сборку с `SyntaxError: Invalid or unexpected token` ещё на этапе коллекции тестов (0 найденных
   тестов, без стека). Воркэраунд: любой Angular-декорированный класс — только в обычном `.ts`
   файле (см. `src/lib/testing/stage1-host.component.ts`, `stage2-host.component.ts`), импортированном в
   спек.
2. **Vite 8 использует `oxc` по умолчанию, не `esbuild`.** `esbuild.tsconfigRaw` тихо
   игнорируется («Both esbuild and oxc options were set»). Публичного эквивалента
   `experimentalDecorators` в `OxcOptions` этой версии не нашли — `vitest.config.ts` явно
   отключает `oxc: false`, откатываясь на `esbuild` с ручным `tsconfigRaw`
   (`experimentalDecorators: true`, `useDefineForClassFields: true` — именно `true`, не `false`:
   сигнальные API требуют настоящих ES class fields).

## Команды

```bash
nx test forms-angular
nx lint forms-angular
nx typecheck:tsgo forms-angular
```

## Известные ограничения (вне скоупа разведки)

- Нет skin/дизайн-системы — только семантическая разметка (как у `forms-vue`, не `forms-vue-shadcn`).
- Нет вложенности `FormGroup` (аналог `FormGroup` из `forms-vue` с `fullPath`) — только плоские поля.
- `FieldBase.name`/`label`/`placeholder` не реактивны к изменению после первого рендера
  (не сигналы, `@Input()`) — приемлемо, так как в реальном использовании `name` не меняется после
  монтирования поля.
- `Field.MaskedInput` (универсальная произвольная маска, Stage J) — не портируется, вне скоупа.
- Тяжёлые peer-deps сами по себе больше не блокер — `FieldRichTextComponent` (Stage H) доказал,
  что ленивая загрузка (`import()` + `ViewContainerRef.createComponent()`) работает для Angular
  так же, как `createLazyField`/`React.lazy` в Vue/React-скинах.

## Подключение к приложению

Обязательное — одно: добавь `@letar/forms-angular` в `nx.implicitDependencies` в `package.json`
приложения (если библиотеки нет в его `dependencies`). Это ребро графа Nx; сам импорт
`@letar/forms-angular` резолвится и без настроек приложения.

Когда дополнительно нужны `paths` в его `tsconfig.json` и почему `nx sync` здесь не поможет —
[libs.md](/.claude/rules/libs.md#подключение-к-приложению).
