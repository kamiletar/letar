import { ChakraProvider } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Bookmark } from '@/hooks/use-bookmarks'
import { system } from '@/theme'

// Мок для useBookmarks
const mockIsBookmarked = vi.fn()
const mockToggleBookmark = vi.fn()

vi.mock('@/hooks/use-bookmarks', () => ({
  useBookmarks: () => ({
    isBookmarked: mockIsBookmarked,
    toggleBookmark: mockToggleBookmark,
  }),
}))

// Импортируем после мока
import { BookmarkButton } from './bookmark-button'

// Обёртка с ChakraProvider для тестов
function TestWrapper({ children }: { children: ReactNode }) {
  return <ChakraProvider value={system}>{children}</ChakraProvider>
}

// Хелпер для рендера с провайдером
function renderWithChakra(ui: ReactNode) {
  return render(ui, { wrapper: TestWrapper })
}

// Тестовая закладка
const testBookmark: Omit<Bookmark, 'addedAt'> = {
  id: 'constitution-1',
  title: 'Конституция',
  articleNumber: '1',
  href: '/constitution#article-1',
  category: 'Основные законы',
}

describe('BookmarkButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('рендеринг', () => {
    it('должен отображать кнопку с иконкой LuBookmark когда не добавлена', () => {
      mockIsBookmarked.mockReturnValue(false)

      renderWithChakra(<BookmarkButton bookmark={testBookmark} />)

      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      expect(button).toHaveAttribute('aria-label', 'Добавить в закладки')
      expect(button).toHaveAttribute('title', 'Добавить в закладки')
    })

    it('должен отображать кнопку с иконкой LuBookmarkCheck когда добавлена', () => {
      mockIsBookmarked.mockReturnValue(true)

      renderWithChakra(<BookmarkButton bookmark={testBookmark} />)

      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      expect(button).toHaveAttribute('aria-label', 'Удалить из закладок')
      expect(button).toHaveAttribute('title', 'Удалить из закладок')
    })

    it('должен иметь атрибут data-print-hide', () => {
      mockIsBookmarked.mockReturnValue(false)

      renderWithChakra(<BookmarkButton bookmark={testBookmark} />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-print-hide')
    })

    it('должен принимать проп size', () => {
      mockIsBookmarked.mockReturnValue(false)

      renderWithChakra(<BookmarkButton bookmark={testBookmark} size="xs" />)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })

  describe('взаимодействие', () => {
    it('должен вызывать toggleBookmark при клике', async () => {
      mockIsBookmarked.mockReturnValue(false)
      const user = userEvent.setup()

      renderWithChakra(<BookmarkButton bookmark={testBookmark} />)

      const button = screen.getByRole('button')
      await user.click(button)

      expect(mockToggleBookmark).toHaveBeenCalledTimes(1)
      expect(mockToggleBookmark).toHaveBeenCalledWith(testBookmark)
    })

    it('должен вызывать toggleBookmark с правильной закладкой', async () => {
      mockIsBookmarked.mockReturnValue(true)
      const user = userEvent.setup()

      const anotherBookmark: Omit<Bookmark, 'addedAt'> = {
        id: 'criminal-5',
        title: 'Уголовный кодекс',
        articleNumber: '5',
        href: '/codes/criminal#article-5',
        category: 'Кодексы',
      }

      renderWithChakra(<BookmarkButton bookmark={anotherBookmark} />)

      const button = screen.getByRole('button')
      await user.click(button)

      expect(mockToggleBookmark).toHaveBeenCalledWith(anotherBookmark)
    })
  })

  describe('проверка isBookmarked', () => {
    it('должен вызывать isBookmarked с правильным id', () => {
      mockIsBookmarked.mockReturnValue(false)

      renderWithChakra(<BookmarkButton bookmark={testBookmark} />)

      expect(mockIsBookmarked).toHaveBeenCalledWith(testBookmark.id)
    })

    it('должен вызывать isBookmarked при каждом рендере', () => {
      mockIsBookmarked.mockReturnValue(false)

      renderWithChakra(<BookmarkButton bookmark={testBookmark} />)
      expect(mockIsBookmarked).toHaveBeenCalledTimes(1)
    })
  })
})
