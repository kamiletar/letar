import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ReactNode } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

interface Category {
  id: string
  name: string
}

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

// Страница поиска не содержит выбранную запись — подпись берётся только из `useSelected`
const searchPage: Category[] = [{ id: 'x', name: 'Другая' }]
const useQuery = () => ({ data: searchPage, isLoading: false })

function renderCombobox(props: Record<string, unknown>, initial: string) {
  render(
    <TestWrapper>
      <Form initialValue={{ cat: initial }} onSubmit={vi.fn()}>
        <Form.Field.Combobox<string, Category>
          name="cat"
          useQuery={useQuery}
          getLabel={(c) => c.name}
          getValue={(c) => c.id}
          {...props}
        />
      </Form>
    </TestWrapper>,
  )
}

const input = () => screen.getByRole('combobox') as HTMLInputElement
const valuePencil = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-part="edit-button"]')).find((el) =>
    !el.closest('[role="option"]')
  )

describe('Field.Combobox — useSelected (Z7)', () => {
  it('подпись выбранного значения приходит из useSelected, когда её нет в странице поиска', async () => {
    const useSelected = vi.fn((id: string) => ({ data: id ? { id, name: 'Кровля' } : null, isLoading: false }))
    renderCombobox({ useSelected }, 'a')
    await waitFor(() => expect(input().value).toBe('Кровля'))
    expect(useSelected).toHaveBeenCalledWith('a')
  })

  it('запись грузится позже — инпут заполняется, когда она пришла', async () => {
    let loaded = false
    const useSelected = (id: string) => ({ data: loaded && id ? { id, name: 'Фасад' } : undefined, isLoading: !loaded })
    renderCombobox({ useSelected }, 'b')
    expect(input().value).toBe('')
    loaded = true
    // Любая перерисовка поля подхватит новое значение хука
    await userEvent.click(input())
    await waitFor(() => expect(input().value).toBe('Фасад'))
  })

  it('initialLabel сильнее useSelected', async () => {
    const useSelected = (id: string) => ({ data: { id, name: 'Из хука' } })
    renderCombobox({ useSelected, initialLabel: 'Из пропа' }, 'a')
    await waitFor(() => expect(input().value).toBe('Из пропа'))
  })

  it('пустое значение: useSelected вызывается с пустой строкой, инпут пуст', () => {
    const useSelected = vi.fn(() => ({ data: null }))
    renderCombobox({ useSelected }, '')
    expect(useSelected).toHaveBeenCalledWith('')
    expect(input().value).toBe('')
  })

  it('запись — data для onUpdate и карандаша; в список опций не попадает', async () => {
    const onUpdate = vi.fn().mockResolvedValue(null)
    const useSelected = (id: string) => ({ data: { id, name: 'Кровля' } })
    renderCombobox({ useSelected, onUpdate }, 'a')
    await waitFor(() => expect(valuePencil()).toBeDefined())
    await userEvent.click(valuePencil()!)
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'a', label: 'Кровля', data: { id: 'a', name: 'Кровля' } }),
      expect.anything(),
    )
    await userEvent.click(input())
    await waitFor(() => expect(screen.getByRole('option', { name: /Другая/ })).toBeInTheDocument())
    expect(screen.queryByRole('option', { name: /Кровля/ })).toBeNull()
  })
})
