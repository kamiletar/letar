import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TestWrapper } from '../../../testing/test-wrapper'
import { FieldErrorBoundary } from './field-error-boundary'

/**
 * Тесты появились в Фазе 7.3 вместе с переводом fallback'а на UIKit-контракт
 * (`chakraUIKit.ErrorFallback`) — до этого компонент не был покрыт вовсе, хотя именно он
 * решает, увидит ли пользователь сломанное поле или белый экран вместо всей формы.
 */

function Boom(): ReactElement {
  throw new Error('поле взорвалось')
}

describe('FieldErrorBoundary', () => {
  beforeEach(() => {
    // React логирует пойманную ошибку в console.error — глушим, чтобы не шуметь в выводе тестов
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('рендерит детей, когда ошибки нет', () => {
    render(
      <TestWrapper>
        <FieldErrorBoundary fieldName="email">
          <span>всё в порядке</span>
        </FieldErrorBoundary>
      </TestWrapper>,
    )

    expect(screen.getByText('всё в порядке')).toBeInTheDocument()
  })

  it('перехватывает ошибку поля и показывает fallback вместо краша', () => {
    render(
      <TestWrapper>
        <FieldErrorBoundary fieldName="email">
          <Boom />
        </FieldErrorBoundary>
      </TestWrapper>,
    )

    // Имя поля и текст ошибки должны быть видны — это то, по чему разработчик находит причину
    expect(screen.getByText(/email/)).toBeInTheDocument()
    expect(screen.getByText(/поле взорвалось/)).toBeInTheDocument()
  })

  it('не даёт ошибке в одном поле снести соседние', () => {
    render(
      <TestWrapper>
        <div>
          <FieldErrorBoundary fieldName="broken">
            <Boom />
          </FieldErrorBoundary>
          <FieldErrorBoundary fieldName="fine">
            <span>соседнее поле живо</span>
          </FieldErrorBoundary>
        </div>
      </TestWrapper>,
    )

    expect(screen.getByText(/broken/)).toBeInTheDocument()
    expect(screen.getByText('соседнее поле живо')).toBeInTheDocument()
  })

  it('логирует ошибку с именем поля', () => {
    render(
      <TestWrapper>
        <FieldErrorBoundary fieldName="phone">
          <Boom />
        </FieldErrorBoundary>
      </TestWrapper>,
    )

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('phone'),
      expect.any(Error),
      expect.anything(),
    )
  })
})
