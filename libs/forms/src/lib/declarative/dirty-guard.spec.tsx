import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DirtyGuard } from './dirty-guard'
import { DeclarativeFormContext } from './form-context'
import type { DeclarativeFormContextValue } from './types'

// Мок Next.js router
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Обёртка для тестов с Chakra UI
const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

// Создаём мок контекста формы
function createMockFormContext(isDirty: boolean): DeclarativeFormContextValue {
  return {
    form: {
      state: { isDirty },
      reset: vi.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  }
}

// Обёртка с контекстом формы
function createContextWrapper(context: DeclarativeFormContextValue) {
  return ({ children }: { children: ReactNode }) =>
    createElement(TestWrapper, null, createElement(DeclarativeFormContext.Provider, { value: context }, children))
}

describe('DirtyGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('не рендерит диалог когда форма не dirty', () => {
      const context = createMockFormContext(false)
      const wrapper = createContextWrapper(context)

      const { container } = render(<DirtyGuard />, { wrapper })

      expect(container.innerHTML).toBe('')
    })

    it('не рендерит диалог когда форма dirty но нет навигации', () => {
      const context = createMockFormContext(true)
      const wrapper = createContextWrapper(context)

      const { container } = render(<DirtyGuard />, { wrapper })

      expect(container.innerHTML).toBe('')
    })
  })

  describe('beforeunload event', () => {
    it('регистрирует обработчик beforeunload', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
      const context = createMockFormContext(false)
      const wrapper = createContextWrapper(context)

      render(<DirtyGuard />, { wrapper })

      expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))
    })

    it('удаляет обработчик при размонтировании', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
      const context = createMockFormContext(false)
      const wrapper = createContextWrapper(context)

      const { unmount } = render(<DirtyGuard />, { wrapper })
      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))
    })

    it('не регистрирует обработчик когда enabled=false', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
      const context = createMockFormContext(true)
      const wrapper = createContextWrapper(context)

      // Сбрасываем счётчик после других тестов
      addEventListenerSpy.mockClear()

      render(<DirtyGuard enabled={false} />, { wrapper })

      const beforeUnloadCalls = addEventListenerSpy.mock.calls.filter((call) => call[0] === 'beforeunload')
      expect(beforeUnloadCalls.length).toBe(0)
    })
  })

  describe('link interception', () => {
    it('показывает диалог при клике на внутреннюю ссылку когда dirty', async () => {
      const context = createMockFormContext(true)
      const wrapper = createContextWrapper(context)

      render(
        <div>
          <DirtyGuard />
          <a href="/other-page">Go to other page</a>
        </div>,
        { wrapper }
      )

      // Кликаем на ссылку
      const link = screen.getByText('Go to other page')
      await userEvent.click(link)

      // Должен появиться диалог
      await waitFor(() => {
        expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
      })
    })

    it('не показывает диалог при клике на внешнюю ссылку', async () => {
      const context = createMockFormContext(true)
      const wrapper = createContextWrapper(context)

      render(
        <div>
          <DirtyGuard />
          <a href="https://external.com">External link</a>
        </div>,
        { wrapper }
      )

      const link = screen.getByText('External link')
      await userEvent.click(link)

      // Диалог не должен появиться
      expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()
    })

    it('не показывает диалог когда форма не dirty', async () => {
      const context = createMockFormContext(false)
      const wrapper = createContextWrapper(context)

      render(
        <div>
          <DirtyGuard />
          <a href="/other-page">Go to other page</a>
        </div>,
        { wrapper }
      )

      const link = screen.getByText('Go to other page')
      await userEvent.click(link)

      // Диалог не должен появиться
      expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()
    })
  })

  describe('dialog interaction', () => {
    it('закрывает диалог при нажатии "Stay"', async () => {
      const context = createMockFormContext(true)
      const wrapper = createContextWrapper(context)

      render(
        <div>
          <DirtyGuard />
          <a href="/other-page">Go to other page</a>
        </div>,
        { wrapper }
      )

      // Кликаем на ссылку чтобы показать диалог
      await userEvent.click(screen.getByText('Go to other page'))

      await waitFor(() => {
        expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
      })

      // Кликаем "Stay"
      await userEvent.click(screen.getByText('Stay'))

      // Диалог должен закрыться
      await waitFor(() => {
        expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()
      })

      // Навигация не должна произойти
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('выполняет навигацию при нажатии "Leave"', async () => {
      const context = createMockFormContext(true)
      const wrapper = createContextWrapper(context)

      render(
        <div>
          <DirtyGuard />
          <a href="/other-page">Go to other page</a>
        </div>,
        { wrapper }
      )

      // Кликаем на ссылку
      await userEvent.click(screen.getByText('Go to other page'))

      await waitFor(() => {
        expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
      })

      // Кликаем "Leave"
      await userEvent.click(screen.getByText('Leave'))

      // Навигация должна произойти
      expect(mockPush).toHaveBeenCalledWith('/other-page')
    })
  })

  describe('custom messages', () => {
    it('отображает кастомный заголовок', async () => {
      const context = createMockFormContext(true)
      const wrapper = createContextWrapper(context)

      render(
        <div>
          <DirtyGuard dialogTitle="Уходите?" />
          <a href="/other-page">Link</a>
        </div>,
        { wrapper }
      )

      await userEvent.click(screen.getByText('Link'))

      await waitFor(() => {
        expect(screen.getByText('Уходите?')).toBeInTheDocument()
      })
    })

    it('отображает кастомное описание', async () => {
      const context = createMockFormContext(true)
      const wrapper = createContextWrapper(context)

      render(
        <div>
          <DirtyGuard dialogDescription="Данные будут потеряны!" />
          <a href="/other-page">Link</a>
        </div>,
        { wrapper }
      )

      await userEvent.click(screen.getByText('Link'))

      await waitFor(() => {
        expect(screen.getByText('Данные будут потеряны!')).toBeInTheDocument()
      })
    })

    it('отображает кастомные тексты кнопок', async () => {
      const context = createMockFormContext(true)
      const wrapper = createContextWrapper(context)

      render(
        <div>
          <DirtyGuard confirmText="Да, уйти" cancelText="Нет, остаться" />
          <a href="/other-page">Link</a>
        </div>,
        { wrapper }
      )

      await userEvent.click(screen.getByText('Link'))

      await waitFor(() => {
        expect(screen.getByText('Да, уйти')).toBeInTheDocument()
        expect(screen.getByText('Нет, остаться')).toBeInTheDocument()
      })
    })
  })

  describe('onBlock callback', () => {
    it('вызывает onBlock при попытке навигации', async () => {
      const onBlock = vi.fn()
      const context = createMockFormContext(true)
      const wrapper = createContextWrapper(context)

      render(
        <div>
          <DirtyGuard onBlock={onBlock} />
          <a href="/other-page">Link</a>
        </div>,
        { wrapper }
      )

      await userEvent.click(screen.getByText('Link'))

      expect(onBlock).toHaveBeenCalled()
    })

    it('пропускает навигацию если onBlock возвращает false', async () => {
      const onBlock = vi.fn().mockReturnValue(false)
      const context = createMockFormContext(true)
      const wrapper = createContextWrapper(context)

      render(
        <div>
          <DirtyGuard onBlock={onBlock} />
          <a href="/other-page">Link</a>
        </div>,
        { wrapper }
      )

      await userEvent.click(screen.getByText('Link'))

      // Диалог не должен появиться
      expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()
    })
  })
})
