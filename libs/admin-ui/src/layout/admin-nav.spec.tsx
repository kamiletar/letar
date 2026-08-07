import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { AdminNavItem } from '../types'
import { AdminNav } from './admin-nav'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

function mockPathname(pathname: string) {
  vi.mocked(usePathname).mockReturnValue(pathname)
}

/**
 * Находит ссылку пункта меню по подписи.
 *
 * Подпись рендерится в Box с responsive display={{ base: 'none', md: '...' }} — в jsdom
 * применяется только безусловное базовое правило (display:none), поэтому accessible name
 * ссылки в getByRole всегда пустая. Ищем сам текстовый узел и поднимаемся до <a>.
 */
function getLinkByLabel(label: string) {
  const link = screen.getByText(label).closest('a')
  if (!link) {
    throw new Error(`Не найдена ссылка для подписи "${label}"`)
  }
  return link
}

/**
 * jsdom не резолвит CSS custom properties — getComputedStyle(...).fontWeight возвращает
 * необработанное значение переменной темы (`var(--chakra-font-weights-medium)`), а не
 * итоговое число 500/400.
 */
const FONT_WEIGHT_ACTIVE = 'var(--chakra-font-weights-medium)'
const FONT_WEIGHT_INACTIVE = 'var(--chakra-font-weights-normal)'

/** Простая иконка-заглушка, совместимая с типом IconType из react-icons */
function StubIcon(props: { size?: number | string }) {
  return <svg data-testid="stub-icon" width={props.size} height={props.size} />
}

const navItems: AdminNavItem[] = [
  { href: '/admin', label: 'Главная', icon: StubIcon },
  { href: '/admin/products', label: 'Товары', icon: StubIcon },
  { href: '/admin/orders', label: 'Заказы', icon: StubIcon },
]

describe('AdminNav', () => {
  it('рендерит все пункты меню как ссылки с корректными href', () => {
    mockPathname('/admin')

    renderWithProvider(<AdminNav navItems={navItems} />)

    expect(getLinkByLabel('Главная')).toHaveAttribute('href', '/admin')
    expect(getLinkByLabel('Товары')).toHaveAttribute('href', '/admin/products')
    expect(getLinkByLabel('Заказы')).toHaveAttribute('href', '/admin/orders')
  })

  it('Dashboard активен только при точном совпадении пути', () => {
    mockPathname('/admin')

    renderWithProvider(<AdminNav navItems={navItems} />)

    const homeLink = getLinkByLabel('Главная')
    expect(getComputedStyle(homeLink).fontWeight).toBe(FONT_WEIGHT_ACTIVE)
  })

  it('Dashboard неактивен на вложенном пути', () => {
    mockPathname('/admin/products')

    renderWithProvider(<AdminNav navItems={navItems} />)

    const homeLink = getLinkByLabel('Главная')
    expect(getComputedStyle(homeLink).fontWeight).toBe(FONT_WEIGHT_INACTIVE)
  })

  it('обычный пункт активен при начале пути (startsWith)', () => {
    mockPathname('/admin/products/123/edit')

    renderWithProvider(<AdminNav navItems={navItems} />)

    const productsLink = getLinkByLabel('Товары')
    const ordersLink = getLinkByLabel('Заказы')

    expect(getComputedStyle(productsLink).fontWeight).toBe(FONT_WEIGHT_ACTIVE)
    expect(getComputedStyle(ordersLink).fontWeight).toBe(FONT_WEIGHT_INACTIVE)
  })

  it('рендерит текстовые подписи в развёрнутом режиме', () => {
    mockPathname('/admin')

    renderWithProvider(<AdminNav navItems={navItems} collapsed={false} />)

    // В развёрнутом режиме подпись встречается один раз (без tooltip-дубля)
    expect(screen.getAllByText('Товары')).toHaveLength(1)
  })

  it('в свёрнутом режиме оборачивает пункты в Tooltip (подпись дублируется в tooltip-content)', () => {
    mockPathname('/admin')

    renderWithProvider(<AdminNav navItems={navItems} collapsed />)

    // Chakra Tooltip не lazyMount по умолчанию — содержимое присутствует в DOM,
    // поэтому подпись встречается дважды: в самой ссылке и в tooltip content
    expect(screen.getAllByText('Товары').length).toBeGreaterThanOrEqual(1)
  })

  it('использует кастомный baseUrl для определения активности Dashboard', () => {
    mockPathname('/panel')

    const items: AdminNavItem[] = [{ href: '/panel', label: 'Главная', icon: StubIcon }]

    renderWithProvider(<AdminNav navItems={items} baseUrl="/panel" />)

    const homeLink = getLinkByLabel('Главная')
    expect(getComputedStyle(homeLink).fontWeight).toBe(FONT_WEIGHT_ACTIVE)
  })

  it('рендерит пустой список без ошибок', () => {
    mockPathname('/admin')

    renderWithProvider(<AdminNav navItems={[]} />)

    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })
})
