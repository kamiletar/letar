import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import type { RenderOptions } from '@testing-library/react'
import { render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'

// Обёртка со всеми необходимыми провайдерами для тестов
function AllProviders({ children }: { children: ReactNode }) {
  return <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
}

// Кастомная функция render с провайдерами
function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllProviders, ...options })
}

// Реэкспорт всего из @testing-library/react
export * from '@testing-library/react'

// Переопределяем render
export { customRender as render }
