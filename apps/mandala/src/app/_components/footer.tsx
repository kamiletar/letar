'use client'

import { Box, Container, Flex, Link, Text } from '@chakra-ui/react'
import packageJson from '../../../package.json'

/**
 * Футер с копирайтом и версией приложения.
 */
export function Footer() {
  return (
    <Box
      as="footer"
      role="contentinfo"
      bg={{ _light: 'blackAlpha.50', _dark: 'whiteAlpha.50' }}
      borderTop="1px solid"
      borderColor="border.subtle"
      mt="auto"
    >
      <Container maxW="container.xl" py={6}>
        <Flex
          direction={{ base: 'column', sm: 'row' }}
          gap={{ base: 2, sm: 6 }}
          align="center"
          justify="center"
          fontSize="xs"
          color="fg.muted"
        >
          <Text>© {new Date().getFullYear()} Elfafeya Art</Text>
          <Text display={{ base: 'none', sm: 'block' }} aria-hidden="true">
            |
          </Text>
          <Link href="mailto:elfafeya@gmail.com" color="brand.500" _hover={{ textDecoration: 'underline' }}>
            elfafeya@gmail.com
          </Link>
          <Text display={{ base: 'none', sm: 'block' }} aria-hidden="true">
            |
          </Text>
          <Text>v{packageJson.version}</Text>
        </Flex>
      </Container>
    </Box>
  )
}
