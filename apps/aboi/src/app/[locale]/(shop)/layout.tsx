import { Box } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { CookieConsent } from '../_components/cookie-consent'
import { Footer } from '../_components/footer'

export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <Box display="flex" flexDirection="column" minH="100dvh">
      <Box flex="1">{children}</Box>
      <Footer />
      <CookieConsent />
    </Box>
  )
}
