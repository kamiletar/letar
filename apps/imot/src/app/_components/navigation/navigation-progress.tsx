'use client'

import { Box } from '@chakra-ui/react'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

/**
 * Компонент для отображения прогресса навигации
 * Показывает индикатор загрузки при переходе между страницами
 */
export function NavigationProgress() {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Начинаем загрузку
    setLoading(true)
    setProgress(30)

    // Плавно увеличиваем прогресс
    const timer1 = setTimeout(() => setProgress(60), 100)
    const timer2 = setTimeout(() => setProgress(90), 300)

    // Завершаем загрузку
    const completeTimer = setTimeout(() => {
      setProgress(100)
      setTimeout(() => {
        setLoading(false)
        setProgress(0)
      }, 200)
    }, 500)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(completeTimer)
    }
  }, [pathname])

  if (!loading) {
    return null
  }

  return (
    <Box position="fixed" top={0} left={0} right={0} h="3px" zIndex={9999} bg="transparent">
      <Box
        h="full"
        w={`${progress}%`}
        bg="fg.500"
        transition="width 0.3s ease"
        boxShadow="0 0 10px rgba(202, 158, 103, 0.5)"
      />
    </Box>
  )
}
