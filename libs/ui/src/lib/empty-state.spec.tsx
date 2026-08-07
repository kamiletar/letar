import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { AppEmptyState } from './empty-state'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('AppEmptyState', () => {
  it('рендерит заголовок и описание', () => {
    renderWithProvider(<AppEmptyState title="Нет записей" description="Добавьте первую запись" />)
    expect(screen.getByText('Нет записей')).toBeInTheDocument()
    expect(screen.getByText('Добавьте первую запись')).toBeInTheDocument()
  })

  it('не рендерит описание, если оно не передано', () => {
    renderWithProvider(<AppEmptyState title="Пусто" />)
    expect(screen.getByText('Пусто')).toBeInTheDocument()
    expect(screen.queryByText('Добавьте первую запись')).not.toBeInTheDocument()
  })

  it('не рендерит кнопку действия без actionLabel', () => {
    renderWithProvider(<AppEmptyState title="Пусто" onAction={vi.fn()} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('рендерит кнопку с onClick при передаче actionLabel + onAction', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    renderWithProvider(<AppEmptyState title="Пусто" actionLabel="Добавить" onAction={onAction} />)

    const button = screen.getByRole('button', { name: 'Добавить' })
    await user.click(button)
    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it('рендерит кнопку-ссылку при передаче actionHref', () => {
    renderWithProvider(<AppEmptyState title="Пусто" actionLabel="Перейти" actionHref="/create" />)
    const link = screen.getByRole('link', { name: 'Перейти' })
    expect(link).toHaveAttribute('href', '/create')
  })

  it('рендерит дополнительный children-контент', () => {
    renderWithProvider(
      <AppEmptyState title="Пусто">
        <div data-testid="extra">extra content</div>
      </AppEmptyState>,
    )
    expect(screen.getByTestId('extra')).toBeInTheDocument()
  })
})
