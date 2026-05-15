import { Box, Container, Text } from '@chakra-ui/react'

/** Hero-секция с заголовком и описанием */
export function HeroSection() {
  return (
    <Box as="section" pt={{ base: '16', md: '24' }} pb={{ base: '12', md: '16' }}>
      <Container maxW="4xl" textAlign="center">
        <Text
          as="h1"
          className="gradient-text"
          fontSize={{ base: '5xl', md: '7xl', lg: '8xl' }}
          fontWeight="extrabold"
          letterSpacing="tight"
          lineHeight="1.1"
          mb={6}
        >
          Letar
        </Text>
        <Text fontSize={{ base: 'lg', md: 'xl' }} color="fg.muted" maxW="2xl" mx="auto" lineHeight="tall">
          Экосистема веб-приложений, десктопных и мобильных проектов. E-commerce, образование, медиа и инфраструктура.
        </Text>
      </Container>
    </Box>
  )
}
