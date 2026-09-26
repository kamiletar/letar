import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ReactNode } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  Element.prototype.scrollTo = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

function renderSelect(props: Record<string, unknown>, initial = '') {
  return render(
    <TestWrapper>
      <Form initialValue={{ cat: initial }} onSubmit={vi.fn()}>
        <Form.Field.Select name="cat" placeholder="Выберите" {...props} />
      </Form>
    </TestWrapper>,
  )
}

const trigger = () => screen.getByRole('combobox')

describe('Field.Select — loading (Z6)', () => {
  it('без loading спиннера и текста загрузки нет', async () => {
    renderSelect({ options: [{ label: 'Кровля', value: 'a' }] })
    await userEvent.click(trigger())
    expect(document.querySelector('.chakra-spinner')).toBeNull()
    expect(screen.queryByText('Loading...')).toBeNull()
  })

  it('loading: спиннер в поле и «Loading...» в пустом списке', async () => {
    renderSelect({ options: [], loading: true })
    expect(document.querySelector('.chakra-spinner')).not.toBeNull()
    await userEvent.click(trigger())
    await waitFor(() => expect(screen.getByText('Loading...')).toBeInTheDocument())
  })

  it('loading + значение без опции: в триггере «Loading...» вместо placeholder', () => {
    renderSelect({ options: [], loading: true }, 'a')
    expect(trigger()).toHaveTextContent('Loading...')
    expect(trigger()).not.toHaveTextContent('Выберите')
  })

  it('loading + значение уже есть в опциях: в триггере его подпись', () => {
    renderSelect({ options: [{ label: 'Кровля', value: 'a' }], loading: true }, 'a')
    expect(trigger()).toHaveTextContent('Кровля')
  })

  it('загрузка закончилась — спиннер исчезает, опции видны', async () => {
    const { rerender } = renderSelect({ options: [], loading: true })
    expect(document.querySelector('.chakra-spinner')).not.toBeNull()
    rerender(
      <TestWrapper>
        <Form initialValue={{ cat: '' }} onSubmit={vi.fn()}>
          <Form.Field.Select name="cat" placeholder="Выберите" options={[{ label: 'Кровля', value: 'a' }]} />
        </Form>
      </TestWrapper>,
    )
    await waitFor(() => expect(document.querySelector('.chakra-spinner')).toBeNull())
    await userEvent.click(trigger())
    await waitFor(() => expect(screen.getByRole('option', { name: /Кровля/ })).toBeInTheDocument())
  })
})
