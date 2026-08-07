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

// matchMedia полифил (требуется для Chakra useBreakpointValue/useMediaQuery, напр. Pagination)
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: noop,
      removeListener: noop,
      addEventListener: noop,
      removeEventListener: noop,
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList
}

Object.assign(global, {
  TextEncoder,
  TextDecoder,
})

import '@testing-library/jest-dom/vitest'

// Mock Next.js router (usePathname/useRouter/useSearchParams — filters, layout, pagination)
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
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}))

// Mock next/image (photo/sortable-photo-grid.tsx)
vi.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ fill, priority, ...props }: any) => (
    <img data-fill={fill ? 'true' : undefined} data-priority={priority ? 'true' : undefined} {...props} />
  ),
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
