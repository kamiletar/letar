import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/**
 * Кликнуть кнопку сабмита формы.
 *
 * Поиск кнопки:
 * 1. По тексту (если передан buttonText)
 * 2. По `type="submit"`
 * 3. По тексту, содержащему "отправить", "сохранить", "submit"
 *
 * @param buttonText — текст кнопки (опционально)
 *
 * @example
 * ```tsx
 * await submitForm()
 * await submitForm('Сохранить')
 * ```
 */
export async function submitForm(buttonText?: string): Promise<void> {
  const user = userEvent.setup()
  const button = findSubmitButton(buttonText)

  if (!button) {
    throw new Error(
      `submitForm: кнопка сабмита не найдена${
        buttonText ? ` (текст: "${buttonText}")` : ''
      }. Проверьте наличие button[type="submit"] или Form.Button.Submit.`,
    )
  }

  await user.click(button)

  // Ждём завершения async-операций (валидация, обработка)
  await waitFor(() => {})
}

/**
 * Найти кнопку сабмита.
 */
function findSubmitButton(buttonText?: string): HTMLElement | null {
  // 1. По тексту
  if (buttonText) {
    try {
      return screen.getByRole('button', { name: buttonText })
    } catch {
      // не найдена
    }
  }

  // 2. По type="submit"
  const submitBtn = document.querySelector<HTMLElement>('button[type="submit"]')
  if (submitBtn) return submitBtn

  // 3. По типичным текстам
  const patterns = [/отправить/i, /сохранить/i, /submit/i, /save/i, /создать/i]
  for (const pattern of patterns) {
    try {
      return screen.getByRole('button', { name: pattern })
    } catch {
      // следующий паттерн
    }
  }

  return null
}
