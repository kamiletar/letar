'use client'

import { Box, Flex } from '@chakra-ui/react'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/** Главная: «/», «/en» с необязательным завершающим слэшем, как в `main-matrix.tsx`. */
const HOME = /^\/(en)?\/?$/

/**
 * Каркас страницы (KM-039): шапка, `main` и подвал для всех страниц, кроме главной. Главная — один экран
 * `100dvh` без шапки, подвала и прокрутки; её значки и нижняя строка живут внутри `main`.
 * Дерево одинаково в обоих случаях (шапка и подвал заменяются на `false` в тех же слотах), поэтому
 * `main` и фон внутри него не пересоздаются при переходе между главной и остальными страницами.
 */
export function SiteChrome({
  header,
  footer,
  children,
}: {
  header: ReactNode
  footer: ReactNode
  children: ReactNode
}) {
  const home = HOME.test(usePathname())
  return (
    <Flex direction="column" minH={home ? '100dvh' : '100vh'} h={home ? '100dvh' : undefined}>
      {!home && header}
      <Box
        asChild
        flex="1"
        outline="none"
        minH={home ? 0 : undefined}
        position={home ? 'relative' : undefined}
        overflow={home ? 'hidden' : undefined}
      >
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
      </Box>
      {!home && footer}
    </Flex>
  )
}
