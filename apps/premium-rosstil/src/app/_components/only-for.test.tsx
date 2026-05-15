import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OnlyFor } from './only-for'

// Mock auth-client
const mockUseSession = vi.fn()

vi.mock('@/lib/auth-client', () => ({
  useSession: () => mockUseSession(),
  authClient: {
    useSession: () => mockUseSession(),
  },
}))

describe('OnlyFor Component', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading state', () => {
    it('should render nothing when session is loading', () => {
      mockUseSession.mockReturnValue({
        data: null,
        isPending: true,
      })

      const { container } = render(
        <OnlyFor userRole="USER">
          <div>Content</div>
        </OnlyFor>
      )

      expect(container.firstChild).toBeNull()
    })
  })

  describe('Unauthorized users', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        isPending: false,
      })
    })

    it('should show content for UNAUTHORIZED role', () => {
      render(
        <OnlyFor userRole="UNAUTHORIZED">
          <div>Sign In</div>
        </OnlyFor>
      )

      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })

    it('should hide content for USER role', () => {
      const { container } = render(
        <OnlyFor userRole="USER">
          <div>User Content</div>
        </OnlyFor>
      )

      expect(container.firstChild).toBeNull()
    })

    it('should hide content for ADMIN role', () => {
      const { container } = render(
        <OnlyFor userRole="ADMIN">
          <div>Admin Content</div>
        </OnlyFor>
      )

      expect(container.firstChild).toBeNull()
    })

    it('should hide content for array of roles not including UNAUTHORIZED', () => {
      const { container } = render(
        <OnlyFor userRole={['USER', 'ADMIN']}>
          <div>Authenticated Content</div>
        </OnlyFor>
      )

      expect(container.firstChild).toBeNull()
    })

    it('should show content when UNAUTHORIZED is in roles array', () => {
      render(
        <OnlyFor userRole={['UNAUTHORIZED', 'USER']}>
          <div>Sign In or Profile</div>
        </OnlyFor>
      )

      expect(screen.getByText('Sign In or Profile')).toBeInTheDocument()
    })
  })

  describe('Authenticated USER', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: 'user-1',
            email: 'user@example.com',
            role: 'USER',
          },
          session: {
            expiresAt: new Date('2024-12-31'),
          },
        },
        isPending: false,
      })
    })

    it('should show content for USER role', () => {
      render(
        <OnlyFor userRole="USER">
          <div>User Content</div>
        </OnlyFor>
      )

      expect(screen.getByText('User Content')).toBeInTheDocument()
    })

    it('should hide content for ADMIN role', () => {
      const { container } = render(
        <OnlyFor userRole="ADMIN">
          <div>Admin Content</div>
        </OnlyFor>
      )

      expect(container.firstChild).toBeNull()
    })

    it('should hide content for UNAUTHORIZED role', () => {
      const { container } = render(
        <OnlyFor userRole="UNAUTHORIZED">
          <div>Sign In</div>
        </OnlyFor>
      )

      expect(container.firstChild).toBeNull()
    })

    it('should show content when USER is in roles array', () => {
      render(
        <OnlyFor userRole={['USER', 'ADMIN']}>
          <div>Authenticated Content</div>
        </OnlyFor>
      )

      expect(screen.getByText('Authenticated Content')).toBeInTheDocument()
    })

    it('should hide content when USER is not in roles array', () => {
      const { container } = render(
        <OnlyFor userRole={['ADMIN']}>
          <div>Admin Only</div>
        </OnlyFor>
      )

      expect(container.firstChild).toBeNull()
    })
  })

  describe('Authenticated ADMIN', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: 'admin-1',
            email: 'admin@example.com',
            role: 'ADMIN',
          },
          session: {
            expiresAt: new Date('2024-12-31'),
          },
        },
        isPending: false,
      })
    })

    it('should show content for ADMIN role', () => {
      render(
        <OnlyFor userRole="ADMIN">
          <div>Admin Content</div>
        </OnlyFor>
      )

      expect(screen.getByText('Admin Content')).toBeInTheDocument()
    })

    it('should hide content for USER role only', () => {
      const { container } = render(
        <OnlyFor userRole="USER">
          <div>User Only Content</div>
        </OnlyFor>
      )

      expect(container.firstChild).toBeNull()
    })

    it('should show content when ADMIN is in roles array', () => {
      render(
        <OnlyFor userRole={['USER', 'ADMIN']}>
          <div>Any Authenticated</div>
        </OnlyFor>
      )

      expect(screen.getByText('Any Authenticated')).toBeInTheDocument()
    })

    it('should hide content for UNAUTHORIZED role', () => {
      const { container } = render(
        <OnlyFor userRole="UNAUTHORIZED">
          <div>Sign In</div>
        </OnlyFor>
      )

      expect(container.firstChild).toBeNull()
    })
  })

  describe('Complex scenarios', () => {
    it('should handle multiple children', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: 'user-1',
            email: 'user@example.com',
            role: 'USER',
          },
          session: {
            expiresAt: new Date('2024-12-31'),
          },
        },
        isPending: false,
      })

      render(
        <OnlyFor userRole="USER">
          <div>First Child</div>
          <div>Second Child</div>
        </OnlyFor>
      )

      expect(screen.getByText('First Child')).toBeInTheDocument()
      expect(screen.getByText('Second Child')).toBeInTheDocument()
    })

    it('should handle nested OnlyFor components', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: 'admin-1',
            email: 'admin@example.com',
            role: 'ADMIN',
          },
          session: {
            expiresAt: new Date('2024-12-31'),
          },
        },
        isPending: false,
      })

      render(
        <OnlyFor userRole={['USER', 'ADMIN']}>
          <div>Outer Content</div>
          <OnlyFor userRole="ADMIN">
            <div>Inner Admin Content</div>
          </OnlyFor>
        </OnlyFor>
      )

      expect(screen.getByText('Outer Content')).toBeInTheDocument()
      expect(screen.getByText('Inner Admin Content')).toBeInTheDocument()
    })
  })
})
