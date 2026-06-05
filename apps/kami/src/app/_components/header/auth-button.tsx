import { Link } from '@/i18n/navigation'
import { getSession, isAdmin } from '@/lib/auth'
import { Avatar, Button, HStack, Menu, Portal, Text } from '@chakra-ui/react'
import { KeyRound, Settings, User } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'
import { SignInButton } from './sign-in-button'
import { SignOutButton } from './sign-out-button'

/**
 * Кнопка авторизации для header
 *
 * Показывает:
 * - Кнопку "Войти" для неавторизованных
 * - Меню с аватаром для авторизованных
 */
export async function AuthButton() {
  const [session, admin, locale, t] = await Promise.all([getSession(), isAdmin(), getLocale(), getTranslations('auth')])

  // Неавторизованный пользователь — сразу редиректим на Ключницу
  if (!session?.user) {
    return <SignInButton label={t('signIn')} />
  }

  // Авторизованный пользователь
  return (
    <HStack gap={1}>
      {/* Кнопка админки — видна только админам */}
      {admin && (
        <Button asChild variant="ghost" size="sm" p={1} title={locale === 'ru' ? 'Админка' : 'Admin'}>
          <Link href="/admin/">
            <Settings size={16} />
          </Link>
        </Button>
      )}
      <Menu.Root>
        <Menu.Trigger asChild>
          <Button variant="ghost" size="sm" p={1}>
            <HStack gap={2}>
              <Avatar.Root size="xs">
                {session.user.image
                  ? <Avatar.Image src={session.user.image} alt={session.user.name || 'User'} />
                  : (
                    <Avatar.Fallback>
                      <User size={14} />
                    </Avatar.Fallback>
                  )}
              </Avatar.Root>
              <Text display={{ base: 'none', lg: 'inline' }} fontSize="sm">
                {session.user.name || session.user.email}
              </Text>
            </HStack>
          </Button>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner>
            <Menu.Content minW="160px">
              {admin && (
                <>
                  <Menu.Item value="admin" asChild>
                    <Link href="/admin/">
                      <Settings size={16} />
                      {locale === 'ru' ? 'Админка' : 'Admin'}
                    </Link>
                  </Menu.Item>
                  <Menu.Separator />
                </>
              )}
              <Menu.Item value="keyholder" asChild>
                <a href="https://auth.letar.best/profile" target="_blank" rel="noopener noreferrer">
                  <KeyRound size={16} />
                  {locale === 'ru' ? 'Аккаунт в Ключнице' : 'Auth Account'}
                </a>
              </Menu.Item>
              <Menu.Separator />
              <Menu.Item value="signout" asChild>
                <SignOutButton locale={locale} label={t('signOut')} />
              </Menu.Item>
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
    </HStack>
  )
}
