import { Provider } from '@/app/_components/provider'
import { Toaster } from '@/app/_components/toaster'
import { ColorModeProvider } from '@letar/chakra-provider'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Form Develop App',
  description: 'Песочница для разработки @letar/forms',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <ColorModeProvider>
          <Provider>
            {children}
            <Toaster />
          </Provider>
        </ColorModeProvider>
      </body>
    </html>
  )
}
