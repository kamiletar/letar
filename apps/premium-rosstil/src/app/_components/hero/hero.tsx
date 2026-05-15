'use client'

import { Link } from '@/i18n/navigation'
import { Box, Button, Container, Heading, Text, VStack } from '@chakra-ui/react'
import Image from 'next/image'
import bgImage from '../../[locale]/catalog/_components/_images/2_1.jpg'

export const Hero = () => {
  return (
    <Box position="relative" h="95vh" w="full" overflow="hidden">
      {/* Background Image */}
      <Box position="absolute" inset="0" zIndex={-1}>
        <Image
          src={bgImage}
          alt="Premium RosStil Hero"
          fill
          priority
          placeholder="blur"
          style={{ objectFit: 'cover' }}
        />
        <Box position="absolute" inset="0" bgGradient="linear(to-b, blackAlpha.300, blackAlpha.600)" />
      </Box>

      {/* Content */}
      <Container maxW="container.xl" h="full">
        <VStack h="full" justify="center" align="center" gap={8} textAlign="center" color="white">
          <Heading
            as="h1"
            fontSize={{ base: '4xl', md: '6xl', lg: '8xl' }}
            fontWeight="bold"
            letterSpacing="tight"
            textShadow="0 2px 10px rgba(0,0,0,0.3)"
          >
            Премиум РосСтиль
          </Heading>

          <Text
            fontSize={{ base: 'xl', md: '2xl' }}
            maxW="2xl"
            textShadow="0 2px 8px rgba(0,0,0,0.3)"
            fontWeight="medium"
          >
            Эксклюзивная дизайнерская одежда, созданная с любовью и вниманием к деталям. Подчеркните свою
            индивидуальность.
          </Text>

          <Button
            asChild
            size="xl"
            height="16"
            px="12"
            fontSize="lg"
            colorPalette="fg"
            _hover={{ transform: 'translateY(-2px)', shadow: 'xl' }}
            transition="all 0.2s"
          >
            <Link href={'/catalog'}>Перейти в каталог</Link>
          </Button>
        </VStack>
      </Container>
    </Box>
  )
}
