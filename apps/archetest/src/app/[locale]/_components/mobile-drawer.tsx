'use client'

import {
  Box,
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
import { MobileAuthSection, Pressable } from '@letar/ui'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { LuMenu, LuX } from 'react-icons/lu'

import { logoutAction } from '@/app/_actions/auth.actions'
import { Link } from '@/i18n/navigation'
import { signInWithLetarAuth, useSession } from '@/lib/auth-client'

import { useIsPsychologist } from '@/app/_hooks/use-psychologist'

import { LanguageSwitcher } from './language-switcher'

/**
 * Мобильное меню — drawer с навигацией, настройками и авторизацией
 */
export function MobileDrawer() {
  const t = useTranslations('nav')
  const { data: session, isPending: isSessionPending } = useSession()
  const { isPsychologist } = useIsPsychologist()
  const [open, setOpen] = useState(false)

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
            <Pressable borderRadius="none">
              <Link href="/express" onClick={close}>
                <Box px={4} py={3} _hover={{ bg: 'bg.muted' }} cursor="pointer">
                  <Text fontSize="sm">{t('express')}</Text>
                </Box>
              </Link>
            </Pressable>
            <Pressable borderRadius="none">
              <Link href="/for-professionals" onClick={close}>
                <Box px={4} py={3} _hover={{ bg: 'bg.muted' }} cursor="pointer">
                  <Text fontSize="sm">{t('forProfessionals')}</Text>
                </Box>
              </Link>
            </Pressable>
            {isPsychologist && (
              <Pressable borderRadius="none">
                <Link href="/cabinet" onClick={close}>
                  <Box px={4} py={3} _hover={{ bg: 'bg.muted' }} cursor="pointer">
                    <Text fontSize="sm">{t('cabinet')}</Text>
                  </Box>
                </Link>
              </Pressable>
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
          {!isSessionPending && (
            <MobileAuthSection
              session={session?.user ?? null}
              onSignIn={signInWithLetarAuth}
              onSignOut={logoutAction}
              onClose={close}
              profileHref="/settings"
              showAuthHub
              extraItems={[]}
            />
          )}
        </DrawerBody>
      </DrawerContent>
    </DrawerRoot>
  )
}
