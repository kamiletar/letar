import { DownloadsSection } from '@/app/_components/downloads-section'
import { FaqSection } from '@/app/_components/faq-section'
import { FeaturesSection } from '@/app/_components/features-section'
import { Footer } from '@/app/_components/footer'
import { HeroSection } from '@/app/_components/hero-section'
import { KeyboardDemo } from '@/app/_components/keyboard-demo'
import { Navbar } from '@/app/_components/navbar'
import { Box } from '@chakra-ui/react'

/**
 * Главная страница лендинга KamiKeyThe
 * Server Component — собирает все секции
 */
export default function HomePage() {
  return (
    <Box as="main" position="relative">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <KeyboardDemo />
      <DownloadsSection />
      <FaqSection />
      <Footer />
    </Box>
  )
}
