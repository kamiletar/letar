import { render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('nextjs-toploader', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: (props: any) => (
    <div
      data-testid="toploader"
      data-color={props.color ?? ''}
      data-height={props.height}
      data-show-spinner={String(props.showSpinner)}
    />
  ),
}))

import { TopLoader } from './top-loader'

describe('TopLoader', () => {
  it('не рендерит индикатор до монтирования на клиенте, затем рендерит', async () => {
    const { container } = render(<TopLoader />)

    await waitFor(() => {
      expect(container.querySelector('[data-testid="toploader"]')).toBeInTheDocument()
    })
  })

  it('пробрасывает color в NextTopLoader', async () => {
    const { container } = render(<TopLoader color="#E53E3E" />)

    await waitFor(() => {
      const el = container.querySelector('[data-testid="toploader"]')
      expect(el).toHaveAttribute('data-color', '#E53E3E')
    })
  })

  it('использует высоту по умолчанию 3, если не передана', async () => {
    const { container } = render(<TopLoader />)

    await waitFor(() => {
      const el = container.querySelector('[data-testid="toploader"]')
      expect(el).toHaveAttribute('data-height', '3')
    })
  })

  it('пробрасывает кастомную высоту', async () => {
    const { container } = render(<TopLoader height={5} />)

    await waitFor(() => {
      const el = container.querySelector('[data-testid="toploader"]')
      expect(el).toHaveAttribute('data-height', '5')
    })
  })

  it('showSpinner по умолчанию false', async () => {
    const { container } = render(<TopLoader />)

    await waitFor(() => {
      const el = container.querySelector('[data-testid="toploader"]')
      expect(el).toHaveAttribute('data-show-spinner', 'false')
    })
  })

  it('пробрасывает showSpinner=true', async () => {
    const { container } = render(<TopLoader showSpinner />)

    await waitFor(() => {
      const el = container.querySelector('[data-testid="toploader"]')
      expect(el).toHaveAttribute('data-show-spinner', 'true')
    })
  })
})
