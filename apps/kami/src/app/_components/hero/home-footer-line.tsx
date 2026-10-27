'use client'

import { CookieSettingsButton } from '@/app/_components/cookie-settings-button'
import { Link } from '@/i18n/navigation'
import { HStack, Link as ChakraLink, Text } from '@chakra-ui/react'
import { BuildVersion } from '@letar/ui'
import packageJson from '../../../../package.json'

/**
 * Единственная строка внизу главной вместо подвала (KM-039): политика ПДн (обязательна по 152-ФЗ),
 * настройки cookie и версия. Мелкий шрифт, цели касания ≥ 44 px по высоте.
 */
export function HomeFooterLine({ privacyLabel }: { privacyLabel: string }) {
  return (
    <HStack
      data-entry-footer=""
      justify="center"
      gap={{ base: 3, md: 5 }}
      flexWrap="wrap"
      css={{ '& a, & button': { minHeight: '44px', display: 'inline-flex', alignItems: 'center' } }}
    >
      <ChakraLink asChild fontSize="xs" color="fg.muted">
        <Link href="/privacy/">
          <Text asChild>
            <span>{privacyLabel}</span>
          </Text>
        </Link>
      </ChakraLink>
      <CookieSettingsButton />
      <BuildVersion version={packageJson.version} whiteSpace="nowrap" />
    </HStack>
  )
}
