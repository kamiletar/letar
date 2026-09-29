import { interpolate } from '@letar/forms-core/i18n'
import {
  applyOptionOverlay,
  CREATE_OPTION_VALUE,
  type CreatedOption,
  type FieldDeps,
  getOptionText,
  isCreateOptionValue,
  isOptionEditable,
  type LoadOptionsFn,
  type LoadSelectedFn,
  mergeCreatedOptions,
  type SelectionActionContext,
  type SettleErrorInfo,
  shouldOfferCreate,
  type UIKitOptionRenderState,
  type UpdatedOption,
} from '@letar/forms-core/uikit'
import {
  resolveFieldMeta,
  useAppFormContext,
  useDebounce,
  useFormGroup,
  usePromiseSearch,
  useRegisterFieldLabel,
  useSelectedLoader,
  useSelectionActionsState,
  withFieldValidation,
} from '@letar/forms-vue/core'
import { computed, defineComponent, h, onErrorCaptured, type PropType, ref, watch } from 'vue'
// Прямой импорт примитива, не через `rekaUIKit.Combobox`: `renderValue`/`resolveOption` — расширение
// контракта сверх `UIKitComboboxProps` (`RekaComboboxExtraProps`, см. `combobox.ts`), которого нет в
// `forms-core`, и `rekaUIKit.Combobox` типизирован строго по нему (excess property error).
// Тот же приём — прямой импорт `Combobox as ComboboxControl` — в React-скине (`field-combobox.tsx`)
import { Combobox } from '../uikit/primitives/combobox'
import type { UINode } from '../uikit/ui-node'
import { rekaUIKit } from '../uikit/uikit-reka'
import type { FieldSelectOption } from './field-select'
import { SelectionActionsProvider, SelectionOptionProvider } from './selection-context'
import { SelectCreateButton, SelectEditButton } from './selection-slots'
import { selectionStrings } from './selection-strings'
import { dependentHelperText, DependentLiveRegion, useDependentFieldUi } from './use-dependent-field-ui'

/**
 * `options` — тот же случай, что и `FieldSelect`: проп сверх контракта `createField`, поле
 * собрано напрямую по `useAppFormContext`. Фильтрация по подстроке — обязанность поля, не
 * примитива (`rekaUIKit.Combobox` ничего не фильтрует сам, см. `uikit/primitives/combobox.ts`).
 *
 * Источники опций (ровно один, Stage 4b): статичные `options` — фильтр на клиенте по подписи;
 * `loadOptions` (промис-путь: server action, `fetch`, SDK) — фильтрует сервер, поле дебаунсит
 * строку поиска, отменяет прошлый запрос и показывает «Повторить» при ошибке.
 *
 * Зависимость от других полей (`dependsOn`, §18, Этап 4d) — тот же `useDependentFieldUi`, что у
 * `Field.Select` (`field-select.ts`): пока родители не готовы, поле заблокировано (`disabled` у
 * примитива, `Combobox` в этом скине его уже поддерживал) с подсказкой вместо placeholder, правка
 * родителя чистит значение. `dependent.deps`/`depsKey` доходят до `usePromiseSearch`/
 * `useSelectedLoader`/`useSelectionActionsState` — смена родителя переинициализирует промис-путь
 * (§18.6: данные и созданные/отредактированные опции чужого родителя не остаются на экране) и не
 * путает кэш действий между родителями, а `loadSelected` продолжает искать запись по `value`
 * независимо от того, какой родитель сейчас выбран (кэш `useSelectedLoader` по `deps` не сбрасывается).
 *
 * ⚠️ Поле собрано напрямую по `FieldRoot`/`FieldLabel`/`FieldError` (как `field-select.ts`), не через
 * `FieldWrapper` (`../uikit/primitives`): `FieldWrapper` не принимает `helperText`/`describedBy` —
 * этого было достаточно, пока подсказке под полем взяться было неоткуда. Расширять `FieldWrapper`
 * ради одного потребителя рискованнее (он общий для всех простых полей `createField`), чем повторить
 * уже рабочую сборку из `field-select.ts`.
 *
 * Создание/правка записи справочника прямо из поля (`onCreate`/`onUpdate`, §16, Этап 4c) — тот же
 * конвейер `useSelectionActionsState`, что у `Field.Select` (`field-select.ts`): служебный пункт
 * «+ Добавить "<текст>"» в конце списка (подпись зависит от `inputValue`, не от отдельного поля
 * поиска — у Combobox «значение» и есть текст ввода), карандаш «Изменить» у пункта и у выбранного
 * значения, `pending`-опции приглушены и не выбираются (см. `combobox.ts`, `ComboboxItem.disabled`).
 * Правки согласованно обновляют и значение поля, и текст ввода (`syncedValue`) — тем же приёмом,
 * что уже даёт Stage 4a/4b для подписи `loadOptions`/`loadSelected`.
 */
