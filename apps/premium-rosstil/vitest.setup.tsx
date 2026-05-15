// Полифилы для jsdom (требуется для @zenstackhq/runtime и других ESM пакетов)
import type { ReactNode } from 'react'
import { TextDecoder, TextEncoder } from 'util'
import { vi } from 'vitest'

// Web API полифилы
class MockRequest {
  url: string
  method: string
  headers: Headers
  body: unknown

  constructor(url: string, init?: RequestInit) {
    this.url = url
    this.method = init?.method || 'GET'
    this.headers = new Headers(init?.headers)
    this.body = init?.body
  }
}

class MockResponse {
  body: unknown
  status: number
  headers: Headers

  constructor(body?: unknown, init?: ResponseInit) {
    this.body = body
    this.status = init?.status || 200
    this.headers = new Headers(init?.headers)
  }

  json() {
    return Promise.resolve(this.body)
  }
}

class MockHeaders {
  private _headers: Map<string, string> = new Map()

  constructor(init?: HeadersInit) {
    if (init) {
      if (Array.isArray(init)) {
        init.forEach(([key, value]) => this._headers.set(key.toLowerCase(), value))
      } else if (init instanceof MockHeaders) {
        init._headers.forEach((value, key) => this._headers.set(key, value))
      } else {
        Object.entries(init).forEach(([key, value]) => this._headers.set(key.toLowerCase(), value))
      }
    }
  }

  get(name: string): string | null {
    return this._headers.get(name.toLowerCase()) || null
  }

  set(name: string, value: string): void {
    this._headers.set(name.toLowerCase(), value)
  }

  has(name: string): boolean {
    return this._headers.has(name.toLowerCase())
  }

  delete(name: string): void {
    this._headers.delete(name.toLowerCase())
  }

  forEach(callback: (value: string, key: string) => void): void {
    this._headers.forEach(callback)
  }
}

// structuredClone полифил (требуется для Chakra UI)
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = <T,>(obj: T): T => {
    if (obj === undefined) {
      return undefined as T
    }
    return JSON.parse(JSON.stringify(obj))
  }
}

// ResizeObserver полифил (требуется для Chakra UI Menu)
class MockResizeObserver {
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor, @typescript-eslint/no-empty-function
  constructor(_callback: ResizeObserverCallback) {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  observe() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  unobserve() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  disconnect() {}
}

global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver

// IntersectionObserver полифил
class MockIntersectionObserver {
  readonly root: Element | null = null
  readonly rootMargin: string = ''
  readonly thresholds: ReadonlyArray<number> = []
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor, @typescript-eslint/no-empty-function
  constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  observe() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  unobserve() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}

global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver

Object.assign(global, {
  TextEncoder,
  TextDecoder,
  Request: MockRequest,
  Response: MockResponse,
  Headers: MockHeaders,
})

import '@testing-library/jest-dom/vitest'

// Mock Next.js router
const mockRouterPush = vi.fn()
const mockRouterReplace = vi.fn()
const mockRouterPrefetch = vi.fn()
const mockRouterBack = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
    prefetch: mockRouterPrefetch,
    back: mockRouterBack,
    pathname: '/',
    query: {},
    asPath: '/',
  })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}))

// Mock next/link
vi.mock('next/link', () => {
  return {
    default: ({ children, href }: { children: ReactNode; href: string }) => {
      return <a href={href}>{children}</a>
    },
  }
})

// Mock next/image
vi.mock('next/image', () => ({
  __esModule: true,

  default: ({ fill, priority, ...props }: any) => {
    // Преобразуем fill и priority в data-атрибуты, чтобы избежать React warning
    return <img data-fill={fill ? 'true' : undefined} data-priority={priority ? 'true' : undefined} {...props} />
  },
}))

// Mock next-auth и связанные модули (предотвращает ESM ошибки)
vi.mock('next-auth', () => {
  class MockCredentialsSignin extends Error {
    type = 'CredentialsSignin'
    code = 'credentials'
  }
  return {
    __esModule: true,
    default: vi.fn(() => ({
      handlers: { GET: vi.fn(), POST: vi.fn() },
      auth: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    })),
    CredentialsSignin: MockCredentialsSignin,
  }
})

// Mock внешних @letar/* библиотек (предотвращает ошибки резолвинга)
vi.mock('@letar/email', () => ({
  sendPasswordResetEmail: vi.fn(),
  sendVerificationEmail: vi.fn(),
}))

vi.mock('@letar/auth/client', () => ({
  createAuthClientWithOAuth: vi.fn(() => ({ signIn: vi.fn(), signOut: vi.fn(), signUp: vi.fn() })),
  createOAuthButtons: vi.fn(() => vi.fn()),
  createTypedUseSession: vi.fn(() => vi.fn(() => ({ data: null, status: 'unauthenticated' }))),
}))

vi.mock('@letar/auth/server', () => ({
  createLogoutAction: vi.fn(() => vi.fn()),
  createSessionHelpers: vi.fn(() => ({ getSession: vi.fn(), getCurrentUser: vi.fn() })),
  createAuthGuards: vi.fn(() => ({ requireAuth: vi.fn(), requireRole: vi.fn(), requireAdmin: vi.fn() })),
}))

// Мок @/lib/auth НЕ ставится глобально — каждый action-тест
// определяет свой мок через shared helpers (mockGetSession, mockRequireAuth и т.д.)
// Глобальный мок конфликтует с per-test моками из-за непредсказуемого порядка.

vi.mock('@/lib/auth.config', () => ({
  __esModule: true,
  authConfig: {},
}))

// Mock next-auth/react (предотвращает ESM ошибки)
vi.mock('next-auth/react', () => ({
  __esModule: true,
  useSession: vi.fn(() => ({
    data: null,
    status: 'unauthenticated',
    update: vi.fn(),
  })),
  signIn: vi.fn(),
  signOut: vi.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock next-intl (предотвращает ESM ошибки)
vi.mock('next-intl', () => ({
  __esModule: true,
  useTranslations: vi.fn(() => (key: string) => key),
  useLocale: vi.fn(() => 'ru'),
  useMessages: vi.fn(() => ({})),
  useNow: vi.fn(() => new Date()),
  useTimeZone: vi.fn(() => 'Europe/Moscow'),
  useFormatter: vi.fn(() => ({
    number: (n: number) => String(n),
    dateTime: (d: Date) => d.toISOString(),
    relativeTime: () => '',
    list: (items: string[]) => items.join(', '),
  })),
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock next-intl/navigation (предотвращает ESM ошибки)
vi.mock('next-intl/navigation', () => ({
  __esModule: true,
  createNavigation: vi.fn(() => ({
    Link: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
    useRouter: vi.fn(() => ({
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
    })),
    usePathname: vi.fn(() => '/'),
    redirect: vi.fn(),
  })),
}))

// Mock next/cache (revalidatePath, revalidateTag для server actions)
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn: (...args: unknown[]) => unknown) => fn),
}))

// Mock @/i18n/navigation (наш локальный модуль навигации с next-intl)
vi.mock('@/i18n/navigation', () => ({
  __esModule: true,
  Link: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  })),
  usePathname: vi.fn(() => '/'),
  redirect: vi.fn(),
}))

// Suppress console errors in tests (optional)
const originalError = console.error
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Not implemented: HTMLFormElement.prototype.requestSubmit') ||
        // Подавляем act() warning от @zag-js/react (Chakra UI внутренняя библиотека)
        args[0].includes('was not wrapped in act('))
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})
