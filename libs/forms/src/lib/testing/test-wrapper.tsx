import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import type { ReactNode } from 'react'

/**
 * Обёртка для тестов — ChakraProvider с defaultSystem.
 * Заменяет дублирующийся TestWrapper в каждом spec-файле.
 *
 * @example
 * ```tsx
 * import { TestWrapper } from '@letar/forms/testing'
 *
 * render(
 *   <TestWrapper>
 *     <MyForm />
 *   </TestWrapper>
 * )
 * ```
 */
export function TestWrapper({ children }: { children: ReactNode }) {
  return <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
}
