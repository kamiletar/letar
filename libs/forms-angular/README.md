# @letar/forms-angular

**Статус: proof-of-concept, не для продакшена.**

Разведочный headless-адаптер `@letar/forms-core` для Angular — третий фреймворк-пруф после React
(`@letar/forms-react`/`forms-shadcn`) и Vue (`@letar/forms-vue`/`forms-vue-shadcn`, Фаза 9). Цель —
не порт форм, а проверка архитектурной границы: framework-free ядро (`@letar/forms-core/schema`,
Zod-мета-движок `.meta({ ui: {...} })`) должно читаться в Angular без единой правки в самом ядре, а
валидация — подключаться через нативные примитивы `@angular/forms` (Reactive Forms), не через
имитацию `@tanstack/angular-form`.

Пруф подтверждён: `forms-core` не потребовал ни одной правки. 28/61 полей закрыто:

- **Этап 1–2** (зеркало Vue-порта): String, Textarea, Number, Password, Checkbox, Switch,
  RadioGroup, NativeSelect, Date, YesNo.
- **Stage A** (Фаза 11, +7 самых простых полей): NumberInput, Currency, Percentage, Slider,
  Rating, Hidden, Time.
- **Stage B** (Фаза 11, +11 документных полей РФ — движок масок): INN, BIK, OGRN, SNILS, KPP,
  Passport, BankAccount, CorrAccount, ForeignPassport, DepartmentCode, BirthCertificate.

## Поля

| Компонент                        | Селектор                        | Доп. `@Input()` сверх `name`/`label`/`placeholder`                          |
| -------------------------------- | ------------------------------- | --------------------------------------------------------------------------- |
| `FieldStringComponent`           | `letar-field-string`            | —                                                                           |
| `FieldTextareaComponent`         | `letar-field-textarea`          | —                                                                           |
| `FieldNumberComponent`           | `letar-field-number`            | —                                                                           |
| `FieldNumberInputComponent`      | `letar-field-number-input`      | `min`, `max`, `step`                                                        |
| `FieldCurrencyComponent`         | `letar-field-currency`          | `currency` (по умолчанию `RUB`), `min`, `max`, `step` (по умолчанию `0.01`) |
| `FieldPercentageComponent`       | `letar-field-percentage`        | `min` (0), `max` (100), `step` (1)                                          |
| `FieldSliderComponent`           | `letar-field-slider`            | `min` (0), `max` (100), `step` (1), `showValue`                             |
| `FieldRatingComponent`           | `letar-field-rating`            | `count` (5)                                                                 |
| `FieldHiddenComponent`           | `letar-field-hidden`            | `value` — без label/error UI, без рендера DOM                               |
| `FieldTimeComponent`             | `letar-field-time`              | `min`, `max`, `step`                                                        |
| `FieldPasswordComponent`         | `letar-field-password`          | —                                                                           |
| `FieldCheckboxComponent`         | `letar-field-checkbox`          | —                                                                           |
| `FieldSwitchComponent`           | `letar-field-switch`            | —                                                                           |
| `FieldRadioGroupComponent`       | `letar-field-radio-group`       | `options: FieldRadioGroupOption[]`                                          |
| `FieldNativeSelectComponent`     | `letar-field-native-select`     | `options: FieldNativeSelectOption[]`                                        |
| `FieldDateComponent`             | `letar-field-date`              | —                                                                           |
| `FieldYesNoComponent`            | `letar-field-yes-no`            | —                                                                           |
| `FieldInnComponent`              | `letar-field-inn`               | — (`formatMode: 'off'`, без группировки — длина переменная, 10 или 12)      |
| `FieldBikComponent`              | `letar-field-bik`               | —                                                                           |
| `FieldOgrnComponent`             | `letar-field-ogrn`              | —                                                                           |
| `FieldSnilsComponent`            | `letar-field-snils`             | —                                                                           |
| `FieldKppComponent`              | `letar-field-kpp`               | —                                                                           |
| `FieldPassportComponent`         | `letar-field-passport`          | — (без контрольной суммы — паспорт РФ её не несёт)                          |
| `FieldBankAccountComponent`      | `letar-field-bank-account`      | —                                                                           |
| `FieldCorrAccountComponent`      | `letar-field-corr-account`      | — (доп. проверка префикса `"301"`)                                          |
| `FieldForeignPassportComponent`  | `letar-field-foreign-passport`  | —                                                                           |
| `FieldDepartmentCodeComponent`   | `letar-field-department-code`   | —                                                                           |
| `FieldBirthCertificateComponent` | `letar-field-birth-certificate` | — (без маски — свободный ввод + нормализация гомоглифов на `blur`)          |

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

## Тестирование без Karma

Разведка (главный технический риск задачи): в репозитории тесты идут через Vitest
(`@nx/vitest`), а Angular-компоненты обычно тестируются через `TestBed` + Karma/Jest + zone.js.
Связка **`provideZonelessChangeDetection()` + `TestBed` + Vitest + jsdom** реально работает —
подтверждено 10 зелёными тестами (`nx test forms-angular`), без Karma-раннера и без `zone.js` в
зависимостях.

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
- `Field.Phone` (особый non-mask-engine форматтер, Stage C) и `Field.MaskedInput` (универсальная
  произвольная маска, Stage J) — вне скоупа Stage B, тяжёлые peer-deps по-прежнему не портируются.

## Подключение к приложению

Обязательное — одно: добавь `@letar/forms-angular` в `nx.implicitDependencies` в `package.json`
приложения (если библиотеки нет в его `dependencies`). Это ребро графа Nx; сам импорт
`@letar/forms-angular` резолвится и без настроек приложения.

Когда дополнительно нужны `paths` в его `tsconfig.json` и почему `nx sync` здесь не поможет —
[libs.md](/.claude/rules/libs.md#подключение-к-приложению).
