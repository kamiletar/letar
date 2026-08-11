'use client'

import type { AddressProvider } from '@letar/forms-core/address'
import type { FileSecurityConfig } from '@letar/forms-core/security'
import type { BaseFieldProps } from '@letar/forms-react'
import type { ReactNode } from 'react'
import type { ToolbarButton } from './rich-text-toolbar-config'

export type { BaseFieldProps }

/** Props for Form.Field.String (shadcn-скин). */
export interface StringFieldProps extends BaseFieldProps {
  /** Input type. Auto-detected from z.string().email()/url() */
  type?: 'text' | 'email' | 'password' | 'url' | 'tel'
  maxLength?: number
  minLength?: number
  pattern?: string
  autoComplete?: string
  inputMode?: 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url'
}

/** Props for Form.Field.Checkbox (shadcn-скин). */
export type CheckboxFieldProps = Omit<BaseFieldProps, 'placeholder'>

export interface SelectOption {
  label: ReactNode
  value: string | number
  disabled?: boolean
}

/**
 * Props for Form.Field.CascadingSelect (shadcn-скин). Значение — `string`.
 *
 * Портирован из Chakra-версии без изменений логики (загрузка опций по значению родительского
 * поля через `form.Subscribe`, сброс значения при смене родителя, disable пока родитель пуст).
 * Beta: generic-параметры `<TParent, TValue>` не портированы — только `string`/`string` (нет
 * нужды в дженериках для доказательства UIKit-контракта), рендер через `shadcnUIKit.Select`,
 * без спиннера загрузки (простой disabled-state триггера на время `loadOptions`).
 */
export interface CascadingSelectFieldProps extends BaseFieldProps {
  /** Имя родительского поля, от значения которого зависит список опций */
  dependsOn: string
  /** Загрузка опций по значению родительского поля */
  loadOptions: (parentValue: string | undefined) => Promise<SelectOption[]>
  /** Опции до выбора значения родителя (по умолчанию []) */
  initialOptions?: SelectOption[]
  /** Сбрасывать значение при смене родителя (по умолчанию true) */
  clearOnParentChange?: boolean
  /** Дизейблить поле, пока родитель пуст (по умолчанию true) */
  disableWhenParentEmpty?: boolean
  /** Показать clear-кнопку (по умолчанию — true если поле не required) */
  clearable?: boolean
  /** Placeholder, пока родитель пуст */
  placeholderWhenDisabled?: string
}

/** Props for Form.Field.Select (shadcn-скин). */
export interface SelectFieldProps extends BaseFieldProps {
  /** Options for selection. If not specified, taken from schema meta */
  options?: SelectOption[]
  /** Value type: 'string' (by default) or 'number' */
  valueType?: 'string' | 'number'
  /** Show clear button (auto-determined: true if optional, false if required) */
  clearable?: boolean
}

/** Props for Form.Field.Textarea (shadcn-скин). */
export interface TextareaFieldProps extends BaseFieldProps {
  rows?: number
  maxLength?: number
  autoComplete?: string
}

/** Props for Form.Field.Number (shadcn-скин). */
export interface NumberFieldProps extends Omit<BaseFieldProps, 'placeholder'> {
  min?: number
  max?: number
  step?: number
}

/**
 * Props for Form.Field.NumberInput (shadcn-скин). Как `Form.Field.Number`, но с видимыми
 * степпер-кнопками (increment/decrement).
 *
 * Beta-упрощение относительно Chakra-версии: без `formatOptions` (Intl-форматирование внутри
 * инпута), `allowMouseWheel`, `clampValueOnBlur` — только min/max/step с клампом при клике по
 * степпер-кнопкам (не при ручном вводе за пределы диапазона, как и у нативного
 * `<input type="number">`).
 */
export interface NumberInputFieldProps extends Omit<BaseFieldProps, 'placeholder'> {
  min?: number
  max?: number
  step?: number
}

