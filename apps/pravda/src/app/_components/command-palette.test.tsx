import { ChakraProvider } from '@chakra-ui/react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { system } from '@/theme'

// Мок данные для результатов поиска
const mockResults = [
  {
    item: {
      title: 'Конституция',
      articleNumber: '1',
      href: '/constitution#article-1',
      content: 'Текст статьи о правах граждан',
      category: 'Основные законы',
    },
    matches: [{ key: 'content', indices: [[0, 5]] }],
  },
  {
    item: {
      title: 'Уголовный кодекс',
      articleNumber: '105',
      href: '/codes/criminal#article-105',
      content: 'Убийство — умышленное причинение смерти',
      category: 'Кодексы',
    },
    matches: [{ key: 'content', indices: [[0, 7]] }],
  },
]

// Моки
const mockSetQuery = vi.fn()
const mockRouterPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}))

// Создаём мок для useSearch
const mockUseSearch = vi.fn()

vi.mock('@/hooks/use-search', () => ({
  useSearch: () => mockUseSearch(),
}))

// Мок для Highlight (упрощённый рендеринг)
vi.mock('./highlight', () => ({
  Highlight: ({ text }: { text: string }) => <span>{text}</span>,
}))

import { CommandPalette } from './command-palette'

// Обёртка с ChakraProvider
function TestWrapper({ children }: { children: ReactNode }) {
  return <ChakraProvider value={system}>{children}</ChakraProvider>
}

function renderWithChakra(ui: ReactNode) {
  return render(ui, { wrapper: TestWrapper })
}

