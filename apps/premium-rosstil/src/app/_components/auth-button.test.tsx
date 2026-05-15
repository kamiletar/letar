import { useRouter } from '@/i18n/navigation'
import { fireEvent, render, screen } from '@/test-utils'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { afterEach, describe, expect, it, type Mock, vi } from 'vitest'
import { AuthButton, SignInButton } from './auth-button'

// Mock @/i18n/navigation
vi.mock('@/i18n/navigation', () => ({
  useRouter: vi.fn(),
}))

// Mock серверного getSession
const mockGetSession = vi.fn()

vi.mock('@/lib/auth', () => ({
  getSession: () => mockGetSession(),
}))

const mockUseRouter = useRouter as Mock

describe('SignInButton Component', () => {
  it('should render sign in button', () => {
    const mockPush = vi.fn()
    mockUseRouter.mockReturnValue({
      push: mockPush,
    } as Partial<AppRouterInstance> as AppRouterInstance)

    render(<SignInButton />)

    const button = screen.getByRole('button', { name: /войти/i })
    expect(button).toBeInTheDocument()
  })

  it('should navigate to sign in page when clicked', () => {
    const mockPush = vi.fn()
    mockUseRouter.mockReturnValue({
      push: mockPush,
    } as Partial<AppRouterInstance> as AppRouterInstance)

    render(<SignInButton />)

    const button = screen.getByRole('button', { name: /войти/i })
    fireEvent.click(button)

    expect(mockPush).toHaveBeenCalledWith('/auth/signin')
  })
})

describe('AuthButton (Server Component)', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should show sign in button for unauthenticated users', async () => {
    mockGetSession.mockResolvedValue(null)

    const mockPush = vi.fn()
    mockUseRouter.mockReturnValue({
      push: mockPush,
    } as Partial<AppRouterInstance> as AppRouterInstance)

    render(await AuthButton())

    const button = screen.getByRole('button', { name: /войти/i })
    expect(button).toBeInTheDocument()
  })

  it('should hide sign in button for authenticated users', async () => {
    mockGetSession.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'user@example.com',
        role: 'USER',
      },
      session: {
        expiresAt: new Date('2024-12-31'),
      },
    })

    const mockPush = vi.fn()
    mockUseRouter.mockReturnValue({
      push: mockPush,
    } as Partial<AppRouterInstance> as AppRouterInstance)

    const result = await AuthButton()
    expect(result).toBeNull()
  })
})
