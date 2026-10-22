import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { Form } from '../'
import { FieldString } from '../form-fields'
import { FormGroupListBase } from './form-group-list-declarative'
import { SortableGroupList } from './sortable-group-list'

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
})

const initialValue = { items: [{ name: 'Первый' }, { name: 'Второй' }] }

describe('SortableGroupList (forms 2.42)', () => {
  it('рисует строки списка с ручкой перетаскивания в каждой', async () => {
    render(
      <TestWrapper>
        <Form initialValue={initialValue} onSubmit={vi.fn()}>
          <SortableGroupList name="items">
            <SortableGroupList.Button.DragHandle />
            <FieldString name="name" label="Название" />
          </SortableGroupList>
        </Form>
      </TestWrapper>,
    )

    await waitFor(() => {
      expect(screen.getAllByText('Название')).toHaveLength(2)
    })
    // DragHandle — кнопка с aria-атрибутами dnd-kit, строка обёрнута в SortableItem
    expect(screen.getAllByRole('button', { name: /drag|перетащ/i }).length).toBeGreaterThanOrEqual(2)
  })

  it('кнопки Add и Remove работают как у Form.Group.List', async () => {
    const user = userEvent.setup()
    render(
      <TestWrapper>
        <Form initialValue={initialValue} onSubmit={vi.fn()}>
          <SortableGroupList
            name="items"
            wrapper={({ children }) => (
              <>
                {children}
                <SortableGroupList.Button.Add defaultValue={{ name: '' }}>Добавить</SortableGroupList.Button.Add>
              </>
            )}
          >
            <FieldString name="name" label="Название" />
            <SortableGroupList.Button.Remove>Удалить</SortableGroupList.Button.Remove>
          </SortableGroupList>
        </Form>
      </TestWrapper>,
    )

    await waitFor(() => expect(screen.getAllByText('Название')).toHaveLength(2))
    await user.click(screen.getByText('Добавить'))
    await waitFor(() => expect(screen.getAllByText('Название')).toHaveLength(3))
    await user.click(screen.getAllByText('Удалить')[0])
    await waitFor(() => expect(screen.getAllByText('Название')).toHaveLength(2))
  })

  it('слоты ListWrapper и ItemWrapper получают id списка, id элементов и перестановку', async () => {
    const listProps = vi.fn()
    const ListWrapper = (props: { id: string; items: string[]; children: ReactNode }) => {
      listProps({ id: props.id, items: props.items })
      return <div data-testid="list-wrapper">{props.children}</div>
    }
    const ItemWrapper = ({ id, children }: { id: string; children: ReactNode }) => (
      <section data-testid="item-wrapper" data-id={id}>{children}</section>
    )

    render(
      <TestWrapper>
        <Form initialValue={initialValue} onSubmit={vi.fn()}>
          <FormGroupListBase name="items" ListWrapper={ListWrapper} ItemWrapper={ItemWrapper}>
            <FieldString name="name" label="Название" />
          </FormGroupListBase>
        </Form>
      </TestWrapper>,
    )

    await waitFor(() => expect(screen.getAllByTestId('item-wrapper')).toHaveLength(2))
    expect(listProps).toHaveBeenCalledWith({ id: 'items', items: ['items-0', 'items-1'] })
    expect(screen.getAllByTestId('item-wrapper').map((n) => n.getAttribute('data-id'))).toEqual(['items-0', 'items-1'])
  })

  it('обычный Form.Group.List без sortable не оборачивает элементы', async () => {
    render(
      <TestWrapper>
        <Form initialValue={initialValue} onSubmit={vi.fn()}>
          <Form.Group.List name="items">
            <Form.Group.List.Button.Remove>Удалить</Form.Group.List.Button.Remove>
            <FieldString name="name" label="Название" />
          </Form.Group.List>
        </Form>
      </TestWrapper>,
    )

    await waitFor(() => expect(screen.getAllByText('Название')).toHaveLength(2))
  })
})
