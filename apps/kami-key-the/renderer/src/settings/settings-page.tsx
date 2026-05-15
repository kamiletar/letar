/**
 * Страница настроек — карта символов, автозагрузка, about
 */

import { Box, Heading, Stack } from '@chakra-ui/react'
import { AboutSection } from './about-section'
import { AutostartToggle } from './autostart-toggle'
import { ExclusionsSection } from './exclusions-section'
import { SymbolMap } from './symbol-map'

export function SettingsPage() {
  return (
    <Box bg="#1a1a2e" minH="100vh" p="5" color="#e0e0e0" fontFamily="'Segoe UI', system-ui, sans-serif">
      <Heading as="h1" size="lg" mb="4">
        <Box as="span" color="#6c7ae0">
          KamiKeyThe
        </Box>
        {' \u2014 \u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438'}
      </Heading>

      <Stack gap="5">
        <SymbolMap />
        <AutostartToggle />
        <ExclusionsSection />
        <AboutSection />
      </Stack>
    </Box>
  )
}
