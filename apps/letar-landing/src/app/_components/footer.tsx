import { Box, Container, HStack, Text } from '@chakra-ui/react'
import { BuildVersion, StudioCredit } from '@letar/ui'
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
          <StudioCredit app="letar-landing" />
          <BuildVersion version={packageJson.version} />
        </HStack>
      </Container>
    </Box>
  )
}
