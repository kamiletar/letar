import { interpolate } from '@letar/forms-core/i18n'
import {
  applyOptionOverlay,
  CREATE_OPTION_VALUE,
  type CreatedOption,
  getOptionText,
  isCreateOptionValue,
  isOptionEditable,
  mergeCreatedOptions,
  type SelectionActionContext,
  type SettleErrorInfo,
  type UIKitOptionRenderState,
  type UIKitSelectControl,
  type UpdatedOption,
} from '@letar/forms-core/uikit'
import {
  resolveFieldMeta,
  useAppFormContext,
  useSelectionActionsState,
  withFieldValidation,
} from '@letar/forms-vue/core'
import { defineComponent, h, onErrorCaptured, type PropType, ref } from 'vue'
import type { UINode } from '../uikit/ui-node'
import { rekaUIKit } from '../uikit/uikit-reka'
import { SelectionActionsProvider, SelectionOptionProvider } from './selection-context'
import { SelectCreateButton, SelectEditButton } from './selection-slots'
import { selectionStrings } from './selection-strings'

/**
 * Reka `SelectItem` запрещает `value=""` (пустая строка у `SelectRoot` — «сбросить выбор и
 * показать placeholder») и бросает ошибку при рендере. Опция «Все категории» со значением `''`
 * внутри примитива подменяется служебным токеном; наружу (в форму) всегда уходит настоящее `''`.
 */
const EMPTY_OPTION_TOKEN = '__letar_empty_option__'

export interface FieldSelectOption<TData = unknown> {
  value: string
  label: string
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
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, placeholder, required, fullPath } = resolveFieldMeta(
      schema,
      props.name,
      props.label,
      props.placeholder,
    )

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

    const actions = useSelectionActionsState({
      appOptions: () => props.options,
      value: () => fieldValueRef.value,
      onSettleError: props.onSettleError,
      settleTimeout: props.settleTimeout,
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

        const toKey = (opt: { value: string }) => (opt.value === '' ? EMPTY_OPTION_TOKEN : opt.value)

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
        const merged = mergeCreatedOptions<FieldSelectOption>(edited, createdAsOptions)

        // Ключ примитива (после подмены `''` → токен) → исходная опция приложения. Нужен, чтобы
        // `renderOption`/`renderValue` приложения никогда не увидели `EMPTY_OPTION_TOKEN` — как
        // `optionByValue` в shadcn-React-скине (`field-select.tsx`)
        const optionByKey = new Map(merged.map((opt) => [toKey(opt), opt]))

        const normalizedOptions = merged.map((opt) => ({
          value: toKey(opt),
          label: opt.label,
          description: opt.description,
          disabled: opt.disabled,
          pending: opt.pending,
          editable: isOptionEditable(opt, hasOnUpdate),
        }))

        // «+ Добавить…»: без `searchable` (Stage 3c) поиска нет, служебный пункт всегда с фиксированной подписью
        const withCreateItem = showCreateItem
          ? [...normalizedOptions, { value: CREATE_OPTION_VALUE, label: `+ ${createLabel}` }]
          : normalizedOptions

        const hasEmptyOption = merged.some((opt) => opt.value === '')

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

        const createText = `+ ${createLabel}`
        const actionsValue = {
          pending: actions.pending.value,
          canCreate: !!props.onCreate,
          hasOnUpdate,
          // Родители/dependsOn (Stage 3c) вне объёма — поле само по себе не бывает заблокировано
          interactive: true,
          // Combobox (Stage 3c) подставит сюда текст поиска; у Select всегда пусто
          search: '',
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

        // `Select` рисует свою метку сам (см. `uikit/primitives/select.ts`) — в отличие от
        // остальных полей, здесь не `FieldWrapper` (он бы продублировал `FieldLabel`), а
        // `FieldRoot` напрямую вокруг `Select` + `FieldError`, как и в React-скине.
        return rekaUIKit.FieldRoot({
          invalid: hasError,
          required,
          children: [
            h(SelectionActionsProvider, { value: actionsValue }, {
              default: () => [
                rekaUIKit.Select({
                  value,
                  onValueChange: (pickedValue) => {
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
                  placeholder,
                  clearable,
                  listFooter: props.listFooter,
                  'data-field-name': props.name,
                }),
              ],
            }),
            actions.settleFailure.value
              ? h(
                'p',
                { role: 'status', class: 'text-destructive mt-1 text-sm', 'data-settle-error': '' },
                interpolate(selectionStrings.settleError, { label: actions.settleFailure.value.label }),
              )
              : null,
            rekaUIKit.FieldError({ hasError, errorMessage }),
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
