import { getSession } from '@/lib/auth'
import { Box, Card, Heading, Stack, Text } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AccountChooser } from './_components/account-chooser'

export const metadata: Metadata = {
  title: 'Выбор аккаунта',
}

/**
 * Каталог известных клиентских приложений для отображения названия.
 * Источник истины — `trustedClients` в `lib/auth.ts`. Здесь дублируется
 * только название (без секретов), чтобы избежать клиент-сайд утечки.
 */
const CLIENT_NAMES: Record<string, string> = {
  'archetest-prod': 'Архетест',
  'time-prod': 'Unix Time',
  'grandslamcup-prod': 'Grand Slam Cup',
  'kami-prod': 'Ками',
  'animatrona-tracker-prod': 'Animatrona Tracker',
  'dashboard-prod': 'Dashboard',
}

interface ConsentPageProps {
  searchParams: Promise<{
    client_id?: string
    consent_code?: string
    scope?: string
  }>
}

export default async function ConsentPage({ searchParams }: ConsentPageProps) {
  const params = await searchParams
  const session = await getSession()

  // Если нет сессии — редирект на sign-in (Better Auth должен сам это делать,
  // но на всякий случай страхуемся, чтобы не упасть на чтении user полей)
  if (!session) {
    redirect('/sign-in')
  }

  const clientId = params.client_id ?? ''
  const clientName = CLIENT_NAMES[clientId] ?? clientId ?? 'Приложение'

  return (
    <Box maxW="md" mx="auto" p={6}>
      <Card.Root>
        <Card.Body>
          <Stack gap={5}>
            <Stack gap={1} textAlign="center">
              <Heading size="lg">Войти в {clientName}</Heading>
              <Text color="fg.muted" fontSize="sm">
                Выберите аккаунт для продолжения
              </Text>
            </Stack>

            <Suspense>
              <AccountChooser
                user={{
                  name: session.user.name,
                  email: session.user.email,
                  image: session.user.image ?? null,
                }}
              />
            </Suspense>
          </Stack>
        </Card.Body>
      </Card.Root>
    </Box>
  )
}
