'use client'

import {
  Box,
  DrawerBackdrop,
  DrawerBody,
  DrawerCloseTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerPositioner,
  DrawerRoot,
  DrawerTitle,
  DrawerTrigger,
  Flex,
  HStack,
  IconButton,
  Portal,
  Separator,
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react'
import { ColorModeSelect } from '@letar/chakra-provider'
import { createConsentConfig, MobileAuthSection, Pressable } from '@letar/ui'
import { useTranslations } from 'next-intl'
import { type ComponentType, type ReactNode, useState } from 'react'
import { LuBriefcaseMedical, LuCookie, LuGraduationCap, LuMenu, LuX, LuZap } from 'react-icons/lu'

import { logoutAction } from '@/app/_actions/auth.actions'
import { useHighContrast } from '@/app/_hooks/use-high-contrast'
import { useIsPsychologist } from '@/app/_hooks/use-psychologist'
import { Link, usePathname } from '@/i18n/navigation'
import { signInWithLetarAuth, useSession } from '@/lib/auth-client'

import { LanguageSwitcher } from './language-switcher'

/** Событие, которое открывает настройки cookie-баннера (в мобильной шапке отдельной кнопки нет) */
const COOKIE_SETTINGS_EVENT = createConsentConfig('archetest').openSettingsEvent

/** Пункт навигации drawer: иконка + подпись, подсветка текущего раздела, зона нажатия ≥ 44px */
function NavItem({
  href,
  icon: Icon,
  label,
  active,
  onNavigate,
}: {
  href: string
  icon: ComponentType<{ size?: number }>
  label: string
  active: boolean
  onNavigate: () => void
}) {
  return (
    <Pressable borderRadius="none">
      <Flex
        asChild
        align="center"
        gap={3}
        px={4}
        minH="48px"
        color={active ? 'brand.fg' : 'fg'}
        bg={active ? 'brand.subtle' : undefined}
        fontWeight={active ? 'semibold' : 'medium'}
        _hover={{ bg: active ? 'brand.subtle' : 'bg.muted' }}
        // Кольцо фокуса внутрь: Pressable режет всё, что снаружи (overflow: hidden)
        _focusVisible={{ outline: '2px solid', outlineColor: 'brand.focusRing', outlineOffset: '-2px' }}
      >
        <Link href={href} onClick={onNavigate} aria-current={active ? 'page' : undefined}>
          <Icon size={18} />
          <Text fontSize="md">{label}</Text>
        </Link>
      </Flex>
    </Pressable>
  )
}

/** Строка настроек: подпись слева, контрол справа */
function SettingRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <HStack px={4} minH="48px" justify="space-between" gap={3}>
      <Text fontSize="sm" color="fg.muted">
        {label}
      </Text>
      {children}
    </HStack>
  )
}

/**
 * Мобильное меню — drawer с навигацией, настройками и авторизацией.
 *
 * ⚠️ `Portal` + `DrawerPositioner` обязательны: без них `DrawerContent` рендерился прямо
 * внутри шапки — шапка раздувалась по высоте, а панель висела «коробкой» не на всю высоту
 * экрана (аудит 2026-09-24).
 */
export function MobileDrawer() {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const { data: session, isPending: isSessionPending } = useSession()
  const { isPsychologist } = useIsPsychologist()
  const highContrast = useHighContrast()
  const [open, setOpen] = useState(false)

  const close = () => setOpen(false)
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <DrawerRoot placement="end" size="xs" open={open} onOpenChange={(e) => setOpen(e.open)}>
      <DrawerTrigger asChild>
        <IconButton aria-label={t('menu')} variant="ghost" size="sm">
          <LuMenu />
        </IconButton>
      </DrawerTrigger>

      <Portal>
        <DrawerBackdrop />
        <DrawerPositioner>
          <DrawerContent>
            <DrawerHeader borderBottomWidth="1px" py={3}>
              <HStack justify="space-between" w="full">
                <DrawerTitle fontSize="lg">{t('menu')}</DrawerTitle>
                <DrawerCloseTrigger asChild position="static">
                  <IconButton aria-label={t('close')} variant="ghost" size="sm">
                    <LuX />
                  </IconButton>
                </DrawerCloseTrigger>
              </HStack>
            </DrawerHeader>

            <DrawerBody p={0}>
              {/* Навигация */}
              <VStack asChild align="stretch" gap={0} py={2}>
                <nav aria-label={t('menu')}>
                  <NavItem
                    href="/express"
                    icon={LuZap}
                    label={t('express')}
                    active={isActive('/express')}
                    onNavigate={close}
                  />
                  <NavItem
                    href="/for-professionals"
                    icon={LuGraduationCap}
                    label={t('forProfessionals')}
                    active={isActive('/for-professionals')}
                    onNavigate={close}
                  />
                  {isPsychologist && (
                    <NavItem
                      href="/cabinet"
                      icon={LuBriefcaseMedical}
                      label={t('cabinet')}
                      active={isActive('/cabinet')}
                      onNavigate={close}
                    />
                  )}
                </nav>
              </VStack>

              <Separator />

              {/* Оформление: тема, язык, контраст */}
              <VStack align="stretch" gap={0} py={2}>
                <Box px={4} pt={2} pb={3}>
                  <Text fontSize="sm" color="fg.muted" mb={2}>
                    {t('theme')}
                  </Text>
                  <ColorModeSelect
                    fullWidth
                    aria-label={t('theme')}
                    labels={{ light: t('themeLight'), system: t('themeSystem'), dark: t('themeDark') }}
                  />
                </Box>
                <SettingRow label={t('language')}>
                  <LanguageSwitcher />
                </SettingRow>
                {/* Вся строка — label свитча: тап по подписи тоже переключает */}
                <Switch.Root
                  size="md"
                  colorPalette="brand"
                  px={4}
                  minH="48px"
                  w="full"
                  justifyContent="space-between"
                  checked={highContrast.enabled}
                  onCheckedChange={highContrast.toggle}
                >
                  <Switch.Label fontSize="sm" fontWeight="normal" color="fg.muted">
                    {t('highContrast')}
                  </Switch.Label>
                  <Switch.HiddenInput />
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Root>
                <Pressable borderRadius="none">
                  <Flex
                    asChild
                    align="center"
                    gap={3}
                    px={4}
                    minH="48px"
                    w="full"
                    color="fg.muted"
                    fontSize="sm"
                    _hover={{ bg: 'bg.muted', color: 'fg' }}
                    _focusVisible={{ outline: '2px solid', outlineColor: 'brand.focusRing', outlineOffset: '-2px' }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        close()
                        window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT))
                      }}
                    >
                      <LuCookie size={16} />
                      {t('cookieSettings')}
                    </button>
                  </Flex>
                </Pressable>
              </VStack>

              <Separator />

              {/* Авторизация */}
              {!isSessionPending && (
                <MobileAuthSection
                  session={session?.user ?? null}
                  onSignIn={() => signInWithLetarAuth()}
                  onSignOut={logoutAction}
                  onClose={close}
                  profileHref="/settings"
                  showAuthHub
                  extraItems={[]}
                />
              )}
            </DrawerBody>
          </DrawerContent>
        </DrawerPositioner>
      </Portal>
    </DrawerRoot>
  )
}
