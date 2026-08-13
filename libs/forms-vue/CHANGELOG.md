# Changelog @letar/forms-vue

## 0.10.0 (2026-08-13)

Фаза 9, Этап 6 (часть 1) — `FieldLikert`/`FieldMatrixChoice`, портированы 1:1 из
`libs/forms-shadcn/src/lib/fields/{field-likert,field-matrix-choice}.tsx`. Итог: 42 поля (было 40).

- **`FieldLikert`** — шкала Лайкерта, значение `number` (1-based индекс точки). `anchors:
  string[]` и `showNumbers` — пропы сверх контракта `createField` (массив), собран напрямую как
  `FieldRadioGroup`/`FieldYesNo`: `role="radiogroup"` на обёртке, `role="radio"`/`aria-checked`
  на каждой точке.
- **`FieldMatrixChoice`** — таблица «вопрос × вариант ответа» (`<table>`), значение
  `Record<string, string | string[]>`. `rows`/`columns: MatrixRow[]/MatrixColumn[]` — пропы сверх
  контракта. Три варианта `variant`: `radio` (одиночный, по умолчанию, кастомная
  кнопка-кружок) / `checkbox` (множественный, `<input type="checkbox">`) / `rating` (звёздочка —
  headless рисует `★` текстовым глифом, тот же принцип, что у `FieldRating`, без иконки-либы).
  Per-row required-подсветка (`data-row-error`), как в React-версии.
- Оба поля собраны напрямую через `defineComponent`+`h()`, не через `createField` — тот же
  паттерн, что у `FieldRadioGroup`/`FieldYesNo` (пропы-массивы вне контракта). `disabled` — явный
  проп поля (по умолчанию `false`), а не производный от контекста формы — так же, как у
  `FieldCreditCard`/`FieldRadioGroup` в Reka-скине.
- Тесты — новый файл `app-form.stage6.spec.ts` (не блок в едином `app-form.spec.ts` — с 0.9.0
  тесты пакета разбиты на файлы по этапам).
- Проверено: `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-vue,@letar/forms-vue-shadcn`
  зелёный на обоих пакетах.

## 0.9.0 (2026-08-13)

Фаза 9, Этап 5 закрыт целиком — последнее из восьми полей, `FieldRichText`, WYSIWYG на Tiptap
(`@tiptap/vue-3`, новый peer-dep). Итог: 40 полей (было 39).

- **`FieldRichText`** — грузится лениво (`createLazyField`, новый Vue-идиоматичный хелпер на
  `defineAsyncComponent`: не требует от потребителя оборачивать поле в `<Suspense>`, в отличие от
  React `lazy()`+`Suspense`), реализация в отдельном чанке `field-rich-text-impl.ts`. Тулбар —
  жирный/курсив/подчёркнутый/зачёркнутый/код/H1-3/списки/цитата/ссылка/undo/redo, headless-скин
  рисует кнопки текстовыми глифами (B/I/U/…), как уже принято у `FieldRating` (★/☆) — пакет не
  тянет иконку-либу.
- Тот же упрощённый scope, что и React `forms-shadcn`-версия (Фаза 7.6, сама уже была
  сокращением от Chakra-оригинала): без `imageUpload`/`ImagePopover`, кнопка `link` — через
  `window.prompt`, не Popover-форма.
- **`useRichTextField`** (`@letar/forms-vue/core`) — общий для headless и Reka-скина: жизненный
  цикл Tiptap-редактора, синхронизация внешнего `value` (html/json), парсинг битого JSON без
  падения редактора. `field.handleBlur` в composable намеренно не пробрасывается — DOM-фокус
  contenteditable недоступен из `setup()` (только в scoped-слоте `form.Field`), поэтому blur
  вешается на обёртку поля в render через `onFocusout` (в отличие от `blur`, `focusout` всплывает).
- **`rich-text-actions.ts`** (`@letar/forms-vue/core`) — таблица команд тулбара
  (`RICH_TEXT_ACTIONS`) и русских `aria-label` (`RICH_TEXT_BUTTON_LABELS`), общая для headless
  (глифы) и Reka-скина (иконки `lucide-vue-next`).
- ⚠️ **StarterKit v3 уже включает `Link`/`Underline` сам** (`extensions.push(Link.configure(...))`
  внутри `@tiptap/starter-kit`) — отдельные `@tiptap/extension-link`/`@tiptap/extension-underline`
  в составе `extensions: [...]` дают `[tiptap warn]: Duplicate extension names found`. Убраны из
  зависимостей обоих Vue-пакетов, конфигурация ссылки — через `StarterKit.configure({ link: {...} })`.
