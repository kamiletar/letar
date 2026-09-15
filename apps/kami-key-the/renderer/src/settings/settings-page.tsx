/**
 * Страница настроек — карта символов, автозагрузка, исключения, about
 */

import { Box, Stack } from '@chakra-ui/react'
import { AboutSection } from './about-section'
import { AutostartToggle } from './autostart-toggle'
import { ExclusionsSection } from './exclusions-section'
import { SymbolMap } from './symbol-map'

interface SettingsPageProps {
  isActive: boolean
}

export function SettingsPage({ isActive }: SettingsPageProps) {
  return (
    <Box h="full" overflowY="auto" display={isActive ? 'block' : 'none'}>
      <Stack gap="4" maxW="880px" mx="auto" px="6" py="6">
        <SymbolMap />
        <AutostartToggle />
        <ExclusionsSection />
        <AboutSection />
      </Stack>
    </Box>
  )
}
