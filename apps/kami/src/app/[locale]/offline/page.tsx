import { Box, Container, Heading, Icon, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { LuWifiOff } from 'react-icons/lu'

export const metadata: Metadata = {
  title: 'Офлайн',
  description: 'Нет подключения к интернету',
}

interface OfflinePageProps {
  params: Promise<{ locale: string }>
}

export default async function OfflinePage({ params }: OfflinePageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'offline' })

  return (
    <Container maxW="lg" py={20}>
      <VStack gap={8} textAlign="center">
        <Box p={6} borderRadius="full" bg="bg.subtle" color="fg.muted">
          <Icon boxSize={16}>
            <LuWifiOff />
          </Icon>
        </Box>

        <VStack gap={4}>
          <Heading size="2xl">{t('title')}</Heading>
          <Text color="fg.muted" fontSize="lg" maxW="md">
            {t('description')}
          </Text>
        </VStack>

        <Text color="fg.subtle" fontSize="sm">
          {t('hint')}
        </Text>
      </VStack>
    </Container>
  )
}
