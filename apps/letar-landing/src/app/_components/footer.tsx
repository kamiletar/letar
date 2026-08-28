import { Box, Container, Flex, Grid, HStack, Text } from '@chakra-ui/react'
import { BuildVersion, CookieSettingsButton, StudioCredit, TouchLink } from '@letar/ui'
import { ArrowUpRight } from 'lucide-react'
import packageJson from '../../../package.json'

/** Футер сайта */
export function Footer() {
  return (
    <Box asChild pt={{ base: 14, md: 20 }} pb={8} borderTopWidth="1px" borderColor="border" bg="bg.footer">
      <footer>
        <Container maxW="7xl">
          <Grid templateColumns={{ base: '1fr', md: '1.3fr 1fr' }} gap={{ base: 10, md: 16 }} pb={{ base: 12, md: 16 }}>
            <Box>
              <HStack gap={2.5} mb={5}>
                <Box boxSize="2" borderRadius="full" bg="brand.300" />
                <Text className="signal-font" fontSize="sm" letterSpacing="0.08em">LETAR / ECOSYSTEM</Text>
              </HStack>
              <Text
                fontSize={{ base: '2xl', md: '3xl' }}
                fontWeight="650"
                letterSpacing="-0.03em"
                maxW="lg"
                lineHeight="1.2"
              >
                Разные продукты. Одна инженерная практика.
              </Text>
            </Box>

            <Flex gap={{ base: 8, md: 14 }} justify={{ base: 'start', md: 'end' }} flexWrap="wrap">
              <FooterLink href="https://studio.letar.best" label="Studio Letar" />
              <FooterLink href="https://kami.letar.best" label="Kami" />
              <FooterLink href="#catalog" label="Каталог" external={false} />
            </Flex>
          </Grid>

          <Flex
            borderTopWidth="1px"
            borderColor="border"
            pt={6}
            justify="space-between"
            align="center"
            gap={5}
            flexWrap="wrap"
          >
            <HStack gap={4} flexWrap="wrap">
              <Text color="fg.subtle" fontSize="sm">&copy; {new Date().getFullYear()} Letar</Text>
              <TouchLink href="/privacy" fontSize="sm" color="fg.subtle" _hover={{ color: 'fg' }}>
                Конфиденциальность
              </TouchLink>
            </HStack>
            <HStack gap={4} flexWrap="wrap" color="fg.subtle">
              <StudioCredit app="letar-landing" />
              <BuildVersion version={packageJson.version} />
              <CookieSettingsButton appKey="letar-landing" />
            </HStack>
          </Flex>
        </Container>
      </footer>
    </Box>
  )
}

function FooterLink({ href, label, external = true }: { href: string; label: string; external?: boolean }) {
  return (
    <Box
      asChild
      color="fg.muted"
      borderBottomWidth="1px"
      borderColor="border.emphasized"
      pb={1}
      _hover={{ color: 'brand.200', borderColor: 'brand.400' }}
      _focusVisible={{ outline: '2px solid', outlineColor: 'brand.300', outlineOffset: '4px' }}
    >
      <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>
        <HStack gap={1.5}>
          <Text>{label}</Text>
          {external && <ArrowUpRight aria-hidden="true" size={15} />}
        </HStack>
      </a>
    </Box>
  )
}
