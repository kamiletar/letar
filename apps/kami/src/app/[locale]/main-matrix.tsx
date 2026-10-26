'use client'
import { MatrixRain } from '@/app/_components/matrix-rain'
import { Box } from '@chakra-ui/react'
import { useColorMode } from '@letar/chakra-provider'
import { usePathname } from 'next/navigation'

export const MainMatrix = () => {
  const { resolvedColorMode } = useColorMode()
  const pathname = usePathname()

  const isLight = resolvedColorMode === 'light'

  // В рабочем интерфейсе не создаём canvas и не запускаем фоновую анимацию.
  if (pathname.split('/').includes('admin')) { return null }

  // pointerEvents none: фиксированный слой иначе перехватывает клики по любым непозиционированным блокам под собой
  return (
    <Box overflow={'hidden'} position={'fixed'} top={0} left={0} width={'100%'} height={'100vh'} pointerEvents={'none'}>
      <MatrixRain
        fontSize={25}
        speed={40}
        fadeOpacity={isLight ? 0.03 : 0.04}
        bgRgb={isLight ? '249, 250, 251' : '0, 0, 0'}
      />
    </Box>
  )
}
