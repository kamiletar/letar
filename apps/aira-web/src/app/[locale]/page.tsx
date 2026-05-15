import { Box } from '@chakra-ui/react'
import { setRequestLocale } from 'next-intl/server'

import { DownloadSection } from '@/app/_components/download-section'
import { Features } from '@/app/_components/features'
import { Footer } from '@/app/_components/footer'
import { Header } from '@/app/_components/header'
import { Hero } from '@/app/_components/hero'
import { SecurityDeepDive } from '@/app/_components/security-deep-dive'

type Props = {
  params: Promise<{ locale: string }>
}

/**
 * Главная страница — лендинг Aira (локализованная)
 */
export default async function HomePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <Box>
      <Header />
      <Box asChild>
        <main id="main-content">
          <Hero />
          <Features />
          <SecurityDeepDive />
          <DownloadSection />
        </main>
      </Box>
      <Footer />
    </Box>
  )
}
