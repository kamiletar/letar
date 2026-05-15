import { fireEvent, render, screen, waitFor } from '@/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { UserMenuClient } from './user-menu-client'

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
}))

describe('UserMenuClient Component', () => {
  const mockUser = {
    name: 'Test User',
    email: 'user@example.com',
    image: 'https://example.com/avatar.jpg',
    role: 'USER',
  }

  it('should render menu trigger with user name', () => {
    render(<UserMenuClient user={mockUser} />)

    // Menu trigger button should be present
    const button = screen.getByTestId('user-menu')
    expect(button).toBeInTheDocument()

    // User name should be visible (on desktop)
    expect(screen.getByText('Test User')).toBeInTheDocument()
  })

  it('should render avatar', () => {
    render(<UserMenuClient user={mockUser} />)

    // Avatar container should be present
    const button = screen.getByTestId('user-menu')
    expect(button).toBeInTheDocument()

    // Avatar image exists but may be hidden until loaded
    const image = button.querySelector('img')
    expect(image).toHaveAttribute('src', 'https://example.com/avatar.jpg')
  })

  it('should show profile menu item when menu is opened', async () => {
    render(<UserMenuClient user={mockUser} />)

    // Open menu
    const trigger = screen.getByTestId('user-menu')
    fireEvent.click(trigger)

    // Profile link should be present in menu
    await waitFor(() => {
      expect(screen.getByText('Профиль')).toBeInTheDocument()
    })
  })

  it('should show admin menu item for admin users', async () => {
    const adminUser = { ...mockUser, role: 'ADMIN' }

    render(<UserMenuClient user={adminUser} />)

    // Open menu
    const trigger = screen.getByTestId('user-menu')
    fireEvent.click(trigger)

    // Admin link should be present in menu
    await waitFor(() => {
      expect(screen.getByText('Админка')).toBeInTheDocument()
    })
  })

  it('should not show admin menu item for regular users', async () => {
    render(<UserMenuClient user={mockUser} />)

    // Open menu
    const trigger = screen.getByTestId('user-menu')
    fireEvent.click(trigger)

    // Wait for menu to open
    await waitFor(() => {
      expect(screen.getByText('Профиль')).toBeInTheDocument()
    })

    // Admin link should not be present
    expect(screen.queryByText('Админка')).not.toBeInTheDocument()
  })

  it('should render sign out button when menu is opened', async () => {
    render(<UserMenuClient user={mockUser} />)

    // Open menu
    const trigger = screen.getByTestId('user-menu')
    fireEvent.click(trigger)

    // Sign out button should be present
    await waitFor(() => {
      expect(screen.getByText('Выйти')).toBeInTheDocument()
    })
  })

  it('should handle missing user name gracefully', () => {
    const userWithoutName = { ...mockUser, name: null }

    render(<UserMenuClient user={userWithoutName} />)

    // Component should still render
    const button = screen.getByTestId('user-menu')
    expect(button).toBeInTheDocument()
  })

  it('should handle missing user image gracefully', () => {
    const userWithoutImage = { ...mockUser, image: null }

    render(<UserMenuClient user={userWithoutImage} />)

    // Component should still render with fallback avatar
    const button = screen.getByTestId('user-menu')
    expect(button).toBeInTheDocument()
  })
})
