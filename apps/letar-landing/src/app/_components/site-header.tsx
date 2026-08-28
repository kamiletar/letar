import { Box, Container, Flex, HStack, Text } from '@chakra-ui/react'
import { ArrowUpRight } from 'lucide-react'

const navItems = [
  { href: '#featured', label: 'Избранное' },
  { href: '#catalog', label: 'Каталог' },
]

/** Компактная навигация между разделами каталога и ключевыми сайтами */
export function SiteHeader() {
  return (
    <Box
      asChild
      position="sticky"
      top="0"
      zIndex="sticky"
      borderBottomWidth="1px"
      borderColor="border"
      bg="bg.header"
      backdropFilter="blur(18px)"
    >
      <header>
        <Container maxW="7xl">
          <Flex minH="16" align="center" justify="space-between" gap={6}>
            <Box asChild>
              <a href="/" aria-label="Letar — на главную">
                <HStack gap={2.5} minH="11">
                  <Box boxSize="2" borderRadius="full" bg="brand.300" boxShadow="0 0 18px rgba(101, 230, 210, 0.7)" />
                  <Text className="signal-font" fontSize="sm" letterSpacing="0.08em" color="fg">
                    LETAR / PROJECTS
                  </Text>
                </HStack>
              </a>
            </Box>

            <HStack asChild gap={{ base: 1, md: 2 }}>
              <nav aria-label="Навигация по странице">
                {navItems.map((item) => (
                  <Box
                    key={item.href}
                    asChild
                    display={{ base: 'none', md: 'block' }}
                    color="fg.muted"
                    fontSize="sm"
                    borderRadius="full"
                    _hover={{ color: 'fg', bg: 'bg.subtle' }}
                    _focusVisible={{ outline: '2px solid', outlineColor: 'brand.300', outlineOffset: '2px' }}
                  >
                    <a className="header-link" href={item.href}>{item.label}</a>
                  </Box>
                ))}
                <Box
                  asChild
                  color="brand.200"
                  fontSize="sm"
                  borderRadius="full"
                  _hover={{ bg: 'brand.a08', color: 'brand.100' }}
                  _focusVisible={{ outline: '2px solid', outlineColor: 'brand.300', outlineOffset: '2px' }}
                >
                  <a className="header-link" href="https://studio.letar.best" target="_blank" rel="noopener noreferrer">
                    Studio <ArrowUpRight aria-hidden="true" size={15} />
                  </a>
                </Box>
              </nav>
            </HStack>
          </Flex>
        </Container>
      </header>
    </Box>
  )
}
