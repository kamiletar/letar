import {
  getOptionText,
  type LoadOptionsFn,
  type LoadSelectedFn,
  type UIKitOptionRenderState,
} from '@letar/forms-core/uikit'
import {
  resolveFieldMeta,
  useAppFormContext,
  useDebounce,
  usePromiseSearch,
  useSelectedLoader,
  withFieldValidation,
} from '@letar/forms-vue/core'
import { computed, defineComponent, onErrorCaptured, type PropType, ref, watch } from 'vue'
import { FieldWrapper } from '../uikit/primitives'
// Прямой импорт примитива, не через `rekaUIKit.Combobox`: `renderValue`/`resolveOption` — расширение
// контракта сверх `UIKitComboboxProps` (`RekaComboboxExtraProps`, см. `combobox.ts`), которого нет в
// `forms-core`, и `rekaUIKit.Combobox` типизирован строго по нему (excess property error).
// Тот же приём — прямой импорт `Combobox as ComboboxControl` — в React-скине (`field-combobox.tsx`)
import { Combobox } from '../uikit/primitives/combobox'
import type { UINode } from '../uikit/ui-node'
import { rekaUIKit } from '../uikit/uikit-reka'
import type { FieldSelectOption } from './field-select'
import { selectionStrings } from './selection-strings'

/**
 * `options` — тот же случай, что и `FieldSelect`: проп сверх контракта `createField`, поле
 * собрано напрямую по `useAppFormContext`. Фильтрация по подстроке — обязанность поля, не
 * примитива (`rekaUIKit.Combobox` ничего не фильтрует сам, см. `uikit/primitives/combobox.ts`).
 *
 * Источники опций (ровно один, Stage 4b): статичные `options` — фильтр на клиенте по подписи;
 * `loadOptions` (промис-путь: server action, `fetch`, SDK) — фильтрует сервер, поле дебаунсит
 * строку поиска, отменяет прошлый запрос и показывает «Повторить» при ошибке. `dependsOn`/`deps`
 * этой стадии нет (Stage 4d) — `usePromiseSearch`/`useSelectedLoader` уже принимают `deps`/`depsKey`,
 * здесь они не подключены за ненадобностью, а не забыты.
 */
export const FieldCombobox = defineComponent({
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
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, placeholder: metaPlaceholder, required, fullPath } = resolveFieldMeta(
      schema,
      props.name,
      props.label,
      props.placeholder,
    )
    const placeholder = metaPlaceholder ?? 'Поиск...'
    const strings = selectionStrings

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

    const promiseSearch = usePromiseSearch<unknown>({
      loadOptions: props.loadOptions,
      search: () => debouncedSearch.value,
      // Запрос уходит, когда список открывали и набран порог `minChars`
      enabled: () =>
        everOpened.value
        && inputValue.value.length >= minChars.value
        && debouncedSearch.value.length >= minChars.value,
      onLoadError: props.onLoadError,
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

    // `loadSelected`: значение непустое и его нет в текущей выдаче
    const valueInResults = computed(() => sourceOptions.value.some((opt) => opt.value === valueKey.value))
    const selectedLoader = useSelectedLoader<unknown>({
      loadSelected: props.loadSelected,
      value: () => valueKey.value,
      enabled: () => !valueInResults.value,
      onLoadError: props.onLoadError,
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
      () => [valueKey.value, sourceOptions.value, selectedSourceOption.value] as const,
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
        const found = sourceOptions.value.find((opt) => opt.value === key)
          ?? (selectedSourceOption.value?.value === key ? selectedSourceOption.value : undefined)
        if (found) {
          syncedValue.value = key
          inputValue.value = getValueText(found)
        }
      },
      { immediate: true },
    )

    const filteredOptions = computed(() => {
      const base = sourceOptions.value
      if (isPromise.value) {
        // Промис-путь: выдачу уже отфильтровал сервер — фильтровать локально нечего
        return base
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
        const value = (field.state.value as string | undefined) || undefined
        const loadError = promiseSearch.error.value

        return FieldWrapper({
          label,
          required,
          hasError,
          errorMessage,
          children: Combobox({
            value,
            inputValue: inputValue.value,
            onInputChange: (next) => {
              inputValue.value = next
            },
            onValueChange: (next) => field.handleChange(next ?? ''),
            onOpenChange: markOpened,
            // Ошибка прячет данные: на экране «Не удалось загрузить», а не выдача прошлого поиска
            options: loadError ? [] : filteredOptions.value,
            loading: !!promiseSearch.isLoading.value || !!selectedLoader.isLoading.value,
            // Обёртка, а не прямой проброс: примитив типизирован по `UIKitSelectOption<UINode>`
            // (`label: UINode`), опции приложения — по `FieldSelectOption` (`label: string`);
            // ищем исходную опцию приложения по значению и передаём её, как `optionByKey` в
            // `field-select.ts` (там та же контравариантная нестыковка сигнатур)
            renderOption: props.renderOption
              ? (opt, state) => {
                const source = sourceOptions.value.find((o) => o.value === opt.value)
                return source ? props.renderOption!(source, state) : opt.label
              }
              : undefined,
            renderValue: props.renderValue
              ? (opt) => {
                const source = sourceOptions.value.find((o) => o.value === opt.value)
                  ?? (selectedSourceOption.value?.value === opt.value ? selectedSourceOption.value : undefined)
                return source ? props.renderValue!(source) : ''
              }
              : undefined,
            // Подпись выбранного значения, когда запись пришла из `loadSelected` — вне `options`
            resolveOption: (rawValue) =>
              selectedSourceOption.value?.value === rawValue ? selectedSourceOption.value : undefined,
            loadError,
            onRetryLoad: promiseSearch.reload,
            loadingText: strings.loading,
            loadErrorText: strings.loadError,
            retryText: strings.retry,
            placeholder,
            'data-field-name': props.name,
          }),
        })
      })
    }
  },
})
