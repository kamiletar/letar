import desktop from '@/assets/about/hero-desktop.webp'
import mobile from '@/assets/about/hero-mobile.webp'
import { Box, Heading, Text, VStack } from '@chakra-ui/react'
import Image from 'next/image'

interface AboutHeroProps {
  title: string
  subtitle: string
  description: string
}

export function AboutHero({ title, subtitle, description }: AboutHeroProps) {
  return (
    <Box
      position="relative"
      isolation="isolate"
      overflow="hidden"
      borderRadius="2xl"
      bg="black"
      color="white"
      w="full"
      minW={0}
      maxW="full"
      minH={{ base: '640px', md: '560px' }}
      aspectRatio={{ md: '16 / 9' }}
      display="flex"
      alignItems={{ base: 'flex-end', md: 'center' }}
    >
      <Box as="picture" position="absolute" inset={0} zIndex={-2}>
        <source media="(max-width: 47.99rem)" srcSet={mobile.src} width={mobile.width} height={mobile.height} />
        <Image
          src={desktop}
          alt=""
          loading="eager"
          fetchPriority="high"
          unoptimized
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </Box>
      <Box
        position="absolute"
        inset={0}
        zIndex={-1}
        background={{
          base:
            'linear-gradient(to top, var(--chakra-colors-black) 0%, color-mix(in srgb, var(--chakra-colors-black) 92%, transparent) 23%, transparent 72%)',
          md:
            'linear-gradient(to right, color-mix(in srgb, var(--chakra-colors-black) 96%, transparent) 0%, color-mix(in srgb, var(--chakra-colors-black) 82%, transparent) 28%, transparent 65%)',
        }}
      />
      <VStack align="start" gap={4} p={{ base: 6, md: 10 }} maxW={{ md: '52%' }}>
        <Heading as="h1" fontSize={{ base: '3xl', md: '5xl' }}>{title}</Heading>
        <Text fontSize={{ base: 'lg', md: 'xl' }} color="green.200" fontFamily="mono">{subtitle}</Text>
        <Text fontSize={{ base: 'md', md: 'lg' }} color="gray.100">{description}</Text>
      </VStack>
    </Box>
  )
}
