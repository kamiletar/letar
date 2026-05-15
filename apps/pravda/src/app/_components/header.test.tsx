import { ChakraProvider } from '@chakra-ui/react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { system } from '@/theme'

// Моки для дочерних компонентов
vi.mock('./command-palette', () => ({
  CommandPalette: vi.fn(({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => (
    <div data-testid="command-palette" data-open={open} onClick={() => onOpenChange(false)}>
      CommandPalette
    </div>
  )),
}))

vi.mock('./sidebar', () => ({
  MobileSidebar: vi.fn(() => <div data-testid="mobile-sidebar">MobileSidebar</div>),
}))

vi.mock('@letar/chakra-provider', () => ({
  ColorModeButton: vi.fn(() => <button data-testid="color-mode-button">ColorModeButton</button>),
}))

import { Header } from './header'

// Обёртка с ChakraProvider для тестов
function TestWrapper({ children }: { children: ReactNode }) {
  return <ChakraProvider value={system}>{children}</ChakraProvider>
}

function renderWithChakra(ui: ReactNode) {
  return render(ui, { wrapper: TestWrapper })
}

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('рендеринг', () => {
    it('должен отображать header с ролью banner', () => {
      renderWithChakra(<Header />)

      const header = screen.getByRole('banner')
      expect(header).toBeInTheDocument()
    })

    it('должен отображать логотип и ссылку на главную', () => {
      renderWithChakra(<Header />)

      const logoLink = screen.getByRole('link', { name: /герб/i })
      expect(logoLink).toHaveAttribute('href', '/')
    })

    it('должен отображать ссылку на закладки', () => {
      renderWithChakra(<Header />)

      const bookmarksButton = screen.getByRole('button', { name: /закладки/i })
      expect(bookmarksButton).toBeInTheDocument()
    })

    it('должен отображать MobileSidebar', () => {
      renderWithChakra(<Header />)

      expect(screen.getByTestId('mobile-sidebar')).toBeInTheDocument()
    })

    it('должен отображать ColorModeButton', () => {
      renderWithChakra(<Header />)

      expect(screen.getByTestId('color-mode-button')).toBeInTheDocument()
    })

    it('должен отображать CommandPalette в закрытом состоянии по умолчанию', () => {
      renderWithChakra(<Header />)

      const palette = screen.getByTestId('command-palette')
      expect(palette).toHaveAttribute('data-open', 'false')
    })

    it('должен содержать SkipLink для доступности', () => {
      renderWithChakra(<Header />)

      const skipLink = screen.getByRole('link', { name: /перейти к содержимому/i })
      expect(skipLink).toHaveAttribute('href', '#main-content')
    })
  })

  describe('keyboard shortcuts', () => {
    it('должен открывать CommandPalette при нажатии Cmd+K (macOS)', () => {
      renderWithChakra(<Header />)

      // Изначально закрыто
      expect(screen.getByTestId('command-palette')).toHaveAttribute('data-open', 'false')

      // Нажимаем Cmd+K
      fireEvent.keyDown(document, { key: 'k', metaKey: true })

      // Теперь открыто
      expect(screen.getByTestId('command-palette')).toHaveAttribute('data-open', 'true')
    })

    it('должен открывать CommandPalette при нажатии Ctrl+K (Windows/Linux)', () => {
      renderWithChakra(<Header />)

      expect(screen.getByTestId('command-palette')).toHaveAttribute('data-open', 'false')

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true })

      expect(screen.getByTestId('command-palette')).toHaveAttribute('data-open', 'true')
    })

    it('не должен открывать CommandPalette при нажатии только K', () => {
      renderWithChakra(<Header />)

      fireEvent.keyDown(document, { key: 'k' })

      expect(screen.getByTestId('command-palette')).toHaveAttribute('data-open', 'false')
    })

    it('не должен открывать CommandPalette при нажатии Cmd+другая_клавиша', () => {
      renderWithChakra(<Header />)

      fireEvent.keyDown(document, { key: 'j', metaKey: true })

      expect(screen.getByTestId('command-palette')).toHaveAttribute('data-open', 'false')
    })
  })

  describe('взаимодействие', () => {
    it('должен открывать CommandPalette при клике на кнопку поиска (мобильная)', async () => {
      const user = userEvent.setup()
      renderWithChakra(<Header />)

      const searchButton = screen.getByRole('button', { name: /поиск/i })
      await user.click(searchButton)

      expect(screen.getByTestId('command-palette')).toHaveAttribute('data-open', 'true')
    })
  })

  describe('cleanup', () => {
    it('должен удалять event listener при unmount', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

      const { unmount } = renderWithChakra(<Header />)

      // Listener был добавлен
      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))

      unmount()

      // Listener был удалён
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))

      addEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
    })
  })
})
