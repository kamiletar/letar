/**
 * Framework-free keyboard navigation for a custom listbox popup (Select/Combobox/Autocomplete)
 * — the pure half of what the headless `forms-vue`/`forms-angular` skins need to replace a native
 * `<select>` with a real ARIA `listbox`. No positioning, no DOM: index arithmetic and type-ahead
 * matching only, so both Vue composables and Angular signal-based helpers wrap the same logic.
 */

/** Minimal option shape this module needs. */
export interface ListboxNavigationOption {
  disabled?: boolean
}

/** Direction of a single navigation step. */
export type ListboxNavigationDirection = 'next' | 'prev' | 'first' | 'last'

/**
 * Next active index for a navigation step, skipping disabled options and wrapping at the ends
 * (`next` past the last option goes to the first enabled one, `prev` before the first wraps to
 * the last). Returns `-1` when every option is disabled or the list is empty — callers keep the
 * previous active index in that case rather than looping forever.
 *
 * `activeIndex` may be `-1` (nothing active yet): `next`/`last` then behave like `first`/`last`.
 */
export function moveListboxActiveIndex<T extends ListboxNavigationOption>(
  options: readonly T[],
  activeIndex: number,
  direction: ListboxNavigationDirection,
): number {
  const count = options.length
  if (count === 0 || options.every((opt) => opt.disabled)) {
    return -1
  }

  if (direction === 'first') {
    return nextEnabled(options, -1, 1)
  }
  if (direction === 'last') {
    return nextEnabled(options, count, -1)
  }
  if (direction === 'next') {
    return nextEnabled(options, activeIndex, 1)
  }
  return nextEnabled(options, activeIndex, -1)
}

/** Walks from `from` in `step` direction (wrapping), returning the first enabled index found. */
function nextEnabled<T extends ListboxNavigationOption>(options: readonly T[], from: number, step: 1 | -1): number {
  const count = options.length
  let index = from
  for (let i = 0; i < count; i++) {
    index = (index + step + count) % count
    if (!options[index].disabled) {
      return index
    }
  }
  return -1
}

/** How long a burst of typed characters counts as one type-ahead query, in milliseconds. */
const TYPE_AHEAD_RESET_MS = 700

/**
 * Type-ahead matcher for a listbox: accumulates characters typed in quick succession (like a
 * native `<select>`) and returns the index of the next option whose text starts with the
 * accumulated query, cycling past the current active option on repeat matches (typing "s" twice
 * moves from the first to the second option starting with "s").
 *
 * Stateful by design (the buffer and its timestamp), but framework-free — a plain closure, not a
 * Vue/Angular primitive. Vue/Angular wrappers create one per field and call `match` from their own
 * keydown handler.
 */
export function createListboxTypeAhead<T>(getText: (option: T) => string) {
  let buffer = ''
  let lastInputAt = 0

  return {
    /**
     * Feeds one typed character. Returns the matched index, or `-1` if nothing matches (the
     * buffer is cleared in that case, so the next keystroke starts a fresh query).
     */
    match(options: readonly (T & ListboxNavigationOption)[], activeIndex: number, char: string): number {
      const now = Date.now()
      buffer = now - lastInputAt > TYPE_AHEAD_RESET_MS ? char : buffer + char
      lastInputAt = now

      const query = buffer.toLowerCase()
      const count = options.length
      // Начинаем поиск сразу после текущей активной опции — повторный ввод той же буквы
      // циклически переходит к следующему совпадению, как в нативном <select>
      for (let i = 1; i <= count; i++) {
        const index = (activeIndex + i) % count
        const option = options[index]
        if (!option.disabled && getText(option).toLowerCase().startsWith(query)) {
          return index
        }
      }
      buffer = ''
      return -1
    },
    /** Clears the buffer immediately (the popup closed, the field lost focus) */
    reset(): void {
      buffer = ''
      lastInputAt = 0
    },
  }
}
