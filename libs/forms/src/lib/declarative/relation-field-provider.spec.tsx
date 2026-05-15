import { render, renderHook, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  RelationFieldProvider,
  useRelationFieldContext,
  useRelationOptions,
  withRelations,
} from './relation-field-provider'

// Мок хука для тестирования
function createMockUseQuery<T>(data: T[], isLoading = false, error: Error | null = null) {
  return vi.fn(() => ({ data, isLoading, error }))
}

describe('RelationFieldProvider', () => {
  describe('useRelationFieldContext', () => {
    it('возвращает null вне провайдера', () => {
      const { result } = renderHook(() => useRelationFieldContext())
      expect(result.current).toBeNull()
    })

    it('возвращает контекст внутри провайдера', () => {
      const mockQuery = createMockUseQuery([{ id: '1', name: 'Test' }])

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RelationFieldProvider relations={[{ model: 'Test', useQuery: mockQuery, labelField: 'name' }]}>
          {children}
        </RelationFieldProvider>
      )

      const { result } = renderHook(() => useRelationFieldContext(), { wrapper })

      expect(result.current).not.toBeNull()
      expect(result.current?.getOptions).toBeDefined()
      expect(result.current?.getState).toBeDefined()
      expect(result.current?.relations).toBeDefined()
    })
  })

  describe('useRelationOptions', () => {
    it('возвращает пустой state вне провайдера', () => {
      const { result } = renderHook(() => useRelationOptions('Category'))

      expect(result.current).toEqual({
        options: [],
        isLoading: false,
        error: null,
      })
    })

    it('возвращает options для зарегистрированной модели', async () => {
      const categories = [
        { id: '1', name: 'Категория 1' },
        { id: '2', name: 'Категория 2' },
      ]
      const mockQuery = createMockUseQuery(categories)

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RelationFieldProvider relations={[{ model: 'Category', useQuery: mockQuery, labelField: 'name' }]}>
          {children}
        </RelationFieldProvider>
      )

      const { result } = renderHook(() => useRelationOptions('Category'), { wrapper })

      await waitFor(() => {
        expect(result.current.options).toHaveLength(2)
      })

      expect(result.current.options).toEqual([
        { value: '1', label: 'Категория 1', description: undefined },
        { value: '2', label: 'Категория 2', description: undefined },
      ])
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('возвращает пустой state для незарегистрированной модели', async () => {
      const mockQuery = createMockUseQuery([{ id: '1', name: 'Test' }])

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RelationFieldProvider relations={[{ model: 'Category', useQuery: mockQuery, labelField: 'name' }]}>
          {children}
        </RelationFieldProvider>
      )

      const { result } = renderHook(() => useRelationOptions('UnknownModel'), { wrapper })

      expect(result.current).toEqual({
        options: [],
        isLoading: false,
        error: null,
      })
    })

    it('поддерживает кастомный valueField', async () => {
      const categories = [{ slug: 'cat-1', title: 'Категория 1' }]
      const mockQuery = createMockUseQuery(categories)

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RelationFieldProvider
          relations={[{ model: 'Category', useQuery: mockQuery, labelField: 'title', valueField: 'slug' }]}
        >
          {children}
        </RelationFieldProvider>
      )

      const { result } = renderHook(() => useRelationOptions('Category'), { wrapper })

      await waitFor(() => {
        expect(result.current.options).toHaveLength(1)
      })

      expect(result.current.options[0]).toEqual({
        value: 'cat-1',
        label: 'Категория 1',
        description: undefined,
      })
    })

    it('поддерживает descriptionField', async () => {
      const items = [{ id: '1', name: 'Item 1', desc: 'Описание' }]
      const mockQuery = createMockUseQuery(items)

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RelationFieldProvider
          relations={[{ model: 'Item', useQuery: mockQuery, labelField: 'name', descriptionField: 'desc' }]}
        >
          {children}
        </RelationFieldProvider>
      )

      const { result } = renderHook(() => useRelationOptions('Item'), { wrapper })

      await waitFor(() => {
        expect(result.current.options).toHaveLength(1)
      })

      expect(result.current.options[0]).toEqual({
        value: '1',
        label: 'Item 1',
        description: 'Описание',
      })
    })
  })

  describe('RelationFieldProvider', () => {
    it('рендерит children', () => {
      const mockQuery = createMockUseQuery([])

      render(
        <RelationFieldProvider relations={[{ model: 'Test', useQuery: mockQuery, labelField: 'name' }]}>
          <div data-testid="child">Child content</div>
        </RelationFieldProvider>
      )

      expect(screen.getByTestId('child')).toBeInTheDocument()
    })

    it('поддерживает несколько relations', async () => {
      const categories = [{ id: '1', name: 'Cat 1' }]
      const tags = [{ id: '2', title: 'Tag 1' }]

      const mockCategoryQuery = createMockUseQuery(categories)
      const mockTagQuery = createMockUseQuery(tags)

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RelationFieldProvider
          relations={[
            { model: 'Category', useQuery: mockCategoryQuery, labelField: 'name' },
            { model: 'Tag', useQuery: mockTagQuery, labelField: 'title' },
          ]}
        >
          {children}
        </RelationFieldProvider>
      )

      const { result } = renderHook(
        () => ({
          categories: useRelationOptions('Category'),
          tags: useRelationOptions('Tag'),
        }),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.categories.options).toHaveLength(1)
        expect(result.current.tags.options).toHaveLength(1)
      })

      expect(result.current.categories.options[0].label).toBe('Cat 1')
      expect(result.current.tags.options[0].label).toBe('Tag 1')
    })

    it('передаёт queryArgs в хук', () => {
      const mockQuery = vi.fn(() => ({ data: [], isLoading: false, error: null }))
      const queryArgs = { where: { isActive: true }, orderBy: { name: 'asc' } }

      render(
        <RelationFieldProvider relations={[{ model: 'Category', useQuery: mockQuery, labelField: 'name', queryArgs }]}>
          <div>Test</div>
        </RelationFieldProvider>
      )

      expect(mockQuery).toHaveBeenCalledWith(queryArgs)
    })

    it('обрабатывает isLoading состояние', async () => {
      const mockQuery = vi.fn(() => ({ data: null, isLoading: true, error: null }))

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RelationFieldProvider relations={[{ model: 'Category', useQuery: mockQuery, labelField: 'name' }]}>
          {children}
        </RelationFieldProvider>
      )

      const { result } = renderHook(() => useRelationOptions('Category'), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true)
      })

      expect(result.current.options).toEqual([])
    })

    it('обрабатывает ошибку загрузки', async () => {
      const error = new Error('Ошибка загрузки')
      const mockQuery = vi.fn(() => ({ data: null, isLoading: false, error }))

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RelationFieldProvider relations={[{ model: 'Category', useQuery: mockQuery, labelField: 'name' }]}>
          {children}
        </RelationFieldProvider>
      )

      const { result } = renderHook(() => useRelationOptions('Category'), { wrapper })

      await waitFor(() => {
        expect(result.current.error).toBe(error)
      })

      expect(result.current.options).toEqual([])
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('withRelations HOC', () => {
    it('оборачивает компонент в RelationFieldProvider', async () => {
      const categories = [{ id: '1', name: 'Test Category' }]
      const mockQuery = createMockUseQuery(categories)

      function TestComponent() {
        const { options } = useRelationOptions('Category')
        return <div data-testid="options">{options.map((o) => o.label).join(', ')}</div>
      }

      const WrappedComponent = withRelations(TestComponent, [
        { model: 'Category', useQuery: mockQuery, labelField: 'name' },
      ])

      render(<WrappedComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('options')).toHaveTextContent('Test Category')
      })
    })

    it('передаёт props в обёрнутый компонент', () => {
      const mockQuery = createMockUseQuery([])

      interface TestProps {
        title: string
      }

      function TestComponent({ title }: TestProps) {
        return <div data-testid="title">{title}</div>
      }

      const WrappedComponent = withRelations(TestComponent, [
        { model: 'Category', useQuery: mockQuery, labelField: 'name' },
      ])

      render(<WrappedComponent title="Hello World" />)

      expect(screen.getByTestId('title')).toHaveTextContent('Hello World')
    })

    it('устанавливает displayName', () => {
      const mockQuery = createMockUseQuery([])

      function MyComponent() {
        return <div>Test</div>
      }

      const WrappedComponent = withRelations(MyComponent, [
        { model: 'Category', useQuery: mockQuery, labelField: 'name' },
      ])

      expect(WrappedComponent.displayName).toBe('withRelations(MyComponent)')
    })
  })

  describe('getOptions и getState', () => {
    it('getOptions возвращает массив options', async () => {
      const categories = [
        { id: '1', name: 'Cat 1' },
        { id: '2', name: 'Cat 2' },
      ]
      const mockQuery = createMockUseQuery(categories)

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RelationFieldProvider relations={[{ model: 'Category', useQuery: mockQuery, labelField: 'name' }]}>
          {children}
        </RelationFieldProvider>
      )

      const { result } = renderHook(() => useRelationFieldContext(), { wrapper })

      await waitFor(() => {
        expect(result.current?.getOptions('Category')).toHaveLength(2)
      })

      const options = result.current?.getOptions('Category')
      expect(options).toEqual([
        { value: '1', label: 'Cat 1', description: undefined },
        { value: '2', label: 'Cat 2', description: undefined },
      ])
    })

    it('getOptions возвращает пустой массив для неизвестной модели', async () => {
      const mockQuery = createMockUseQuery([{ id: '1', name: 'Test' }])

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RelationFieldProvider relations={[{ model: 'Category', useQuery: mockQuery, labelField: 'name' }]}>
          {children}
        </RelationFieldProvider>
      )

      const { result } = renderHook(() => useRelationFieldContext(), { wrapper })

      await waitFor(() => {
        expect(result.current?.getOptions('Category')).toHaveLength(1)
      })

      expect(result.current?.getOptions('UnknownModel')).toEqual([])
    })

    it('getState возвращает полное состояние', async () => {
      const categories = [{ id: '1', name: 'Cat 1' }]
      const mockQuery = createMockUseQuery(categories)

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RelationFieldProvider relations={[{ model: 'Category', useQuery: mockQuery, labelField: 'name' }]}>
          {children}
        </RelationFieldProvider>
      )

      const { result } = renderHook(() => useRelationFieldContext(), { wrapper })

      await waitFor(() => {
        expect(result.current?.getState('Category').options).toHaveLength(1)
      })

      const state = result.current?.getState('Category')
      expect(state).toEqual({
        options: [{ value: '1', label: 'Cat 1', description: undefined }],
        isLoading: false,
        error: null,
      })
    })
  })
})
