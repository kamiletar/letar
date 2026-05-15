import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { FormSkeleton } from './form-skeleton'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FormSkeleton', () => {
  it('экспортирует компонент', () => {
    expect(typeof FormSkeleton).toBe('function')
  })

  it('рендерится без ошибок с числом полей', () => {
    const { container } = render(<FormSkeleton fields={3} />, { wrapper: TestWrapper })
    // VStack рендерит children — 3 поля + submit = минимум 4 box
    expect(container.firstChild).toBeTruthy()
    expect(container.innerHTML.length).toBeGreaterThan(50)
  })

  it('рендерится без ошибок с Zod-like schema', () => {
    const mockSchema = {
      _def: {
        shape: () => ({ name: {}, email: {}, phone: {}, age: {} }),
      },
    }
    const { container } = render(<FormSkeleton fields={mockSchema} />, { wrapper: TestWrapper })
    expect(container.firstChild).toBeTruthy()
  })

  it('рендерится с дефолтным количеством полей', () => {
    const { container } = render(<FormSkeleton />, { wrapper: TestWrapper })
    expect(container.firstChild).toBeTruthy()
  })

  it('showSubmit=false рендерит меньше элементов', () => {
    const { container: withSubmit } = render(<FormSkeleton fields={2} showSubmit />, { wrapper: TestWrapper })
    const { container: noSubmit } = render(<FormSkeleton fields={2} showSubmit={false} />, { wrapper: TestWrapper })
    expect(withSubmit.innerHTML.length).toBeGreaterThan(noSubmit.innerHTML.length)
  })
})