export interface RadioOption {
  label: ReactNode
  value: string
  disabled?: boolean
}

/** Props for Form.Field.RadioGroup (shadcn-скин). */
export interface RadioGroupFieldProps extends Omit<BaseFieldProps, 'placeholder'> {
  options: RadioOption[]
}

/** Props for Form.Field.SegmentGroup (shadcn-скин). */
export interface SegmentGroupFieldProps extends Omit<BaseFieldProps, 'placeholder'> {
  options: RadioOption[]
}

/** Props for Form.Field.Date (shadcn-скин). Beta: нативный `<input type="date">`. */
export type DateFieldProps = BaseFieldProps

/** Props for Form.Field.Time (shadcn-скин). Beta: нативный `<input type="time">`. */
export interface TimeFieldProps extends BaseFieldProps {
  /** Минимальное время (`HH:MM`) */
  min?: string
  /** Максимальное время (`HH:MM`) */
  max?: string
  /** Шаг в секундах */
  step?: number
}

/** Props for Form.Field.NativeSelect (shadcn-скин). Label — только `string` (нативный `<option>`). */
export interface NativeSelectFieldProps extends BaseFieldProps {
  options: { label: string; value: string; disabled?: boolean }[]
}

/** Props for Form.Field.Switch (shadcn-скин). */
export type SwitchFieldProps = Omit<BaseFieldProps, 'placeholder'>

/** Props for Form.Field.YesNo (shadcn-скин). Значение — `boolean`. */
export interface YesNoFieldProps extends Omit<BaseFieldProps, 'placeholder'> {
  /** Текст кнопки "Да" (по умолчанию 'Да') */
  yesLabel?: string
  /** Текст кнопки "Нет" (по умолчанию 'Нет') */
  noLabel?: string
  /** Визуальный вариант (по умолчанию 'buttons') */
  variant?: 'buttons' | 'thumbs' | 'emoji'
}

/** Props for Form.Field.Slider (shadcn-скин). */
export interface SliderFieldProps extends Omit<BaseFieldProps, 'placeholder'> {
  min?: number
  max?: number
  step?: number
  /** Показать текущее значение рядом с меткой */
  showValue?: boolean
}

/** Props for Form.Field.Password (shadcn-скин). */
export interface PasswordFieldProps extends BaseFieldProps {
  maxLength?: number
  autoComplete?: string
  /** Показывать пароль открытым текстом по умолчанию */
  defaultVisible?: boolean
}

/** Требование к паролю для `Form.Field.PasswordStrength`. */
export type PasswordRequirement = 'minLength:8' | 'uppercase' | 'lowercase' | 'number' | 'special'

/**
 * Props for Form.Field.PasswordStrength (shadcn-скин).
 *
 * Портирован из Chakra-версии без изменений логики расчёта силы пароля (доля выполненных
 * требований × 100) — своя реализация цветной полосы прогресса вместо Chakra `Progress.Root`
 * (нет такого примитива в UIKit-контракте, простой `<div>` с шириной в процентах).
 */
export interface PasswordStrengthFieldProps extends BaseFieldProps {
  maxLength?: number
  autoComplete?: string
  /** Показывать пароль открытым текстом по умолчанию */
  defaultVisible?: boolean
  /** Список требований (по умолчанию — все 5) */
  requirements?: PasswordRequirement[]
  /** Показывать чеклист требований под полем (по умолчанию true) */
  showRequirements?: boolean
}

/**
 * Props for Form.Field.Combobox (shadcn-скин).
 *
 * Beta-упрощение: только статичные `options`, без `useQuery` (асинхронный поиск) и без
 * группировки — оба требуют больше инфраструктуры, чем нужно для доказательства контракта.
 * Фильтрация — по вхождению подстроки в `label` (регистронезависимо), на стороне поля.
 */
export interface ComboboxFieldProps extends BaseFieldProps {
  options: SelectOption[]
  /** Минимум символов для показа списка (по умолчанию 0 — показывать сразу) */
  minChars?: number
}

