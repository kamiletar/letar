'use client'

import { Box } from '@chakra-ui/react'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'

interface PageTransitionProps {
  children: ReactNode
}

/**
 * Компонент анимации перехода между страницами.
 * Использует CSS transitions для плавного появления контента.
 */
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(false)
  const [displayChildren, setDisplayChildren] = useState(children)

  useEffect(() => {
    // Синхронизация с навигацией (внешняя система) — скрываем контент при смене страницы
    // oxlint-disable-next-line react/set-state-in-effect
    setIsVisible(false)

    // Задержка перед показом нового контента
    const timeout = setTimeout(() => {
      setDisplayChildren(children)
      setIsVisible(true)
    }, 150)

    return () => clearTimeout(timeout)
  }, [pathname, children])

  return (
    <Box
      opacity={isVisible ? 1 : 0}
      transform={isVisible ? 'translateY(0)' : 'translateY(8px)'}
      transition="opacity 0.2s ease-out, transform 0.2s ease-out"
    >
      {displayChildren}
    </Box>
  )
}
