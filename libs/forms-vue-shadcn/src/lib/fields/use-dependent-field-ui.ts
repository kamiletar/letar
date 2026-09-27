import { interpolate } from '@letar/forms-core/i18n'
import { getFieldMeta } from '@letar/forms-core/schema'
import type { FieldDeps } from '@letar/forms-core/uikit'
import { type DependentFieldState, useDependentField, type UseDependentFieldOptions } from '@letar/forms-vue/core'
import { computed, type ComputedRef, h } from 'vue'
import type { ZodType } from 'zod'
import type { UINode } from '../uikit/ui-node'
import { selectionStrings } from './selection-strings'

/**
 * `dependsOn`/`groupPath`/`values` остаются геттерами (контракт `UseDependentFieldOptions` из
 * Stage 2, `@letar/forms-vue/core`) — Vue `setup()` выполняется один раз, реактивность на смену
 * пропа/значения формы держится только через функцию, читаемую внутри `computed`, а не через
 * захваченное на вызове значение. `getParentLabel`/`emptyValue` считает сама эта функция.
 */
export interface DependentFieldUiOptions<TDeps extends FieldDeps = FieldDeps>
  extends Omit<UseDependentFieldOptions<TDeps>, 'getParentLabel' | 'emptyValue'>
{
  /** Подпись самого поля (для объявления об очистке) — уже разрешённая (`resolved.label` полей) */
  label: string | undefined
  schema: ZodType
  /** Реактивная карта видимых подписей полей формы (`AppFormContext.labels`) */
  labels: Map<string, string>
  /** Текст в заблокированном поле. По умолчанию — подсказка «Сначала выберите «{метка родителя}»» */
  placeholderWhenDisabled?: string
}

export interface DependentFieldUi<TDeps extends FieldDeps = FieldDeps> {
  /** Состояние из `useDependentField`: `deps`, `depsKey`, `ready`, `cleared`… */
  state: DependentFieldState<TDeps>
  active: ComputedRef<boolean>
  deps: ComputedRef<TDeps>
  /** Поле заблокировано: родители не готовы */
  blocked: ComputedRef<boolean>
  /** Placeholder заблокированного поля: `placeholderWhenDisabled` либо «Сначала выберите «Страна»» */
  blockedPlaceholder: ComputedRef<string | undefined>
  /** Id видимой подсказки — для `aria-describedby` */
  hintId: string
  /** Видимая подсказка «Сначала выберите «Страна»» (`null` — поле не заблокировано) */
  hintText: ComputedRef<string | null>
  /** Текст для live-области: «Поле «Город» очищено: изменилось поле «Страна»» (пусто — очистки не было) */
  liveMessage: ComputedRef<string>
}

function lastSegment(path: string): string {
  const index = path.lastIndexOf('.')
  return index === -1 ? path : path.slice(index + 1)
}

/**
 * Зависимое поле (§18) для `forms-vue-shadcn`: `useDependentField` (`@letar/forms-vue/core`, Stage 2) плюс
 * тексты и разметка a11y — Vue-эквивалент React `useDependentFieldUi` (`@letar/forms-shadcn`,
 * `fields/use-dependent-field-ui.tsx`). Строки захардкожены на русском (`selectionStrings`, как и весь
 * Stage 3 этого скина) — в Vue-стеке ещё нет `FormI18nProvider`. Вызывать из `setup()` поля, не из `render`.
 */
export function useDependentFieldUi<TDeps extends FieldDeps = FieldDeps>(
  options: DependentFieldUiOptions<TDeps>,
): DependentFieldUi<TDeps> {
  const {
    fullPath,
    label,
    groupPath,
    values,
    schema,
    labels,
    dependents,
    setValue,
    dependsOn,
    depsReady,
    clearOnParentChange,
    disableWhenParentEmpty,
    placeholderWhenDisabled,
  } = options

  const hintId = `${fullPath.replace(/\./g, '-')}-depends-hint`

  // Подпись родителя: видимая подпись поля из реестра формы (`labels`), иначе `ui.title` схемы
  const getParentLabel = (path: string): string | undefined => {
    const registered = labels.get(path)
    if (registered) {
      return registered
    }
    const title = getFieldMeta(schema, path).ui?.title
    return typeof title === 'string' && title !== '' ? title : undefined
  }

  const state = useDependentField<TDeps>({
    fullPath,
    dependsOn,
    groupPath,
    values,
    depsReady,
    dependents,
    setValue,
    clearOnParentChange,
    disableWhenParentEmpty,
    // Тот же контракт очистки, что у собственной кнопки очистки этого скина (`applyValue(undefined)` → `''`)
    emptyValue: '',
    getParentLabel,
  })

  const blocked = state.blocked
  const hintText = computed<string | null>(() =>
    blocked.value
      ? interpolate(selectionStrings.dependsOnHint, { parent: state.missingParentLabels.value.join('», «') })
      : null
  )
  const fieldLabel = label && label.trim() !== '' ? label : lastSegment(fullPath)
  const liveMessage = computed(() => {
    const cleared = state.cleared.value
    return cleared
      ? interpolate(selectionStrings.dependentCleared, { field: fieldLabel, parent: cleared.parentLabel })
      : ''
  })
  const blockedPlaceholder = computed(() =>
    blocked.value ? placeholderWhenDisabled ?? hintText.value ?? undefined : undefined
  )

  return {
    state,
    active: state.active,
    deps: state.deps,
    blocked,
    blockedPlaceholder,
    hintId,
    hintText,
    liveMessage,
  }
}

/**
 * Подсказка под заблокированным полем — `<span id>` для `FieldError({ helperText })`. Пока на поле
 * показана ошибка валидации, подсказки нет — тогда и `aria-describedby` не ставится (та же политика,
 * что в React-версии).
 */
export function dependentHelperText(
  ui: DependentFieldUi,
  hasError: boolean,
): { helperText: UINode | undefined; describedBy: string | undefined } {
  const hint = ui.hintText.value
  if (!hint || hasError) {
    return { helperText: undefined, describedBy: undefined }
  }
  return {
    helperText: h('span', { id: ui.hintId, 'data-slot': 'dependent-hint' }, hint),
    describedBy: ui.hintId,
  }
}

/**
 * Вежливая live-область: объявляет, что значение очищено из-за смены родителя. Рендерится всегда, пока
 * у поля есть `dependsOn` — область должна быть в DOM до появления текста, иначе скринридер молчит.
 */
export function DependentLiveRegion(ui: DependentFieldUi): UINode {
  if (!ui.active.value) {
    return null
  }
  return h(
    'span',
    { class: 'sr-only', 'aria-live': 'polite', 'aria-atomic': 'true', 'data-dependent-live': '' },
    ui.liveMessage.value,
  )
}
