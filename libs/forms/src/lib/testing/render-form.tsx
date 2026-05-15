import { render } from '@testing-library/react'
import type { ComponentType } from 'react'
import { createElement } from 'react'

import { expectFieldError, expectNoFieldError } from './expect-helpers'
import { fillField } from './fill-field'
import { submitForm } from './submit-form'
import { TestWrapper } from './test-wrapper'
import type { RenderFormOptions, RenderFormResult } from './types'

/**
 * Рендер компонента формы в ChakraProvider с тестовыми хелперами.
 *
 * Возвращает стандартный RenderResult + привязанные хелперы:
 * - `fillField(name, value)` — заполнить поле
 * - `submitForm(text?)` — кликнуть сабмит
 * - `expectFieldError(name, message)` — проверить ошибку
 * - `expectNoFieldError(name)` — проверить отсутствие ошибки
 * - `onSubmit` — мок-функция
 *
 * @example
 * ```tsx
 * import { renderForm } from '@letar/forms/testing'
 *
 * const { fillField, submitForm, onSubmit } = renderForm(ContactForm)
 *
 * await fillField('name', 'Иван')
 * await fillField('email', 'ivan@test.com')
 * await submitForm()
 *
 * expect(onSubmit).toHaveBeenCalled()
 * ```
 *
 * @example С начальными значениями
 * ```tsx
 * const { fillField } = renderForm(EditForm, {
 *   defaults: { name: 'Старое', email: 'old@test.com' },
 *   onSubmit: vi.fn(),
 * })
 * ```
 */
export function renderForm<TData extends Record<string, unknown> = Record<string, unknown>>(
  Component: ComponentType<Record<string, unknown>>,
  options?: RenderFormOptions<TData>,
): RenderFormResult<TData> {
  // Создаём мок onSubmit если не передан
  const onSubmit = options?.onSubmit ?? createMockFn()

  // Собираем пропсы
  const componentProps: Record<string, unknown> = {
    ...options?.props,
    onSubmit,
  }

  if (options?.defaults) {
    componentProps.initialValue = options.defaults
    componentProps.defaults = options.defaults
  }

  // Рендерим с ChakraProvider
  const renderResult = render(
    createElement(TestWrapper, null, createElement(Component, componentProps)),
  )

  return {
    ...renderResult,
    onSubmit,
    fillField: (name: string & keyof TData, value: unknown) => fillField(name, value),
    submitForm: (buttonText?: string) => submitForm(buttonText),
    expectFieldError: (name: string & keyof TData, message: string) => expectFieldError(name, message),
    expectNoFieldError: (name: string & keyof TData) => expectNoFieldError(name),
  }
}

/**
 * Создать мок-функцию (vitest или jest)
 */
function createMockFn(): (...args: unknown[]) => void {
  // vitest
  if (typeof globalThis !== 'undefined' && 'vi' in globalThis) {
    return (globalThis as Record<string, unknown>).vi
        && typeof ((globalThis as Record<string, unknown>).vi as Record<string, unknown>).fn === 'function'
      ? ((globalThis as Record<string, unknown>).vi as { fn: () => (...args: unknown[]) => void }).fn()
      : noopMock()
  }

  // jest
  if (typeof globalThis !== 'undefined' && 'jest' in globalThis) {
    return (globalThis as unknown as { jest: { fn: () => (...args: unknown[]) => void } }).jest.fn()
  }

  return noopMock()
}

/** Fallback мок с записью вызовов */
function noopMock(): ((...args: unknown[]) => void) & { calls: unknown[][] } {
  const calls: unknown[][] = []
  const fn = (...args: unknown[]) => {
    calls.push(args)
  }
  fn.calls = calls
  return fn
}
