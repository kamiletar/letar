'use client'

import { Box } from '@chakra-ui/react'
import { usePathname } from 'next/navigation'

/**
 * Обёртка контента — добавляет отступы под фиксированный сайдбар
 * Desktop: marginLeft = 220px (ширина сайдбара)
 * Mobile: paddingTop = 56px (высота мобильного хедера)
 * На /auth/* — без отступов
 */
export function DashboardPageWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuth = pathname.startsWith('/auth')

  if (isAuth) {
    return <>{children}</>
  }

  return (
    <Box ml={{ base: 0, lg: '220px' }} pt={{ base: '56px', lg: 0 }} minH="100vh">
      {children}
    </Box>
  )
}