/**
 * Props for Form.Field.PinInput (shadcn-скин).
 *
 * Beta-упрощение: без вставки кода из буфера обмена одним действием (paste-across-boxes) —
 * только посимвольный ввод с автопереходом между ячейками.
 */
export interface PinInputFieldProps extends Omit<BaseFieldProps, 'placeholder'> {
  /** Число ячеек (по умолчанию 4) */
  length?: number
  /** Маскировать ввод как пароль */
  mask?: boolean
  /** Вызывается, когда заполнены все ячейки */
  onComplete?: (value: string) => void
}

/** Props for Form.Field.Rating (shadcn-скин). */
export interface RatingFieldProps extends Omit<BaseFieldProps, 'placeholder'> {
  /** Число звёзд (по умолчанию 5) */
  count?: number
}

/**
 * Props for Form.Field.Tags (shadcn-скин).
 *
 * Beta-упрощение: только Enter добавляет тег (нет `delimiter`/`addOnPaste` — вставка со
 * множественным разделителем не разбирается автоматически).
 */
export interface TagsFieldProps extends BaseFieldProps {
  /** Максимум тегов */
  maxTags?: number
  /** Минимальная длина тега (по умолчанию 1) */
  minTagLength?: number
}

/** Значение поля адреса. */
export interface AddressValue {
  /** Полная строка адреса */
  value: string
  /** Разобранные компоненты адреса (специфично для провайдера) */
  data?: Record<string, unknown>
}

/**
 * Props for Form.Field.Address (shadcn-скин).
 *
 * Beta-упрощение относительно Chakra-версии: нет клавиатурной навигации стрелками по списку
 * подсказок (`shadcnUIKit.Combobox` — общий примитив с `FieldCombobox`, только клик/Enter/Escape
 * самого Popover) и нет визуального спиннера внутри инпута.
 */
export interface AddressFieldProps extends BaseFieldProps {
  /** Провайдер подсказок адреса (рекомендуется) */
  provider?: AddressProvider
  /** DaData API token (обратная совместимость — создаёт DaData-провайдер внутри) */
  token?: string
  /** Минимум символов перед поиском (по умолчанию 3) */
  minChars?: number
  /** Задержка debounce в мс (по умолчанию 300) */
  debounceMs?: number
  /** Ограничить конкретными локациями (регион, город) */
  locations?: Array<{ region?: string; city?: string }>
  /** Возвращать только строку (по умолчанию false — возвращает AddressValue) */
  valueOnly?: boolean
}

/**
 * Props for Form.Field.City (shadcn-скин). Значение — простая строка (имя города).
 *
 * Beta: значение поля обновляется только через выбор подсказки или полное стирание текста —
 * без сохранения набранного вручную текста на `blur` (см. JSDoc `field-city.tsx`).
 */
export interface CityFieldProps extends BaseFieldProps {
  /** Провайдер подсказок адреса (рекомендуется) */
  provider?: AddressProvider
  /** DaData API token (обратная совместимость — создаёт DaData-провайдер внутри) */
  token?: string
  /** Минимум символов перед поиском (по умолчанию 2) */
  minChars?: number
  /** Задержка debounce в мс (по умолчанию 300) */
  debounceMs?: number
}

/**
 * Props for Form.Field.Likert (shadcn-скин). Значение — `number` (1-based индекс точки).
 *
 * Портирован из Chakra-версии без изменений логики. Beta: одна разметка на все брейкпоинты
 * (горизонтальный ряд с `flex-wrap`), без отдельного мобильного вертикального вида — Chakra-версия
 * рендерила два независимых DOM-дерева (`display: none` на разных брейкпоинтах), здесь один и
 * тот же ряд переносится сам через `flex-wrap`.
 */
