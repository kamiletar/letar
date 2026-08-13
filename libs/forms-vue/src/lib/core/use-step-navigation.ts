import { type Ref, ref } from 'vue'
import type { StepDirection, StepInfo } from './step-types'

const EMPTY_HIDDEN_FIELDS: Set<string> = new Set()

/**
 * Параметры `useStepNavigation`
 */
export interface UseStepNavigationParams {
  /** Инстанс `@tanstack/vue-form` */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Form API `@tanstack/vue-form`
  form: any
  /** Текущий индекс шага (уже смешанный controlled/internal, см. `FormSteps` root) */
  currentStep: Ref<number>
  /** Общее число шагов */
  stepCount: Ref<number>
  /** Отсортированные шаги */
  sortedSteps: Ref<StepInfo[]>
  /** Скрытые поля (интеграция с Form.When — не портирована, см. PLAN.md) */
  hiddenFields?: Ref<Set<string>>
  /** Внешне управляемый шаг (`undefined`, если форма сама управляет текущим шагом) */
  controlledStep?: Ref<number | undefined>
  /** Колбэк при смене шага */
  onStepChange?: (step: number) => void
  /** Колбэк при завершении шага */
  onStepComplete?: (stepIndex: number, values: unknown) => Promise<void> | void
  /** Валидировать при переходе к следующему шагу (по умолчанию `true`) */
  validateOnNext?: boolean
  /** Сеттер внутреннего состояния шага */
  setInternalStep: (step: number) => void
}

/**
 * Результат `useStepNavigation`
 */
export interface UseStepNavigationResult {
  /** Направление перехода (для UI-индикатора/анимации в скине) */
  direction: Ref<StepDirection>
  /** Перейти к следующему шагу (с валидацией) */
  goToNext: () => Promise<boolean>
  /** Перейти к предыдущему шагу */
  goToPrev: () => Promise<void>
  /** Перейти к конкретному шагу */
  goToStep: (step: number) => void
  /** Перескочить в конец (без валидации) */
  skipToEnd: () => void
  /** Программно отправить форму */
  triggerSubmit: () => void
  /** Валидировать текущий шаг */
  validateCurrentStep: () => Promise<boolean>
}

/**
 * Composable навигации между шагами формы — Vue-эквивалент `useStepNavigation` из
 * `@letar/forms-react` (`libs/forms-react/src/lib/steps/use-step-navigation.ts`).
 *
 * React-версия мультиплицирует все параметры через `useRef`, чтобы не пересоздавать колбэки при
 * каждой регистрации шага (иначе бесконечный цикл ре-рендеров — регистрация шага меняет
 * `sortedSteps`, что меняет колбэки, что меняет `contextValue`, что вызывает ре-рендер и повторную
 * регистрацию). В Vue этой проблемы нет: параметры уже приходят `Ref`/computed-ами, `setup()`
 * выполняется один раз, а функции ниже читают актуальное `.value` при каждом вызове — реф-обёртки
 * не нужны.
 */
export function useStepNavigation(params: UseStepNavigationParams): UseStepNavigationResult {
  const direction = ref<StepDirection>('forward') as Ref<StepDirection>

  async function validateCurrentStep(): Promise<boolean> {
    if (params.validateOnNext === false) {
      return true
    }

    const currentStepInfo = params.sortedSteps.value[params.currentStep.value]
    if (!currentStepInfo || currentStepInfo.fieldNames.length === 0) {
      return true
    }

    const hidden = params.hiddenFields?.value ?? EMPTY_HIDDEN_FIELDS
    const visibleFieldNames = currentStepInfo.fieldNames.filter((name) => !hidden.has(name))

    if (visibleFieldNames.length === 0) {
      return true
    }

    // Отметить поля как touched — показать ошибки
    for (const fieldName of visibleFieldNames) {
      params.form.setFieldMeta(fieldName, (prev: unknown) => ({
        ...(prev as Record<string, unknown>),
        isTouched: true,
      }))
    }

    // Провалидировать каждое видимое поле текущего шага
    for (const fieldName of visibleFieldNames) {
      await params.form.validateField(fieldName, 'change')
    }

    // Проверить наличие ошибок
    const state = params.form.store.state
    for (const fieldName of visibleFieldNames) {
      const fieldMeta = state.fieldMeta[fieldName]
      if (fieldMeta?.errors && fieldMeta.errors.length > 0) {
        return false
      }
    }

    return true
  }

  async function goToNext(): Promise<boolean> {
    const isValid = await validateCurrentStep()
    if (!isValid) {
      return false
    }

    const step = params.currentStep.value
    const currentStepInfo = params.sortedSteps.value[step]

    // Колбэк onLeave, если есть (может отменить переход)
    if (currentStepInfo?.onLeave) {
      const canLeave = await currentStepInfo.onLeave('forward')
      if (!canLeave) {
        return false
      }
    }

    // Колбэк onStepComplete
    if (params.onStepComplete) {
      await params.onStepComplete(step, params.form.state.values)
    }

    const nextStep = step + 1
    if (nextStep < params.stepCount.value) {
      direction.value = 'forward'
      if (params.controlledStep?.value === undefined) {
        params.setInternalStep(nextStep)
      }
      params.onStepChange?.(nextStep)

      // Колбэк onEnter следующего шага
      const nextStepInfo = params.sortedSteps.value[nextStep]
      nextStepInfo?.onEnter?.()

      return true
    }
    return false
  }

  async function goToPrev(): Promise<void> {
    const step = params.currentStep.value
    const prevStep = step - 1
    if (prevStep >= 0) {
      const currentStepInfo = params.sortedSteps.value[step]

      // Колбэк onLeave, если есть (может отменить переход)
      if (currentStepInfo?.onLeave) {
        const canLeave = await currentStepInfo.onLeave('backward')
        if (!canLeave) {
          return
        }
      }

      direction.value = 'backward'
      if (params.controlledStep?.value === undefined) {
        params.setInternalStep(prevStep)
      }
      params.onStepChange?.(prevStep)

      // Колбэк onEnter предыдущего шага
      const prevStepInfo = params.sortedSteps.value[prevStep]
      prevStepInfo?.onEnter?.()
    }
  }

  function goToStep(step: number): void {
    if (step >= 0 && step < params.stepCount.value) {
      direction.value = step > params.currentStep.value ? 'forward' : 'backward'
      if (params.controlledStep?.value === undefined) {
        params.setInternalStep(step)
      }
      params.onStepChange?.(step)
    }
  }

  function skipToEnd(): void {
    const count = params.stepCount.value
    direction.value = 'forward'
    if (params.controlledStep?.value === undefined) {
      params.setInternalStep(count) // За последним шагом — состояние "завершено"
    }
    params.onStepChange?.(count)
  }

  function triggerSubmit(): void {
    params.form.handleSubmit()
  }

  return {
    direction,
    goToNext,
    goToPrev,
    goToStep,
    skipToEnd,
    triggerSubmit,
    validateCurrentStep,
  }
}
