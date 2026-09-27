import { interpolate } from '@letar/forms-core/i18n'
import {
  applyOptionOverlay,
  CREATE_OPTION_VALUE,
  type CreatedOption,
  type FieldDeps,
  getOptionSearchText,
  getOptionText,
  isCreateOptionValue,
  isOptionEditable,
  mergeCreatedOptions,
  type SelectionActionContext,
  type SelectSearchable,
  type SettleErrorInfo,
  shouldOfferCreate,
  type UIKitOptionRenderState,
  type UIKitSelectControl,
  type UpdatedOption,
} from '@letar/forms-core/uikit'
import {
  resolveFieldMeta,
  useAppFormContext,
  useFormGroup,
  useRegisterFieldLabel,
  useSelectionActionsState,
  useSelectionSearch,
  withFieldValidation,
} from '@letar/forms-vue/core'
import { computed, defineComponent, h, onErrorCaptured, type PropType, ref } from 'vue'
import type { UINode } from '../uikit/ui-node'
import { rekaUIKit } from '../uikit/uikit-reka'
import { SelectionActionsProvider, SelectionOptionProvider } from './selection-context'
import { SelectCreateButton, SelectEditButton } from './selection-slots'
import { selectionStrings } from './selection-strings'
import { dependentHelperText, DependentLiveRegion, useDependentFieldUi } from './use-dependent-field-ui'

/**
 * Reka `SelectItem` запрещает `value=""` (пустая строка у `SelectRoot` — «сбросить выбор и
 * показать placeholder») и бросает ошибку при рендере. Опция «Все категории» со значением `''`
 * внутри примитива подменяется служебным токеном; наружу (в форму) всегда уходит настоящее `''`.
 */
const EMPTY_OPTION_TOKEN = '__letar_empty_option__'

export interface FieldSelectOption<TData = unknown> {
  value: string
  label: string
  /**
   * Строковая форма опции — поиск, подпись в поле ввода Combobox, когда `label` не даёт готового текста
   * (записи `loadOptions`/`loadSelected`, Stage 4b). Статичным опциям обычно не нужна: `label` уже строка
   */
  textValue?: string
  /** Вторая строка пункта списка (под `label`), как в shadcn-React-скине — не отображается в триггере */
  description?: string
  disabled?: boolean
  /** Вычисляется полем (`isOptionEditable`): получает ли пункт карандаш «Изменить» */
  editable?: boolean
  /** Запись ещё не подтверждена сервером (§16.7, оптимистичный `onCreate`): показана приглушённой, без выбора */
  pending?: boolean
  data?: TData
}

/**
 * `options` — проп, которого нет в контракте `createField` (`name`/`label`/`placeholder`),
 * поэтому поле, как и в headless `forms-vue`, собрано напрямую по `useAppFormContext`, не через
 * фабрику.
 */
