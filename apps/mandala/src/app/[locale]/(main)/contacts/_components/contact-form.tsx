'use client'

import { toaster } from '@/app/_components/ui/toaster'
import {
  type ContactMessageCreateForm,
  ContactMessageCreateFormSchema,
} from '@/generated/form-schemas/ContactMessage.form'
import type { MandalaActionType } from '@/lib/offline'
import { MandalaForm } from '@/mandala-form'
import { Badge, Box, Spinner, Stack } from '@chakra-ui/react'
import { useOfflineForm } from '@letar/forms/offline'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { LuCloudOff, LuSend } from 'react-icons/lu'
import { sendMessageAction } from '../_actions/send-message.action'

const defaultValues: ContactMessageCreateForm = {
  name: '',
  email: '',
  message: '',
}

export function ContactForm() {
  const t = useTranslations('contacts')
  const [formKey, setFormKey] = useState(0)

  // Оффлайн поддержка формы
  const { submit, isOffline, pendingCount, isProcessing } = useOfflineForm<ContactMessageCreateForm>({
    actionType: 'SEND_CONTACT' satisfies MandalaActionType,
    onlineSubmit: async (data) => {
      const result = await sendMessageAction(data)
      if (result.success) {
        return { success: true }
      }
      return { success: false, error: result.error }
    },
    onSuccess: () => {
      toaster.success({
        title: t('toast.success.title'),
        description: t('toast.success.description'),
      })
      setFormKey((k) => k + 1) // Сбросить форму
    },
    onQueued: () => {
      toaster.info({
        title: t('toast.queued.title'),
        description: t('toast.queued.description'),
      })
      setFormKey((k) => k + 1) // Сбросить форму даже при оффлайн
    },
    onError: (error) => {
      toaster.error({ title: error })
    },
  })

  const handleSubmit = async (data: ContactMessageCreateForm) => {
    await submit(data)
  }

  return (
    <MandalaForm
      key={formKey}
      initialValue={defaultValues}
      schema={ContactMessageCreateFormSchema}
      onSubmit={handleSubmit}
    >
      <Stack gap={4}>
        {/* Оффлайн статус */}
        {(isOffline || pendingCount > 0) && (
          <Box>
            {isOffline && (
              <Badge colorPalette="orange" size="sm">
                <LuCloudOff />
                {t('offline.badge')}
              </Badge>
            )}
            {pendingCount > 0 && !isOffline && (
              <Badge colorPalette="blue" size="sm">
                {isProcessing ? <Spinner size="xs" /> : null}
                {isProcessing ? t('offline.syncing') : t('offline.pending', { count: pendingCount })}
              </Badge>
            )}
          </Box>
        )}

        <MandalaForm.Field.String name="name" />
        <MandalaForm.Field.String name="email" />
        <MandalaForm.Field.Textarea name="message" rows={6} />
        <MandalaForm.Errors />
        <Box alignSelf="flex-start">
          <MandalaForm.Button.Submit colorPalette="fg" size="lg">
            <LuSend />
            {isOffline ? t('form.submitOffline') : t('form.submit')}
          </MandalaForm.Button.Submit>
        </Box>
      </Stack>
    </MandalaForm>
  )
}