export interface LikertFieldProps extends Omit<BaseFieldProps, 'placeholder'> {
  /** Текстовые якоря — по одному на каждую точку шкалы */
  anchors: string[]
  /** Показывать номера точек (по умолчанию false) */
  showNumbers?: boolean
}

/** Значение поля диапазона дат. */
export interface DateRangeValue {
  start: string
  end: string
}

/** Пресеты быстрого выбора диапазона. */
export type DateRangePreset = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear'

/**
 * Props for Form.Field.DateRange (shadcn-скин).
 *
 * Beta-упрощение относительно Chakra-версии: пресеты — ряд кнопок, а не выпадающее меню
 * (нет `@radix-ui/react-dropdown-menu` в peer-зависимостях).
 */
export interface DateRangeFieldProps extends BaseFieldProps {
  /** Лейбл начала диапазона (по умолчанию "С") */
  startLabel?: string
  /** Лейбл конца диапазона (по умолчанию "По") */
  endLabel?: string
  /** Минимальная дата (YYYY-MM-DD) */
  min?: string
  /** Максимальная дата (YYYY-MM-DD) */
  max?: string
  /** Кнопки быстрого выбора */
  presets?: DateRangePreset[]
  /** Ориентация полей начала/конца */
  orientation?: 'horizontal' | 'vertical'
}

/** Временной слот для `Form.Field.Schedule`. */
export interface ScheduleTimeSlot {
  open: string
  close: string
}

/** Расписание на день (`null` — выходной). */
export type ScheduleDaySchedule = ScheduleTimeSlot | null

/** Недельное расписание для `Form.Field.Schedule`. */
export interface WeeklySchedule {
  monday: ScheduleDaySchedule
  tuesday: ScheduleDaySchedule
  wednesday: ScheduleDaySchedule
  thursday: ScheduleDaySchedule
  friday: ScheduleDaySchedule
  saturday: ScheduleDaySchedule
  sunday: ScheduleDaySchedule
}

/** День недели — ключ `WeeklySchedule`. */
export type DayOfWeek = keyof WeeklySchedule

/**
 * Props for Form.Field.Schedule (shadcn-скин). Значение — `WeeklySchedule`.
 *
 * Портирован из Chakra-версии без изменений логики (toggle дня, изменение времени, копирование
 * понедельника на будни, проверка `close > open`). Переключатель дня — `@radix-ui/react-switch`
 * (тот же примитив, что `FieldSwitch`), время — нативные `<input type="time">`
 * (`NATIVE_INPUT_CLASS`, как у `FieldDateRange`/`FieldTime`).
 */
export interface ScheduleFieldProps extends Omit<BaseFieldProps, 'placeholder'> {
  /** Кастомные названия дней (локализация) */
  dayNames?: Partial<Record<DayOfWeek, string>>
  /** Расписание по умолчанию, когда значение пусто */
  defaultSchedule?: WeeklySchedule
  /** Какие дни показывать (по умолчанию — все 7) */
  days?: DayOfWeek[]
  /** Показывать кнопку «скопировать на будни» (по умолчанию true) */
  showCopyToWeekdays?: boolean
  /** Текст для состояния «выходной» (по умолчанию «Выходной») */
  offLabel?: string
  /** Текст кнопки копирования (по умолчанию «Скопировать Пн на будни») */
  copyToWeekdaysLabel?: string
  /** Время открытия по умолчанию при включении дня (по умолчанию '09:00') */
  defaultOpenTime?: string
  /** Время закрытия по умолчанию при включении дня (по умолчанию '18:00') */
  defaultCloseTime?: string
}

/** Props for Form.Field.Duration (shadcn-скин). Значение — число минут. */
export interface DurationFieldProps extends Omit<BaseFieldProps, 'placeholder'> {
  /** Формат отображения (по умолчанию "HH:MM") */
  format?: 'HH:MM' | 'minutes'
  /** Минимум минут (по умолчанию 0) */
  min?: number
  /** Максимум минут (по умолчанию 1440 — сутки) */
  max?: number
  /** Шаг минут (по умолчанию 15) */
  step?: number
}

