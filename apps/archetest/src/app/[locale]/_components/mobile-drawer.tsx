'use client'

import {
  Box,
  Button,
  DrawerBackdrop,
  DrawerBody,
  DrawerCloseTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerRoot,
  DrawerTrigger,
  HStack,
  IconButton,
  Separator,
  Text,
  VStack,
} from '@chakra-ui/react'
import { ColorModeButton } from '@letar/chakra-provider'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { LuLogOut, LuMenu, LuSettings, LuUser, LuX } from 'react-icons/lu'

import { Link } from '@/i18n/navigation'
import { signInWithLetarAuth, signOut, useSession } from '@/lib/auth-client'

import { useIsPsychologist } from '@/app/_hooks/use-psychologist'

import { LanguageSwitcher } from './language-switcher'

/**
 * Мобильное меню — drawer с навигацией, настройками и авторизацией
 */
export function MobileDrawer() {
  const t = useTranslations('nav')
  const tCommon = useTranslations('common')
  const { data: session, isPending } = useSession()
  const { isPsychologist } = useIsPsychologist()
  const [open, setOpen] = useState(false)

  /** Закрыть drawer при навигации */
  const close = () => setOpen(false)

  return (
    <DrawerRoot placement="end" size="xs" open={open} onOpenChange={(e) => setOpen(e.open)}>
      <DrawerTrigger asChild>
        <IconButton aria-label={t('menu')} variant="ghost" size="sm">
          <LuMenu />
        </IconButton>
      </DrawerTrigger>

      <DrawerBackdrop />

      <DrawerContent>
        <DrawerHeader borderBottomWidth="1px">
          <HStack justify="space-between">
            <Text fontSize="lg" fontWeight="semibold">
              {t('menu')}
            </Text>
            <DrawerCloseTrigger asChild position="relative" top="0" right="0">
              <IconButton aria-label={t('menu')} variant="ghost" size="sm">
                <LuX />
              </IconButton>
            </DrawerCloseTrigger>
          </HStack>
        </DrawerHeader>

        <DrawerBody p={0}>
          {/* Навигация */}
          <VStack align="stretch" gap={0} py={2}>
            <Box asChild onClick={close}>
              <Link href="/leaderboard">
                <Box px={4} py={3} _hover={{ bg: 'bg.muted' }} cursor="pointer">
                  <Text fontSize="sm">{t('leaderboard')}</Text>
                </Box>
              </Link>
            </Box>
            <Box asChild onClick={close}>
              <Link href="/for-professionals">
                <Box px={4} py={3} _hover={{ bg: 'bg.muted' }} cursor="pointer">
                  <Text fontSize="sm">{t('forProfessionals')}</Text>
                </Box>
              </Link>
            </Box>
            {isPsychologist && (
              <Box asChild onClick={close}>
                <Link href="/cabinet">
                  <Box px={4} py={3} _hover={{ bg: 'bg.muted' }} cursor="pointer">
                    <Text fontSize="sm">{t('cabinet')}</Text>
                  </Box>
                </Link>
              </Box>
            )}
          </VStack>

          <Separator />

          {/* Язык и тема */}
          <VStack align="stretch" gap={0} py={2}>
            <HStack px={4} py={3} justify="space-between">
              <LanguageSwitcher />
              <HStack gap={2}>
                <Text fontSize="sm" color="fg.muted">
                  {t('theme')}
                </Text>
                <ColorModeButton />
              </HStack>
            </HStack>
          </VStack>

          <Separator />

          {/* Авторизация */}
          {isPending ? null : session?.user ? (
            <VStack align="stretch" gap={0} py={2}>
              <HStack px={4} py={3} gap={2} color="fg.muted">
                <LuUser size={16} />
                <Text fontSize="sm">{session.user.name || session.user.email}</Text>
              </HStack>
              <Box asChild onClick={close}>
                <Link href="/settings">
                  <HStack px={4} py={3} gap={2} _hover={{ bg: 'bg.muted' }} cursor="pointer">
                    <LuSettings size={16} />
                    <Text fontSize="sm">{t('settings')}</Text>
                  </HStack>
                </Link>
              </Box>
              <HStack
                as="button"
                px={4}
                py={3}
                gap={2}
                _hover={{ bg: 'bg.muted' }}
                cursor="pointer"
                w="full"
                onClick={() => {
                  close()
                  signOut({ fetchOptions: { onSuccess: () => window.location.reload() } })
                }}
              >
                <LuLogOut size={16} />
                <Text fontSize="sm">{tCommon('signOut')}</Text>
              </HStack>
            </VStack>
          ) : (
            <Box px={4} py={3}>
              <Button
                onClick={() => {
                  close()
                  signInWithLetarAuth()
                }}
                variant="outline"
                size="sm"
                w="full"
              >
                {tCommon('signIn')}
              </Button>
            </Box>
          )}
        </DrawerBody>
      </DrawerContent>
    </DrawerRoot>
  )
}
