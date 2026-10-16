import { BLOCKED_FOR_RU, getCountryCode } from '@/lib/geo'
import { Card } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { OidcPendingCapture } from './_components/oidc-pending-capture'
import { SignInFlow } from './_components/sign-in-flow'

export const metadata: Metadata = { title: 'Вход в Letar', robots: { index: false, follow: false } }

const OTHER_PROVIDERS = ['google', 'github', 'facebook'] as const

/** Единая точка входа и регистрации; OIDC-контекст сохраняется для всех способов. */
export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams
  const hasOidc = !!(params.client_id && params.redirect_uri && params.response_type)
  const countryCode = await getCountryCode()
  const isRussianIp = countryCode === 'RU'
  const otherProviders = OTHER_PROVIDERS.filter((provider) => !isRussianIp || !BLOCKED_FOR_RU.has(provider))
  const hasTelegram = !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_USERNAME) && !isRussianIp

  return (
    <Card.Root maxW="440px" w="full" mx={4} my={6} borderRadius="2xl">
      {hasOidc && <OidcPendingCapture params={params} />}
      <Card.Body p={{ base: 6, sm: 8 }}>
        <Suspense>
          <SignInFlow otherProviders={otherProviders} hasTelegram={hasTelegram} />
        </Suspense>
      </Card.Body>
    </Card.Root>
  )
}