/**
 * Props for Form.Field.DateTimePicker (shadcn-скин). Значение — строка ISO
 * (`YYYY-MM-DDTHH:MM:00`).
 */
export interface DateTimePickerFieldProps extends BaseFieldProps {
  /** Минимальные дата+время */
  minDateTime?: Date | string
  /** Максимальные дата+время */
  maxDateTime?: Date | string
  /** Шаг времени в минутах (по умолчанию 15) */
  timeStep?: number
}

/** Коды стран для маски телефона. */
export type PhoneCountry = 'RU' | 'US' | 'UK' | 'DE' | 'FR' | 'IT' | 'ES' | 'CN' | 'JP' | 'KR' | 'BY' | 'KZ' | 'UA'

/** Props for Form.Field.Phone (shadcn-скин). */
export interface PhoneFieldProps extends BaseFieldProps {
  /** Код страны для формата номера (по умолчанию 'RU') */
  country?: PhoneCountry
  /** Показывать флаг страны */
  showFlag?: boolean
  /** Возвращать значение без маски */
  autoUnmask?: boolean
}

/**
 * Props for Form.Field.Currency (shadcn-скин).
 *
 * Beta-упрощение: без живого Intl-форматирования значения внутри инпута при вводе — символ
 * валюты рядом с полем, не встроен в маску текста (Chakra-версия форматирует посимвольно через
 * `NumberInput.Root formatOptions`, у UIKit-контракта такого примитива нет).
 */
export interface CurrencyFieldProps extends BaseFieldProps {
  /** Код валюты (по умолчанию 'RUB') */
  currency?: string
  /** Стиль отображения валюты (по умолчанию 'symbol') */
  currencyDisplay?: 'symbol' | 'narrowSymbol' | 'code' | 'name'
  /** Минимальное значение */
  min?: number
  /** Максимальное значение */
  max?: number
  /** Шаг изменения (по умолчанию 0.01) */
  step?: number
}

/**
 * Props for Form.Field.Percentage (shadcn-скин). Значение хранится как есть (50 = 50%).
 */
export interface PercentageFieldProps extends BaseFieldProps {
  /** Минимальное значение (по умолчанию 0) */
  min?: number
  /** Максимальное значение (по умолчанию 100) */
  max?: number
  /** Шаг изменения (по умолчанию 1) */
  step?: number
}

/**
 * Props for Form.Field.Autocomplete (shadcn-скин).
 *
 * Beta: только статичные `suggestions`, без `useQuery` (Chakra-версия поддерживает
 * асинхронный поиск через ZenStack hooks — здесь не портировано).
 */
export interface AutocompleteFieldProps extends BaseFieldProps {
  /** Статичные подсказки */
  suggestions?: string[]
  /** Минимум символов перед показом подсказок (по умолчанию 1) */
  minChars?: number
}

export interface ListboxOption {
  label: ReactNode
  value: string | number
  disabled?: boolean
  /** Ключ группы — опции с одинаковым `group` рендерятся под общим заголовком */
  group?: string
}

/**
 * Props for Form.Field.Listbox (shadcn-скин). Все опции видны сразу (не выпадающий список).
 */
export interface ListboxFieldProps extends Omit<BaseFieldProps, 'placeholder'> {
  /** Опции списка */
  options: ListboxOption[]
  /** Режим выбора: одиночный (по умолчанию) или множественный */
  selectionMode?: 'single' | 'multiple'
}

/** Опция для `Form.Field.ImageChoice`. */
export interface ImageChoiceOption {
  value: string
  label: string
  image: string
  /** Описание под label */
  description?: string
}

