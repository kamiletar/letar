import { FALLBACK_DOWNLOAD } from '@/app/_components/download-info'
import { DownloadsSection } from '@/app/_components/downloads-section'
import { FaqSection } from '@/app/_components/faq-section'
import { FeaturesSection } from '@/app/_components/features-section'
import { Footer } from '@/app/_components/footer'
import { HeroSection } from '@/app/_components/hero-section'
import { KeyboardDemo } from '@/app/_components/keyboard-demo'
import { Navbar } from '@/app/_components/navbar'
import { getLatestDownload } from '@/lib/github'
import { Box } from '@chakra-ui/react'

/**
 * Главная страница лендинга KamiKeyThe
 * Server Component — собирает все секции, подтягивает версию/размер/URL последнего релиза
 * с GitHub Releases (ISR 1ч, тот же источник, что и /changelog).
 */
export default async function HomePage() {
  const download = (await getLatestDownload()) ?? FALLBACK_DOWNLOAD

  return (
    <Box as="main" position="relative">
      <Navbar />
      <HeroSection download={download} />
      <FeaturesSection />
      <KeyboardDemo />
      <DownloadsSection download={download} />
      <FaqSection />
      <Footer />
    </Box>
  )
}