- ⚠️ **`@tiptap/vue-3` пиновать точной версией, не каретом.** `^3.29.2` у Bun резолвится в
  `3.30.1`, чей `peerDependencies` требует ровно `@tiptap/core@3.30.1`/`@tiptap/pm@3.30.1` — при
  остальном tiptap-семействе воркспейса на `3.29.2` рантайм падает `SyntaxError: ... does not
  provide an export named 'createWidgetDecoration'` (не TS-ошибка, всплывает только в браузере/
  тесте). Пин точной версией `"3.29.2"` (без `^`) во всех трёх `package.json` (корень,
  `forms-vue`, `forms-vue-shadcn`) — обязателен, пока апстрим не выровняет caret-диапазоны.
- ⚠️ **`editor.state`/`isActive()` в `@tiptap/vue-3` обновляются с задержкой в два кадра.**
  `Editor.ts` пакета держит их за `customRef` с `set()` через двойной `requestAnimationFrame` перед
  `trigger()` — обычного `nextTick()` после клика по кнопке тулбара недостаточно, тесты должны
  ждать `requestAnimationFrame` дважды (см. `waitForEditorUpdate` в `app-form.stage5b.spec.ts`).
- ⚠️ **`defineAsyncComponent`'s реальный `import()` под Vite/Vitest — не микрозадача.** Резолвится
  через несколько макротасков модульного графа; `flushPromises()`/`nextTick()` из
  `@vue/test-utils` в одиночку недостаточны для ожидания ленивого поля в тестах — нужен цикл с
  реальным `setTimeout` (см. `waitForLazyField`).
- Тесты — новый файл `app-form.stage5b.spec.ts` (не общий `app-form.spec.ts`, чтобы не раздувать
  его дальше): загрузка + рендер тулбара/редактора, клик по "B" переключает `aria-pressed`,
  `toolbarButtons` сужает набор кнопок.
- Проверено: `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-vue,@letar/forms-vue-shadcn`
  зелёный на обоих пакетах.

## 0.8.0 (2026-08-13)

Фаза 9, Этап 5 (часть 2) — ещё 3 «тяжёлых» peer-dep поля: `FieldSignature`, `FieldAddress`,
`FieldCity`. Итог: 39 полей (было 36). Из восьми полей Этапа 5 остался только `FieldRichText`
(Tiptap) — новый peer-dep для пакета, требует `lazy()`-паттерна (как у React `Form.Captcha`) и
отдельного захода.

- **`useSignatureField`** (`@letar/forms-vue/core`) — 1:1 порт `useFieldState` React
  `field-signature.tsx`: рисование мышью/пальцем на canvas + typed-режим (курсивный текст),
  экспорт в PNG (`canvas.toDataURL`) или SVG data URI по записанным штрихам. Чистые функции
  экспорта (`buildSvgString`/`buildTypedSvgString`/`escapeXml`) не вынесены в `forms-core` —
  единственный потребитель этой пары Vue-полей, дублирование признано оправданным (не
  общеиспользуемая логика, в отличие от дата/число-хелперов Этапа 4).
- **`useAddressSuggestions`** (`@letar/forms-vue/core`) — общий для `FieldAddress`/`FieldCity`,
  обоих Vue-скинов. `createDaDataProvider`/`AddressProvider` (`@letar/forms-core/address`) уже
  framework-agnostic (существовали до Фазы 9) — порт не потребовался вовсе, Vue-специфика только
  в debounce/click-outside/клавиатурной навигации. `FieldAddress` возвращает `AddressValue`
  (`{value, data?}`) либо строку при `valueOnly`; `FieldCity` — только строку, с извлечением
  названия города из `data.city`/`data.settlement`.
- И `useSignatureField`, и `useAddressSuggestions` вызываются один раз в `setup()`, не в
  render-замыкании `withFieldValidation` — тот же принцип, что у `usePinInputField`/
  `useMaskField`: composable с `ref()` внутри теряет стабильную идентичность состояния при вызове
  на каждый рендер. Запись значения — через `form.setFieldValue` напрямую, не `field.handleChange`
  (composable не имеет доступа к `field` из render-замыкания).
- Тесты — `app-form.spec.ts`, блок «Этап 5 (часть 2)»: рендер трёх полей, переключение
  draw/typed-режима подписи, рисование на canvas + очистка (canvas 2D-контекст замокан — jsdom
  его не реализует), ввод запроса адреса/города через мок-провайдер, выбор подсказки.
