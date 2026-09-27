import { onBeforeUnmount, type Ref, ref, watch } from 'vue'

/**
 * Vue-эквивалент React `useDebounce`: значение с задержкой обновления. Источник и задержка — геттеры
 * (не `Ref`, по соглашению `forms-vue/core` — см. `use-selection-search.ts`, `use-options-loader.ts`),
 * потому что вызывающий код чаще всего сам держит `ref`/`computed` и передаёт `() => x.value`.
 *
 * Первое значение источника отдаётся сразу, без задержки — как и в React-версии (исходный `useState(value)`).
 */
export function useDebounce<T>(source: () => T, delay: () => number = () => 300): Readonly<Ref<T>> {
  const debounced = ref(source()) as Ref<T>
  let timer: ReturnType<typeof setTimeout> | undefined

  watch(source, (value) => {
    if (timer !== undefined) {
      clearTimeout(timer)
    }
    timer = setTimeout(() => {
      debounced.value = value
    }, delay())
  })

  onBeforeUnmount(() => {
    if (timer !== undefined) {
      clearTimeout(timer)
    }
  })

  return debounced
}
