import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { FormReadOnlyView } from './form-readonly-view'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FormReadOnlyView', () => {
  const data = {
    name: 'Иван Петров',
    email: 'ivan@test.com',
    role: 'Администратор',
    isActive: true,
  }

  it('отображает все поля из data', () => {
    render(<FormReadOnlyView data={data} />, { wrapper: TestWrapper })
    expect(screen.getByText('Иван Петров')).toBeInTheDocument()
    expect(screen.getByText('ivan@test.com')).toBeInTheDocument()
    expect(screen.getByText('Администратор')).toBeInTheDocument()
    expect(screen.getByText('Да')).toBeInTheDocument()
  })

  it('использует кастомные labels', () => {
    render(<FormReadOnlyView data={data} labels={{ name: 'ФИО', email: 'Почта' }} />, { wrapper: TestWrapper })
    expect(screen.getByText('ФИО')).toBeInTheDocument()
    expect(screen.getByText('Почта')).toBeInTheDocument()
  })

  it('exclude фильтрует поля', () => {
    render(<FormReadOnlyView data={data} exclude={['email', 'isActive']} />, { wrapper: TestWrapper })
    expect(screen.getByText('Иван Петров')).toBeInTheDocument()
    expect(screen.queryByText('ivan@test.com')).not.toBeInTheDocument()
    expect(screen.queryByText('Да')).not.toBeInTheDocument()
  })

  it('include показывает только выбранные поля', () => {
    render(<FormReadOnlyView data={data} include={['name']} />, { wrapper: TestWrapper })
    expect(screen.getByText('Иван Петров')).toBeInTheDocument()
    expect(screen.queryByText('ivan@test.com')).not.toBeInTheDocument()
  })

  it('форматирует boolean как Да/Нет', () => {
    render(<FormReadOnlyView data={{ active: true, deleted: false }} />, { wrapper: TestWrapper })
    expect(screen.getByText('Да')).toBeInTheDocument()
    expect(screen.getByText('Нет')).toBeInTheDocument()
  })

  it('форматирует null как "—"', () => {
    render(<FormReadOnlyView data={{ value: null }} />, { wrapper: TestWrapper })
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('использует кастомный formatter', () => {
    render(<FormReadOnlyView data={{ price: 1500 }} formatters={{ price: (v) => `${v} ₽` }} />, {
      wrapper: TestWrapper,
    })
    expect(screen.getByText('1500 ₽')).toBeInTheDocument()
  })

  it('humanizeKey преобразует camelCase', () => {
    render(<FormReadOnlyView data={{ firstName: 'Иван' }} />, { wrapper: TestWrapper })
    expect(screen.getByText('First Name')).toBeInTheDocument()
  })

  it('compact режим рендерит HStack', () => {
    const { container } = render(<FormReadOnlyView data={{ name: 'Иван' }} compact />, { wrapper: TestWrapper })
    // В compact режиме не должно быть Separator
    expect(container.querySelector('[data-scope="separator"]')).toBeNull()
  })
})
