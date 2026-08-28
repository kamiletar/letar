import { EcosystemPreview } from '@/app/_components/ecosystem-preview'
import { ecosystemEntrances, projectCount } from '@/lib/projects-data'
import { Box, Button, Container, Flex, Grid, HStack, Text } from '@chakra-ui/react'
import { ArrowDown, ArrowUpRight } from 'lucide-react'

/** Hero-секция: тезис экосистемы и два главных сайта в живых окнах */
export function HeroSection() {
  return (
    <Box asChild className="hero-section" pt={{ base: '12', md: '20', xl: '24' }} pb={{ base: '10', md: '18' }}>
      <section>
        <Container maxW="7xl">
          <Grid
            templateColumns={{ base: '1fr', lg: 'minmax(0, 0.92fr) minmax(520px, 1.08fr)' }}
            gap={{ base: 12, lg: 10, xl: 16 }}
            alignItems="center"
          >
            <Box>
              <HStack gap={3} mb={7}>
                <Box className="signal-dot" boxSize="2.5" borderRadius="full" bg="brand.300" />
                <Text className="signal-font" color="brand.200" fontSize="xs" letterSpacing="0.1em">
                  SYSTEM ONLINE · {projectCount} PROJECTS
                </Text>
              </HStack>

              <Text
                asChild
                fontSize={{ base: '4xl', sm: '5xl', md: '6xl', xl: '7xl' }}
                fontWeight="750"
                letterSpacing="-0.055em"
                lineHeight={{ base: '1.02', md: '0.98' }}
                maxW="3xl"
              >
                <h1>
                  Проекты, которые{' '}
                  <Text asChild className="gradient-text">
                    <span>живут и работают.</span>
                  </Text>
                </h1>
              </Text>

              <Text fontSize={{ base: 'lg', md: 'xl' }} color="fg.muted" maxW="2xl" lineHeight="1.7" mt={7}>
                Letar — связанная экосистема сайтов, приложений и инструментов. Здесь собраны продукты Ками и работы
                Studio Letar.
              </Text>

              <Flex gap={3} mt={9} flexWrap="wrap">
                <Button
                  asChild
                  size="lg"
                  bg="brand.300"
                  color="gray.950"
                  borderRadius="full"
                  px={6}
                  _hover={{ bg: 'brand.200', transform: 'translateY(-2px)' }}
                  _active={{ transform: 'scale(0.98)' }}
                  transition="all 0.15s ease-out"
                >
                  <a href="https://studio.letar.best" target="_blank" rel="noopener noreferrer">
                    Перейти в Studio <ArrowUpRight aria-hidden="true" size={18} />
                  </a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  borderColor="border.emphasized"
                  color="fg"
                  borderRadius="full"
                  px={6}
                  _hover={{ bg: 'bg.subtle', borderColor: 'brand.500' }}
                  _active={{ transform: 'scale(0.98)' }}
                  transition="all 0.15s ease-out"
                >
                  <a href="#catalog">
                    Смотреть каталог <ArrowDown aria-hidden="true" size={18} />
                  </a>
                </Button>
              </Flex>

              <Flex mt={12} gap={{ base: 6, md: 10 }} align="start">
                <Box>
                  <Text fontSize="2xl" fontWeight="700">4</Text>
                  <Text className="signal-font" fontSize="xs" color="fg.subtle" mt={1}>НАПРАВЛЕНИЯ</Text>
                </Box>
                <Box width="1px" height="11" bg="border" aria-hidden="true" />
                <Box>
                  <Text fontSize="2xl" fontWeight="700">1</Text>
                  <Text className="signal-font" fontSize="xs" color="fg.subtle" mt={1}>ЭКОСИСТЕМА</Text>
                </Box>
              </Flex>
            </Box>

            <EcosystemPreview items={ecosystemEntrances} />
          </Grid>
        </Container>
      </section>
    </Box>
  )
}