- Проверено: `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-vue,@letar/forms-vue-shadcn`
  зелёный на обоих пакетах.

## 0.7.0 (2026-08-13)

Фаза 9, Этап 5 (часть 1) — 4 из 8 «тяжёлых» peer-dep полей: `FieldPinInput`, `FieldOTPInput`,
`FieldColorPicker`, `FieldFileUpload`. Итог: 36 полей (было 32). Скоуп этой части ограничен
намеренно — только поля без тяжёлых внешних зависимостей; `RichText` (Tiptap), `Signature`
(canvas), `Address`/`City` (DaData) — в следующей части Этапа 5.

- Общий composable `usePinInputField` (`@letar/forms-vue/core`) — обработчики ввода/backspace/
  paste для N однобуквенных ячеек, переиспользован `FieldPinInput` и `FieldOTPInput`, а также
  `forms-vue-shadcn`. Экспортирует и чистый хелпер `splitPinChars(value, count)`.
- `FieldColorPicker` — Vue-идиоматичное упрощение относительно Chakra-версии: нативный
  `<input type="color">` вместо Ark UI compound `ColorPicker.Root` (area/hue/alpha слайдеры) —
  браузерный пикер уже даёт то же самое бесплатно. Плюс hex-инпут и палитра свотчей.
- `FieldFileUpload` — нативный `<input type="file">` + drag&drop-зона, безопасность файлов через
  `processFileWithSecurity` (`@letar/forms-core/security`) напрямую, порт не потребовался
  (framework-agnostic).
- **Находка:** `form.getFieldValue`/`form.setFieldValue` не являются Vue-реактивным источником —
  `computed(() => splitPinChars(getValue(), count))` внутри composable не обновлялся при вводе.
  Фикс — рендерить из `field.state.value` (реактивный объект внутри `withFieldValidation`), а не
  из значения, прочитанного через `getValue()`. Composable оставляет `getValue()` только для
  синхронного чтения внутри обработчиков событий (не завязано на реактивность рендера).
- Тесты — `app-form.spec.ts`, блок «Этап 5 (часть 1)»: рендер всех 4 полей, ввод/фокус/backspace
  PIN-ячеек, таймер повторной отправки OTP, выбор свотча, добавление/удаление файла.
- Проверено: `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-vue,@letar/forms-vue-shadcn`
  зелёный на обоих пакетах.

## 0.6.0 (2026-08-13)

Фаза 9, Этап 3 (продолжение) — `FieldCreditCard` (compound-поле, отложено с основного захода
Этапа 3). Итог: 32 поля (было 31).

- Общий composable `useCreditCardField` (`@letar/forms-vue/core`) — форматирование номера/срока/CVC,
  Luhn-валидация, автопереход фокуса между подполями. Переиспользуется `forms-vue-shadcn`, только
  разметка своя в каждом пакете (тот же принцип, что у `useMaskField`).
- `cardBrandIcon` (`@letar/forms-vue/core`) — Vue-порт React `card-brand-icon.tsx` (Visa/Mastercard/
  Amex/МИР inline SVG), тоже общий для обоих скинов.
- Поле не участвует в Zod-валидации через `withFieldValidation` — это составной виджет с тремя
  subfields (`.number`/`.expiry`/`.cvc`), пишет напрямую через `form.setFieldValue`, как и обе
  React-версии (`@letar/forms`, `forms-shadcn`).
- Тесты — `app-form.spec.ts`, блок «Этап 3 (продолжение)»: форматирование номера + определение
  бренда, Luhn-валидация на blur, smart month + автопереход к CVC, ограничение длины CVC по бренду.
- Проверено: `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-vue,@letar/forms-vue-shadcn`
  зелёный.

## 0.5.1 (2026-08-13)

Рефакторинг без изменения публичного API: `formatDate`/`getPresetRange` (`field-date-range.ts`),
`parseDateTime`/`combineDateTime` (`field-datetime-picker.ts`), `minutesToHHMM`/`hhmmToMinutes`
(`field-duration.ts`) дублировались дословно с `forms-vue-shadcn` — вынесены в
`@letar/forms-core/field-widgets`. Типы `DateRangeValue`/`DateRangePreset` по-прежнему
реэкспортируются из `field-date-range.ts`, чтобы не ломать существующие импорты.

## 0.5.0 (2026-08-13)

Фаза 9, Этап 4 — дата/число-виджеты (5 новых полей): `FieldDateRange`, `FieldDateTimePicker`,
`FieldDuration`, `FieldSlider`, `FieldRating`.

