'use client'

import { Box, Button, Card, Heading, Text, VStack } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { Component } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary component for catching React errors
 * Usage: Wrap any component tree that might throw errors
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  override render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <Box p="8" maxW="2xl" mx="auto">
          <Card.Root bg="red.900" borderColor="red.700">
            <Card.Body>
              <VStack gap="4" align="start">
                <Heading size="lg" color="red.100">
                  Что-то пошло не так
                </Heading>
                <Text color="red.200">Произошла ошибка при отображении этого компонента.</Text>
                {this.state.error && (
                  <Box
                    bg="red.950"
                    p="4"
                    borderRadius="md"
                    fontFamily="mono"
                    fontSize="sm"
                    color="red.300"
                    maxW="100%"
                    overflow="auto"
                  >
                    <Text fontWeight="bold" mb="2">
                      Ошибка:
                    </Text>
                    <Text>{this.state.error.message}</Text>
                    {this.state.error.stack && (
                      <>
                        <Text fontWeight="bold" mt="3" mb="2">
                          Stack trace:
                        </Text>
                        <Text fontSize="xs" whiteSpace="pre-wrap">
                          {this.state.error.stack}
                        </Text>
                      </>
                    )}
                  </Box>
                )}
                <Button onClick={this.handleReset} colorPalette="red" variant="outline">
                  Попробовать снова
                </Button>
              </VStack>
            </Card.Body>
          </Card.Root>
        </Box>
      )
    }

    return this.props.children
  }
}

/**
 * Simpler error fallback component for inline use
 */
export const ErrorFallback = ({ error, resetError }: { error: Error; resetError?: () => void }) => (
  <Box p="6" bg="red.50" borderRadius="md" borderWidth="1px" borderColor="red.200">
    <Heading size="md" color="red.700" mb="2">
      Ошибка
    </Heading>
    <Text color="red.600" mb="4">
      {error.message}
    </Text>
    {resetError && (
      <Button onClick={resetError} size="sm" colorPalette="red">
        Повторить
      </Button>
    )}
  </Box>
)
