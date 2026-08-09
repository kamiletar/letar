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
 * Label of an option as a plain string, falling back to its value.
 *
 * Used both for accessible text and for adapter-side collection building (`itemToString`).
 * `label` is typed loosely because a React adapter allows `ReactNode` labels — anything
 * non-string falls back to the value rather than forcing the core to know about nodes.
 */
export function getOptionLabel<TValue>(item: { label?: unknown; value: TValue }): string {
  return typeof item.label === 'string' ? item.label : String(item.value)
}
