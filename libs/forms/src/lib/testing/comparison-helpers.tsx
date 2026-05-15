import { render, type RenderResult } from '@testing-library/react'
import { createElement } from 'react'

import { TestWrapper } from './test-wrapper'

/**
 * Рендер FormComparison с ChakraProvider.
 *
 * @param original — исходные данные
 * @param current — текущие данные
 * @param options — пропсы FormComparison (onlyChanged, labels, exclude)
 *
 * @example
 * ```tsx
 * import { renderComparison } from '@letar/forms/testing'
 * import { FormComparison } from '@letar/forms'
 *
 * const { getByText } = renderComparison(
 *   { name: 'Иван', email: 'old@test.com' },
 *   { name: 'Иван', email: 'new@test.com' },
 *   { onlyChanged: true }
 * )
 *
 * expect(getByText('new@test.com')).toBeInTheDocument()
 * ```
 */
export function renderComparison(
  original: Record<string, unknown>,
  current: Record<string, unknown>,
  options?: Record<string, unknown>,
): RenderResult {
  // Ленивый импорт — FormComparison из основного пакета
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { FormComparison } = require('../../index') as { FormComparison: React.ComponentType<Record<string, unknown>> }

  return render(
    createElement(
      TestWrapper,
      null,
      createElement(FormComparison, { original, current, ...options }),
    ),
  )
}

/**
 * Рендер FormReadOnlyView с ChakraProvider.
 *
 * @param data — данные для отображения
 * @param options — пропсы FormReadOnlyView (schema, labels, compact, formatters)
 *
 * @example
 * ```tsx
 * import { renderReadOnlyView } from '@letar/forms/testing'
 *
 * const { getByText } = renderReadOnlyView(
 *   { name: 'Иван', email: 'ivan@test.com' },
 *   { compact: true }
 * )
 *
 * expect(getByText('Иван')).toBeInTheDocument()
 * ```
 */
export function renderReadOnlyView(
  data: Record<string, unknown>,
  options?: Record<string, unknown>,
): RenderResult {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { FormReadOnlyView } = require('../../index') as {
    FormReadOnlyView: React.ComponentType<Record<string, unknown>>
  }

  return render(
    createElement(
      TestWrapper,
      null,
      createElement(FormReadOnlyView, { data, ...options }),
    ),
  )
}
