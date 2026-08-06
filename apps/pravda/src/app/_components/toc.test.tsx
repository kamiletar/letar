import { ChakraProvider } from '@chakra-ui/react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { system } from '@/theme'

import { TableOfContents } from './toc'

// Обёртка с ChakraProvider
function TestWrapper({ children }: { children: ReactNode }) {
  return <ChakraProvider value={system}>{children}</ChakraProvider>
}

function renderWithChakra(ui: ReactNode) {
  return render(ui, { wrapper: TestWrapper })
}

// Мокируем DOM элементы для TOC
function setupMockHeadings() {
  // h2 с id
  const h2 = document.createElement('h2')
  h2.id = 'article-1'
  h2.textContent = 'Статья 1'
  document.body.appendChild(h2)

  // h3 с id
  const h3 = document.createElement('h3')
  h3.id = 'article-2'
  h3.textContent = 'Статья 2'
  document.body.appendChild(h3)

  return [h2, h3]
}

function cleanupMockHeadings() {
  const elements = document.querySelectorAll('h2[id], h3[id], [id^="section-"], [id^="chapter-"]')
  elements.forEach((el) => el.remove())
}

describe('TableOfContents', () => {
  let mockObserve: ReturnType<typeof vi.fn>
  let mockDisconnect: ReturnType<typeof vi.fn>
  let mockIntersectionCallback: IntersectionObserverCallback | null = null

  beforeEach(() => {
    vi.clearAllMocks()
    cleanupMockHeadings()

    // Мокируем IntersectionObserver через класс
    mockObserve = vi.fn()
    mockDisconnect = vi.fn()

    class MockIntersectionObserver {
      constructor(callback: IntersectionObserverCallback) {
        mockIntersectionCallback = callback
      }
      observe = mockObserve
      unobserve = vi.fn()
      disconnect = mockDisconnect
      takeRecords = () => [] as IntersectionObserverEntry[]
      root = null
      rootMargin = ''
      thresholds = [] as number[]
    }

    global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver

    // Мокируем scrollIntoView
    Element.prototype.scrollIntoView = vi.fn()

    // Мокируем history.pushState
    vi.spyOn(window.history, 'pushState').mockImplementation(() => undefined)

    // Мокируем requestAnimationFrame
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 1
    })

    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)

    // Мокируем scroll properties
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true })
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 2000, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
  })

  afterEach(() => {
    cleanupMockHeadings()
    vi.restoreAllMocks()
  })

  describe('рендеринг', () => {
    it('должен возвращать null когда нет заголовков', () => {
      const { container } = renderWithChakra(<TableOfContents />)

      expect(container.querySelector('nav')).not.toBeInTheDocument()
    })

    it('должен рендерить nav с заголовками', async () => {
      setupMockHeadings()

      const { container } = renderWithChakra(<TableOfContents />)

      // Компонент скрыт на маленьких экранах (display: none на base), используем querySelector
      await waitFor(() => {
        const nav = container.querySelector('nav')
        expect(nav).toBeInTheDocument()
        expect(nav).toHaveAttribute('aria-label', 'Содержание документа')
      })
    })

    it('должен отображать заголовок "Содержание"', async () => {
      setupMockHeadings()

      renderWithChakra(<TableOfContents />)

      // Ждём пока компонент отрендерится
      await waitFor(() => {
        expect(screen.getByText('Содержание')).toBeInTheDocument()
      })
    })

    it('должен отображать progress bar', async () => {
      setupMockHeadings()

      const { container } = renderWithChakra(<TableOfContents />)

      // Прогресс-бар скрыт вместе с nav, используем querySelector
      await waitFor(() => {
        const progressbar = container.querySelector('[role="progressbar"]')
        expect(progressbar).toBeInTheDocument()
        expect(progressbar).toHaveAttribute('aria-label', 'Прогресс чтения')
      })
    })

    it('должен отображать заголовки из DOM как ссылки', async () => {
      setupMockHeadings()

      const { container } = renderWithChakra(<TableOfContents />)

      await waitFor(() => {
        const links = container.querySelectorAll('a')
        expect(links).toHaveLength(2)
        expect(links[0]).toHaveTextContent('Статья 1')
        expect(links[1]).toHaveTextContent('Статья 2')
      })
    })
  })

  describe('IntersectionObserver', () => {
    it('должен вызывать observe для заголовков', async () => {
      setupMockHeadings()

      const { container } = renderWithChakra(<TableOfContents />)

      // Ждём пока компонент отрендерится
      await waitFor(() => {
        expect(container.querySelector('nav')).toBeInTheDocument()
      })

      // 2 элемента: h2, h3
      expect(mockObserve).toHaveBeenCalledTimes(2)
    })

    it('должен обновлять activeId при intersection', async () => {
      const elements = setupMockHeadings()

      const { container } = renderWithChakra(<TableOfContents />)

      // Ждём пока компонент отрендерится
      await waitFor(() => {
        expect(container.querySelector('nav')).toBeInTheDocument()
      })

      // Симулируем intersection с первым элементом
      act(() => {
        mockIntersectionCallback?.(
          [{ isIntersecting: true, target: elements[0] } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        )
      })

      await waitFor(() => {
        const links = container.querySelectorAll('a')
        expect(links[0]).toHaveAttribute('aria-current', 'location')
      })
    })

    it('должен отключать observer при unmount', async () => {
      setupMockHeadings()

      const { container, unmount } = renderWithChakra(<TableOfContents />)

      // Ждём пока компонент отрендерится
      await waitFor(() => {
        expect(container.querySelector('nav')).toBeInTheDocument()
      })

      unmount()

      expect(mockDisconnect).toHaveBeenCalled()
    })
  })

  describe('scroll progress', () => {
    it('должен показывать 0% в начале страницы', async () => {
      setupMockHeadings()

      const { container } = renderWithChakra(<TableOfContents />)

      await waitFor(() => {
        expect(container.querySelector('nav')).toBeInTheDocument()
        expect(screen.getByText('0%')).toBeInTheDocument()
      })
    })

    it('должен удалять scroll listener при unmount', async () => {
      setupMockHeadings()

      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      const { container, unmount } = renderWithChakra(<TableOfContents />)

      // Ждём пока компонент отрендерится
      await waitFor(() => {
        expect(container.querySelector('nav')).toBeInTheDocument()
      })

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
    })
  })

  describe('клик по заголовку', () => {
    it('должен вызывать scrollIntoView при клике', async () => {
      const user = userEvent.setup()
      const elements = setupMockHeadings()

      const { container } = renderWithChakra(<TableOfContents />)

      // Ждём пока компонент отрендерится
      await waitFor(() => {
        expect(container.querySelector('nav')).toBeInTheDocument()
      })

      const link = container.querySelector('a[href="#article-1"]')!
      await user.click(link)

      expect(elements[0].scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' })
    })

    it('должен обновлять URL через history.pushState', async () => {
      const user = userEvent.setup()
      setupMockHeadings()

      const { container } = renderWithChakra(<TableOfContents />)

      // Ждём пока компонент отрендерится
      await waitFor(() => {
        expect(container.querySelector('nav')).toBeInTheDocument()
      })

      const link = container.querySelector('a[href="#article-1"]')!
      await user.click(link)

      expect(window.history.pushState).toHaveBeenCalledWith(null, '', '#article-1')
    })
  })
})
