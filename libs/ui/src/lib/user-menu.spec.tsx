import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { UserMenu } from './user-menu'

import type { ReactNode } from 'react'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('UserMenu — неавторизованный пользователь', () => {
  it('показывает кнопку "Войти"', () => {
    renderWithProvider(<UserMenu session={null} onSignIn={vi.fn()} onSignOut={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Войти' })).toBeInTheDocument()
  })

  it('вызывает onSignIn при клике на "Войти"', async () => {
    const user = userEvent.setup()
    const onSignIn = vi.fn()
    renderWithProvider(<UserMenu session={null} onSignIn={onSignIn} onSignOut={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Войти' }))

    expect(onSignIn).toHaveBeenCalledTimes(1)
  })

  it('не показывает меню пользователя при отсутствии сессии', () => {
    renderWithProvider(<UserMenu session={null} onSignIn={vi.fn()} onSignOut={vi.fn()} />)
    expect(screen.queryByText('Выйти')).not.toBeInTheDocument()
  })
})

describe('UserMenu — авторизованный пользователь', () => {
  const session = { name: 'Иван Иванов', email: 'ivan@example.com', image: null }

  it('показывает имя пользователя в триггере', () => {
    renderWithProvider(<UserMenu session={session} onSignIn={vi.fn()} onSignOut={vi.fn()} />)
    expect(screen.getByText('Иван Иванов')).toBeInTheDocument()
  })

  it('показывает email вместо имени, если имя не задано', () => {
    renderWithProvider(
      <UserMenu
        session={{ name: null, email: 'ivan@example.com', image: null }}
        onSignIn={vi.fn()}
        onSignOut={vi.fn()}
      />,
    )
    expect(screen.getByText('ivan@example.com')).toBeInTheDocument()
  })

  it('открывает меню с пунктом "Профиль" при переданном profileHref', async () => {
    const user = userEvent.setup()
    renderWithProvider(<UserMenu session={session} onSignIn={vi.fn()} onSignOut={vi.fn()} profileHref="/profile" />)

    await user.click(screen.getByText('Иван Иванов'))
    await screen.findByText('Выйти')

    const profileLink = screen.getByRole('menuitem', { name: 'Профиль' })
    expect(profileLink).toHaveAttribute('href', '/profile')
  })

  it('не показывает пункт "Профиль" без profileHref', async () => {
    const user = userEvent.setup()
    renderWithProvider(<UserMenu session={session} onSignIn={vi.fn()} onSignOut={vi.fn()} />)

    await user.click(screen.getByText('Иван Иванов'))

    expect(screen.queryByRole('menuitem', { name: 'Профиль' })).not.toBeInTheDocument()
  })

  it('показывает дополнительные пункты меню из extraItems', async () => {
    const user = userEvent.setup()
    renderWithProvider(
      <UserMenu
        session={session}
        onSignIn={vi.fn()}
        onSignOut={vi.fn()}
        extraItems={[{ value: 'admin', label: 'Админ', href: '/admin' }]}
      />,
    )

    await user.click(screen.getByText('Иван Иванов'))
    await screen.findByText('Выйти')

    const adminLink = screen.getByRole('menuitem', { name: /Админ/ })
    expect(adminLink).toHaveAttribute('href', '/admin')
  })

  it('вызывает onClick пункта extraItems при клике, если href не задан', async () => {
    const user = userEvent.setup()
    const onExtraClick = vi.fn()
    renderWithProvider(
      <UserMenu
        session={session}
        onSignIn={vi.fn()}
        onSignOut={vi.fn()}
        extraItems={[{ value: 'custom', label: 'Настройки', onClick: onExtraClick }]}
      />,
    )

    await user.click(screen.getByText('Иван Иванов'))
    await user.click(await screen.findByText('Настройки'))

    expect(onExtraClick).toHaveBeenCalledTimes(1)
  })

  it('показывает ссылку "Аккаунт в Ключнице" по умолчанию (showAuthHub=true)', async () => {
    const user = userEvent.setup()
    renderWithProvider(<UserMenu session={session} onSignIn={vi.fn()} onSignOut={vi.fn()} />)

    await user.click(screen.getByText('Иван Иванов'))
    await screen.findByText('Выйти')

    const authHubLink = screen.getByRole('menuitem', { name: /Аккаунт в Ключнице/ })
    expect(authHubLink).toHaveAttribute('href', 'https://auth.letar.best/profile')
  })

  it('не показывает ссылку "Аккаунт в Ключнице" при showAuthHub=false', async () => {
    const user = userEvent.setup()
    renderWithProvider(<UserMenu session={session} onSignIn={vi.fn()} onSignOut={vi.fn()} showAuthHub={false} />)

    await user.click(screen.getByText('Иван Иванов'))

    await screen.findByText('Выйти')
    expect(screen.queryByRole('menuitem', { name: /Аккаунт в Ключнице/ })).not.toBeInTheDocument()
  })

  it('использует кастомный authHubUrl', async () => {
    const user = userEvent.setup()
    renderWithProvider(
      <UserMenu
        session={session}
        onSignIn={vi.fn()}
        onSignOut={vi.fn()}
        authHubUrl="https://custom-auth.example.com"
      />,
    )

    await user.click(screen.getByText('Иван Иванов'))
    await screen.findByText('Выйти')

    const authHubLink = screen.getByRole('menuitem', { name: /Аккаунт в Ключнице/ })
    expect(authHubLink).toHaveAttribute('href', 'https://custom-auth.example.com/profile')
  })

  it('вызывает onSignOut при клике на "Выйти"', async () => {
    const user = userEvent.setup()
    const onSignOut = vi.fn()
    renderWithProvider(<UserMenu session={session} onSignIn={vi.fn()} onSignOut={onSignOut} />)

    await user.click(screen.getByText('Иван Иванов'))
    await user.click(await screen.findByText('Выйти'))

    expect(onSignOut).toHaveBeenCalledTimes(1)
  })
})
