'use client'

import { useToken } from '@chakra-ui/react'
import { TopLoader as BaseTopLoader } from '@letar/ui'

/**
 * TopLoader с цветом из темы Pravda.
 *
 * Использует brand.500 (#E53E3E) для индикатора загрузки.
 */
export function TopLoader() {
  const [brandColor] = useToken('colors', ['brand.500'])

  return <BaseTopLoader color={brandColor} />
}
