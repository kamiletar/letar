'use client'

import { Box, Button } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'

/**
 * Skip Link для быстрого перехода к основному контенту
 * Важный элемент accessibility для пользователей screen readers и клавиатуры
 */
export function SkipLink() {
  const t = useTranslations('a11y')

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      zIndex={9999}
      transform="translateY(-100%)"
      _focusWithin={{
        transform: 'translateY(0)',
      }}
      transition="transform 0.2s"
    >
      <Button
        asChild
        colorPalette="fg"
        size="lg"
        m={2}
        _focus={{
          outline: '2px solid',
          outlineColor: 'fg.500',
          outlineOffset: '2px',
        }}
      >
        <a href="#main-content">{t('skipToContent')}</a>
      </Button>
    </Box>
  )
}
