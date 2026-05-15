import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { FormComparison } from './form-comparison'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FormComparison', () => {
  const original = { name: 'Иван', email: 'ivan@test.com', role: 'Пользователь' }
  const current = { name: 'Пётр', email: 'ivan@test.com', role: 'Администратор' }

  it('отображает все поля', () => {
    render(<FormComparison original={original} current={current} />, { wrapper: TestWrapper })
    expect(screen.getByText('Иван')).toBeInTheDocument()
    expect(screen.getByText('Пётр')).toBeInTheDocument()
  })

  it('показывает "Было" / "Стало" для изменённых', () => {
    render(<FormComparison original={original} current={current} />, { wrapper: TestWrapper })
    expect(screen.getAllByText('Было:').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Стало:').length).toBeGreaterThan(0)
  })

  it('не показывает "Было/Стало" для неизменённых', () => {
    // email не изменился
    render(<FormComparison original={original} current={current} />, { wrapper: TestWrapper })
    // email должен быть без "Было/Стало"
    const emailText = screen.getByText('ivan@test.com')
    expect(emailText).toBeInTheDocument()
  })

  it('onlyChanged скрывает неизменённые поля', () => {
    render(<FormComparison original={original} current={current} onlyChanged />, { wrapper: TestWrapper })
    // name и role изменились → видны
    expect(screen.getByText('Иван')).toBeInTheDocument()
    expect(screen.getByText('Пётр')).toBeInTheDocument()
    // email не изменился → скрыт
    expect(screen.queryByText('ivan@test.com')).not.toBeInTheDocument()
  })

  it('exclude фильтрует поля', () => {
    render(<FormComparison original={original} current={current} exclude={['role']} />, { wrapper: TestWrapper })
    expect(screen.queryByText('Администратор')).not.toBeInTheDocument()
  })

  it('показывает "Нет изменений" если данные одинаковые + onlyChanged', () => {
    render(<FormComparison original={original} current={original} onlyChanged />, { wrapper: TestWrapper })
    expect(screen.getByText('Нет изменений')).toBeInTheDocument()
  })

  it('использует кастомные labels', () => {
    render(<FormComparison original={original} current={current} labels={{ name: 'ФИО' }} />, { wrapper: TestWrapper })
    expect(screen.getByText('ФИО')).toBeInTheDocument()
  })

  it('форматирует boolean', () => {
    render(<FormComparison original={{ active: true }} current={{ active: false }} />, { wrapper: TestWrapper })
    expect(screen.getByText('Да')).toBeInTheDocument()
    expect(screen.getByText('Нет')).toBeInTheDocument()
  })
})
