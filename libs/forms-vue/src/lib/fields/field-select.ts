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
  type UpdatedOption,
} from '@letar/forms-core/uikit'
import {
  type ComponentPublicInstance,
  computed,
  defineComponent,
  h,
  nextTick,
  type PropType,
  ref,
  type VNode,
  watch,
} from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext, useRegisterFieldLabel } from '../core/form-context'
import { useFormGroup } from '../core/form-group'
import { useListboxPopup } from '../core/use-listbox-popup'
import { useSelectionActionsState } from '../core/use-selection-actions-state'
import { useSelectionSearch } from '../core/use-selection-search'
import { fieldWrapper } from './field-utils'
import { SelectionActionsProvider, SelectionOptionProvider } from './selection-context'
import { SelectCreateButton, SelectEditButton } from './selection-slots'
import { selectionStrings } from './selection-strings'
import { dependentHelperText, DependentLiveRegion, useDependentFieldUi } from './use-dependent-field-ui'

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
 *
 * Этап 3f (последний кусок паритета Select) — `searchable`/`dependsOn`:
 * - `searchable` — обвязка над `useSelectionSearch` (`../core/use-selection-search.ts`, Этап 2).
 *   У headless-скина нет отдельного Reka/Popover-примитива, как у `forms-vue-shadcn`
 *   (`select-searchable.ts`) — строка поиска рисуется прямо внутри уже существующего попапа
 *   `useListboxPopup` первым элементом, список фильтруется тем же `<ul>`/`<li>`. Клавиатурная
 *   навигация внутри поля поиска использует тот же `popup.onKeydown`, что и триггер — фокус на
 *   время открытого попапа переходит на инпут, поэтому нажатия стрелок/Enter/Escape долетают до
 *   него, а не до триггера.
 * - `dependsOn` — обвязка над `useDependentField` (`../core/use-dependent-field.ts`, Этап 2) через
 *   headless-версию UI-хелпера `use-dependent-field-ui.ts` (текст/a11y идентичны
 *   `forms-vue-shadcn`, разметка — свои `<span>` без Tailwind). Подпись родителя ищется в общем
 *   реестре формы (`AppFormContext.labels`, `useRegisterFieldLabel`) — тот же реестр, что уже
 *   подключён к `forms-vue-shadcn` в Этапе 3c.
 * - Пункт создания и поиск работают вместе: пока запрос не пуст, пункт «+ Добавить "текст"»
 *   предлагается, только если ни одна опция не совпала (`shouldOfferCreate`) — та же политика,
 *   что у React/`forms-vue-shadcn` эталонов.
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
    /** Поиск по списку (Этап 3f): `true`/`false`/`'auto'` (сам с 10-й опции) либо точная настройка */
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

    // `useListboxPopup`/`useSelectionActionsState`/`useDependentFieldUi` — композаблы с хуками
    // жизненного цикла, обязаны вызываться синхронно из `setup()`, а не из render-замыкания
    // `withFieldValidation` (тот выполняется как slot-функция `form.Field`, вне контекста текущего
    // компонента). Поэтому `field` не передаётся напрямую в колбэки — они читают его из переменной,
    // которую render-замыкание обновляет на каждый свой вызов; к моменту реального клика/нажатия
    // клавиши (событие DOM, всегда после рендера) переменная уже указывает на актуальный `field`.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Form field API, тип неэкспортируем
    let currentField: any = null

    // Снимок значений всей формы — источник для `dependsOn` (родительские поля читаются по имени
    // из общего дерева, не из этого поля). `form.useStore` — Vue-идиоматичный эквивалент подписки
    // React `useStore(form.store, ...)`
    const valuesRef = form.useStore((state: { values: Record<string, unknown> }) => state.values)

    const actions = useSelectionActionsState({
      appOptions: () => props.options,
      value: () => currentField?.state.value as string | undefined,
      onSettleError: props.onSettleError,
      settleTimeout: props.settleTimeout,
    })

    // Видимая подпись поля — в общий реестр формы (`AppFormContext.labels`), чтобы дети,
    // зависящие от этого поля (`dependsOn`), могли показать «Сначала выберите «<эта подпись>»»
    useRegisterFieldLabel(labels, fullPath, () => label)

    const dependentUi = useDependentFieldUi({
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
    const blocked = dependentUi.blocked

    const createLabel = computed(() => props.createLabel ?? `${selectionStrings.createVerb}…`)
    const showCreateItem = computed(() => !!props.onCreate && props.createItem !== false)

    // Список приложения (с уже наложенными правками) + оптимистично созданные — БЕЗ служебного
    // пункта создания и БЕЗ фильтра поиска (их дописывает/применяет `visibleOptions` ниже)
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

    // Текст для поиска: описание участвует, если `searchInDescription` не выключен явно — читаем
    // проп внутри самой функции (не на вызове), чтобы поздняя смена пропа не осталась в замкнутом
    // на старое значение геттере (композиция получает эту функцию один раз)
    const getSearchText = (opt: FieldSelectOption) =>
      props.searchInDescription === false ? getOptionText(opt) : getOptionSearchText(opt)

    const searchState = useSelectionSearch<FieldSelectOption>({
      searchable: () => props.searchable,
      options: () => merged.value,
      getText: getSearchText,
      placeholder: selectionStrings.searchPlaceholder,
      ariaLabel: selectionStrings.searchAria,
    })

    // Список после фильтра поиска (без фильтра, если поле поиска не показано)
    const searchedOptions = computed<FieldSelectOption[]>(() =>
      searchState.enabled.value ? searchState.filtered.value : merged.value
    )
    // Поисковый запрос (только пока поле поиска реально показано) — участвует в подписи
    // служебного пункта («+ Добавить "текст"») и в решении, предлагать ли создание вообще
    const searchQuery = computed(() => (searchState.enabled.value ? searchState.query.value.trim() : ''))
    const offerCreate = computed(() =>
      showCreateItem.value
      && (searchQuery.value === '' || shouldOfferCreate(searchQuery.value, merged.value.map(getOptionText)))
    )
    const createItemLabel = computed(() =>
      searchQuery.value !== ''
        ? `+ ${selectionStrings.createVerb} "${searchQuery.value}"`
        : `+ ${createLabel.value}`
    )

    // Видимый список — с пунктом создания в конце, когда он актуален (без поиска — всегда, пока
    // включён; с поиском — только если ни одна опция не совпала с запросом)
    const visibleOptions = computed<FieldSelectOption[]>(() =>
      offerCreate.value
        ? [...searchedOptions.value, { value: CREATE_OPTION_VALUE, label: createItemLabel.value }]
        : searchedOptions.value
    )

    const emptyMessage = computed(() =>
      (typeof props.searchable === 'object' ? props.searchable.emptyMessage : undefined) ?? selectionStrings.empty
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

    // Контейнер попапа (поле поиска + список) — отдельно от `popup.floatingRef` (та функция сама
    // не отдаёт наружу DOM-узел), нужен для `onBlur`-проверки «фокус ушёл внутри попапа, а не наружу»
    const popupContainerRef = ref<HTMLElement | null>(null)
    const searchInputRef = ref<HTMLInputElement | null>(null)

    // При открытии попапа с активным поиском фокус сразу переходит в поле поиска — иначе набор
    // текста для фильтрации требовал бы лишнего клика (та же UX-политика, что и в `forms-vue-shadcn`,
    // где `onOpenAutoFocus` Reka-попапа делает то же самое)
    watch(
      () => popup.isOpen.value,
      (open) => {
        if (open && searchState.enabled.value) {
          void nextTick(() => searchInputRef.value?.focus())
        }
      },
    )

    const isWithinPopup = (node: Node | null): boolean =>
      !!node && !!(popup.triggerRef.value?.contains(node) || popupContainerRef.value?.contains(node))

    // Общий `onBlur` для триггера и поля поиска: фокус, переходящий МЕЖДУ ними (открытие попапа
    // переносит фокус с триггера в инпут, закрытие — обратно), не должен считаться уходом с поля.
    // Без этой проверки первый же клик по триггеру с `searchable` закрывал бы попап немедленно.
    const handlePopupBlur = (event: FocusEvent) => {
      if (isWithinPopup(event.relatedTarget as Node | null)) {
        return
      }
      popup.closePopup()
      currentField?.handleBlur()
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
        const isBlocked = blocked.value
        const searchEnabled = searchState.enabled.value
        const realOptionCount = options.filter((opt) => !isCreateOptionValue(opt.value)).length

        const actionsValue = {
          pending: actions.pending.value,
          canCreate: !!props.onCreate,
          hasOnUpdate: hasOnUpdateNow,
          interactive: !isBlocked,
          search: searchQuery.value,
          runCreate,
          runEdit,
          strings: {
            edit: selectionStrings.edit,
            editAria: (text: string) => `${selectionStrings.edit}: ${text}`,
            create: `+ ${createLabel.value}`,
            createWithSearch: (text: string) => `+ ${selectionStrings.createVerb} "${text}"`,
          },
        }

        // Заблокированное поле: placeholder — подсказка про родителя, значение не редактируется
        const effectivePlaceholder = isBlocked ? dependentUi.blockedPlaceholder.value : placeholder
        const triggerContent: CustomRenderResult = selectedOption
          ? (props.renderValue?.(selectedOption) || selectedOption.label)
          : (effectivePlaceholder ?? '')

        const valueEditButton = hasOnUpdateNow && selectedOption && isOptionEditable(selectedOption, true)
          ? h(SelectionOptionProvider, { value: optionContext(selectedOption.value, 'value') }, {
            default: () => [h(SelectEditButton)],
          })
          : null

        const { helperText, describedBy } = dependentHelperText(dependentUi, hasError)

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
                    'aria-describedby': describedBy,
                    'data-placeholder': selectedOption ? undefined : '',
                    disabled: isBlocked || undefined,
                    onClick: () => {
                      if (isBlocked) {
                        return
                      }
                      popup.togglePopup()
                    },
                    onKeydown: (event: KeyboardEvent) => {
                      if (isBlocked) {
                        return
                      }
                      popup.onKeydown(event)
                    },
                    onBlur: handlePopupBlur,
                  },
                  triggerContent,
                ),
                valueEditButton,
                popup.isOpen.value
                  ? h(
                    'div',
                    {
                      // Обёртка, а не `popup.floatingRef` напрямую: сигнатура ref-колбэка Vue —
                      // `(el: Element | ComponentPublicInstance | null, refs) => void`, шире, чем
                      // `(el: HTMLElement | null) => void` у `attachFloating` — под `strictFunctionTypes`
                      // узкий параметр не проходит контравариантную проверку без явного каста. Элемент
                      // всегда `<div>` (не компонент), поэтому каст на `HTMLElement` безопасен.
                      // Второе назначение — тот же узел кладётся в `popupContainerRef` для проверки
                      // «фокус ушёл внутри попапа» в `handlePopupBlur`
                      ref: (el: Element | ComponentPublicInstance | null) => {
                        const node = el as HTMLElement | null
                        popupContainerRef.value = node
                        popup.floatingRef(node)
                      },
                      class: 'letar-field__select-popup',
                      style: popup.floatingStyles,
                    },
                    [
                      searchEnabled
                        ? h('input', {
                          ref: searchInputRef,
                          type: 'text',
                          role: 'searchbox',
                          autocomplete: 'off',
                          class: 'letar-field__select-search',
                          value: searchState.query.value,
                          placeholder: selectionStrings.searchPlaceholder,
                          'aria-label': selectionStrings.searchAria,
                          'aria-controls': listboxId,
                          'aria-activedescendant': popup.activeDescendantId.value,
                          onInput: (event: Event) => {
                            searchState.setQuery((event.target as HTMLInputElement).value)
                          },
                          onKeydown: popup.onKeydown,
                          onBlur: handlePopupBlur,
                        })
                        : null,
                      h(
                        'ul',
                        {
                          id: listboxId,
                          role: 'listbox',
                          class: 'letar-field__select-listbox',
                        },
                        [
                          searchEnabled && realOptionCount === 0
                            ? h('li', { class: 'letar-field__select-empty', role: 'presentation' }, emptyMessage.value)
                            : null,
                          ...options.map((option, index) => {
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
                                // `preventDefault` на mousedown — фокус остаётся на кнопке-триггере/поле
                                // поиска, `blur` (который иначе закрыл бы попап раньше, чем сработает `click`)
                                // не срабатывает
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
                        ],
                      ),
                    ],
                  )
                  : null,
              ]),
              helperText ?? null,
              DependentLiveRegion(dependentUi),
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
