'use client'

import { Box, Link } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'

/**
 * Skip-to-content ссылка для keyboard navigation.
 * Скрыта визуально, появляется при фокусе через Tab.
 */
export function SkipToContent() {
  const t = useTranslations('nav')

  return (
    <Box position="fixed" top={0} left={0} zIndex={100}>
      <Link
        href="#main-content"
        position="absolute"
        top="-100px"
        left="16px"
        px={4}
        py={2}
        bg="brand.solid"
        color="brand.contrast"
        borderRadius="md"
        fontWeight="semibold"
        fontSize="sm"
        _focus={{ top: '16px' }}
        transition="top 0.2s"
        textDecoration="none"
      >
        {t('skipToContent')}
      </Link>
    </Box>
  )
}
