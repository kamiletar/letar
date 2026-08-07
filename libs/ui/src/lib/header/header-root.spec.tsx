import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { HeaderRoot } from './header-root'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('HeaderRoot', () => {
  it('рендерит children внутри header-элемента', () => {
    const { container } = renderWithProvider(
      <HeaderRoot>
        <span>Контент хедера</span>
      </HeaderRoot>,
    )

    expect(screen.getByText('Контент хедера')).toBeInTheDocument()
    expect(container.querySelector('header')).toBeInTheDocument()
  })

  it('sticky=true (по умолчанию) даёт position: sticky', () => {
    const { container } = renderWithProvider(
      <HeaderRoot>
        <span>Контент</span>
      </HeaderRoot>,
    )

    const header = container.querySelector('header') as HTMLElement
    expect(getComputedStyle(header).position).toBe('sticky')
  })

  it('sticky=false убирает position: sticky', () => {
    const { container } = renderWithProvider(
      <HeaderRoot sticky={false}>
        <span>Контент</span>
      </HeaderRoot>,
    )

    const header = container.querySelector('header') as HTMLElement
    expect(getComputedStyle(header).position).not.toBe('sticky')
  })

  it('blurBackdrop=true (по умолчанию) добавляет backdrop-filter', () => {
    const { container } = renderWithProvider(
      <HeaderRoot>
        <span>Контент</span>
      </HeaderRoot>,
    )

    const header = container.querySelector('header') as HTMLElement
    expect(getComputedStyle(header).backdropFilter).toContain('blur')
  })

  it('blurBackdrop=false убирает backdrop-filter', () => {
    const { container } = renderWithProvider(
      <HeaderRoot blurBackdrop={false}>
        <span>Контент</span>
      </HeaderRoot>,
    )

    const header = container.querySelector('header') as HTMLElement
    expect(getComputedStyle(header).backdropFilter).not.toContain('blur')
  })

  it('hideOnScroll + isVisible=false сдвигает хедер через translateY', () => {
    const { container } = renderWithProvider(
      <HeaderRoot hideOnScroll isVisible={false}>
        <span>Контент</span>
      </HeaderRoot>,
    )

    const header = container.querySelector('header') as HTMLElement
    expect(getComputedStyle(header).transform).toContain('translateY(-100%)')
  })

  it('hideOnScroll + isVisible=true не сдвигает хедер', () => {
    const { container } = renderWithProvider(
      <HeaderRoot hideOnScroll isVisible>
        <span>Контент</span>
      </HeaderRoot>,
    )

    const header = container.querySelector('header') as HTMLElement
    expect(getComputedStyle(header).transform).toContain('translateY(0)')
  })
})
