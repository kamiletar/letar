import { within } from '@testing-library/react'

/**
 * Проверить, что поле показывает ошибку с указанным текстом.
 *
 * Ищет контейнер поля по `data-field-name`, затем ищет
 * Chakra `Field.ErrorText` внутри ближайшего `Field.Root`.
 *
 * @param name — имя поля
 * @param message — ожидаемый текст ошибки (подстрока)
 *
 * @example
 * ```tsx
 * expectFieldError('email', 'Некорректный email')
 * ```
 */
export function expectFieldError(name: string, message: string): void {
  const container = findFieldContainer(name)
  if (!container) {
    throw new Error(`expectFieldError: контейнер поля "${name}" не найден`)
  }

  const errorText = within(container).queryByText(message)
  if (!errorText) {
    // Собираем все тексты в контейнере для диагностики
    const allText = container.textContent ?? ''
    throw new Error(
      `expectFieldError: ошибка "${message}" не найдена в поле "${name}". Содержимое поля: "${allText.slice(0, 200)}"`,
    )
  }
}

/**
 * Проверить, что поле НЕ показывает ошибок.
 *
 * @param name — имя поля
 *
 * @example
 * ```tsx
 * expectNoFieldError('email')
 * ```
 */
export function expectNoFieldError(name: string): void {
  const container = findFieldContainer(name)
  if (!container) {
    // Нет контейнера = нет ошибки
    return
  }

  // Chakra Field.Root устанавливает data-invalid при наличии ошибки
  const isInvalid = container.hasAttribute('data-invalid')
  if (isInvalid) {
    const errorTexts = container.querySelectorAll('[data-part="error-text"]')
    const messages = Array.from(errorTexts)
      .map((el) => el.textContent)
      .join(', ')
    throw new Error(`expectNoFieldError: поле "${name}" содержит ошибки: ${messages}`)
  }
}

/**
 * Проверить текущее значение поля.
 *
 * @param name — имя поля
 * @param value — ожидаемое значение
 *
 * @example
 * ```tsx
 * expectFieldValue('name', 'Иван')
 * expectFieldValue('agree', true)
 * ```
 */
export function expectFieldValue(name: string, value: unknown): void {
  const element = document.querySelector<HTMLInputElement>(`[data-field-name="${name}"]`)
  if (!element) {
    throw new Error(`expectFieldValue: поле "${name}" не найдено по data-field-name`)
  }

  const inputType = element.getAttribute('type')?.toLowerCase() ?? ''

  if (inputType === 'checkbox') {
    const actual = element.checked
    if (actual !== Boolean(value)) {
      throw new Error(`expectFieldValue: поле "${name}" — checked=${actual}, ожидалось ${value}`)
    }
    return
  }

  const actual = element.value
  const expected = String(value ?? '')
  if (actual !== expected) {
    throw new Error(`expectFieldValue: поле "${name}" — значение "${actual}", ожидалось "${expected}"`)
  }
}

/**
 * Найти ближайший Field.Root контейнер для поля.
 * Field.Root — это fieldset[role=group] или div с data-part="root".
 */
function findFieldContainer(name: string): HTMLElement | null {
  // Ищем элемент поля
  const fieldElement = document.querySelector<HTMLElement>(`[data-field-name="${name}"]`)
  if (!fieldElement) return null

  // Поднимаемся к Field.Root (Chakra ставит data-scope="field")
  let current: HTMLElement | null = fieldElement
  while (current) {
    if (current.hasAttribute('data-scope') && current.getAttribute('data-scope') === 'field') {
      return current
    }
    current = current.parentElement
  }

  // Fallback: ближайший fieldset или div с role="group"
  return fieldElement.closest('fieldset, [role="group"]') as HTMLElement | null
}
