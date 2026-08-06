import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { vi } from 'vitest'
import { Form, useFormGroupListContext } from './'
import { FieldNumber, FieldString } from './form-fields'

// Обёртка для тестов с Chakra UI
const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FormGroupList Integration', () => {
  it('должен рендерить начальные элементы массива', async () => {
    render(
      <TestWrapper>
        <Form
          initialValue={{
            items: [
              { name: 'Первый', price: 100 },
              { name: 'Второй', price: 200 },
            ],
          }}
          onSubmit={vi.fn()}
        >
          <Form.Group.List name="items">
            <FieldString name="name" label="Название" />
            <FieldNumber name="price" label="Цена" />
          </Form.Group.List>
        </Form>
      </TestWrapper>,
    )

    // Ждём async инициализацию
    await waitFor(() => {
      // Проверяем что есть 2 набора полей
      expect(screen.getAllByText('Название')).toHaveLength(2)
      expect(screen.getAllByText('Цена')).toHaveLength(2)
    })
  })

  it('должен предоставлять контекст списка через useFormGroupListContext', async () => {
    const ListInfo = () => {
      const ctx = useFormGroupListContext()
      return <span data-testid="list-info">{`${ctx.fullPath}-${ctx.length}`}</span>
    }

    render(
      <TestWrapper>
        <Form
          initialValue={{
            items: [{ name: 'Test' }],
          }}
          onSubmit={vi.fn()}
        >
          <Form.Group.List
            name="items"
            wrapper={({ children }) => (
              <>
                <ListInfo />
                {children}
              </>
            )}
          >
            <FieldString name="name" label="Название" />
          </Form.Group.List>
        </Form>
      </TestWrapper>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('list-info')).toHaveTextContent('items-1')
    })
  })

  it('должен рендерить emptyContent для пустого списка', async () => {
    render(
      <TestWrapper>
        <Form
          initialValue={{
            items: [],
          }}
          onSubmit={vi.fn()}
        >
          <Form.Group.List name="items" emptyContent={<span data-testid="empty">Пусто</span>}>
            <FieldString name="name" label="Название" />
          </Form.Group.List>
        </Form>
      </TestWrapper>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('empty')).toHaveTextContent('Пусто')
      expect(screen.queryByText('Название')).not.toBeInTheDocument()
    })
  })

  it('должен отображать начальные значения элементов', async () => {
    render(
      <TestWrapper>
        <Form
          initialValue={{
            items: [{ name: 'Товар А' }, { name: 'Товар Б' }],
          }}
          onSubmit={vi.fn()}
        >
          <Form.Group.List name="items">
            <FieldString name="name" label="Название" />
          </Form.Group.List>
        </Form>
      </TestWrapper>,
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('Товар А')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Товар Б')).toBeInTheDocument()
    })
  })
})