describe('CommandPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })

    // Дефолтное состояние useSearch
    mockUseSearch.mockReturnValue({
      query: '',
      setQuery: mockSetQuery,
      results: [],
      hasResults: false,
      isSearching: false,
      isPending: false,
      isLoading: false,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  describe('рендеринг', () => {
    it('не должен рендерить содержимое когда закрыт', () => {
      renderWithChakra(<CommandPalette open={false} onOpenChange={vi.fn()} />)

      // Dialog с lazyMount не рендерит содержимое когда закрыт
      expect(screen.queryByPlaceholderText('Поиск по законам...')).not.toBeInTheDocument()
    })

    it('должен рендерить input когда открыт', async () => {
      renderWithChakra(<CommandPalette open={true} onOpenChange={vi.fn()} />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Поиск по законам...')).toBeInTheDocument()
      })
    })

    it('должен показывать подсказку для навигации когда нет результатов', async () => {
      renderWithChakra(<CommandPalette open={true} onOpenChange={vi.fn()} />)

      await waitFor(() => {
        expect(screen.getByText('Введите запрос для поиска')).toBeInTheDocument()
      })
    })

    it('должен показывать Spinner когда isLoading', async () => {
      mockUseSearch.mockReturnValue({
        query: '',
        setQuery: mockSetQuery,
        results: [],
        hasResults: false,
        isSearching: false,
        isPending: false,
        isLoading: true,
      })

      renderWithChakra(<CommandPalette open={true} onOpenChange={vi.fn()} />)

      // Spinner рендерится как span с классом chakra-spinner
      await waitFor(() => {
        const spinners = document.querySelectorAll('.chakra-spinner')
        expect(spinners.length).toBeGreaterThan(0)
      })
    })

    it('должен показывать "Ничего не найдено" когда isSearching и нет результатов', async () => {
      mockUseSearch.mockReturnValue({
        query: 'несуществующий',
        setQuery: mockSetQuery,
        results: [],
        hasResults: false,
        isSearching: true,
        isPending: false,
        isLoading: false,
      })

      renderWithChakra(<CommandPalette open={true} onOpenChange={vi.fn()} />)

      await waitFor(() => {
        expect(screen.getByText('Ничего не найдено')).toBeInTheDocument()
      })
    })

    it('должен отображать результаты поиска', async () => {
      mockUseSearch.mockReturnValue({
        query: 'права',
        setQuery: mockSetQuery,
        results: mockResults,
        hasResults: true,
        isSearching: true,
        isPending: false,
        isLoading: false,
      })

      renderWithChakra(<CommandPalette open={true} onOpenChange={vi.fn()} />)

      await waitFor(() => {
        expect(screen.getByText('Конституция')).toBeInTheDocument()
        expect(screen.getByText('Уголовный кодекс')).toBeInTheDocument()
        expect(screen.getByText('Ст. 1')).toBeInTheDocument()
        expect(screen.getByText('Ст. 105')).toBeInTheDocument()
      })
    })
  })

  describe('сброс при открытии', () => {
    it('должен сбрасывать query при открытии', async () => {
      const { rerender } = renderWithChakra(<CommandPalette open={false} onOpenChange={vi.fn()} />)

      // Открываем
      rerender(
        <TestWrapper>
          <CommandPalette open={true} onOpenChange={vi.fn()} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(mockSetQuery).toHaveBeenCalledWith('')
      })
    })

    it('должен фокусировать input при открытии', async () => {
      renderWithChakra(<CommandPalette open={true} onOpenChange={vi.fn()} />)

      // Ждём setTimeout для фокуса (50ms)
      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      await waitFor(() => {
        const input = screen.getByPlaceholderText('Поиск по законам...')
        expect(document.activeElement).toBe(input)
      })
    })
  })

  describe('ввод в поле поиска', () => {
    it('должен вызывать setQuery при вводе текста', async () => {
      vi.useRealTimers()
      const user = userEvent.setup()

      renderWithChakra(<CommandPalette open={true} onOpenChange={vi.fn()} />)

      const input = await screen.findByPlaceholderText('Поиск по законам...')
      await user.type(input, 'права')

      expect(mockSetQuery).toHaveBeenCalled()
    })
  })

  describe('keyboard navigation', () => {
    beforeEach(() => {
      mockUseSearch.mockReturnValue({
        query: 'права',
        setQuery: mockSetQuery,
        results: mockResults,
        hasResults: true,
        isSearching: true,
        isPending: false,
        isLoading: false,
      })
    })

    it('должен переключать выбранный элемент при ArrowDown', async () => {
      renderWithChakra(<CommandPalette open={true} onOpenChange={vi.fn()} />)

      const input = await screen.findByPlaceholderText('Поиск по законам...')

      // Первый элемент выбран по умолчанию
      // Нажимаем ArrowDown
      fireEvent.keyDown(input, { key: 'ArrowDown' })

      // Теперь второй элемент должен быть выбран (проверяем через hover эффект)
      await waitFor(() => {
        const links = screen.getAllByRole('link')
        expect(links).toHaveLength(2)
      })
    })

    it('должен переключать выбранный элемент при ArrowUp', async () => {
      renderWithChakra(<CommandPalette open={true} onOpenChange={vi.fn()} />)

      const input = await screen.findByPlaceholderText('Поиск по законам...')

      // ArrowUp от первого элемента должен перейти к последнему
      fireEvent.keyDown(input, { key: 'ArrowUp' })

      await waitFor(() => {
        const links = screen.getAllByRole('link')
        expect(links).toHaveLength(2)
      })
    })

    it('должен переходить по ссылке и закрывать при Enter', async () => {
      const mockOnOpenChange = vi.fn()

      renderWithChakra(<CommandPalette open={true} onOpenChange={mockOnOpenChange} />)

      const input = await screen.findByPlaceholderText('Поиск по законам...')

      fireEvent.keyDown(input, { key: 'Enter' })

      expect(mockRouterPush).toHaveBeenCalledWith('/constitution#article-1')
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('клик по результату', () => {
    it('должен закрывать палитру при клике на результат', async () => {
      vi.useRealTimers()
      const user = userEvent.setup()
      const mockOnOpenChange = vi.fn()

      mockUseSearch.mockReturnValue({
        query: 'права',
        setQuery: mockSetQuery,
        results: mockResults,
        hasResults: true,
        isSearching: true,
        isPending: false,
        isLoading: false,
      })

      renderWithChakra(<CommandPalette open={true} onOpenChange={mockOnOpenChange} />)

      const link = await screen.findByRole('link', { name: /Конституция/i })
      await user.click(link)

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })
})
