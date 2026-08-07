import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { fireEvent, render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { AdminNavItem } from '../types'
import { AdminSidebar } from './admin-sidebar'

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

/**
 * AdminSidebar на корневом `<aside>` и на большинстве внутренних узлов (заголовок, кнопка
 * сворачивания, подписи пунктов меню) использует responsive display={{ base: 'none', md: '...' }}
 * — компонент рассчитан на десктоп, на мобильном скрыт целиком (вместо него — MobileAdminDrawer).
 *
 * jsdom применяет только безусловное базовое CSS-правило и не матчит @media, поэтому всё
 * поддерево технически «display:none». Из-за этого:
 *  - role-запросы по умолчанию не видят элементы — фикс: `hidden: true`;
 *  - но даже с `hidden: true` вычисляемое accessible name для скрытых элементов пустое
 *    (алгоритм ARIA считает имя пустым для hidden-узлов, включая свой aria-label) —
 *    поэтому вместо `getByRole(..., { name })` используем поиск по тексту/атрибутам напрямую.
 */
describe('AdminSidebar', () => {
  it('рендерит дефолтный заголовок', () => {
    const { container } = renderWithProvider(<AdminSidebar navItems={navItems} onLogout={vi.fn()} />)

    const heading = container.querySelector('h2')
    expect(heading).toHaveTextContent('Админ-панель')
  })

  it('рендерит кастомный заголовок', () => {
    const { container } = renderWithProvider(
      <AdminSidebar navItems={navItems} onLogout={vi.fn()} title="Моя панель" />,
    )

    const heading = container.querySelector('h2')
    expect(heading).toHaveTextContent('Моя панель')
  })

  it('рендерит email пользователя', () => {
    renderWithProvider(<AdminSidebar navItems={navItems} onLogout={vi.fn()} userEmail="admin@example.com" />)

    expect(screen.getByText('admin@example.com')).toBeInTheDocument()
  })

  it('рендерит ссылку на основной сайт с target=_blank', () => {
    const { container } = renderWithProvider(
      <AdminSidebar navItems={navItems} onLogout={vi.fn()} siteUrl="https://example.com" />,
    )

    const siteLink = container.querySelector('a[aria-label="Перейти на сайт"]')
    expect(siteLink).toHaveAttribute('href', 'https://example.com')
    expect(siteLink).toHaveAttribute('target', '_blank')
  })

  it('рендерит навигацию с переданными пунктами', () => {
    renderWithProvider(<AdminSidebar navItems={navItems} onLogout={vi.fn()} />)

    // подпись пункта меню в отдельном Box с display:none в base — ищем текстом, не ролью
    const link = screen.getByText('Товары').closest('a')
    expect(link).toHaveAttribute('href', '/admin/products')
  })

  it('переключает подпись кнопки сворачивания при клике', () => {
    const { container } = renderWithProvider(<AdminSidebar navItems={navItems} onLogout={vi.fn()} />)

    const toggleButton = container.querySelector('button[aria-label="Свернуть меню"]')
    expect(toggleButton).toBeInTheDocument()

    fireEvent.click(toggleButton as HTMLButtonElement)

    expect(container.querySelector('button[aria-label="Развернуть меню"]')).toBeInTheDocument()
    expect(container.querySelector('button[aria-label="Свернуть меню"]')).not.toBeInTheDocument()
  })

  it('возвращает подпись обратно при повторном клике', () => {
    const { container } = renderWithProvider(<AdminSidebar navItems={navItems} onLogout={vi.fn()} />)

    fireEvent.click(container.querySelector('button[aria-label="Свернуть меню"]') as HTMLButtonElement)
    fireEvent.click(container.querySelector('button[aria-label="Развернуть меню"]') as HTMLButtonElement)

    expect(container.querySelector('button[aria-label="Свернуть меню"]')).toBeInTheDocument()
  })

  it('вызывает onLogout при отправке формы выхода', () => {
    const onLogout = vi.fn().mockResolvedValue(undefined)

    const { container } = renderWithProvider(<AdminSidebar navItems={navItems} onLogout={onLogout} />)

    const submitButton = container.querySelector('button[type="submit"]')
    expect(submitButton).toHaveTextContent('Выход')

    fireEvent.click(submitButton as HTMLButtonElement)

    expect(onLogout).toHaveBeenCalled()
  })
})
