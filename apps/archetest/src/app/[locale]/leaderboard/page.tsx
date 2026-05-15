import { getSession } from '@/lib/auth'
import { Container, Heading, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getLeaderboardAction } from '../_actions/leaderboard.action'
import { LeaderboardTable } from '../_components/leaderboard-table'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'quiz.leaderboard' })
  return {
    title: t('title'),
    description: t('description'),
  }
}

export default async function LeaderboardPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('quiz.leaderboard')
  const [entries, session] = await Promise.all([getLeaderboardAction({ limit: 50 }), getSession()])

  return (
    <Container maxW="3xl" py={8}>
      <VStack gap={6} align="start" w="100%">
        <VStack gap={1} align="start">
          <Heading size="xl">{t('title')}</Heading>
          <Text color="fg.muted">{t('description')}</Text>
        </VStack>

        <LeaderboardTable entries={entries} currentUserId={session?.user?.id} />
      </VStack>
    </Container>
  )
}
