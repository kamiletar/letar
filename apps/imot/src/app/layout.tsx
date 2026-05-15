import { NavigationProgress } from '@/app/_components/navigation/navigation-progress'
import { QueryProvider } from '@/app/_components/providers/query-provider'
import { Provider } from '@/app/_components/ui/provider'
import { Toaster } from '@/app/_components/ui/toaster'
import { UmamiScript } from '@letar/analytics'
// oxlint-disable-next-line no-unassigned-import
import './global.css'

export const metadata = {
  title: 'Добро пожаловать в технику ИМОТ',
  description: 'Интегративная Матрица Осознанной Трансформации',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <Provider>
          <QueryProvider>
            <NavigationProgress />
            {children}
            <Toaster />
            <UmamiScript />
          </QueryProvider>
        </Provider>
      </body>
    </html>
  )
}
