import { computed, type ComputedRef, type Ref, ref } from 'vue'
import type { StepInfo } from './step-types'

/**
 * Результат `useStepState`
 */
export interface UseStepStateResult {
  /** Зарегистрированные шаги, отсортированные по индексу */
  sortedSteps: ComputedRef<StepInfo[]>
  /** Количество шагов */
  stepCount: ComputedRef<number>
  /** Зарегистрировать шаг */
  registerStep: (step: StepInfo) => void
  /** Дерегистрировать шаг */
  unregisterStep: (index: number) => void
  /** Shared mutable Set для атомарного назначения уникальных индексов шагам */
  claimedIndices: Set<number>
  /** Скрытые поля (исключены из валидации, интеграция с Form.When — не портирована, см. PLAN.md) */
  hiddenFields: Ref<Set<string>>
  /** Скрыть поля от валидации */
  hideFieldsFromValidation: (fieldNames: string[]) => void
  /** Показать поля для валидации */
  showFieldsForValidation: (fieldNames: string[]) => void
}

/**
 * Composable управления состоянием шагов `Form.Steps` — регистрация/дерегистрация, сортировка по
 * индексу, скрытые поля для будущей `Form.When`-интеграции.
 *
 * Vue-эквивалент `useStepState` из `@letar/forms-react`
 * (`libs/forms-react/src/lib/steps/use-step-state.ts`) — но заметно проще: React-версия держит
 * `claimedIndicesRef` в `useRef`, чтобы пережить ре-рендеры и решить race condition между
 * `useEffect`-ами нескольких `Step`. В Vue `setup()` выполняется один раз (не при каждом
 * ре-рендере), поэтому обычный `Set`, замкнутый в composable, уже стабилен по ссылке — обёртка
 * в `ref()` не нужна.
 */
export function useStepState(): UseStepStateResult {
  const steps = ref<StepInfo[]>([]) as Ref<StepInfo[]>
  const claimedIndices = new Set<number>()
  const hiddenFields = ref<Set<string>>(new Set()) as Ref<Set<string>>

  const sortedSteps = computed(() => [...steps.value].sort((a, b) => a.index - b.index))
  const stepCount = computed(() => sortedSteps.value.length)

  function registerStep(step: StepInfo): void {
    const existing = steps.value.findIndex((s) => s.index === step.index)
    if (existing >= 0) {
      const old = steps.value[existing]
      // Сравнение значимых полей — если не изменились, не трогать state
      if (
        old.title === step.title
        && old.description === step.description
        && old.fieldNames.length === step.fieldNames.length
        && old.fieldNames.every((f, i) => f === step.fieldNames[i])
      ) {
        return
      }
      steps.value.splice(existing, 1, step)
      return
    }
    steps.value.push(step)
  }

  function unregisterStep(index: number): void {
    claimedIndices.delete(index)
    steps.value = steps.value.filter((s) => s.index !== index)
  }

  function hideFieldsFromValidation(fieldNames: string[]): void {
    const next = new Set(hiddenFields.value)
    for (const name of fieldNames) {
      next.add(name)
    }
    hiddenFields.value = next
  }

  function showFieldsForValidation(fieldNames: string[]): void {
    const next = new Set(hiddenFields.value)
    for (const name of fieldNames) {
      next.delete(name)
    }
    hiddenFields.value = next
  }

  return {
    sortedSteps,
    stepCount,
    registerStep,
    unregisterStep,
    claimedIndices,
    hiddenFields,
    hideFieldsFromValidation,
    showFieldsForValidation,
  }
}
