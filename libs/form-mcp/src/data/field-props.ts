/**
 * Пропсы, которые нельзя вывести из `fields.md` (там — таблица «компонент — описание»): зависимые поля выбора
 * (этап З, `libs/forms/PLAN.md` §18). Отдаются `get_field_props` в поле `props` для Select и Combobox.
 */

/** Один проп поля */
export interface FieldPropInfo {
  /** Имя пропа */
  name: string
  /** Сигнатура/тип (TypeScript) */
  type: string
  /** Значение по умолчанию, если есть */
  default?: string
  /** Описание */
  description: string
}

/** Пропсы зависимости, общие для Select и Combobox (`DependentFieldProps` из `@letar/forms-core/uikit`) */
const DEPENDENCY_PROPS: FieldPropInfo[] = [
  {
    name: 'dependsOn',
    type: 'string | readonly string[]',
    description:
      'Field(s) the list depends on. The path is relative to the current group (like `name`); a leading "/" means from the form root '
      + '(`dependsOn="/countryId"` inside an array row). The `deps` object keys are the names as written, without the "/". '
      + 'From a schema: `@meta("form.dependsOn", "countryId")`.',
  },
  {
    name: 'depsReady',
    type: '(deps: TDeps) => boolean',
    default: 'all deps values are non-empty',
    description: 'Own readiness check of the parents. Empty means undefined, null, "" and []; 0 and false are values. '
      + 'Not ready: the field is disabled (with disableWhenParentEmpty) and the loaders are not called.',
  },
  {
    name: 'clearOnParentChange',
    type: 'boolean',
    default: 'true',
    description:
      'Clear the value when the user EDITS a parent (choice, field.handleChange, form.setFieldValue). Form hydration, reset(values), '
      + 'a new initialValue, UrlSync/useUrlPrefill and restoring a draft do not clear it. Use `dependents.suppress(fn)` from '
      + '`useDeclarativeForm()` to write parent and child together.',
  },
  {
    name: 'disableWhenParentEmpty',
    type: 'boolean',
    default: 'true',
    description:
      'Disable the field while the parents are not ready: native `disabled` plus a visible hint under the field tied to the trigger by aria-describedby. '
      + 'A stored value is shown, not erased.',
  },
  {
    name: 'placeholderWhenDisabled',
    type: 'string',
    default: '"Select «<parent label>» first" (i18n formSelection.dependsOnHint)',
    description: 'Text of the disabled field.',
  },
]

/** Select: три источника опций (ровно один) и `deps` в действиях */
const SELECT_PROPS: FieldPropInfo[] = [
  ...DEPENDENCY_PROPS,
  {
    name: 'options',
    type: 'Option[] | ((deps: TDeps) => Option[])',
    description:
      'Exactly ONE source: `options` | `loadOptions` | `useOptions`. A function of `deps` filters an already loaded full list '
      + '(category -> subcategory) without a request.',
  },
  {
    name: 'loadOptions',
    type: '(search: string, ctx: { signal: AbortSignal; deps: TDeps }) => Promise<TData[]>',
    description:
      "One load per parent value (per depsKey); `search` is always '' (the Select has no server search). The previous parent's options are not shown "
      + 'while the new ones load; `signal` is aborted on a parent change and on unmount. Use getLabel/getValue like the Combobox.',
  },
  {
    name: 'useOptions',
    type: '(deps: TDeps) => { options: Option[]; loading: boolean }',
    description:
      'A hook source, the same shape as `useQueryOptions(...).fieldProps` from @letar/forms-query; called on every render with the current `deps`.',
  },
  {
    name: 'onCreate',
    type: '(search: string, ctx: { optimistic; deps: TDeps }) => Promise<CreatedOption | null>',
    description:
      '`ctx.deps` is a snapshot at the moment the action started: the create dialog gets the country that was selected on click.',
  },
  {
    name: 'onUpdate',
    type: '(option, ctx: { optimistic; deps: TDeps }) => Promise<UpdatedOption | null>',
    description: '`ctx.deps` — same snapshot as in onCreate. `onSettleError(info)` also gets `info.deps`.',
  },
]

/** Combobox: `deps` во всех источниках и действиях */
const COMBOBOX_PROPS: FieldPropInfo[] = [
  ...DEPENDENCY_PROPS,
  {
    name: 'loadOptions',
    type: '(search: string, ctx: { signal: AbortSignal; deps: TDeps }) => Promise<TData[]>',
    description:
      'Promise source. The request key is nonce + depsKey + search: a parent change aborts the previous request (`signal`) and only the last result is applied.',
  },
  {
    name: 'loadSelected',
    type: '(value: string, ctx: { signal: AbortSignal; deps: TDeps }) => Promise<TData | null>',
    description:
      'Record of the current value for its label (edit forms). Cached by `value` — it is not reset on a parent change.',
  },
  {
    name: 'useQuery',
    type: '(search: string, deps: TDeps) => { data?: TData[]; isLoading?: boolean; isPlaceholderData?: boolean }',
    description:
      'Hook source: `deps` is the second argument. With `isPlaceholderData` (keepPreviousData) the field shows no options of ANOTHER parent after a parent change, '
      + 'while a search inside the same parent keeps the previous list. With @letar/forms-query: `fromSearchQuery((search, options, deps) => …)`, '
      + '`useLoaderQuery(key, load)` puts `deps` into the query key.',
  },
  {
    name: 'useSelected',
    type: '(value: string, deps: TDeps) => { data?: TData | null; isLoading?: boolean }',
    description:
      'Hook pair of `loadSelected`: `deps` is the second argument (`fromSelectedQuery((value, options, deps) => …)`).',
  },
  {
    name: 'onCreate',
    type: '(search: string, ctx: { optimistic; deps: TDeps }) => Promise<CreatedOption | null>',
    description:
      '`ctx.deps` is a snapshot at the moment the action started. A parent change while an optimistic create is pending drops the pending selection; '
      + 'the confirmed option lands only in the cache of the previous parent. Invalidate the right list: `useInvalidateAfter((ctx) => [["employees", ctx.deps.companyId]])`.',
  },
  {
    name: 'onUpdate',
    type: '(option, ctx: { optimistic; deps: TDeps }) => Promise<UpdatedOption | null>',
    description: '`ctx.deps` — same snapshot as in onCreate. `onSettleError(info)` also gets `info.deps`.',
  },
]

/** Дополнительные пропсы по короткому имени поля (в нижнем регистре) */
export const FIELD_EXTRA_PROPS: Record<string, FieldPropInfo[]> = {
  select: SELECT_PROPS,
  combobox: COMBOBOX_PROPS,
}
