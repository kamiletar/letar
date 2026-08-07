import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { AdminNavItem } from '../types'
import { MobileAdminDrawer } from './mobile-admin-drawer'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

function StubIcon(props: { size?: number | string }) {
  return <svg data-testid="stub-icon" width={props.size} height={props.size} />
}

const navItems: AdminNavItem[] = [
  { href: '/admin', label: 'Главная', icon: StubIcon },
  { href: '/admin/products', label: 'Товары', icon: StubIcon },
]

beforeEach(() => {
  vi.mocked(usePathname).mockReturnValue('/admin')
})

describe('MobileAdminDrawer', () => {
  it('изначально закрыт — содержимое drawer не видно', () => {
    renderWithProvider(<MobileAdminDrawer navItems={navItems} onLogout={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Открыть меню' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Админ-панель' })).not.toBeInTheDocument()
  })

  it('открывается по клику на гамбургер-кнопку', async () => {
    const user = userEvent.setup()
    renderWithProvider(<MobileAdminDrawer navItems={navItems} onLogout={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Открыть меню' }))

    expect(await screen.findByRole('heading', { name: 'Админ-панель' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Товары/ })).toHaveAttribute('href', '/admin/products')
  })

  it('рендерит кастомный заголовок при открытии', async () => {
    const user = userEvent.setup()
    renderWithProvider(<MobileAdminDrawer navItems={navItems} onLogout={vi.fn()} title="Моя панель" />)

    await user.click(screen.getByRole('button', { name: 'Открыть меню' }))

    expect(await screen.findByRole('heading', { name: 'Моя панель' })).toBeInTheDocument()
  })

  it('закрывается при клике на пункт навигации', async () => {
    const user = userEvent.setup()
    renderWithProvider(<MobileAdminDrawer navItems={navItems} onLogout={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Открыть меню' }))
    const productsLink = await screen.findByRole('link', { name: /Товары/ })
    await user.click(productsLink)

    // после клика по ссылке drawer закрывается — заголовок больше не в DOM
    await vi.waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Админ-панель' })).not.toBeInTheDocument()
    })
  })

  it('рендерит email пользователя, когда он передан', async () => {
    const user = userEvent.setup()
    renderWithProvider(<MobileAdminDrawer navItems={navItems} onLogout={vi.fn()} userEmail="admin@example.com" />)

    await user.click(screen.getByRole('button', { name: 'Открыть меню' }))

    expect(await screen.findByText('admin@example.com')).toBeInTheDocument()
  })

  it('не рендерит блок email, когда userEmail не передан', async () => {
    const user = userEvent.setup()
    renderWithProvider(<MobileAdminDrawer navItems={navItems} onLogout={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Открыть меню' }))
    await screen.findByRole('heading', { name: 'Админ-панель' })

    expect(screen.queryByText(/@/)).not.toBeInTheDocument()
  })

  it('рендерит ссылку на сайт с target=_blank', async () => {
    const user = userEvent.setup()
    renderWithProvider(<MobileAdminDrawer navItems={navItems} onLogout={vi.fn()} siteUrl="https://example.com" />)

    await user.click(screen.getByRole('button', { name: 'Открыть меню' }))

    const siteLink = await screen.findByRole('link', { name: /Открыть сайт/ })
    expect(siteLink).toHaveAttribute('href', 'https://example.com')
    expect(siteLink).toHaveAttribute('target', '_blank')
  })

  it('вызывает onLogout при отправке формы выхода', async () => {
    const user = userEvent.setup()
    const onLogout = vi.fn().mockResolvedValue(undefined)

    renderWithProvider(<MobileAdminDrawer navItems={navItems} onLogout={onLogout} />)

    await user.click(screen.getByRole('button', { name: 'Открыть меню' }))
    await user.click(await screen.findByRole('button', { name: /Выход/ }))

    expect(onLogout).toHaveBeenCalled()
  })
})
