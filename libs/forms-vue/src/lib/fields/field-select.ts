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
  type UpdatedOption,
} from '@letar/forms-core/uikit'
import { type ComponentPublicInstance, computed, defineComponent, h, type PropType, type VNode } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'
import { useListboxPopup } from '../core/use-listbox-popup'
import { useSelectionActionsState } from '../core/use-selection-actions-state'
import { fieldWrapper } from './field-utils'
import { SelectionActionsProvider, SelectionOptionProvider } from './selection-context'
import { SelectCreateButton, SelectEditButton } from './selection-slots'
import { selectionStrings } from './selection-strings'

export interface FieldSelectOption {
  value: string
  label: string
  /** Вторая строка в опции списка — видна только в кастомном рендере, нативный `<select>` её не показывал */
  description?: string
  disabled?: boolean
  /** Вычисляется полем (`isOptionEditable`): получает ли пункт карандаш «Изменить» */
  editable?: boolean
  /** Запись ещё не подтверждена сервером (Этап 3e, оптимистичный `onCreate`/`onUpdate`) — показана приглушённой, не выбирается */
  pending?: boolean
  data?: unknown
}

/** Состояние опции, которое получает `renderOption` — вместе с самой опцией */
export interface SelectOptionRenderState {
  /** Опция совпадает с текущим значением поля */
  selected: boolean
  /** Опция подсвечена клавиатурной навигацией (аналог `:hover`/`aria-activedescendant`) */
  active: boolean
}

/**
 * Кастомный узел вместо стандартного текста опции/значения. `undefined`/`null`/`''` — сигнал
 * «ничего не рисуй сам, используй запасной текст» (та же семантика, что у React-эталона
 * `forms-shadcn`): для `renderValue` запасной текст — `label` выбранной опции.
 */
type CustomRenderResult = VNode | string | null

/**
 * Select — единственное поле из пяти, которому нужен проп сверх `name`/`label`/`placeholder`
 * (`options`), поэтому оно не построено через `createField` (та фабрика — под однородный
 * набор пропсов пяти остальных полей), а собрано напрямую по тому же контракту контекста.
 *
 * Этап 3d паритета Select/Combobox (`forms-vue-angular-select-parity`): нативный `<select>`/
 * `<option>` заменён на кастомный listbox-попап поверх headless-примитива `useListboxPopup`
 * (`../core/use-listbox-popup.ts`) — нативный элемент физически не может показать кастомный
 * рендер опции, вторую строку описания или кастомное значение. `forms-vue` — headless-скин без
 * сторонней UI-библиотеки (в отличие от `forms-vue-shadcn`, который тот же примитив оборачивает
 * в Reka UI), поэтому разметка — голые `<button role="combobox">` + `<ul role="listbox">` с
 * `<li role="option">`, минимум классов (`letar-field__select-*`), без иконок.
 *
 * У `forms-vue` нет проблемы `forms-vue-shadcn` с `value=""` (там её создаёт Reka `SelectItem`,
 * запрещающий пустое значение) — опция с пустым значением работает как любая другая, служебный
 * `EMPTY_OPTION_TOKEN` не нужен.
 *
 * Этап 3e паритета: `onCreate`/`onUpdate`/`pending` через готовый `useSelectionActionsState`
 * (`../core/use-selection-actions-state.ts`, бизнес-логика не меняется, только её UI-подключение —
 * тот же приём, что и в `forms-vue-shadcn` (`field-select.ts`), адаптированный под headless-разметку
 * этого пакета: слоты `Field.Select.EditButton`/`.CreateButton` (`selection-slots.ts`) — обычные
 * Vue-компоненты поверх `provide`/`inject`-контекста (`selection-context.ts`), а не Reka-примитив.
 * Служебный пункт создания — обычный `<li>` в конце списка (Select без поиска, Stage 3f, предлагает
 * его всегда, когда есть `onCreate`); `Select.CreateButton` — для случая, когда приложение задаёт
 * свой `renderOption` и хочет вызвать создание из своей разметки.
 */
