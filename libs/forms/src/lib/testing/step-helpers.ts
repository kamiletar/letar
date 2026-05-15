import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/**
 * Перейти на указанный шаг мультистеп-формы.
 *
 * Кликает кнопку "Далее" нужное количество раз (от текущего шага).
 * Если целевой шаг меньше текущего — кликает "Назад".
 *
 * @param step — номер шага (1-based)
 * @param options — кастомные тексты кнопок
 *
 * @example
 * ```tsx
 * await goToStep(3)
 * await goToStep(1, { prevLabel: 'Back' })
 * ```
 */
export async function goToStep(
  step: number,
  options?: { nextLabel?: string; prevLabel?: string },
): Promise<void> {
  const user = userEvent.setup()
  const nextLabel = options?.nextLabel ?? /далее|next|продолжить/i
  const prevLabel = options?.prevLabel ?? /назад|back|prev/i

  const currentStep = getCurrentStep()
  if (currentStep === step) return

  const direction = step > currentStep ? 'forward' : 'backward'
  const clicks = Math.abs(step - currentStep)
  const pattern = direction === 'forward' ? nextLabel : prevLabel

  for (let i = 0; i < clicks; i++) {
    const button = screen.getByRole('button', { name: pattern })
    await user.click(button)
    await waitFor(() => {})
  }
}

/**
 * Проверить, что активен указанный шаг.
 *
 * @param step — ожидаемый номер шага (1-based)
 *
 * @example
 * ```tsx
 * expectActiveStep(2)
 * ```
 */
export function expectActiveStep(step: number): void {
  const current = getCurrentStep()
  if (current !== step) {
    throw new Error(`expectActiveStep: текущий шаг ${current}, ожидался ${step}`)
  }
}

/**
 * Определить текущий активный шаг.
 * Ищет Chakra Steps индикатор или data-step-active.
 */
function getCurrentStep(): number {
  // Chakra Steps: ищем элемент с aria-current="step"
  const activeIndicator = document.querySelector('[aria-current="step"]')
  if (activeIndicator) {
    // Определяем индекс среди siblings
    const parent = activeIndicator.closest('[data-scope="steps"]')
    if (parent) {
      const allSteps = parent.querySelectorAll('[data-part="indicator"]')
      for (let i = 0; i < allSteps.length; i++) {
        if (allSteps[i] === activeIndicator || allSteps[i].contains(activeIndicator)) {
          return i + 1
        }
      }
    }
  }

  // Fallback: data-active-step на контейнере
  const stepsContainer = document.querySelector('[data-active-step]')
  if (stepsContainer) {
    return Number(stepsContainer.getAttribute('data-active-step')) + 1
  }

  return 1
}
