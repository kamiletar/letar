import { Box, Container, HStack, Text } from '@chakra-ui/react'
import { BuildVersion, CookieSettingsButton, StudioCredit, TouchLink } from '@letar/ui'
import packageJson from '../../../package.json'

/** Футер сайта */
export function Footer() {
  return (
    <Box as="footer" py={8} borderTopWidth="1px" borderColor="border">
      <Container maxW="5xl">
        <HStack justify="center" gap={4} flexWrap="wrap">
          <Text color="fg.subtle" fontSize="sm">
            &copy; {new Date().getFullYear()} Letar
          </Text>
          <TouchLink href="/privacy" fontSize="sm" color="fg.subtle" _hover={{ color: 'fg' }}>
            Конфиденциальность
          </TouchLink>
          <StudioCredit app="letar-landing" />
          <BuildVersion version={packageJson.version} />
          <CookieSettingsButton appKey="letar-landing" />
        </HStack>
      </Container>
    </Box>
  )
}