const FieldSelectBase = defineComponent({
  name: 'FieldSelect',
  props: {
    name: { type: String, required: true },
    label: { type: String as PropType<string | undefined>, required: false, default: undefined },
    placeholder: { type: String as PropType<string | undefined>, required: false, default: undefined },
    options: { type: Array as PropType<FieldSelectOption[]>, required: true },
    /** Кастомный рендер опции в списке — по умолчанию рисуются `label` + `description` (+ карандаш, если `onUpdate` задан) */
    renderOption: {
      type: Function as PropType<(option: FieldSelectOption, state: SelectOptionRenderState) => CustomRenderResult>,
      required: false,
      default: undefined,
    },
    /** Кастомный рендер подписи триггера — по умолчанию `label` выбранной опции */
    renderValue: {
      type: Function as PropType<(option: FieldSelectOption) => CustomRenderResult>,
      required: false,
      default: undefined,
    },
    /** Создание новой записи справочника без ухода из формы — конвейер см. `useSelectionActionsState` */
    onCreate: {
      type: Function as PropType<(search: string, ctx: SelectionActionContext) => Promise<CreatedOption | null>>,
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
    /** Подпись служебного пункта «+ Добавить…»; по умолчанию `«<createVerb>…»` */
    createLabel: { type: String, required: false, default: undefined },
    /** `false` прячет служебный пункт создания, оставляя саму возможность вызвать `Field.Select.CreateButton` вручную */
    createItem: { type: Boolean, required: false, default: undefined },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, placeholder, required, fullPath } = resolveFieldMeta(
      schema,
      props.name,
      props.label,
      props.placeholder,
    )

    // `useListboxPopup`/`useSelectionActionsState` — композаблы с хуками жизненного цикла,
    // обязаны вызываться синхронно из `setup()`, а не из render-замыкания `withFieldValidation`
    // (тот выполняется как slot-функция `form.Field`, вне контекста текущего компонента). Поэтому
    // `field` не передаётся напрямую в колбэки — они читают его из переменной, которую
    // render-замыкание обновляет на каждый свой вызов; к моменту реального клика/нажатия клавиши
    // (событие DOM, всегда после рендера) переменная уже указывает на актуальный `field`.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Form field API, тип неэкспортируем
    let currentField: any = null

    const actions = useSelectionActionsState({
      appOptions: () => props.options,
      value: () => currentField?.state.value as string | undefined,
      onSettleError: props.onSettleError,
      settleTimeout: props.settleTimeout,
    })

    const createLabel = computed(() => props.createLabel ?? `${selectionStrings.createVerb}…`)
    const showCreateItem = computed(() => !!props.onCreate && props.createItem !== false)

    // Список приложения (с уже наложенными правками) + оптимистично созданные — БЕЗ служебного
    // пункта создания (его дописывает `visibleOptions` ниже, только для попапа/рендера)
    const merged = computed<FieldSelectOption[]>(() => {
      // Пока свой create в полёте, `pending`-опции приложения скрыты: почти всегда это та же запись,
      // иначе в списке была бы запись дважды
      const shownApp = actions.hasOwnCreatePending.value
        ? props.options.filter((opt) => !opt.pending)
        : props.options
      const edited = applyOptionOverlay(shownApp, actions.overlay.value)
      const createdAsOptions: FieldSelectOption[] = actions.createdOptions.value.map((opt) => ({
        ...opt,
        value: String(opt.value),
      }))
      // Опция приложения сильнее созданной с тем же значением — дубля после перезагрузки нет
      return mergeCreatedOptions<FieldSelectOption>(edited, createdAsOptions)
    })

    // Видимый список — с пунктом создания в конце, когда он включён. У Select нет поиска
    // (Stage 3f), поэтому пункт создания, в отличие от Combobox, предлагается всегда, а не только
    // когда текст поиска не совпал ни с одной опцией
    const visibleOptions = computed<FieldSelectOption[]>(() =>
      showCreateItem.value
        ? [...merged.value, { value: CREATE_OPTION_VALUE, label: `+ ${createLabel.value}` }]
        : merged.value
    )

    const optionByValue = computed(() => new Map(visibleOptions.value.map((opt) => [opt.value, opt])))

    // Контракт `useListboxPopup` — только `value`/`disabled`; `pending`-опция ведёт себя как
    // `disabled` для навигации и выбора (клавиатурой и мышью), хотя ARIA-атрибут ей рендер ставит
    // другой (`aria-busy`, не `aria-disabled`) — см. цикл рендера ниже
    const popupOptions = computed(() =>
      visibleOptions.value.map((opt) => ({ value: opt.value, disabled: !!opt.disabled || !!opt.pending }))
    )

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
            currentField?.handleChange(String(created.value))
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
            currentField?.handleChange(String(result.value))
          }
        },
      })
    }

    const popup = useListboxPopup<{ value: string; disabled?: boolean }>({
      options: () => popupOptions.value,
      onSelect: (option) => {
        if (isCreateOptionValue(option.value)) {
          runCreate()
          return
        }
        currentField?.handleChange(option.value)
      },
      selectedValue: () => actions.pendingSelection.value ?? (currentField?.state.value as string | undefined),
      idBase: fullPath,
    })

    // Мост типов: скин отдаёт композаблу ручку выпадашки (закрыть список, вернуть фокус на
    // триггер) — тот же контракт `UIKitSelectControl`, что и у React/vue-shadcn скинов.
    // Присваивается один раз: обе функции читают актуальный `popup` через замыкание
    actions.controlRef.value = {
      close: () => popup.closePopup(),
      focusTrigger: () => popup.triggerRef.value?.focus(),
    }

    const listboxId = `${fullPath}-listbox`

    const optionContext = (value: string, scope: 'option' | 'value') => {
      const source = optionByValue.value.get(value)
      return {
        option: source,
        text: source ? getOptionText(source) : '',
        editable: !!source && isOptionEditable(source, !!props.onUpdate),
        scope,
      }
    }

    return () =>
      withFieldValidation(form, fullPath, fieldSchema, (field, hasError, errorMessage) => {
        currentField = field
        const hasOnUpdateNow = !!props.onUpdate
        const formValue = field.state.value as string | undefined
        // Оптимистично созданная/правленая запись показана выбранной, пока форма хранит прежнее значение
        const currentValue = actions.pendingSelection.value ?? formValue
        const options = visibleOptions.value
        const selectedOption = currentValue !== undefined ? optionByValue.value.get(currentValue) : undefined

        const actionsValue = {
          pending: actions.pending.value,
          canCreate: !!props.onCreate,
          hasOnUpdate: hasOnUpdateNow,
          interactive: true,
          search: '',
          runCreate,
          runEdit,
          strings: {
            edit: selectionStrings.edit,
            editAria: (text: string) => `${selectionStrings.edit}: ${text}`,
            create: `+ ${createLabel.value}`,
            createWithSearch: (text: string) => `+ ${selectionStrings.createVerb} "${text}"`,
          },
        }

        const triggerContent: CustomRenderResult = selectedOption
          ? (props.renderValue?.(selectedOption) || selectedOption.label)
          : (placeholder ?? '')

        const valueEditButton = hasOnUpdateNow && selectedOption && isOptionEditable(selectedOption, true)
          ? h(SelectionOptionProvider, { value: optionContext(selectedOption.value, 'value') }, {
            default: () => [h(SelectEditButton)],
          })
          : null

        return fieldWrapper(
          { name: props.name, label, required, hasError, errorMessage },
          h(SelectionActionsProvider, { value: actionsValue }, {
            default: () => [
              h('div', { class: 'letar-field__select', 'data-field-name': props.name }, [
                h(
                  'button',
                  {
                    type: 'button',
                    id: props.name,
                    ref: popup.triggerRef,
                    class: 'letar-field__control letar-field__select-trigger',
                    role: 'combobox',
                    'aria-haspopup': 'listbox',
                    'aria-expanded': popup.isOpen.value,
                    'aria-controls': listboxId,
                    'aria-activedescendant': popup.activeDescendantId.value,
                    'data-placeholder': selectedOption ? undefined : '',
                    onClick: () => popup.togglePopup(),
                    onKeydown: popup.onKeydown,
                    onBlur: () => {
                      popup.closePopup()
                      field.handleBlur()
                    },
                  },
                  triggerContent,
                ),
                valueEditButton,
                popup.isOpen.value
                  ? h(
                    'ul',
                    {
                      // Обёртка, а не `popup.floatingRef` напрямую: сигнатура ref-колбэка Vue —
                      // `(el: Element | ComponentPublicInstance | null, refs) => void`, шире, чем
                      // `(el: HTMLElement | null) => void` у `attachFloating` — под `strictFunctionTypes`
                      // узкий параметр не проходит контравариантную проверку без явного каста. Элемент
                      // всегда `<ul>` (не компонент), поэтому каст на `HTMLElement` безопасен.
                      ref: (el: Element | ComponentPublicInstance | null) =>
                        popup.floatingRef(el as HTMLElement | null),
                      id: listboxId,
                      role: 'listbox',
                      class: 'letar-field__select-listbox',
                      style: popup.floatingStyles,
                    },
                    options.map((option, index) => {
                      const isCreateOption = isCreateOptionValue(option.value)
                      const selected = option.value === currentValue
                      const active = index === popup.activeIndex.value
                      const editable = !isCreateOption && isOptionEditable(option, hasOnUpdateNow)

                      // Всегда массив (не «одиночное значение либо массив») — смешанный union путал
                      // разрешение перегрузок `h()` при передаче третьим аргументом.
                      const content: (VNode | string | null)[] = isCreateOption
                        ? [option.label]
                        : props.renderOption
                        ? [
                          h(SelectionOptionProvider, { value: optionContext(option.value, 'option') }, {
                            default: () => [props.renderOption!(option, { selected, active })],
                          }),
                        ]
                        : [
                          h('span', { class: 'letar-field__select-option-label' }, option.label),
                          option.description
                            ? h('span', { class: 'letar-field__select-option-description' }, option.description)
                            : null,
                          // Свой renderOption — свои кнопки (`Field.Select.EditButton`); карандаш по умолчанию только без него
                          editable
                            ? h(SelectionOptionProvider, { value: optionContext(option.value, 'option') }, {
                              default: () => [h(SelectEditButton)],
                            })
                            : null,
                        ]

                      return h(
                        'li',
                        {
                          key: option.value,
                          id: popup.optionId(index),
                          role: 'option',
                          'aria-selected': selected,
                          'aria-disabled': option.disabled || undefined,
                          // Опция ждёт подтверждения сервера — приглушена и недоступна для выбора,
                          // но это не то же самое, что `disabled` (`aria-disabled` не ставим)
                          'aria-busy': option.pending || undefined,
                          'data-active': active || undefined,
                          'data-pending': option.pending || undefined,
                          class: 'letar-field__select-option',
                          // `preventDefault` на mousedown — фокус остаётся на кнопке-триггере, `blur`
                          // (который иначе закрыл бы попап раньше, чем сработает `click`) не срабатывает
                          onMousedown: (event: Event) => event.preventDefault(),
                          onClick: () => {
                            if (option.disabled || option.pending) {
                              return
                            }
                            popup.selectIndex(index)
                          },
                          onMouseenter: () => {
                            if (!option.disabled && !option.pending) {
                              popup.activeIndex.value = index
                            }
                          },
                        },
                        content,
                      )
                    }),
                  )
                  : null,
              ]),
              actions.settleFailure.value
                ? h(
                  'p',
                  { role: 'status', class: 'letar-field__select-settle-error', 'data-settle-error': '' },
                  interpolate(selectionStrings.settleError, { label: actions.settleFailure.value.label }),
                )
                : null,
            ],
          }),
        )
      })
  },
})

/** Слоты `Form.Field.Select.EditButton` / `.CreateButton` — для своего `renderOption` */
export const FieldSelect = Object.assign(FieldSelectBase, {
  EditButton: SelectEditButton,
  CreateButton: SelectCreateButton,
})
