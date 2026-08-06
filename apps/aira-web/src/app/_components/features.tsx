import { Box, Container, Grid, Heading, Text, VStack } from '@chakra-ui/react'
import { getTranslations } from 'next-intl/server'
import type { IconType } from 'react-icons/lib'
import { LuGlobe, LuLock, LuMessageCircle, LuNetwork, LuShield, LuSmartphone } from 'react-icons/lu'

interface FeatureCardProps {
  icon: IconType
  title: string
  description: string
  accent?: string
}

/**
 * Карточка фичи с иконкой и описанием
 */
function FeatureCard({ icon: Icon, title, description, accent = 'brand' }: FeatureCardProps) {
  return (
    <Box
      p={8}
      borderRadius="xl"
      bg="bg.surface"
      border="1px solid"
      borderColor="border"
      _hover={{ borderColor: `${accent}.border`, bg: 'bg.subtle' }}
      transition="all 0.3s"
    >
      <VStack align="start" gap={4}>
        <Box p={3} borderRadius="lg" bg={`${accent}.subtle`} color={`${accent}.fg`}>
          <Icon size={24} />
        </Box>
        <Heading as="h3" size="md" fontWeight="semibold">
          {title}
        </Heading>
        <Text color="fg.muted" lineHeight="tall">
          {description}
        </Text>
      </VStack>
    </Box>
  )
}

/**
 * Секция с ключевыми возможностями Aira
 */
export async function Features() {
  const t = await getTranslations('features')

  const features: FeatureCardProps[] = [
    {
      icon: LuShield,
      title: t('quantum.title'),
      description: t('quantum.description'),
      accent: 'brand',
    },
    {
      icon: LuNetwork,
      title: t('p2p.title'),
      description: t('p2p.description'),
      accent: 'accent',
    },
    {
      icon: LuLock,
      title: t('metadata.title'),
      description: t('metadata.description'),
      accent: 'brand',
    },
    {
      icon: LuGlobe,
      title: t('global.title'),
      description: t('global.description'),
      accent: 'accent',
    },
    {
      icon: LuMessageCircle,
      title: t('fullMessenger.title'),
      description: t('fullMessenger.description'),
      accent: 'brand',
    },
    {
      icon: LuSmartphone,
      title: t('multiplatform.title'),
      description: t('multiplatform.description'),
      accent: 'accent',
    },
  ]

  return (
    <Box id="features" py={24}>
      <Container maxW="6xl">
        <VStack gap={16}>
          {/* Заголовок секции */}
          <VStack gap={4} textAlign="center" maxW="2xl">
            <Heading as="h2" size="3xl" fontWeight="bold">
              {t('title')}
            </Heading>
            <Text fontSize="lg" color="fg.muted">
              {t('subtitle')}
            </Text>
          </VStack>

          {/* Сетка фич */}
          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={6} w="full">
            {features.map((feature) => <FeatureCard key={feature.title} {...feature} />)}
          </Grid>
        </VStack>
      </Container>
    </Box>
  )
}
