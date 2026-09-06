import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ConversationalMode } from './conversational-mode'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('ConversationalMode — welcomeScreen', () => {
  it('без welcomeScreen сразу показывает первое поле', () => {
    render(
      <TestWrapper>
        <ConversationalMode onComplete={vi.fn()}>
          <div>Поле 1</div>
          <div>Поле 2</div>
        </ConversationalMode>
      </TestWrapper>,
    )

    expect(screen.getByText('Поле 1')).toBeInTheDocument()
  })

  it('с welcomeScreen показывает его первым и скрывает первое поле', () => {
    render(
      <TestWrapper>
        <ConversationalMode welcomeScreen={<div>Привет!</div>} onComplete={vi.fn()}>
          <div>Поле 1</div>
          <div>Поле 2</div>
        </ConversationalMode>
      </TestWrapper>,
    )

    expect(screen.getByText('Привет!')).toBeInTheDocument()
    expect(screen.queryByText('Поле 1')).not.toBeInTheDocument()
  })

  it('клик по кнопке старта закрывает welcome screen и открывает первое поле', () => {
    render(
      <TestWrapper>
        <ConversationalMode welcomeScreen={<div>Привет!</div>} startLabel="Поехали" onComplete={vi.fn()}>
          <div>Поле 1</div>
          <div>Поле 2</div>
        </ConversationalMode>
      </TestWrapper>,
    )

    fireEvent.click(screen.getByText(/Поехали/))

    expect(screen.queryByText('Привет!')).not.toBeInTheDocument()
    expect(screen.getByText('Поле 1')).toBeInTheDocument()
  })

  it('Enter на welcome screen закрывает его так же, как клик по кнопке', () => {
    const { container } = render(
      <TestWrapper>
        <ConversationalMode welcomeScreen={<div>Привет!</div>} onComplete={vi.fn()}>
          <div>Поле 1</div>
        </ConversationalMode>
      </TestWrapper>,
    )

    const welcomeContainer = screen.getByText('Привет!').closest('div[class]') ?? container
    fireEvent.keyDown(welcomeContainer, { key: 'Enter' })

    expect(screen.queryByText('Привет!')).not.toBeInTheDocument()
    expect(screen.getByText('Поле 1')).toBeInTheDocument()
  })

  it('welcome screen не появляется повторно после возврата на предыдущий шаг', () => {
    render(
      <TestWrapper>
        <ConversationalMode welcomeScreen={<div>Привет!</div>} onComplete={vi.fn()}>
          <div>Поле 1</div>
          <div>Поле 2</div>
        </ConversationalMode>
      </TestWrapper>,
    )

    fireEvent.click(screen.getByText(/Начать/))
    expect(screen.getByText('Поле 1')).toBeInTheDocument()

    fireEvent.click(screen.getByText(/Далее/))
    expect(screen.getByText('Поле 2')).toBeInTheDocument()

    fireEvent.click(screen.getByText(/Назад/))
    expect(screen.getByText('Поле 1')).toBeInTheDocument()
    expect(screen.queryByText('Привет!')).not.toBeInTheDocument()
  })
})
