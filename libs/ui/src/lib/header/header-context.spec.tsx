import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { HeaderMobileProvider, useHeaderMobile } from './header-context'

function Consumer() {
  const { isOpen, open, close, toggle } = useHeaderMobile()
  return (
    <div>
      <span data-testid="state">{isOpen ? 'open' : 'closed'}</span>
      <button type="button" onClick={open}>open</button>
      <button type="button" onClick={close}>close</button>
      <button type="button" onClick={toggle}>toggle</button>
    </div>
  )
}

describe('HeaderMobileProvider / useHeaderMobile', () => {
  it('изначально меню закрыто', () => {
    render(
      <HeaderMobileProvider>
        <Consumer />
      </HeaderMobileProvider>,
    )

    expect(screen.getByTestId('state')).toHaveTextContent('closed')
  })

  it('open() открывает меню', async () => {
    const user = userEvent.setup()
    render(
      <HeaderMobileProvider>
        <Consumer />
      </HeaderMobileProvider>,
    )

    await user.click(screen.getByText('open'))

    expect(screen.getByTestId('state')).toHaveTextContent('open')
  })

  it('close() закрывает открытое меню', async () => {
    const user = userEvent.setup()
    render(
      <HeaderMobileProvider>
        <Consumer />
      </HeaderMobileProvider>,
    )

    await user.click(screen.getByText('open'))
    await user.click(screen.getByText('close'))

    expect(screen.getByTestId('state')).toHaveTextContent('closed')
  })

  it('toggle() переключает состояние туда и обратно', async () => {
    const user = userEvent.setup()
    render(
      <HeaderMobileProvider>
        <Consumer />
      </HeaderMobileProvider>,
    )

    await user.click(screen.getByText('toggle'))
    expect(screen.getByTestId('state')).toHaveTextContent('open')

    await user.click(screen.getByText('toggle'))
    expect(screen.getByTestId('state')).toHaveTextContent('closed')
  })

  it('бросает ошибку при использовании вне провайдера', () => {
    // Подавляем ожидаемый React error boundary лог в stderr для этого теста
    const originalError = console.error
    console.error = () => {}

    expect(() => render(<Consumer />)).toThrow('useHeaderMobile must be used within HeaderMobileProvider')

    console.error = originalError
  })
})