/**
 * Props for Form.Field.ImageChoice (shadcn-скин). Grid карточек с изображениями (стили,
 * продукты, категории). Значение — `string` (single) или `string[]` (multiple).
 *
 * Портирован из Chakra-версии без изменений логики. `columns` — фиксированное число колонок на
 * `md`+ (Chakra-версия давала полноценный responsive `SimpleGrid`, здесь — Tailwind `grid-cols`
 * по брейкпоинту `md`, `sm`/`base` всегда 1/2 колонки).
 */
export interface ImageChoiceFieldProps extends Omit<BaseFieldProps, 'placeholder'> {
  options: ImageChoiceOption[]
  /** Число колонок на десктопе (по умолчанию 3) */
  columns?: number
  /** Множественный выбор (по умолчанию false) */
  multiple?: boolean
}

/** Опция для RadioCard/CheckboxCard — с описанием и иконкой. */
export interface RichOption {
  label: ReactNode
  value: string | number
  disabled?: boolean
  description?: ReactNode
  icon?: ReactNode
}

/**
 * Props for Form.Field.RadioCard (shadcn-скин).
 *
 * Beta: без `keyboardNavigation` (циклическая навигация стрелками) — Chakra-версия её
 * поддерживает опционально, здесь не портировано.
 */
export interface RadioCardFieldProps extends Omit<BaseFieldProps, 'placeholder'> {
  /** Опции карточек */
  options: RichOption[]
  /** Ориентация (по умолчанию 'horizontal') */
  orientation?: 'horizontal' | 'vertical'
}

/** Props for Form.Field.CheckboxCard (shadcn-скин). */
export interface CheckboxCardFieldProps extends Omit<BaseFieldProps, 'placeholder'> {
  /** Опции карточек */
  options: RichOption[]
  /** Ориентация (по умолчанию 'horizontal') */
  orientation?: 'horizontal' | 'vertical'
}

/**
 * Props for Form.Field.OTPInput (shadcn-скин).
 *
 * Beta: только числовой ввод — `type="alphanumeric"` из Chakra-версии не поддержан
 * (`inputMode="numeric"` зашит в `shadcnUIKit.PinInput`).
 */
export interface OTPInputFieldProps extends Omit<BaseFieldProps, 'placeholder'> {
  /** Число ячеек (по умолчанию 6) */
  length?: number
  /** Автосабмит формы при заполнении всех ячеек (по умолчанию false) */
  autoSubmit?: boolean
  /** Маскировать ввод как пароль */
  mask?: boolean
  /** Таймаут повторной отправки в секундах (по умолчанию 60) */
  resendTimeout?: number
  /** Колбэк повторной отправки кода — показывает кнопку/таймер, если задан */
  onResend?: () => Promise<void>
}

/**
 * Props for Form.Field.Editable (shadcn-скин).
 *
 * Beta: нет `showControls` (набор Edit/Cancel/Submit-кнопок из Chakra) и режимов активации
 * `dblclick`/`focus` — только `click` (по умолчанию) и `none`.
 */
export interface EditableFieldProps extends Omit<BaseFieldProps, 'placeholder'> {
  /** Плейсхолдер, когда пусто */
  placeholder?: string
  /** Многострочное редактирование через textarea (по умолчанию false) */
  multiline?: boolean
  /** Режим активации: клик (по умолчанию) или без активации (превью всегда в режиме ввода) */
  activationMode?: 'click' | 'none'
  /** Сохранять при потере фокуса (по умолчанию true) */
  submitOnBlur?: boolean
}

/** Точка штриха подписи. */
export interface StrokePoint {
  x: number
  y: number
}

/** Один штрих (от начала до конца жеста). */
export interface SignatureStroke {
  points: StrokePoint[]
}

/**
 * Props for Form.Field.Signature (shadcn-скин). Значение — data URI (`image/png` или
 * `image/svg+xml` base64).
 */