- **Находка на входе в этап:** исходный план предполагал предварительное сравнение
  Vue-библиотек дат (`@vuepic/vue-datepicker` vs `v-calendar`) перед реализацией. При чтении
  React-исходников (`forms-shadcn/field-date-range.tsx`, `field-datetime-picker.tsx`) оказалось,
  что ни одно из пяти полей группы не использует внешнюю библиотеку дат вовсе — все пять
  собраны на нативных `<input type="date"/"time">` + уже существующем `NumberInput` +
  `<input type="range">`/иконках звёзд. Сравнение библиотек снято с повестки как основанное на
  неверной посылке, не отложено.
- `FieldDateRange` — два `<input type="date">` (start/end) + опциональный ряд кнопок-пресетов
  (`today`/`yesterday`/`thisWeek`/`lastWeek`/`thisMonth`/`lastMonth`/`thisYear`), без
  выпадающего меню — тот же выбор, что у React-версии.
- `FieldDateTimePicker` — `<input type="date">` + `<input type="time">` рядом, значение —
  строка ISO (`YYYY-MM-DDTHH:MM:00`).
- `FieldDuration` — значение в минутах, два формата: `HH:MM` (два `<input type="number">`,
  по умолчанию) и `minutes` (один).
- `FieldSlider` — голый `<input type="range">` (headless-пакет без UIKit-абстракции, в отличие
  от Reka-скина).
- `FieldRating` — ряд кнопок-звёзд на текстовых символах `★`/`☆` (без иконки-либы в headless).
- Итог: 31 поле (было 26).
- Тесты — `app-form.spec.ts`, блок «Этап 4»: рендер контролов всех пяти полей, пресет
  `DateRange`, комбинирование даты+времени, сложение часов/минут `Duration`, обновление
  значения `Slider`, выбор звезды `Rating`.
- Проверено: `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-vue,@letar/forms-vue-shadcn`
  зелёный.

## 0.4.0 (2026-08-13)

Фаза 9, Этап 3 — маски/документы через `@letar/forms-core/mask` (10 новых полей).

- **Новый composable `useMaskField`** (`src/lib/core/use-mask-field.ts`, экспорт через
  `@letar/forms-vue/core`) — Vue-аналог React `useMaskField` (`forms-react`). Оборачивает
  `MaskController`/`format`/`unformat` из `forms-core/mask`. `'live'`-режим рендерит
  **неконтролируемый** `<input>` (`inputRef`, без `value`/`onInput` в vnode-данных) — DOM
  источник истины, `MaskController` пишет напрямую через `setRangeText`; `'blur'`/`'off'` —
  обычный контролируемый `<input>`. **Обязательно вызывать один раз в `setup()`**, не в
  render-замыкании — иначе `inputRef` терял бы идентичность между ре-рендерами и
  `MaskController` пересоздавался бы на каждое нажатие клавиши (в React ту же роль стабильности
  играет `useCallback` с зависимостями; в Vue её даёт сам `setup()`, выполняющийся один раз).
- **`createDocumentField(config)`** (`src/lib/fields/document-field-base.ts`) — фабрика
  документных полей, Vue-аналог `libs/forms-shadcn/.../document-field-base.tsx`.
- **10 новых полей:** `FieldMaskedInput` (маска общего назначения, WCAG 3.3.2
  `formatDescription` обязателен), `FieldPassport`, `FieldINN` (`formatMode: 'off'` — длина
  переменная, 10/12 цифр), `FieldKPP`, `FieldOGRN`, `FieldSNILS`, `FieldBIK`, `FieldBankAccount`,
  `FieldCorrAccount`, `FieldPhone` (форматтер `forms-core/phone`, НЕ через `useMaskField` — тот
  же выбор, что в React `field-phone.tsx`, WebKit-safe чистый JS).
- Контрольные суммы (ИНН/КПП/ОГРН/СНИЛС/БИК) — `@letar/forms-core/validators/ru`, портированы
  1:1 из React `document-field-base.tsx`-полей.
- Итог: 26 полей в headless-пакете (было 16). `FieldCreditCard` — компаунд-поле без
  `useMaskField` (форматтеры `forms-core/credit-card`) — сознательно отложено на отдельный заход,
  не входит в Этап 3.
- Тесты — `src/lib/app-form.spec.ts`, блок «Этап 3»: живое форматирование `FieldPassport`/
  `FieldMaskedInput` через реальный `MaskController` (не мок — `setValue()` из
  `@vue/test-utils` идёт по пути `commitFullReplace`, см. `controller.ts`), ошибка валидации
  `FieldINN`/`FieldCorrAccount`, форматирование `FieldPhone`.

