// Полифилы для jsdom
import type { ReactNode } from 'react'
import { TextDecoder, TextEncoder } from 'util'
import { vi } from 'vitest'

// structuredClone полифил (требуется для Chakra UI)
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = <T,>(obj: T): T => {
    if (obj === undefined) {
      return undefined as T
    }
    return JSON.parse(JSON.stringify(obj))
  }
}

// Пустая функция-заглушка
const noop = () => {
  /* намеренно пусто */
}

// ResizeObserver полифил (требуется для Chakra UI)
class MockResizeObserver {
  observe = noop
  unobserve = noop
  disconnect = noop
}

global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver

// IntersectionObserver полифил
class MockIntersectionObserver {
  readonly root: Element | null = null
  readonly rootMargin: string = ''
  readonly thresholds: ReadonlyArray<number> = []
  observe = noop
  unobserve = noop
  disconnect = noop
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}

global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver

// Полифилл localStorage для jsdom (в этом окружении Node подменяет window.localStorage
// нерабочей нативной реализацией — setItem/clear падают с "is not a function";
// см. такой же полифилл в libs/forms/vitest.setup.ts)
if (typeof window !== 'undefined') {
  const store = new Map<string, string>()
  const storageMock: Storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
    get length() {
      return store.size
    },
    key: (index: number) => [...store.keys()][index] ?? null,
  }
  if (typeof window.localStorage?.removeItem !== 'function') {
    Object.defineProperty(window, 'localStorage', { value: storageMock, writable: true })
  }
}

Object.assign(global, {
  TextEncoder,
  TextDecoder,
})

import '@testing-library/jest-dom/vitest'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}))

// Mock next/link
// ⚠️ Обязательно пробрасывать остальные props (...rest) — Chakra `asChild` клонирует
// пропсы (в т.ч. onClick) на прямой дочерний элемент, которым часто выступает next/link.
// Мок, отбрасывающий лишние props, молча теряет обработчики кликов (найдено в libs/ui/header).
vi.mock('next/link', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ children, href, ...props }: { children: ReactNode; href: string; [key: string]: any }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

// Mock next/image
vi.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ fill, priority, ...props }: any) => (
    <img data-fill={fill ? 'true' : undefined} data-priority={priority ? 'true' : undefined} {...props} />
  ),
  // getImageProps используется вручную вне <Image> (например OptimizedAvatar) — в jsdom нет
  // реального оптимизатора, поэтому просто прокидываем src/srcSet/alt как есть
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getImageProps: (props: any) => ({
    props: {
      src: props.src,
      srcSet: undefined,
      alt: props.alt,
      width: props.width,
      height: props.height,
    },
  }),
}))

// Suppress console errors in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string'
      && (args[0].includes('Warning: ReactDOM.render')
        || args[0].includes('Not implemented: HTMLFormElement.prototype.requestSubmit')
        || args[0].includes('was not wrapped in act('))
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})
