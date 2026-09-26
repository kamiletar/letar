'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { ArchetestForm } from '@/archetest-form'
import { Box, VStack } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { z } from 'zod/v4'
import { sendMessagesAction } from '../../_actions/messages.action'

/** Граница длины совпадает с серверной схемой — отсюда же подсказка счётчика у поля */
const MessageSchema = z.object({ body: z.string().trim().min(1).max(2000) })

interface MessageComposerProps {
  /** Адресат — одна связь (карточка клиента); без неё — все активные клиенты */
  linkId?: string
  onSent?: () => void
}

/**
 * Форма сообщения клиенту (волна 7.5): одному — из карточки, всем активным — из списка.
 * После отправки форма перемонтируется ключом: `reset()` оставил бы в поле отправленный текст
 * (`letar-forms-post-submit-reset-stale-initialvalue`).
 */
export function MessageComposer({ linkId, onSent }: MessageComposerProps) {
  const t = useTranslations('cabinet.messages')
  const [formKey, setFormKey] = useState(0)

  return (
    <Box w="100%">
      <ArchetestForm
        key={formKey}
        schema={MessageSchema}
        initialValue={{ body: '' }}
        onSubmit={async ({ body }) => {
          const result = await sendMessagesAction(linkId ? { linkIds: [linkId], body } : { allActive: true, body })
          if ('error' in result) {
            toaster.create({ title: t('sendError'), type: 'error' })
            return
          }
          toaster.create({ title: t('sent', { count: result.data.sent }), type: 'success' })
          setFormKey((k) => k + 1)
          onSent?.()
        }}
      >
        <VStack align="stretch" gap={3} w="100%">
          <ArchetestForm.Field.Textarea name="body" label={t('label')} placeholder={t('placeholder')} rows={3} />
          <Box>
            <ArchetestForm.Button.Submit size="sm">{t('send')}</ArchetestForm.Button.Submit>
          </Box>
        </VStack>
      </ArchetestForm>
    </Box>
  )
}
