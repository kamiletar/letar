'use client'

import { Box, Text } from '@chakra-ui/react'
import { Component, type ErrorInfo, type ReactNode } from 'react'

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
      return (
        <Box p={3} borderWidth="1px" borderColor="red.500" borderRadius="md" bg="red.50" _dark={{ bg: 'red.950' }}>
          <Text color="red.600" _dark={{ color: 'red.300' }} fontSize="sm">
            Ошибка в поле &quot;{this.props.fieldName}&quot;: {this.state.error?.message}
          </Text>
        </Box>
      )
    }

    return this.props.children
  }
}
