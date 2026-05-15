import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/**
 * Заполнить поле формы по имени.
 *
 * Автоматически определяет тип поля и использует правильное взаимодействие:
 * - text/email/password/textarea → clear + type
 * - number → clear + type
 * - checkbox/switch → click (если значение отличается)
 *
 * Поиск: сначала по `data-field-name`, затем по label.
 *
 * @param name — имя поля (соответствует data-field-name или label)
 * @param value — значение для заполнения
 *
 * @example
 * ```tsx
 * await fillField('email', 'test@example.com')
 * await fillField('agree', true)
 * await fillField('age', 25)
 * ```
 */
export async function fillField(name: string, value: unknown): Promise<void> {
  const user = userEvent.setup()
  const element = findFieldElement(name)

  if (!element) {
    throw new Error(`fillField: поле "${name}" не найдено. Проверьте data-field-name или label.`)
  }

  const tagName = element.tagName.toLowerCase()
  const inputType = element.getAttribute('type')?.toLowerCase() ?? ''

  // Checkbox / Switch
  if (inputType === 'checkbox' || element.getAttribute('role') === 'switch') {
    const isChecked = (element as HTMLInputElement).checked
    const shouldBeChecked = Boolean(value)
    if (isChecked !== shouldBeChecked) {
      await user.click(element)
    }
    return
  }

  // Radio
  if (inputType === 'radio') {
    await user.click(element)
    return
  }

  // Text, email, password, number, textarea
  if (tagName === 'input' || tagName === 'textarea') {
    await user.clear(element)
    if (value !== '' && value !== null && value !== undefined) {
      await user.type(element, String(value))
    }
    return
  }

  throw new Error(
    `fillField: не удалось определить тип поля "${name}" (tag: ${tagName}, type: ${inputType}). Используйте userEvent напрямую.`,
  )
}

/**
 * Найти DOM-элемент поля по имени.
 * Приоритет: data-field-name → label → placeholder.
 */
function findFieldElement(name: string): HTMLElement | null {
  // 1. По data-field-name (самый надёжный)
  const byAttr = document.querySelector<HTMLElement>(`[data-field-name="${name}"]`)
  if (byAttr) return byAttr

  // 2. По label text (fallback)
  try {
    return screen.getByLabelText(name) as HTMLElement
  } catch {
    // label не найден
  }

  // 3. По placeholder
  try {
    return screen.getByPlaceholderText(name) as HTMLElement
  } catch {
    // placeholder не найден
  }

  return null
}