export interface SignatureFieldProps extends Omit<BaseFieldProps, 'placeholder'> {
  /** Placeholder поверх пустого canvas (по умолчанию «Подпишите здесь») */
  placeholder?: string
  /** Ширина canvas (по умолчанию 400) */
  width?: number
  /** Высота canvas (по умолчанию 150) */
  height?: number
  /** Цвет линии (по умолчанию 'black') */
  strokeColor?: string
  /** Толщина линии (по умолчанию 2) */
  strokeWidth?: number
  /** Фон canvas (по умолчанию 'white') */
  backgroundColor?: string
  /** Текст кнопки очистки (по умолчанию 'Очистить') */
  clearLabel?: string
  /** Разрешить typed mode (по умолчанию true) */
  allowTyped?: boolean
  /** Шрифт для typed mode */
  typedFont?: string
  /** Формат экспорта: 'png' (по умолчанию) или 'svg' */
  exportFormat?: 'png' | 'svg'
}

/**
 * Props for Form.Field.FileUpload (shadcn-скин). Значение — `File[]`.
 *
 * Beta: без Radix/Ark UI `FileUpload.Root` (нет такого примитива в контракте) — нативный
 * `<input type="file">` (скрытый) + drag&drop через нативные `onDragOver`/`onDrop` на
 * `variant="dropzone"`. Security-проверка (`@letar/forms-core/security`) портирована как есть —
 * framework-free, доступна обоим скинам.
 */
export interface FileUploadFieldProps extends Omit<BaseFieldProps, 'placeholder'> {
  /** Принимаемые типы файлов (атрибут `accept` инпута), например `"image/*"` или `".pdf,.doc"` */
  accept?: string
  /** Максимальный размер файла в байтах */
  maxFileSize?: number
  /** Максимум файлов (по умолчанию 1) */
  maxFiles?: number
  /** Вариант отображения (по умолчанию 'button') */
  variant?: 'button' | 'dropzone' | 'input'
  /** Показывать размер файла в списке */
  showSize?: boolean
  /** Разрешить удаление файлов из списка (по умолчанию true) */
  clearable?: boolean
  /** Текст в dropzone-варианте (по умолчанию «Перетащите файлы сюда») */
  dropzoneLabel?: string
  /** Описание под текстом dropzone */
  dropzoneDescription?: string
  /** Текст кнопки (для variant='button', по умолчанию «Загрузить файл») */
  buttonText?: string
  /** Placeholder для variant='input' */
  placeholder?: string
  /**
   * Конфигурация проверки безопасности файлов — размер, MIME по magic bytes, EXIF, переименование.
   * См. `FileSecurityConfig` из `@letar/forms-core/security`.
   */
  security?: FileSecurityConfig
}

/**
 * Props for Form.Field.ColorPicker (shadcn-скин).
 *
 * Beta: нативный `<input type="color">` вместо полного Ark UI `ColorPicker.Root` с областью
 * насыщенности/яркости и hue/alpha-слайдерами.
 */
export interface ColorPickerFieldProps extends Omit<BaseFieldProps, 'placeholder'> {
  /** Палитра быстрого выбора */
  swatches?: string[]
  /** Показывать hex-инпут (по умолчанию true) */
  showInput?: boolean
}

/**
 * Props for Form.Field.RichText (shadcn-скин).
 *
 * Beta: без `imageUpload`/`ImagePopover` (загрузка изображений на сервер) и без Popover-формы
 * для ссылок — кнопка `link` использует `window.prompt`. См. README `FieldRichText`.
 */
export interface RichTextFieldProps extends BaseFieldProps {
  /** Минимальная высота редактора (по умолчанию '150px') */
  minHeight?: string | number
  /** Максимальная высота редактора (со скроллом) */
  maxHeight?: string | number
  /** Показывать тулбар (по умолчанию true) */
  showToolbar?: boolean
  /** Кнопки тулбара (по умолчанию все, см. `DEFAULT_TOOLBAR_BUTTONS`) */
  toolbarButtons?: ToolbarButton[]
  /** Формат значения: 'html' или 'json' (по умолчанию 'html') */
  outputFormat?: 'html' | 'json'
}
