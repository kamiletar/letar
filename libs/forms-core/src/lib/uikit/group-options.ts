/**
 * Grouping options for selection fields (Select, Combobox, Listbox, Autocomplete).
 *
 * Split out of `libs/forms` `use-grouped-options.ts` during Фаза 7.3: that hook mixed two
 * unrelated things — pure grouping logic (this file) and building an Ark UI `ListCollection`
 * (a Chakra runtime structure). The collection is an adapter detail: shadcn has no
 * `createListCollection` at all, so it cannot live in a UI-library-agnostic layer.
 *
 * This module is framework-free: plain functions over plain data, no React, no memoisation.
 * Callers that need memoisation wrap it themselves (`useMemo` in the React layer).
 */

/**
 * Minimal option shape this module needs — deliberately narrower than the full option types.
 * Grouping only ever reads `group`, so the value type is left unconstrained: callers keep
 * their own richer option type through the generic and get it back untouched.
 */
export interface GroupableLike {
  group?: string
}

/**
 * Group options by their `group` key, preserving input order inside each group.
 *
 * Returns `null` when no option carries a group — callers use that as the "render flat"
 * signal, which is cheaper and clearer than checking for an empty Map.
 *
 * @example
 * ```ts
 * const groups = groupOptions([
 *   { value: 'a', group: 'Vowels' },
 *   { value: 'b', group: 'Consonants' },
 *   { value: 'e', group: 'Vowels' },
 * ])
 * // Map { 'Vowels' => [a, e], 'Consonants' => [b] }
 * ```
 */
export function groupOptions<T extends GroupableLike>(options: readonly T[]): Map<string, T[]> | null {
  if (!hasGroups(options)) {
    return null
  }

  const groupMap = new Map<string, T[]>()
  for (const option of options) {
    const key = option.group ?? ''
    const existing = groupMap.get(key)
    if (existing) {
      existing.push(option)
    } else {
      groupMap.set(key, [option])
    }
  }
  return groupMap
}

/** Whether any option declares a group — the signal for grouped vs flat rendering. */
export function hasGroups<T extends GroupableLike>(options: readonly T[]): boolean {
  return options.some((option) => Boolean(option.group))
}

/**
 * Text of an option as a plain string: `textValue` → string (or number) `label` → `String(value)`.
 *
 * Single source for everything that needs a string out of an option: `itemToString` of the
 * adapter collection (typeahead, `valueAsString`), the trigger caption, search/filter and the
 * duplicate check of `onCreate`. `label` is typed loosely because a React adapter allows
 * `ReactNode` labels — a node without `textValue` falls back to the value rather than forcing
 * the core to know about nodes.
 */
export function getOptionText<TValue>(
  item: { label?: unknown; textValue?: string; value: TValue },
): string {
  if (typeof item.textValue === 'string') {
    return item.textValue
  }
  if (typeof item.label === 'string') {
    return item.label
  }
  if (typeof item.label === 'number') {
    return String(item.label)
  }
  return String(item.value)
}

/**
 * Label of an option as a plain string, falling back to its value.
 *
 * Kept as a public name; delegates to `getOptionText`, so `textValue` (when set) wins. For data
 * without `textValue` and with a string label the result is unchanged.
 */
export function getOptionLabel<TValue>(item: { label?: unknown; textValue?: string; value: TValue }): string {
  return getOptionText(item)
}

/**
 * Whether a `ReactNode`-like label needs `textValue` to be searched and shown in the trigger:
 * anything except a string, a number or an empty value. A helper for the dev-only warning.
 */
export function isNodeLabelWithoutText(item: { label?: unknown; textValue?: string }): boolean {
  if (typeof item.textValue === 'string') {
    return false
  }
  const label = item.label
  return label !== null && label !== undefined && typeof label !== 'string' && typeof label !== 'number'
    && typeof label !== 'boolean'
}