## 0.3.0 (2026-08-13)

Фаза 9, Этап 1 (продолжение) — 11 новых нативных HTML-полей поверх `@letar/forms-vue/core`,
имена файлов подобраны 1:1 с React-скином (`libs/forms/src/lib/declarative/form-fields/**`) —
требование координатора для будущего сопоставления примеров по диску в `apps/form-docs`
(P7).

- **Новые поля:** `FieldNumberInput` (min/max/step), `FieldPassword` (переключатель видимости,
  локальный `ref`), `FieldSwitch`, `FieldRadioGroup`, `FieldNativeSelect`, `FieldHidden`
  (не рендерит DOM, синхронизирует `value` через `watch`), `FieldYesNo` (два кликабельных
  блока), `FieldDate`, `FieldTime`, `FieldCurrency`, `FieldPercentage`.
- Поля с пропсами сверх `name`/`label`/`placeholder` (min/max/step/options) собраны напрямую
  через `resolveFieldMeta`/`withFieldValidation` (как `FieldSelect` до них), не через
  `createField` — тот же паттерн, не новая абстракция.
- Итог: 16 полей в headless-пакете (было 5).
- Тесты — `src/lib/app-form.spec.ts`, блок «Этап 1»: рендер меток/контролов всех 11 полей,
  переключение видимости пароля, клик по `YesNo`, выбор в `RadioGroup`.

## 0.2.0 (2026-08-13)

Фаза 9 (`libs/forms/PLAN.md`, тред `forms-vue-parity-phase9`), Этап 1 — начало паритета Vue-полей.
Архитектурное решение координатора: композиционный слой выделен в отдельный проверяемый подпуть.

- **Новый подпуть `@letar/forms-vue/core`** — `AppForm`, `createField`, `provideAppForm`,
  `useAppFormContext`, плюс новые `resolveFieldMeta`/`withFieldValidation`. Композиционная
  обвязка без единого конкретного поля — Vue-аналог роли `@letar/forms-react`. Корневой `.`
  экспорт не изменился (по-прежнему реэкспортирует всё, включая референсные HTML-поля).
- **ESLint-барьер** (`eslint.config.mjs`) запрещает файлам `src/core.ts`/`src/lib/core/**`
  импортировать что-либо из `src/lib/fields/**` — граница проверяемая, не на честном слове, тот
  же принцип, что уже защищает `forms-core`/`forms-react`.
- `resolveFieldMeta`/`withFieldValidation` — вынесены из `createField`, чтобы `forms-vue-shadcn`
  переиспользовал их вместо дублирования (было скопировано дословно в `createFieldPrimitives`).
- Физически: `app-form.ts`/`create-field.ts`/`form-context.ts` переехали в `src/lib/core/`;
  интеграционный тест (`AppForm` + все 5 полей вместе) остался в `src/lib/app-form.spec.ts` —
  он законно пересекает границу core/fields, поэтому не в `core/`.
- Публичное API `.` (корневого экспорта) не ломается — только добавление подпути.

Первый релиз — Фаза 7.8 `libs/forms/PLAN.md` (задача координатора форм `QuietRidge`, тред
`forms-phase7-3-shadcn`, письмо #58).

- `AppForm` — корневой компонент, `useForm` из `@tanstack/vue-form` + `provide`/`inject` контекста
  `{ form, schema }` полям.
- 5 полей: `FieldInput`, `FieldTextarea`, `FieldNumber`, `FieldCheckbox`, `FieldSelect`. Метки и
  плейсхолдеры читаются из `.meta({ ui: {...} })` через `@letar/forms-core/schema`
  (`getFieldMeta`) — тот же вызов, что использует React-скин.
- `createField(displayName, render)` — фабрика простых полей, Vue-эквивалент `createField` из
  `@letar/forms-react`.
- Валидация — `onChange` по `schema.shape[name]`, `@tanstack/vue-form` принимает Zod-схему
  напрямую (Standard Schema), без дополнительного адаптера.
- **Находка задачи:** `forms-core` не потребовал ни одного изменения — `getFieldMeta` и вся
  схемная часть уже были framework-agnostic. Граница DIP подтверждена.
- Тесты — vitest + `@vue/test-utils`, `libs/forms-vue/src/lib/app-form.spec.ts` (рендер меток из
  схемы, показ ошибки валидации, блокировка сабмита при невалидных данных, успешный сабмит,
  guard «поле вне `<AppForm>`»).
