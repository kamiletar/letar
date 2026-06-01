'use client'
import { MatrixRain } from '@/app/_components/matrix-rain'
import { Box } from '@chakra-ui/react'
import { useColorMode } from '@letar/chakra-provider'

export const MainMatrix = () => {
  const { resolvedColorMode } = useColorMode()

  const isLight = resolvedColorMode === 'light'

  return (
    <Box overflow={'hidden'} position={'fixed'} top={0} left={0} width={'100%'} height={'100vh'}>
      <MatrixRain
        fontSize={25}
        speed={40}
        fadeOpacity={isLight ? 0.03 : 0.04}
        bgRgb={isLight ? '249, 250, 251' : '0, 0, 0'}
      />
    </Box>
  )
}

