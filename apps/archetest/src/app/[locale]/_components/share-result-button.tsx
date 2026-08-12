'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Button, type ButtonProps, Icon } from '@chakra-ui/react'
import { useShare } from '@letar/ui'
import { useTranslations } from 'next-intl'
import { useCallback } from 'react'
import { LuShare2 } from 'react-icons/lu'

interface ShareResultButtonProps extends Omit<ButtonProps, 'onClick'> {
  /** Текст, сопровождающий ссылку при шеринге */
  shareText: string
  /** URL для шеринга (по умолчанию — текущая страница) */
  url?: string
  /** Заголовок для нативного диалога шеринга */
  shareTitle?: string
}

/**
 * Кнопка «Поделиться» (этап 5.4) — Web Share API с деградацией.
 *
 * Мобильные браузеры получают нативный лист шеринга (`navigator.share`),
 * десктоп/без поддержки — копирование ссылки в буфер + тост. Фестивальный
 * сценарий: посетитель делится результатом прямо со стенда.
 */
export function ShareResultButton({ shareText, url, shareTitle, children, ...props }: ShareResultButtonProps) {
  const t = useTranslations('common.share')
  const { share } = useShare()

  const handleShare = useCallback(async () => {
    const shareUrl = url ?? (typeof window !== 'undefined' ? window.location.href : '')
    const title = shareTitle ?? 'Archetest'

    try {
      const outcome = await share({ title, text: shareText, url: shareUrl }, `${shareText} ${shareUrl}`.trim())
      if (outcome === 'copied') {
        toaster.success({ title: t('copied') })
      }
    } catch {
      toaster.error({ title: t('error') })
    }
  }, [shareText, url, shareTitle, t, share])

  return (
    <Button variant="outline" onClick={handleShare} {...props}>
      <Icon>
        <LuShare2 />
      </Icon>
      {children ?? t('cta')}
    </Button>
  )
}
