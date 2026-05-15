import { Box } from '@chakra-ui/react'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { PageTransition } from './_components/page-transition'
import { Providers } from './_components/provider'
import { Sidebar } from './_components/sidebar'
import { StatusBar } from './_components/status-bar'
import { Toaster } from './_components/ui/toaster'

export const metadata: Metadata = {
  title: 'Label Printer Desktop',
  description: 'Приложение для печати этикеток',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <Providers>
          <Sidebar />
          <Box ml="250px" pb="40px" minH="100vh">
            <PageTransition>{children}</PageTransition>
          </Box>
          <StatusBar />
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
