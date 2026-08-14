'use client'

import { Button, HStack, Menu, Portal, Separator, Text } from '@chakra-ui/react'
import type { ComponentType, ReactNode } from 'react'
import { useTransition } from 'react'
import { LuChevronDown, LuKeyRound, LuLogOut } from 'react-icons/lu'
import { OptimizedAvatar } from './optimized-avatar'

export interface UserMenuItemConfig {
  /** Уникальный ключ пункта меню */
  value: string
  /** Текст пункта меню */
  label: string
  /** Ссылка (если задана — рендерится как <a>) */
  href?: string
  /** Обработчик клика (альтернатива href) */
  onClick?: () => void
  /** Иконка из react-icons */
  icon?: ComponentType<{ size?: number }>
  /** Цветовая схема Chakra (например 'red' для деструктивных действий) */
  colorPalette?: string
}

export interface UserMenuSession {
  name?: string | null
  email?: string | null
  image?: string | null
}

export interface UserMenuLabels {
  /** Текст кнопки для анонимного пользователя */
  signIn?: string
  /** Плейсхолдер имени, когда нет ни name, ни email */
  fallbackName?: string
  /** Плейсхолдер имени в шапке dropdown, когда нет session.name */
  anonymousName?: string
  /** Пункт «Профиль» */
  profile?: string
  /** Пункт «Аккаунт в Ключнице» */
  authHub?: string
  /** Пункт «Выйти» */
  signOut?: string
}

const DEFAULT_LABELS: Required<UserMenuLabels> = {
  signIn: 'Войти',
  fallbackName: 'Профиль',
  anonymousName: 'Пользователь',
  profile: 'Профиль',
  authHub: 'Аккаунт в Ключнице',
  signOut: 'Выйти',
}

export interface UserMenuProps {
  /** Сессия текущего пользователя или null */
  session: UserMenuSession | null
  /** Вызывается при клике «Войти» */
  onSignIn: () => void
  /** Вызывается при клике «Выйти» */
  onSignOut: () => void
  /** Ссылка на страницу профиля (если не задана — профиль не отображается в меню) */
  profileHref?: string
  /** Дополнительные пункты меню — размещаются перед разделителем «Выйти» */
  extraItems?: UserMenuItemConfig[]
  /** Содержимое после имени пользователя в триггере (например бейдж роли) */
  triggerSlot?: ReactNode
  /** Базовый URL Ключницы (по умолчанию https://auth.letar.best) */
  authHubUrl?: string
  /** Показывать ли пункт «Аккаунт в Ключнице» (по умолчанию true; false для standalone-приложений) */
  showAuthHub?: boolean
  /** Размер кнопки «Войти» */
  size?: 'sm' | 'md' | 'lg'
  /** Тексты компонента (частичное переопределение) — по умолчанию русские */
  labels?: UserMenuLabels
}

/**
 * Универсальный компонент меню пользователя.
 *
 * Когда пользователь не авторизован — показывает кнопку «Войти».
 * Когда авторизован — показывает dropdown с профилем, доп. пунктами, Ключницей и выходом.
 *
 * @example
 * ```tsx
 * // В хедере приложения:
 * <UserMenu
 *   session={session?.user ?? null}
 *   onSignIn={() => signInWithLetarAuth(pathname)}
 *   onSignOut={signOut}
 *   profileHref="/profile"
 *   extraItems={isAdmin ? [{ value: 'admin', label: 'Админ', href: '/admin', icon: LuSettings }] : []}
 * />
 * ```
 */
export function UserMenu({
  session,
  onSignIn,
  onSignOut,
  profileHref,
  extraItems = [],
  triggerSlot,
  authHubUrl = 'https://auth.letar.best',
  showAuthHub = true,
  size = 'sm',
  labels,
}: UserMenuProps) {
  const [isPending, startTransition] = useTransition()
  const t = { ...DEFAULT_LABELS, ...labels }

  if (!session) {
    return (
      <Button variant="solid" size={size} colorPalette="brand" onClick={onSignIn}>
        {t.signIn}
      </Button>
    )
  }

  const displayName = session.name || session.email || t.fallbackName

  return (
    <Menu.Root>
      <Menu.Trigger cursor="pointer" asChild>
        <HStack
          gap={2}
          px={2}
          py={1}
          borderRadius="full"
          _hover={{ bg: 'bg.subtle' }}
          transition="background 0.15s"
          tabIndex={0}
        >
          <OptimizedAvatar src={session.image} name={displayName} size="xs" />
          <Text
            fontSize="sm"
            fontWeight="medium"
            display={{ base: 'none', lg: 'block' }}
            whiteSpace="nowrap"
            maxW="150px"
            truncate
          >
            {displayName}
          </Text>
          {triggerSlot}
          <LuChevronDown size={14} />
        </HStack>
      </Menu.Trigger>

      <Portal>
        <Menu.Positioner>
          <Menu.Content minW="200px">
            {/* Шапка: имя + email */}
            <Menu.Item value="_user-info" disabled px={3} py={2} cursor="default" _hover={{}}>
              <Text fontWeight="semibold" fontSize="sm" truncate maxW="170px">
                {session.name || t.anonymousName}
              </Text>
              {session.email && (
                <Text fontSize="xs" color="fg.muted" truncate maxW="170px">
                  {session.email}
                </Text>
              )}
            </Menu.Item>

            <Separator />

            {/* Профиль */}
            {profileHref && (
              <Menu.Item value="profile" asChild>
                <a href={profileHref}>{t.profile}</a>
              </Menu.Item>
            )}

            {/* Дополнительные пункты */}
            {extraItems.map((item) => {
              const Icon = item.icon
              const content = (
                <>
                  {Icon && <Icon size={16} />}
                  {item.label}
                </>
              )

              if (item.href) {
                return (
                  <Menu.Item
                    key={item.value}
                    value={item.value}
                    asChild
                    color={item.colorPalette ? `${item.colorPalette}.fg` : undefined}
                  >
                    <a href={item.href}>{content}</a>
                  </Menu.Item>
                )
              }

              return (
                <Menu.Item
                  key={item.value}
                  value={item.value}
                  color={item.colorPalette ? `${item.colorPalette}.fg` : undefined}
                  onClick={item.onClick}
                >
                  {content}
                </Menu.Item>
              )
            })}

            {(profileHref || extraItems.length > 0) && <Separator />}

            {/* Аккаунт в Ключнице — только для hub-client приложений */}
            {showAuthHub && (
              <>
                <Menu.Item value="auth-hub" asChild>
                  <a href={`${authHubUrl}/profile`} target="_blank" rel="noopener noreferrer">
                    <LuKeyRound size={16} />
                    {t.authHub}
                  </a>
                </Menu.Item>
                <Separator />
              </>
            )}

            {/* Выйти */}
            <Menu.Item
              value="sign-out"
              color="fg.muted"
              disabled={isPending}
              onClick={() => startTransition(() => onSignOut())}
            >
              <LuLogOut size={16} />
              {t.signOut}
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}