const FieldComboboxBase = defineComponent({
  name: 'FieldCombobox',
  props: {
    name: { type: String, required: true },
    label: { type: String as PropType<string | undefined>, required: false, default: undefined },
    placeholder: { type: String as PropType<string | undefined>, required: false, default: undefined },
    /** Статичные опции. Ровно один источник опций — либо это, либо `loadOptions` */
    options: { type: Array as PropType<FieldSelectOption[] | undefined>, required: false, default: undefined },
    /** Своё содержимое пункта списка; примитив рисует вторую строку (`description`) сам, только без этого пропа */
    renderOption: {
      type: Function as PropType<(option: FieldSelectOption, state: UIKitOptionRenderState) => UINode>,
      required: false,
      default: undefined,
    },
    /**
     * Свой текст поля ввода для выбранного значения (аналог `renderValue` у `Field.Select`, но
     * результат — строка: у Combobox отдельного триггера нет, «значение» — это и есть текст поля
     * ввода). Примитив передаёт его в нативный `displayValue` Reka (см. `uikit/primitives/combobox.ts`),
     * пустой результат откатывается на текст опции (`textValue`/`label`)
     */
    renderValue: {
      type: Function as PropType<(option: FieldSelectOption) => string>,
      required: false,
      default: undefined,
    },
    /**
     * Промис-путь: записи по строке поиска (server action, `fetch`, SDK). Запрос уходит через
     * `debounce`, когда набрано `minChars` (по умолчанию 1) и список хоть раз открывали. Новый
     * запрос отменяет прошлый, применяется только последний ответ; при ошибке — «Не удалось
     * загрузить» и «Повторить», автоповторов нет
     */
    loadOptions: {
      type: Function as PropType<LoadOptionsFn<unknown> | undefined>,
      required: false,
      default: undefined,
    },
    /** Запись текущего значения, когда её нет в выдаче `loadOptions`; кэш на экземпляр поля */
    loadSelected: {
      type: Function as PropType<LoadSelectedFn<unknown> | undefined>,
      required: false,
      default: undefined,
    },
    /** Как запись `loadOptions`/`loadSelected` становится опцией — обязательны на промис-пути */
    getLabel: {
      type: Function as PropType<((item: unknown) => string) | undefined>,
      required: false,
      default: undefined,
    },
    getValue: {
      type: Function as PropType<((item: unknown) => string | number) | undefined>,
      required: false,
      default: undefined,
    },
    /** Строковая подпись записи, когда `getLabel` возвращает не то, что искать/показывать (typeahead, поле ввода) */
    getTextValue: {
      type: Function as PropType<((item: unknown) => string | undefined) | undefined>,
      required: false,
      default: undefined,
    },
    /** Вторая строка опции в списке — для записей `loadOptions` (статичные `options` несут свой `description`) */
    getDescription: {
      type: Function as PropType<((item: unknown) => string | undefined) | undefined>,
      required: false,
      default: undefined,
    },
    getDisabled: {
      type: Function as PropType<((item: unknown) => boolean | undefined) | undefined>,
      required: false,
      default: undefined,
    },
    getEditable: {
      type: Function as PropType<((item: unknown) => boolean | undefined) | undefined>,
      required: false,
      default: undefined,
    },
    /** Запись ещё не подтверждена сервером (оптимистичное обновление) — приглушена, не выбирается */
    getPending: {
      type: Function as PropType<((item: unknown) => boolean | undefined) | undefined>,
      required: false,
      default: undefined,
    },
    /** Минимум символов для запроса `loadOptions` (по умолчанию 1; `0` — с пустой строкой при открытии) */
    minChars: { type: Number as PropType<number | undefined>, required: false, default: undefined },
    /** Задержка перед запросом `loadOptions`, мс (по умолчанию 300) */
    debounce: { type: Number as PropType<number | undefined>, required: false, default: undefined },
    /** Ошибка `loadOptions`/`loadSelected` (отменённый запрос — не ошибка): лог или тост */
    onLoadError: {
      type: Function as PropType<((error: unknown) => void) | undefined>,
      required: false,
      default: undefined,
    },
    /** Создание новой записи справочника без ухода из формы (§16) — конвейер см. `useSelectionActionsState` */
    onCreate: {
      type: Function as PropType<
        ((search: string, ctx: SelectionActionContext) => Promise<CreatedOption | null>) | undefined
      >,
      required: false,
      default: undefined,
    },
    /** Правка опции на месте (карандаш) — тот же конвейер, что `onCreate` */
    onUpdate: {
      type: Function as PropType<
        ((option: FieldSelectOption, ctx: SelectionActionContext) => Promise<UpdatedOption | null>) | undefined
      >,
      required: false,
      default: undefined,
    },
    /** Отказ подтверждения оптимистичного действия; без обработчика — встроенное сообщение под полем */
    onSettleError: {
      type: Function as PropType<((info: SettleErrorInfo) => void) | undefined>,
      required: false,
      default: undefined,
    },
    /** Мс до признания оптимистичного действия неподтверждённым; по умолчанию 30 000 (`DEFAULT_SETTLE_TIMEOUT`) */
    settleTimeout: { type: Number as PropType<number | undefined>, required: false, default: undefined },
    /** Подпись служебного пункта «+ Добавить "<текст>"»; по умолчанию `«<createVerb>»` */
    createLabel: { type: String as PropType<string | undefined>, required: false, default: undefined },
    /** `false` прячет служебный пункт создания, оставляя саму возможность вызвать `Field.Combobox.CreateButton` вручную */
    createItem: { type: Boolean as PropType<boolean | undefined>, required: false, default: undefined },
    /** Подвал списка (обычно `Field.Combobox.CreateButton`) — для своего `renderOption` без встроенного пункта создания */
    listFooter: { type: null, required: false, default: undefined },
    /** Путь(и) родительского поля(ей) — поле блокируется, пока родитель(и) не заполнены (§18) */
    dependsOn: { type: [String, Array] as PropType<string | readonly string[]>, required: false, default: undefined },
    /** Родитель считается заполненным, если вернуть `false` — по умолчанию проверка на непустое значение */
    depsReady: { type: Function as PropType<(deps: FieldDeps) => boolean>, required: false, default: undefined },
    /** Очищать своё значение при смене родителя; по умолчанию `true` при наличии `dependsOn` */
    clearOnParentChange: { type: Boolean as PropType<boolean | undefined>, required: false, default: undefined },
    /** Блокировать управление, пока родитель(и) не готовы; по умолчанию `true` при наличии `dependsOn` */
    disableWhenParentEmpty: { type: Boolean as PropType<boolean | undefined>, required: false, default: undefined },
    /** Свой текст в заблокированном поле вместо автоматической подсказки «Сначала выберите «…»» */
    placeholderWhenDisabled: { type: String as PropType<string | undefined>, required: false, default: undefined },
  },
  setup(props) {
    const { form, schema, dependents, labels } = useAppFormContext()
    const { fieldSchema, label, placeholder: metaPlaceholder, required, fullPath } = resolveFieldMeta(
      schema,
      props.name,
      props.label,
      props.placeholder,
    )
    const formGroup = useFormGroup()
    const placeholder = metaPlaceholder ?? 'Поиск...'
    const strings = selectionStrings

    // Видимая подпись поля — в общий реестр формы, чтобы дети, зависящие от этого поля
    // (`dependsOn`), могли показать «Сначала выберите «<эта подпись>»» (тот же приём, что в `field-select.ts`)
    useRegisterFieldLabel(labels, fullPath, () => label)

    const isPromise = computed(() => !!props.loadOptions)
    if (!props.options && !props.loadOptions) {
      console.error(
        `[@letar/forms-vue-shadcn] Form.Field.Combobox "${props.name}": нужен ровно один источник опций — `
          + `"options" (статичный список) или "loadOptions" (промис-путь). Не передан ни один`,
      )
    }

    const inputValue = ref('')
    // Промис-путь стартует, когда список хоть раз открывали: N полей на странице не шлют N запросов на монтировании
    const everOpened = ref(false)
    const markOpened = (open: boolean): void => {
      if (open) {
        everOpened.value = true
      }
    }
    const minChars = computed(() => props.minChars ?? (isPromise.value ? 1 : 0))
    const debouncedSearch = useDebounce(() => inputValue.value, () => props.debounce ?? 300)

    // Снимок значений всей формы — источник для `dependsOn` (родительские поля читаются по имени
    // из общего дерева, не из этого поля), тот же приём, что в `field-select.ts`
    const valuesRef = form.useStore((state: { values: Record<string, unknown> }) => state.values)

    const dependent = useDependentFieldUi<FieldDeps>({
      fullPath,
      label,
      groupPath: () => formGroup?.name ?? null,
      values: () => valuesRef.value,
      schema,
      labels,
      dependents,
      setValue: (value) => form.setFieldValue(fullPath, value),
      dependsOn: () => props.dependsOn,
      depsReady: props.depsReady,
      clearOnParentChange: props.clearOnParentChange,
      disableWhenParentEmpty: props.disableWhenParentEmpty,
      placeholderWhenDisabled: props.placeholderWhenDisabled,
    })

    const promiseSearch = usePromiseSearch<unknown, FieldDeps>({
      loadOptions: props.loadOptions,
      search: () => debouncedSearch.value,
      // Запрос уходит, когда родители готовы, список открывали и набран порог `minChars`
      enabled: () =>
        dependent.state.ready.value
        && everOpened.value
        && inputValue.value.length >= minChars.value
        && debouncedSearch.value.length >= minChars.value,
      onLoadError: props.onLoadError,
      // Смена родителя — другой список: прежние данные скрываются немедленно (§18.6), см. `usePromiseSearch`
      deps: () => dependent.deps.value,
      depsKey: () => dependent.state.depsKey.value,
    })

    // Снимок значения поля вне render-замыкания (как `fieldValueRef` у `FieldSelect`) — нужен и для
    // `loadSelected`, и для распознавания «в поле ввода подпись выбранного значения, не поиск» ниже
    const fieldValueRef = form.useStore((state: { values: Record<string, unknown> }) => {
      const parts = fullPath.split('.')
      let value: unknown = state.values
      for (const part of parts) {
        value = value && typeof value === 'object' ? (value as Record<string, unknown>)[part] : undefined
      }
      return value as string | undefined
    })
    const valueKey = computed(() => (fieldValueRef.value ? String(fieldValueRef.value) : ''))

    const toOption = (item: unknown): FieldSelectOption | undefined => {
      const { getLabel, getValue } = props
      if (item === undefined || item === null || !getLabel || !getValue) {
        return undefined
      }
      return {
        label: getLabel(item),
        textValue: props.getTextValue?.(item),
        description: props.getDescription?.(item),
        value: String(getValue(item)),
        disabled: props.getDisabled?.(item),
        editable: props.getEditable?.(item),
        pending: props.getPending?.(item),
        data: item,
      }
    }

    // Опции приложения без фильтра: статичные `options` или записи `loadOptions`
    const sourceOptions = computed<FieldSelectOption[]>(() => {
      if (props.options) {
        return props.options
      }
      const data = promiseSearch.data.value
      if (!data) {
        return []
      }
      return data.map((item) => toOption(item)).filter((opt): opt is FieldSelectOption => opt !== undefined)
    })

    // Действия (`onCreate`/`onUpdate`, §16, Этап 4c) — тот же конвейер, что `Field.Select`
    // (`field-select.ts`): `pending`, наложение правок, созданные опции. Работает поверх
    // `sourceOptions` независимо от того, откуда они пришли — статичный список или `loadOptions`
    const actions = useSelectionActionsState({
      appOptions: () => sourceOptions.value,
      value: () => fieldValueRef.value,
      onSettleError: props.onSettleError,
      settleTimeout: props.settleTimeout,
      // Другой родитель — другой список (§18.6): созданные опции и наложение правок относились
      // к списку прежнего родителя и сбрасываются при смене `depsKey`, см. `useSelectionActionsState`
      deps: () => dependent.deps.value,
      depsKey: () => dependent.state.depsKey.value,
    })

    // Правки лежат поверх опций приложения; опция приложения сильнее созданной с тем же значением
    const mergedOptions = computed<FieldSelectOption[]>(() => {
      // Пока свой оптимистичный create в полёте, `pending`-опции приложения скрыты: почти всегда это
      // та же запись (§16.7), иначе в списке была бы запись дважды
      const shownApp = actions.hasOwnCreatePending.value
        ? sourceOptions.value.filter((opt) => !opt.pending)
        : sourceOptions.value
      const edited = applyOptionOverlay(shownApp, actions.overlay.value)
      const createdAsOptions: FieldSelectOption[] = actions.createdOptions.value.map((opt) => ({
        ...opt,
        value: String(opt.value),
      }))
      return mergeCreatedOptions<FieldSelectOption>(edited, createdAsOptions)
    })

    // `loadSelected`: значение непустое и его нет в текущей выдаче (уже с учётом правок/созданных опций —
    // только что созданная запись не должна ходить за собственной же подписью)
    const valueInResults = computed(() => mergedOptions.value.some((opt) => opt.value === valueKey.value))
    const selectedLoader = useSelectedLoader<unknown, FieldDeps>({
      loadSelected: props.loadSelected,
      value: () => valueKey.value,
      enabled: () => !valueInResults.value,
      onLoadError: props.onLoadError,
      // Кэш записи — по `value` (идентификаторы уникальны между родителями), смена родителя его не сбрасывает
      deps: () => dependent.deps.value,
    })
    // Запись из `loadSelected` — вне списка (сервер её не выдавал), только для подписи поля ввода
    const selectedSourceOption = computed<FieldSelectOption | undefined>(() => toOption(selectedLoader.data.value))

    // Текст поля ввода для опции — свой `renderValue`, иначе текст опции (`textValue`/`label`)
    const getValueText = (opt: FieldSelectOption) => props.renderValue?.(opt) || getOptionText(opt)

    // Reka сама подставляет подпись выбранного значения в поле ввода (`displayValue`, `combobox.ts`),
    // но следит только за сменой самого значения (`watch(rootContext.modelValue)`) — если в момент
    // этой смены запись ещё не загружена (`loadOptions`/`loadSelected` в полёте), подпись не появится
    // сама, когда ответ придёт позже. Синхронизация здесь — тот же приём, что `syncedValueRef` в
    // React-скине (`field-combobox.tsx`): не перебивает уже набранный пользователем текст
    const syncedValue = ref<string | undefined>(undefined)
    watch(
      () => [valueKey.value, mergedOptions.value, selectedSourceOption.value] as const,
      ([key]) => {
        if (!key) {
          syncedValue.value = undefined
          return
        }
        // Пока запись не пришла, Reka уже подставила в поле сырое значение (`displayValue`
        // без найденной опции возвращает `String(value)`, см. `combobox.ts`) — это не набранный
        // пользователем текст, поэтому не считается «уже показанным» и не блокирует замену
        if (
          syncedValue.value === key || (syncedValue.value === undefined && inputValue.value && inputValue.value !== key)
        ) {
          return
        }
        const found = mergedOptions.value.find((opt) => opt.value === key)
          ?? (selectedSourceOption.value?.value === key ? selectedSourceOption.value : undefined)
        if (found) {
          syncedValue.value = key
          inputValue.value = getValueText(found)
        }
      },
      { immediate: true },
    )

    const filteredOptions = computed(() => {
      const base = mergedOptions.value
      if (isPromise.value) {
        // Промис-путь: выдачу уже отфильтровал сервер — локально фильтруем только опции, созданные
        // этим полем (`onCreate`): сервер о них не знает, но список не должен показывать созданную
        // запись, если пользователь уже печатает что-то другое
        const createdValues = new Set(actions.createdOptions.value.map((opt) => String(opt.value)))
        const needle = inputValue.value.toLowerCase()
        return base.filter((opt) =>
          !createdValues.has(opt.value) || !needle || opt.label.toLowerCase().includes(needle)
        )
      }
      const needle = inputValue.value.toLowerCase()
      if (!needle) {
        return base
      }
      // В поле подпись выбранного значения (Reka выставляет её сама через `displayValue`,
      // см. `combobox.ts`), а не активный поисковый запрос — список показываем целиком, как в
      // React-скине (`field-combobox.tsx`, `matchedOptions`): иначе подпись фильтрует список сама
      // на себя и прячет остальные опции сразу после открытия
      const currentValue = fieldValueRef.value || undefined
      const selected = currentValue !== undefined ? base.find((opt) => opt.value === currentValue) : undefined
      if (selected && inputValue.value === getValueText(selected)) {
        return base
      }
      return base.filter((opt) => opt.label.toLowerCase().includes(needle))
    })

    // Опция по значению (после наложения правок/созданных) — для `optionContext` (карандаш) и `renderOption`
    const optionByValue = computed(() => {
      const map = new Map<string, FieldSelectOption>(mergedOptions.value.map((opt) => [opt.value, opt]))
      if (selectedSourceOption.value) {
        map.set(selectedSourceOption.value.value, selectedSourceOption.value)
      }
      return map
    })

    // Служебный пункт «+ Добавить "<текст>"» — подпись зависит от текста поля ввода (не от отдельного
    // поля поиска, как у Select): у Combobox «значение» и есть текст, набранный пользователем
    const showCreateItem = computed(() => !!props.onCreate && props.createItem !== false)

    const renderError = ref<Error | null>(null)
    onErrorCaptured((error) => {
      renderError.value = error instanceof Error ? error : new Error(String(error))
      console.error(`[@letar/forms-vue-shadcn] Ошибка в поле "${props.name}":`, error)
      return false
    })

    return () => {
      if (renderError.value) {
        return rekaUIKit.ErrorFallback({ fieldName: props.name, message: renderError.value.message })
      }

      return withFieldValidation(form, fullPath, fieldSchema, (field, hasError, errorMessage) => {
        const formValue = (field.state.value as string | undefined) || undefined
        // Оптимистично созданная запись показана выбранной, пока форма хранит прежнее значение (§16.7)
        const value = actions.pendingSelection.value ?? formValue
        const loadError = promiseSearch.error.value
        const hasOnUpdate = !!props.onUpdate
        const createVerb = props.createLabel ?? strings.createVerb

        // Поле заблокировано `dependsOn` (§18) — родители ещё не готовы: свои действия и правка недоступны
        const blocked = dependent.blocked.value
        const effectivePlaceholder = blocked ? dependent.blockedPlaceholder.value : placeholder
        const { helperText, describedBy } = dependentHelperText(dependent, hasError)

        // Служебный пункт создания — в конце отфильтрованного списка; проверка дублей — по ПОЛНОМУ
        // (не отфильтрованному) списку, как у Select (`shouldOfferCreate`)
        const search = inputValue.value.trim()
        const offerCreate = showCreateItem.value
          && shouldOfferCreate(search, mergedOptions.value.map((opt) => getOptionText(opt)))
        const createItemLabel = offerCreate ? `+ ${createVerb} "${search}"` : ''
        const optionsWithCreate = createItemLabel
          ? [...filteredOptions.value, { label: createItemLabel, value: CREATE_OPTION_VALUE }]
          : filteredOptions.value

        // Ошибки `onCreate`/`onUpdate` — забота приложения: всплывают как unhandled rejection (та же политика, что в Select)
        const runCreate = () => {
          const onCreate = props.onCreate
          if (!onCreate) {
            return
          }
          // Текст ввода до действия: отказ оптимистичного create возвращает поле в него
          const previousText = inputValue.value
          actions.run({
            scope: 'option',
            kind: 'create',
            call: (ctx) => onCreate(search, ctx),
            onOptimistic: (preview) => {
              inputValue.value = preview.label
            },
            onRevert: () => {
              inputValue.value = previousText
            },
            apply: (created, info) => {
              actions.addCreatedOption(created)
              // Выбор пользователя, сделанный за время ожидания, подтверждение не перебивает
              if (info.optimistic && !info.selectionHeld) {
                return
              }
              syncedValue.value = String(created.value)
              field.handleChange(String(created.value))
              inputValue.value = created.label
              // Промис-путь: внешнего кэша, который обновил бы список, нет — запрашиваем текущий поиск заново
              if (props.loadOptions) {
                promiseSearch.reload()
              }
            },
          })
        }

        const runEdit = (option: unknown, scope: 'option' | 'value') => {
          const onUpdate = props.onUpdate
          const source = option as FieldSelectOption
          if (!onUpdate) {
            return
          }
          const fromValue = source.value
          // Выбрана ли запись СЕЙЧАС: значение читаем живым — за время оптимистичного ожидания оно могло измениться
          const isSelectedNow = () => {
            const live = form.getFieldValue(fullPath) as string | undefined
            return !!live && String(live) === fromValue
          }
          actions.run({
            scope,
            kind: 'edit',
            fromValue,
            call: (ctx) => onUpdate(source, ctx),
            // Правят выбранное: поле ввода показывает новую подпись сразу, не дожидаясь сервера
            onOptimistic: (preview) => {
              if (isSelectedNow()) {
                inputValue.value = preview.label
              }
            },
            apply: (result) => {
              actions.recordEdit(fromValue, result)
              if (props.loadOptions) {
                promiseSearch.reload()
              }
              selectedLoader.invalidate(fromValue)
              // Замена записи (другой value): выбранное переезжает на новую. Тот же value — форма не dirty
              if (isSelectedNow()) {
                if (String(result.value) !== fromValue) {
                  syncedValue.value = String(result.value)
                  field.handleChange(String(result.value))
                  inputValue.value = result.label
                } else {
                  inputValue.value = result.label
                }
              }
            },
          })
        }

        const optionContext = (key: string, scope: 'option' | 'value') => {
          const source = optionByValue.value.get(key)
          return {
            option: source,
            text: source ? getOptionText(source) : '',
            editable: !!source && isOptionEditable(source, hasOnUpdate),
            scope,
          }
        }

        const actionsValue = {
          pending: actions.pending.value,
          canCreate: !!props.onCreate,
          hasOnUpdate,
          interactive: !blocked,
          search,
          runCreate,
          runEdit,
          strings: {
            edit: strings.edit,
            editAria: (text: string) => `${strings.edit}: ${text}`,
            create: `+ ${createVerb}…`,
            createWithSearch: (text: string) => `+ ${createVerb} "${text}"`,
          },
        }

        const selectedSource = value !== undefined ? optionByValue.value.get(value) : undefined
        const showValueEdit = hasOnUpdate && !!selectedSource && isOptionEditable(selectedSource, true)

        return rekaUIKit.FieldRoot({
          invalid: hasError,
          required,
          disabled: blocked,
          children: [
            rekaUIKit.FieldLabel({ label, required }),
            h(SelectionActionsProvider, { value: actionsValue }, {
              default: () => [
                Combobox({
                  value,
                  inputValue: inputValue.value,
                  onInputChange: (next) => {
                    if (blocked) {
                      return
                    }
                    inputValue.value = next
                  },
                  onValueChange: (next) => {
                    if (blocked) {
                      return
                    }
                    if (next !== undefined && isCreateOptionValue(next)) {
                      // Служебный пункт: значение в форму не попадает
                      runCreate()
                      return
                    }
                    syncedValue.value = next
                    field.handleChange(next ?? '')
                  },
                  onOpenChange: markOpened,
                  disabled: blocked,
                  describedBy,
                  // Ошибка прячет данные: на экране «Не удалось загрузить», а не выдача прошлого поиска
                  options: loadError ? [] : optionsWithCreate,
                  loading: !!promiseSearch.isLoading.value || !!selectedLoader.isLoading.value,
                  // Обёртка, а не прямой проброс: примитив типизирован по `UIKitSelectOption<UINode>`
                  // (`label: UINode`), опции приложения — по `FieldSelectOption` (`label: string`);
                  // ищем исходную опцию приложения по значению и передаём её, как `optionByKey` в
                  // `field-select.ts` (там та же контравариантная нестыковка сигнатур)
                  renderOption: props.renderOption
                    ? (opt, state) => {
                      const source = optionByValue.value.get(opt.value)
                      return source ? props.renderOption!(source, state) : opt.label
                    }
                    : undefined,
                  // Свой `renderOption` — свои кнопки (`Field.Combobox.EditButton`); карандаш по умолчанию только без него
                  renderOptionActions: hasOnUpdate && !props.renderOption
                    ? (opt) =>
                      isCreateOptionValue(opt.value)
                        ? null
                        : h(SelectionOptionProvider, { value: optionContext(opt.value, 'option') }, {
                          default: () => [h(SelectEditButton)],
                        })
                    : undefined,
                  controlActions: showValueEdit && value !== undefined
                    ? h(SelectionOptionProvider, { value: optionContext(value, 'value') }, {
                      default: () => [h(SelectEditButton)],
                    })
                    : undefined,
                  listFooter: props.listFooter,
                  renderValue: props.renderValue
                    ? (opt) => {
                      const source = optionByValue.value.get(opt.value)
                      return source ? props.renderValue!(source) : ''
                    }
                    : undefined,
                  // Подпись выбранного значения, если записи нет в текущем отфильтрованном списке:
                  // либо она пришла из `loadSelected` (вне `options`), либо это только что
                  // созданная/отредактированная запись — `options` внутри примитива уже отфильтрован
                  // по тексту поиска и может не содержать её в момент пересчёта `displayValue`.
                  resolveOption: (rawValue) =>
                    optionByValue.value.get(rawValue)
                      ?? (selectedSourceOption.value?.value === rawValue ? selectedSourceOption.value : undefined),
                  loadError,
                  onRetryLoad: promiseSearch.reload,
                  loadingText: strings.loading,
                  loadErrorText: strings.loadError,
                  retryText: strings.retry,
                  placeholder: effectivePlaceholder,
                  'data-field-name': props.name,
                }),
                DependentLiveRegion(dependent),
              ],
            }),
            actions.settleFailure.value
              ? h(
                'p',
                { role: 'status', class: 'text-destructive mt-1 text-sm', 'data-settle-error': '' },
                interpolate(strings.settleError, { label: actions.settleFailure.value.label }),
              )
              : null,
            rekaUIKit.FieldError({ hasError, errorMessage, helperText }),
          ] as unknown as UINode,
        })
      })
    }
  },
})

/** Слоты `Form.Field.Combobox.EditButton` / `.CreateButton` — для своего `renderOption` */
export const FieldCombobox = Object.assign(FieldComboboxBase, {
  EditButton: SelectEditButton,
  CreateButton: SelectCreateButton,
})