const FieldSelectBase = defineComponent({
  name: 'FieldSelect',
  props: {
    name: { type: String, required: true },
    label: { type: String as PropType<string | undefined>, required: false, default: undefined },
    placeholder: { type: String as PropType<string | undefined>, required: false, default: undefined },
    options: { type: Array as PropType<FieldSelectOption[]>, required: true },
    clearable: { type: Boolean, required: false, default: undefined },
    /** Своё содержимое пункта списка; служебные пункты (создание) через рендерер не проходят */
    renderOption: {
      type: Function as PropType<(option: FieldSelectOption, state: UIKitOptionRenderState) => UINode>,
      required: false,
      default: undefined,
    },
    /** Своя подпись выбранного значения в триггере; пустой результат откатывается на текст опции */
    renderValue: {
      type: Function as PropType<(option: FieldSelectOption) => UINode>,
      required: false,
      default: undefined,
    },
    /** Подпись служебного пункта «+ Добавить…»; по умолчанию `«<createVerb>…»` */
    createLabel: { type: String, required: false, default: undefined },
    /** `false` прячет служебный пункт создания, оставляя саму возможность вызвать `Field.Select.CreateButton` вручную */
    createItem: { type: Boolean, required: false, default: undefined },
    /** Подвал списка (обычно `Field.Select.CreateButton`) — для своего `renderOption` без встроенного пункта создания */
    listFooter: { type: null, required: false, default: undefined },
    /** Создание новой записи справочника без ухода из формы (§16) — конвейер см. `useSelectionActionsState` */
    onCreate: {
      type: Function as PropType<
        (search: string, ctx: SelectionActionContext) => Promise<CreatedOption | null>
      >,
      required: false,
      default: undefined,
    },
    /** Правка опции на месте (карандаш) — тот же конвейер, что `onCreate` */
    onUpdate: {
      type: Function as PropType<
        (option: FieldSelectOption, ctx: SelectionActionContext) => Promise<UpdatedOption | null>
      >,
      required: false,
      default: undefined,
    },
    /** Отказ подтверждения оптимистичного действия; без обработчика — встроенное сообщение под полем */
    onSettleError: {
      type: Function as PropType<(info: SettleErrorInfo) => void>,
      required: false,
      default: undefined,
    },
    /** Мс до признания оптимистичного действия неподтверждённым; по умолчанию 30 000 (`DEFAULT_SETTLE_TIMEOUT`) */
    settleTimeout: { type: Number, required: false, default: undefined },
    /** Поиск по списку (§Stage 3c): `true`/`'auto'` — сам с 10-й опции, `false` — никогда, объект — точная настройка */
    searchable: { type: [Boolean, String, Object] as PropType<SelectSearchable>, required: false, default: undefined },
    /** Искать и по `description`, не только по `label`; по умолчанию `true`, как у остальных скинов */
    searchInDescription: { type: Boolean, required: false, default: true },
    /** Путь(и) родительского поля(ей) — поле блокируется, пока родитель(и) не заполнены (§18) */
    dependsOn: { type: [String, Array] as PropType<string | readonly string[]>, required: false, default: undefined },
    /** Родитель считается заполненным, если вернуть `false` — по умолчанию проверка на непустое значение */
    depsReady: { type: Function as PropType<(deps: FieldDeps) => boolean>, required: false, default: undefined },
    /** Очищать своё значение при смене родителя; по умолчанию `true` при наличии `dependsOn` */
    clearOnParentChange: { type: Boolean, required: false, default: undefined },
    /** Блокировать управление, пока родитель(и) не готовы; по умолчанию `true` при наличии `dependsOn` */
    disableWhenParentEmpty: { type: Boolean, required: false, default: undefined },
    /** Свой текст в заблокированном поле вместо автоматической подсказки «Сначала выберите «…»» */
    placeholderWhenDisabled: { type: String, required: false, default: undefined },
  },
  setup(props) {
    const { form, schema, dependents, labels } = useAppFormContext()
    const { fieldSchema, label, placeholder, required, fullPath } = resolveFieldMeta(
      schema,
      props.name,
      props.label,
      props.placeholder,
    )
    const formGroup = useFormGroup()

    const renderError = ref<Error | null>(null)
    onErrorCaptured((error) => {
      renderError.value = error instanceof Error ? error : new Error(String(error))
      console.error(`[@letar/forms-vue-shadcn] Ошибка в поле "${props.name}":`, error)
      return false
    })

    // Значение поля вне render-замыкания (`form.useStore`, Vue-идиоматичный путь той же подписки,
    // что `useStore(form.store, ...)` у React): нужно конвейеру действий — оптимистичный выбор
    // снимается, когда значение формы изменилось (§16.7), а это происходит между рендерами поля
    const fieldValueRef = form.useStore((state: { values: Record<string, unknown> }) => {
      const parts = fullPath.split('.')
      let value: unknown = state.values
      for (const part of parts) {
        value = value && typeof value === 'object' ? (value as Record<string, unknown>)[part] : undefined
      }
      return value as string | number | undefined
    })
    // Снимок значений всей формы — источник для `dependsOn` (родительские поля читаются по имени
    // из общего дерева, не из этого поля). Тот же приём, что у `fieldValueRef` выше
    const valuesRef = form.useStore((state: { values: Record<string, unknown> }) => state.values)

    const actions = useSelectionActionsState({
      appOptions: () => props.options,
      value: () => fieldValueRef.value,
      onSettleError: props.onSettleError,
      settleTimeout: props.settleTimeout,
    })

    // Видимая подпись поля — в общий реестр формы (`AppFormContext.labels`), чтобы дети,
    // зависящие от этого поля (`dependsOn`), могли показать «Сначала выберите «<эта подпись>»»
    useRegisterFieldLabel(labels, fullPath, () => label)

    const dependent = useDependentFieldUi({
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

    const toKey = (opt: { value: string }) => (opt.value === '' ? EMPTY_OPTION_TOKEN : opt.value)

    // Полный список опций (приложение + правки + оптимистично созданные), БЕЗ служебного пункта
    // создания — вынесено в `computed`, а не в render-замыкание: `useSelectionSearch` вызывается
    // из `setup()` (как и остальные Vue-композиции), ей нужен геттер, читающий актуальный список
    // на каждый вызов
    const merged = computed<FieldSelectOption[]>(() => {
      // Пока свой create в полёте, `pending`-опции приложения скрыты: почти всегда это та же запись,
      // иначе в списке была бы запись дважды (§16.7)
      const shownApp = actions.hasOwnCreatePending.value
        ? props.options.filter((opt) => !opt.pending)
        : props.options
      // Правки лежат поверх опций приложения, пока оно не перезапросит список
      const edited = applyOptionOverlay(shownApp, actions.overlay.value)
      // `SelectionCreatedOption.value` — `string | number` (framework-free контракт `onCreate`),
      // `FieldSelectOption.value` в Vue-скине — всегда `string` (значение примитива Reka —
      // атрибут `value` реального `<option>`-подобного элемента). Приводим к строке здесь же,
      // тем же приёмом, что и `toKey` ниже. `createdOptions.value` публично `readonly` —
      // `mergeCreatedOptions` ждёт обычный массив, копия дешёвая, список коротких
      const createdAsOptions: FieldSelectOption[] = actions.createdOptions.value.map((opt) => ({
        ...opt,
        value: String(opt.value),
      }))
      // Опция приложения сильнее созданной с тем же значением — дубля после перезагрузки нет
      return mergeCreatedOptions<FieldSelectOption>(edited, createdAsOptions)
    })

    // Текст для поиска: описание участвует, если `searchInDescription` не выключен явно —
    // читаем проп внутри самой функции (не на вызове), чтобы поздняя смена пропа не осталась
    // в замкнутом на старое значение геттере (композиция получает эту функцию один раз)
    const getSearchText = (opt: FieldSelectOption) =>
      props.searchInDescription === false ? getOptionText(opt) : getOptionSearchText(opt)

    const searchState = useSelectionSearch<FieldSelectOption>({
      searchable: () => props.searchable,
      options: () => merged.value,
      getText: getSearchText,
      placeholder: selectionStrings.searchPlaceholder,
      ariaLabel: selectionStrings.searchAria,
    })

    return () => {
      if (renderError.value) {
        return rekaUIKit.ErrorFallback({ fieldName: props.name, message: renderError.value.message })
      }

      return withFieldValidation(form, fullPath, fieldSchema, (field, hasError, errorMessage) => {
        const clearable = props.clearable ?? !required
        const hasOnUpdate = !!props.onUpdate
        const showCreateItem = !!props.onCreate && props.createItem !== false
        const createLabel = props.createLabel ?? `${selectionStrings.createVerb}…`

        const mergedOptions = merged.value

        // Ключ примитива (после подмены `''` → токен) → исходная опция приложения. Нужен, чтобы
        // `renderOption`/`renderValue` приложения никогда не увидели `EMPTY_OPTION_TOKEN` — как
        // `optionByValue` в shadcn-React-скине (`field-select.tsx`)
        const optionByKey = new Map(mergedOptions.map((opt) => [toKey(opt), opt]))

        // Поиск фильтрует `mergedOptions`; сам список пункта строится из отфильтрованного —
        // без совпадений список пуст, но порог/строка запроса считаются по полному `mergedOptions`
        // (см. `useSelectionSearch`, геттер `options`)
        const searchActive = searchState.search.value
        const visibleOptions = searchActive ? searchState.filtered.value : mergedOptions

        const normalizedOptions = visibleOptions.map((opt) => ({
          value: toKey(opt),
          label: opt.label,
          description: opt.description,
          disabled: opt.disabled,
          pending: opt.pending,
          editable: isOptionEditable(opt, hasOnUpdate),
        }))

        // Поисковый запрос (только пока поле поиска реально показано) — участвует в подписи
        // служебного пункта («+ Добавить "текст"») и в решении, предлагать ли создание вообще
        const searchQuery = searchActive ? searchState.query.value.trim() : ''
        const offerCreate = showCreateItem
          && (searchQuery === '' || shouldOfferCreate(searchQuery, mergedOptions.map(getOptionText)))
        const createItemLabel = searchQuery !== ''
          ? `+ ${selectionStrings.createVerb} "${searchQuery}"`
          : `+ ${createLabel}`
        const withCreateItem = offerCreate
          ? [...normalizedOptions, { value: CREATE_OPTION_VALUE, label: createItemLabel }]
          : normalizedOptions

        // `visibleValues` контракта поиска строит `useSelectionSearch` из «сырых» `option.value` —
        // здесь их нужно провести через тот же `toKey`, что и сам список пунктов, иначе пустая
        // опция (`''` → `EMPTY_OPTION_TOKEN`) выпадала бы из видимых при активном поиске
        const search = searchActive
          ? { ...searchActive, visibleValues: new Set(searchState.filtered.value.map((opt) => toKey(opt))) }
          : undefined

        const hasEmptyOption = mergedOptions.some((opt) => opt.value === '')

        const rawFieldValue = field.state.value as string | number | undefined
        const formRawValue = rawFieldValue !== null && rawFieldValue !== undefined ? String(rawFieldValue) : undefined
        // Оптимистично созданная запись показана выбранной, пока форма хранит прежнее значение (§16.7)
        const rawValue = actions.pendingSelection.value ?? formRawValue
        // `''` при наличии опции с пустым значением — это выбранная опция, а не «пусто»
        const value = rawValue === '' && hasEmptyOption ? EMPTY_OPTION_TOKEN : (rawValue || undefined)

        const applyValue = (raw: string | undefined) => {
          field.handleChange(raw === undefined ? '' : raw)
        }

        // Ошибки `onCreate`/`onUpdate` — забота приложения, всплывают как unhandled rejection (та же политика, что в React)
        const runCreate = () => {
          const onCreate = props.onCreate
          if (!onCreate) {
            return
          }
          actions.run({
            scope: 'option',
            kind: 'create',
            call: (ctx) => onCreate('', ctx),
            apply: (created, info) => {
              actions.addCreatedOption(created)
              // Выбор пользователя, сделанный за время оптимистичного ожидания, подтверждение не перебивает
              if (!info.optimistic || info.selectionHeld) {
                applyValue(String(created.value))
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
          const fromValue = String(source.value)
          actions.run({
            scope,
            kind: 'edit',
            fromValue,
            call: (ctx) => onUpdate(source, ctx),
            apply: (result) => {
              actions.recordEdit(fromValue, result)
              // Замена записи (другой value): выбранное переезжает на новую. Тот же value — форма не dirty.
              // Значение читаем живым: при оптимистичной правке за время ожидания оно могло измениться
              const liveValue = form.getFieldValue(fullPath)
              if (String(result.value) !== fromValue && liveValue !== undefined && String(liveValue) === fromValue) {
                applyValue(String(result.value))
              }
            },
          })
        }

        const optionContext = (key: string, scope: 'option' | 'value' | 'value-text') => {
          const source = optionByKey.get(key)
          return {
            option: source,
            text: source ? getOptionText(source) : '',
            editable: !!source && isOptionEditable(source, hasOnUpdate),
            scope,
          }
        }

        // Поле заблокировано `dependsOn` (§18) — родители ещё не готовы: свои действия недоступны
        const blocked = dependent.blocked.value
        const createText = `+ ${createLabel}`
        const actionsValue = {
          pending: actions.pending.value,
          canCreate: !!props.onCreate,
          hasOnUpdate,
          interactive: !blocked,
          search: searchQuery,
          runCreate,
          runEdit,
          strings: {
            edit: selectionStrings.edit,
            editAria: (text: string) => `${selectionStrings.edit}: ${text}`,
            create: createText,
            createWithSearch: (text: string) => `+ ${selectionStrings.createVerb} "${text}"`,
          },
        }

        const selectedSource = value !== undefined ? optionByKey.get(value) : undefined

        // Мост типов: `useSelectionActionsState` (Vue) отдаёт `Ref<UIKitSelectControl | null>`
        // (`.value`), а примитив `Select` ждёт React-подобный `{ current }` — тот же контракт,
        // что и у Chakra/React-скинов (`UIKitSelectProps.controlRef`, framework-free half)
        const controlRefBridge: { current: UIKitSelectControl | null } = {
          get current() {
            return actions.controlRef.value
          },
          set current(next) {
            actions.controlRef.value = next
          },
        }

        // Заблокированное поле: placeholder — подсказка про родителя, значение не редактируется
        const effectivePlaceholder = blocked ? dependent.blockedPlaceholder.value : placeholder
        const { helperText, describedBy } = dependentHelperText(dependent, hasError)

        // `Select` рисует свою метку сам (см. `uikit/primitives/select.ts`) — в отличие от
        // остальных полей, здесь не `FieldWrapper` (он бы продублировал `FieldLabel`), а
        // `FieldRoot` напрямую вокруг `Select` + `FieldError`, как и в React-скине.
        return rekaUIKit.FieldRoot({
          invalid: hasError,
          required,
          disabled: blocked,
          children: [
            h(SelectionActionsProvider, { value: actionsValue }, {
              default: () => [
                rekaUIKit.Select({
                  value,
                  onValueChange: (pickedValue) => {
                    if (blocked) {
                      return
                    }
                    const newValue = pickedValue === EMPTY_OPTION_TOKEN ? '' : pickedValue
                    if (newValue !== undefined && isCreateOptionValue(newValue)) {
                      // Служебный пункт: значение не применяется
                      runCreate()
                      return
                    }
                    applyValue(newValue)
                  },
                  onBlur: field.handleBlur,
                  options: withCreateItem,
                  disabled: blocked,
                  search,
                  emptyContent: (typeof props.searchable === 'object' ? props.searchable.emptyMessage : undefined)
                    ?? selectionStrings.empty,
                  describedBy,
                  renderOption: props.renderOption
                    ? (opt, state) => {
                      // Служебный пункт «+ Добавить…» через renderer приложения не проходит
                      const source = optionByKey.get(opt.value)
                      if (!source) {
                        return opt.label
                      }
                      return h(SelectionOptionProvider, { value: optionContext(opt.value, 'option') }, {
                        default: () => [props.renderOption!(source, state)],
                      })
                    }
                    : undefined,
                  // Свой renderOption — свои кнопки (`Field.Select.EditButton`); карандаш по умолчанию только без него
                  renderOptionActions: hasOnUpdate && !props.renderOption
                    ? (opt) =>
                      h(SelectionOptionProvider, { value: optionContext(opt.value, 'option') }, {
                        default: () => [h(SelectEditButton)],
                      })
                    : undefined,
                  renderValue: props.renderValue
                    ? (opt) => {
                      const source = optionByKey.get(opt.value)
                      const custom = source ? props.renderValue!(source) : undefined
                      // Пустой результат — `null` (не `undefined`/`false`: `UINode` их не допускает,
                      // в отличие от `ReactNode` в React-скине), примитив откатится к тексту опции
                      if (custom === undefined || custom === null || custom === '') {
                        return null
                      }
                      return h(SelectionOptionProvider, { value: optionContext(opt.value, 'value-text') }, {
                        default: () => [custom],
                      })
                    }
                    : undefined,
                  controlActions: hasOnUpdate && selectedSource && value !== undefined
                    ? h(SelectionOptionProvider, { value: optionContext(value, 'value') }, {
                      default: () => [h(SelectEditButton)],
                    })
                    : undefined,
                  controlRef: controlRefBridge,
                  label,
                  placeholder: effectivePlaceholder,
                  clearable: clearable && !blocked,
                  listFooter: props.listFooter,
                  'data-field-name': props.name,
                }),
                DependentLiveRegion(dependent),
              ],
            }),
            actions.settleFailure.value
              ? h(
                'p',
                { role: 'status', class: 'text-destructive mt-1 text-sm', 'data-settle-error': '' },
                interpolate(selectionStrings.settleError, { label: actions.settleFailure.value.label }),
              )
              : null,
            rekaUIKit.FieldError({ hasError, errorMessage, helperText }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- children принимает VNode[], контракт типизирован как единичный TNode
          ] as any,
        })
      })
    }
  },
})

/** Слоты `Form.Field.Select.EditButton` / `.CreateButton` — для своего `renderOption`/`listFooter` */
export const FieldSelect = Object.assign(FieldSelectBase, {
  EditButton: SelectEditButton,
  CreateButton: SelectCreateButton,
})
