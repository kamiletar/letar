import { Footer } from '@/app/_components/footer'
import { Navigation } from '@/app/_components/navigation'
import { Box } from '@chakra-ui/react'

/**
 * Layout для основных страниц с навигацией и футером.
 * Используется для всех страниц кроме главной.
 */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box display="flex" flexDirection="column" minH="100vh">
      <Navigation />
      <Box flex="1">{children}</Box>
      <Footer />
    </Box>
  )
}
