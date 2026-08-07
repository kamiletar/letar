import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Header } from './header'
import type { NavItem } from './header-nav'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

const navItems: NavItem[] = [
  { href: '/', label: 'Главная', exact: true },
  { href: '/catalog', label: 'Каталог' },
]

describe('Header (composite)', () => {
  it('собирает Logo, Nav и Actions в единый header', () => {
    vi.mocked(usePathname).mockReturnValue('/')

    renderWithProvider(
      <Header>
        <Header.Logo>My Brand</Header.Logo>
        <Header.Nav items={navItems} />
        <Header.Spacer />
        <Header.Actions>
          <button type="button">Профиль</button>
        </Header.Actions>
      </Header>,
    )

    expect(screen.getByText('My Brand')).toBeInTheDocument()
    expect(screen.getByText('Каталог')).toBeInTheDocument()
    expect(screen.getByText('Профиль')).toBeInTheDocument()
  })

  it('открывает мобильное меню через Header.MobileMenu внутри общего дерева', async () => {
    const user = userEvent.setup()
    vi.mocked(usePathname).mockReturnValue('/')

    renderWithProvider(
      <Header>
        <Header.Logo>My Brand</Header.Logo>
        <Header.MobileActions>
          <Header.MobileMenu items={navItems} />
        </Header.MobileActions>
      </Header>,
    )

    await user.click(screen.getByLabelText('Открыть меню'))

    expect(await screen.findByText('Каталог')).toBeInTheDocument()
  })

  it('экспортирует все под-компоненты через Object.assign', () => {
    expect(Header.Root).toBeDefined()
    expect(Header.Logo).toBeDefined()
    expect(Header.Nav).toBeDefined()
    expect(Header.Actions).toBeDefined()
    expect(Header.MobileMenu).toBeDefined()
    expect(Header.MobileActions).toBeDefined()
    expect(Header.Spacer).toBeDefined()
  })
})
