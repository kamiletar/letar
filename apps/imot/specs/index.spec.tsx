import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

// Мокаем серверные зависимости
vi.mock('../src/lib/auth', () => ({
  getSession: vi.fn().mockResolvedValue(null),
}))

// Мокаем next/headers (требуется для серверных компонентов)
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
  cookies: vi.fn().mockReturnValue({ get: vi.fn(), set: vi.fn() }),
}))

describe('HomePage', () => {
  it('рендерится успешно для неавторизованного пользователя', async () => {
    const { default: Page } = await import('../src/app/page')
    const result = await Page()
    const { baseElement } = render(<ChakraProvider value={defaultSystem}>{result}</ChakraProvider>)
    expect(baseElement).toBeTruthy()
    expect(screen.getByText(/Интегративная методология/)).toBeInTheDocument()
    expect(screen.getByText('Вход')).toBeInTheDocument()
    expect(screen.getByText('Регистрация')).toBeInTheDocument()
  })
})
