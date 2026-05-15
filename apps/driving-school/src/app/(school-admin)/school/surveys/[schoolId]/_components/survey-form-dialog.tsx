'use client'

/**
 * Диалог создания/редактирования опроса.
 */

import { Button, CloseButton, Dialog, HStack, Input, Portal, Switch, Text, Textarea, VStack } from '@chakra-ui/react'
import { NativeSelect } from '@chakra-ui/react/native-select'
import { ChakraFormField, useAppForm } from '@letar/forms'
import { useTransition } from 'react'

import { toaster } from '@/app/_components/ui/toaster'

import {
  createSurveyAction,
  type CreateSurveyData,
  type SurveyWithStats,
  updateSurveyAction,
} from '../../_actions/survey.action'

interface SurveyFormDialogProps {
  isOpen: boolean
  onClose: () => void
  organizationId: string
  survey?: SurveyWithStats | null
}

type TriggerType = 'AFTER_COMPLETION' | 'AFTER_FIRST_EXAM' | 'AFTER_LICENSE' | 'MANUAL'

interface FormData {
  name: string
  description: string
  triggerType: TriggerType
  delayDays: number
  expirationDays: number
  isActive: boolean
}

const TRIGGER_OPTIONS = [
  { value: 'AFTER_COMPLETION', label: 'После завершения обучения' },
  { value: 'AFTER_FIRST_EXAM', label: 'После первого экзамена ГИБДД' },
  { value: 'AFTER_LICENSE', label: 'После получения прав' },
  { value: 'MANUAL', label: 'Отправка вручную' },
]

export function SurveyFormDialog({ isOpen, onClose, organizationId, survey }: SurveyFormDialogProps) {
  const [isPending, startTransition] = useTransition()
  const isEdit = !!survey

  const form = useAppForm({
    defaultValues: {
      name: survey?.name ?? '',
      description: survey?.description ?? '',
      triggerType: (survey?.triggerType as TriggerType) ?? 'AFTER_COMPLETION',
      delayDays: survey?.delayDays ?? 1,
      expirationDays: survey?.expirationDays ?? 14,
      isActive: survey?.isActive ?? true,
    } satisfies FormData,
    onSubmit: async ({ value }) => {
      startTransition(async () => {
        let result

        if (isEdit && survey) {
          result = await updateSurveyAction({
            id: survey.id,
            ...value,
          })
        } else {
          result = await createSurveyAction({
            organizationId,
            ...value,
          } as CreateSurveyData)
        }

        if (result.success) {
          toaster.success({ title: isEdit ? 'Опрос обновлён' : 'Опрос создан' })
          form.reset()
          onClose()
        } else {
          toaster.error({ title: 'Ошибка', description: result.error })
        }
      })
    },
  })

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(e) => !e.open && !isPending && onClose()}
      size={{ base: 'full', md: 'lg' }}
      placement="center"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{isEdit ? 'Редактировать опрос' : 'Создать опрос'}</Dialog.Title>
            </Dialog.Header>

            <Dialog.CloseTrigger asChild disabled={isPending}>
              <CloseButton size="sm" aria-label="Закрыть" />
            </Dialog.CloseTrigger>

            <Dialog.Body>
              <form.AppForm>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    form.handleSubmit()
                  }}
                >
                  <VStack align="stretch" gap={4}>
                    {/* Название */}
                    <form.Field name="name">
                      {(field) => (
                        <ChakraFormField label="Название" required>
                          <Input
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="Например: Опрос после обучения"
                          />
                        </ChakraFormField>
                      )}
                    </form.Field>

                    {/* Описание */}
                    <form.Field name="description">
                      {(field) => (
                        <ChakraFormField label="Описание" helperText="Показывается ученику перед заполнением">
                          <Textarea
                            value={field.state.value ?? ''}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="Расскажите, зачем нужен этот опрос..."
                            rows={3}
                          />
                        </ChakraFormField>
                      )}
                    </form.Field>

                    {/* Триггер */}
                    <form.Field name="triggerType">
                      {(field) => (
                        <ChakraFormField label="Когда отправлять" required disabled={isEdit}>
                          <NativeSelect.Root disabled={isEdit}>
                            <NativeSelect.Field
                              value={field.state.value}
                              onChange={(e) => field.handleChange(e.target.value as FormData['triggerType'])}
                            >
                              {TRIGGER_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </NativeSelect.Field>
                          </NativeSelect.Root>
                          {isEdit && (
                            <Text fontSize="xs" color="fg.muted" mt={1}>
                              Триггер нельзя изменить после создания
                            </Text>
                          )}
                        </ChakraFormField>
                      )}
                    </form.Field>

                    {/* Настройки времени */}
                    <HStack gap={4}>
                      <form.Field name="delayDays">
                        {(field) => (
                          <ChakraFormField label="Отправить через (дней)" helperText="После события">
                            <Input
                              type="number"
                              min={0}
                              max={30}
                              value={field.state.value}
                              onChange={(e) => field.handleChange(Number(e.target.value))}
                            />
                          </ChakraFormField>
                        )}
                      </form.Field>

                      <form.Field name="expirationDays">
                        {(field) => (
                          <ChakraFormField label="Срок действия (дней)" helperText="Время на заполнение">
                            <Input
                              type="number"
                              min={1}
                              max={90}
                              value={field.state.value}
                              onChange={(e) => field.handleChange(Number(e.target.value))}
                            />
                          </ChakraFormField>
                        )}
                      </form.Field>
                    </HStack>

                    {/* Активность */}
                    <form.Field name="isActive">
                      {(field) => (
                        <HStack justify="space-between">
                          <VStack align="start" gap={0}>
                            <Text fontWeight="medium">Активен</Text>
                            <Text fontSize="sm" color="fg.muted">
                              Опрос будет автоматически отправляться
                            </Text>
                          </VStack>
                          <Switch.Root
                            checked={field.state.value}
                            onCheckedChange={(e) => field.handleChange(e.checked)}
                          >
                            <Switch.HiddenInput />
                            <Switch.Control>
                              <Switch.Thumb />
                            </Switch.Control>
                          </Switch.Root>
                        </HStack>
                      )}
                    </form.Field>
                  </VStack>
                </form>
              </form.AppForm>
            </Dialog.Body>

            <Dialog.Footer>
              <HStack gap={3} justify="flex-end" width="100%">
                <Button variant="ghost" onClick={onClose} disabled={isPending}>
                  Отмена
                </Button>
                <Button colorPalette="blue" onClick={() => form.handleSubmit()} loading={isPending}>
                  {isEdit ? 'Сохранить' : 'Создать'}
                </Button>
              </HStack>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
