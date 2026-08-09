'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { chakraUIKit } from './uikit-chakra'

interface FieldErrorBoundaryProps {
  /** Имя поля для отображения в сообщении об ошибке */
  fieldName: string
  children: ReactNode
}

interface FieldErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * ErrorBoundary для field-компонентов.
 *
 * Перехватывает ошибки рендеринга внутри отдельного поля формы,
 * показывает fallback вместо краша всей формы.
 * Особенно полезен для кастомных полей через createForm({ extraFields }).
 */
export class FieldErrorBoundary extends Component<FieldErrorBoundaryProps, FieldErrorBoundaryState> {
  constructor(props: FieldErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): FieldErrorBoundaryState {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`[Form] Ошибка в поле "${this.props.fieldName}":`, error, errorInfo)
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      // Внешний вид fallback'а — деталь UI-адаптера (Фаза 7.3): раньше здесь были зашиты
      // Chakra-токены (red.500/red.50 + _dark), теперь их владелец — реализация контракта.
      return <chakraUIKit.ErrorFallback fieldName={this.props.fieldName} message={this.state.error?.message} />
    }

    return this.props.children
  }
}
