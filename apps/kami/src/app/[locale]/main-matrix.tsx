'use client'
import { MatrixRain } from '@/app/_components/matrix-rain'
import { Box } from '@chakra-ui/react'
import { useColorMode } from '@letar/chakra-provider'
import { usePathname } from 'next/navigation'

export const MainMatrix = () => {
  const { resolvedColorMode } = useColorMode()
  const pathname = usePathname()

  // Главная: «/», «/en» с необязательным завершающим слэшем.
  const isHome = /^\/(en)?\/?$/.test(pathname)

  // В рабочем интерфейсе не создаём canvas и не запускаем фоновую анимацию.
  if (pathname.split('/').includes('admin')) { return null }

  // pointerEvents none: фиксированный слой иначе перехватывает клики по любым непозиционированным блокам под собой
  return (
    <Box overflow="hidden" position="fixed" inset={0} pointerEvents="none">
      <MatrixRain theme={resolvedColorMode} home={isHome} />
    </Box>
  )
}
