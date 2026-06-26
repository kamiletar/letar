'use client'

import { Box, Button, Flex, Separator, Text } from '@chakra-ui/react'
import type { ComponentType } from 'react'
import { useTransition } from 'react'
import { LuKeyRound, LuLogOut, LuUser } from 'react-icons/lu'

import { OptimizedAvatar } from './optimized-avatar'
import type { UserMenuItemConfig, UserMenuSession } from './user-menu'

export interface MobileAuthSectionProps {
  /** Сессия текущего пользователя или null */
  session: UserMenuSession | null
  /** Вызывается при клике «Войти» */
  onSignIn: () => void
  /** Вызывается при клике «Выйти» */
  onSignOut: () => void
  /** Вызывается при клике на любой пункт (для закрытия drawer) */
  onClose?: () => void
  /** Ссылка на страницу профиля */
  profileHref?: string
  /** Дополнительные пункты меню */
  extraItems?: UserMenuItemConfig[]
  /** Показывать ли пункт «Аккаунт в Ключнице» (false для standalone-приложений) */
  showAuthHub?: boolean
  /** Базовый URL Ключницы */
  authHubUrl?: string
}

interface DrawerItemProps {
  href?: string
  onClick?: () => void
  icon: ComponentType<{ size?: number }>
  label: string
  colorPalette?: string
  external?: boolean
}

function DrawerItem({ href, onClick, icon: Icon, label, colorPalette, external }: DrawerItemProps) {
  const color = colorPalette ? `${colorPalette}.fg` : 'fg.muted'
  const content = (
    <Flex
      align="center"
      gap={3}
      px={4}
      py={3}
      minH="44px"
      color={color}
      _hover={{ bg: 'bg.subtle', color: colorPalette ? `${colorPalette}.fg` : 'fg' }}
      transition="all 0.15s"
      cursor="pointer"
      w="full"
    >
      <Icon size={16} />
      <Text fontSize="sm" fontWeight="medium">
        {label}
      </Text>
    </Flex>
  )

  if (href) {
    return (
      <Box asChild w="full">
        <a
          href={href}
          onClick={onClick}
          target={external ? '_blank' : undefined}
          rel={external ? 'noopener noreferrer' : undefined}
        >
          {content}
        </a>
      </Box>
    )
  }

  return (
    <Box asChild w="full">
      <button type="button" onClick={onClick}>
        {content}
      </button>
    </Box>
  )
}

/**
 * Auth-секция для мобильного drawer.
 *
 * Рендерит плоский список: аватар+имя, профиль, доп.пункты, Ключница, выход.
 * Или кнопку «Войти» когда нет сессии.
 *
 * Вставляется в Drawer.Body приложения сразу после nav-ссылок:
 * @example
 * ```tsx
 * <Separator />
 * <MobileAuthSection
 *   session={session?.user ?? null}
 *   onSignIn={() => signInWithLetarAuth()}
 *   onSignOut={logoutAction}
 *   onClose={() => setDrawerOpen(false)}
 *   profileHref="/profile"
 *   extraItems={isAdmin ? [{ value: 'admin', label: 'Админ', href: '/admin', icon: LuSettings }] : []}
 * />
 * ```
 */
export function MobileAuthSection({
  session,
  onSignIn,
  onSignOut,
  onClose,
  profileHref,
  extraItems = [],
  showAuthHub = true,
  authHubUrl = 'https://auth.letar.best',
}: MobileAuthSectionProps) {
  const [isPending, startTransition] = useTransition()

  const displayName = session?.name || session?.email || 'Профиль'

  if (!session) {
    return (
      <Box px={4} py={3}>
        <Button
          variant="solid"
          colorPalette="brand"
          size="sm"
          w="full"
          onClick={() => {
            onClose?.()
            onSignIn()
          }}
        >
          Войти
        </Button>
      </Box>
    )
  }

  return (
    <Box>
      {/* Имя пользователя */}
      <Flex align="center" gap={3} px={4} py={3} color="fg.muted">
        <OptimizedAvatar src={session.image} name={displayName} size="xs" />
        <Text fontSize="sm" fontWeight="medium" truncate maxW="180px">
          {displayName}
        </Text>
      </Flex>

      <Separator />

      {/* Профиль */}
      {profileHref && (
        <DrawerItem
          href={profileHref}
          icon={LuUser}
          label="Профиль"
          onClick={onClose}
        />
      )}

      {/* Дополнительные пункты */}
      {extraItems.map((item) => (
        <DrawerItem
          key={item.value}
          href={item.href}
          icon={item.icon ?? LuUser}
          label={item.label}
          colorPalette={item.colorPalette}
          onClick={() => {
            onClose?.()
            item.onClick?.()
          }}
        />
      ))}

      {/* Аккаунт в Ключнице */}
      {showAuthHub && (
        <DrawerItem
          href={`${authHubUrl}/profile`}
          icon={LuKeyRound}
          label="Аккаунт в Ключнице"
          onClick={onClose}
          external
        />
      )}

      <Separator />

      {/* Выйти */}
      <DrawerItem
        icon={LuLogOut}
        label={isPending ? 'Выход...' : 'Выйти'}
        onClick={() => {
          onClose?.()
          startTransition(() => onSignOut())
        }}
      />
    </Box>
  )
}
