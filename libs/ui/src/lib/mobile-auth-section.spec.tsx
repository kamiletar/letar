import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { MobileAuthSection } from './mobile-auth-section'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('MobileAuthSection', () => {
  it('без сессии показывает только кнопку «Войти»', () => {
    renderWithProvider(<MobileAuthSection session={null} onSignIn={vi.fn()} onSignOut={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Войти' })).toBeInTheDocument()
    expect(screen.queryByText('Выйти')).not.toBeInTheDocument()
  })

  it('клик по «Войти» вызывает onSignIn и onClose', async () => {
    const onSignIn = vi.fn()
    const onClose = vi.fn()
    const user = userEvent.setup()

    renderWithProvider(
      <MobileAuthSection session={null} onSignIn={onSignIn} onSignOut={vi.fn()} onClose={onClose} />,
    )

    await user.click(screen.getByRole('button', { name: 'Войти' }))

    expect(onSignIn).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('с сессией показывает имя пользователя и пункт «Выйти»', () => {
    renderWithProvider(
      <MobileAuthSection
        session={{ name: 'Иван Иванов', email: 'ivan@example.com', image: null }}
        onSignIn={vi.fn()}
        onSignOut={vi.fn()}
      />,
    )

    expect(screen.getByText('Иван Иванов')).toBeInTheDocument()
    expect(screen.getByText('Выйти')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Войти' })).not.toBeInTheDocument()
  })

  it('показывает email вместо имени, если имя не задано', () => {
    renderWithProvider(
      <MobileAuthSection
        session={{ name: null, email: 'ivan@example.com', image: null }}
        onSignIn={vi.fn()}
        onSignOut={vi.fn()}
      />,
    )

    expect(screen.getByText('ivan@example.com')).toBeInTheDocument()
  })

  it('рендерит ссылку на профиль, когда задан profileHref', () => {
    renderWithProvider(
      <MobileAuthSection
        session={{ name: 'Иван', email: null, image: null }}
        onSignIn={vi.fn()}
        onSignOut={vi.fn()}
        profileHref="/profile"
      />,
    )

    expect(screen.getByText('Профиль').closest('a')).toHaveAttribute('href', '/profile')
  })

  it('не рендерит ссылку на профиль, когда profileHref не задан', () => {
    renderWithProvider(
      <MobileAuthSection session={{ name: 'Иван', email: null, image: null }} onSignIn={vi.fn()} onSignOut={vi.fn()} />,
    )

    expect(screen.queryByText('Профиль')).not.toBeInTheDocument()
  })

  it('скрывает пункт «Аккаунт в Ключнице», когда showAuthHub=false', () => {
    renderWithProvider(
      <MobileAuthSection
        session={{ name: 'Иван', email: null, image: null }}
        onSignIn={vi.fn()}
        onSignOut={vi.fn()}
        showAuthHub={false}
      />,
    )

    expect(screen.queryByText('Аккаунт в Ключнице')).not.toBeInTheDocument()
  })

  it('показывает пункт «Аккаунт в Ключнице» по умолчанию', () => {
    renderWithProvider(
      <MobileAuthSection session={{ name: 'Иван', email: null, image: null }} onSignIn={vi.fn()} onSignOut={vi.fn()} />,
    )

    expect(screen.getByText('Аккаунт в Ключнице')).toBeInTheDocument()
  })

  it('рендерит дополнительные пункты меню', () => {
    renderWithProvider(
      <MobileAuthSection
        session={{ name: 'Иван', email: null, image: null }}
        onSignIn={vi.fn()}
        onSignOut={vi.fn()}
        extraItems={[{ value: 'admin', label: 'Админ', href: '/admin' }]}
      />,
    )

    expect(screen.getByText('Админ')).toBeInTheDocument()
  })

  it('клик по «Выйти» вызывает onSignOut', async () => {
    const onSignOut = vi.fn()
    const user = userEvent.setup()

    renderWithProvider(
      <MobileAuthSection
        session={{ name: 'Иван', email: null, image: null }}
        onSignIn={vi.fn()}
        onSignOut={onSignOut}
      />,
    )

    await user.click(screen.getByText('Выйти'))

    expect(onSignOut).toHaveBeenCalledTimes(1)
  })
})
