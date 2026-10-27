'use client'

import { AuthButton } from '@/app/_components/header/auth-button'
import { EntryReplay } from '@/app/_components/hero/entry-replay'
import { LanguageSwitcher } from '@/app/_components/language-switcher'
import { HStack } from '@chakra-ui/react'
import { ColorModeButton } from '@letar/chakra-provider'

/**
 * Значки в правом верхнем углу главной вместо шапки (KM-039): язык, тема, «Войти» или аватар и ↻ повтор.
 * Проявляются вместе с меню (`data-entry-corner`), до этого скрыты и не получают фокус. Цель касания ≥ 44 px.
 */
export function HomeCorner({ ariaLabel, replayLabel }: { ariaLabel: string; replayLabel: string }) {
  return (
    <HStack
      data-entry-corner=""
      role="group"
      aria-label={ariaLabel}
      position="absolute"
      top={{ base: 1, md: 3 }}
      right={{ base: 1, md: 4 }}
      zIndex="sticky"
      gap={0}
      css={{ '& button, & a': { minWidth: '44px', minHeight: '44px' } }}
    >
      <AuthButton />
      <LanguageSwitcher />
      <ColorModeButton />
      <EntryReplay label={replayLabel} />
    </HStack>
  )
}
