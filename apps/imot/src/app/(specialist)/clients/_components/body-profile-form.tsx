'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Box, Grid, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { type BodyProfileFormData, BodyProfileFormSchema } from '../_schemas/profile-forms.schema'

interface BodyProfileFormProps {
  onSubmit: (data: BodyProfileFormData) => Promise<{ success: boolean; error?: string }>
  clientId: string
  defaultValue?: Partial<BodyProfileFormData>
}

/**
 * Форма телесного профиля - Карта зажимов и психосоматика
 */
export function BodyProfileForm({ onSubmit, clientId, defaultValue }: BodyProfileFormProps) {
  const handleSubmit = async (data: BodyProfileFormData) => {
    const result = await onSubmit(data)

    if (!result.success && result.error) {
      toaster.error({
        title: 'Ошибка',
        description: result.error,
      })
    } else if (result.success) {
      toaster.success({
        title: 'Сохранено',
        description: 'Телесный профиль успешно сохранен',
      })
    }
  }

  return (
    <Form
      initialValue={{
        clientId,
        tensionMap: defaultValue?.tensionMap ?? '',
        tensionAreas: defaultValue?.tensionAreas ?? '',
        psychosomaticIssues: defaultValue?.psychosomaticIssues ?? '',
        symptoms: defaultValue?.symptoms ?? '',
        chronicConditions: defaultValue?.chronicConditions ?? '',
        breathingPatterns: defaultValue?.breathingPatterns ?? '',
        breathingIssues: defaultValue?.breathingIssues ?? '',
        bodyResources: defaultValue?.bodyResources ?? '',
        physicalStrengths: defaultValue?.physicalStrengths ?? '',
        bodyMindConnection: defaultValue?.bodyMindConnection ?? '',
        bodyMessages: defaultValue?.bodyMessages ?? '',
        notes: defaultValue?.notes ?? '',
      }}
      schema={BodyProfileFormSchema}
      onSubmit={handleSubmit}
    >
      <Stack gap={6}>
        <Form.Errors />

        {/* Карта зажимов */}
        <Box>
          <Text fontSize="lg" fontWeight="medium" mb={3}>
            Карта зажимов
          </Text>
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
            <Box>
              <Form.Field.Textarea
                name="tensionMap"
                label="Карта зажимов (можно JSON или текст)"
                placeholder='{"шея": "сильное напряжение", "плечи": "зажимы", "поясница": "боль"}'
                rows={5}
              />
              <Text fontSize="xs" color="fg.muted" mt={1}>
                Можно указать в формате JSON или простым текстом
              </Text>
            </Box>

            <Form.Field.Textarea
              name="tensionAreas"
              label="Описание областей зажимов"
              placeholder="Опишите подробно области и характер зажимов"
              rows={5}
            />
          </Grid>
        </Box>

        {/* Психосоматика */}
        <Box>
          <Text fontSize="lg" fontWeight="medium" mb={3}>
            Психосоматика
          </Text>
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr 1fr' }} gap={4}>
            <Form.Field.Textarea
              name="psychosomaticIssues"
              label="Психосоматические проявления"
              placeholder="Список психосоматических проявлений"
              rows={4}
            />

            <Form.Field.Textarea name="symptoms" label="Симптомы" placeholder="Физические симптомы" rows={4} />

            <Form.Field.Textarea
              name="chronicConditions"
              label="Хронические состояния"
              placeholder="Хронические заболевания или состояния"
              rows={4}
            />
          </Grid>
        </Box>

        {/* Паттерны дыхания */}
        <Box>
          <Text fontSize="lg" fontWeight="medium" mb={3}>
            Паттерны дыхания
          </Text>
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
            <Form.Field.Textarea
              name="breathingPatterns"
              label="Паттерны дыхания"
              placeholder="Как клиент дышит: глубоко, поверхностно, задерживает дыхание и т.д."
              rows={4}
            />

            <Form.Field.Textarea
              name="breathingIssues"
              label="Проблемы с дыханием"
              placeholder="Выявленные проблемы с дыханием"
              rows={4}
            />
          </Grid>
        </Box>

        {/* Телесные ресурсы */}
        <Box>
          <Text fontSize="lg" fontWeight="medium" mb={3}>
            Телесные ресурсы
          </Text>
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
            <Form.Field.Textarea
              name="bodyResources"
              label="Телесные ресурсы"
              placeholder="Сильные стороны, ресурсы тела"
              rows={4}
            />

            <Form.Field.Textarea
              name="physicalStrengths"
              label="Физические сильные стороны"
              placeholder="Что работает хорошо в теле клиента"
              rows={4}
            />
          </Grid>
        </Box>

        {/* Связь тело-психика */}
        <Box>
          <Text fontSize="lg" fontWeight="medium" mb={3}>
            Связь тело-психика
          </Text>
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
            <Form.Field.Textarea
              name="bodyMindConnection"
              label="Связь тело-психика"
              placeholder="Как психические состояния отражаются в теле"
              rows={4}
            />

            <Form.Field.Textarea
              name="bodyMessages"
              label="Послания тела"
              placeholder="Что тело пытается сказать клиенту"
              rows={4}
            />
          </Grid>
        </Box>

        {/* Заметки специалиста */}
        <Form.Field.Textarea
          name="notes"
          label="Заметки специалиста"
          placeholder="Дополнительные заметки и наблюдения"
          rows={4}
        />

        {/* Кнопка submit */}
        <Form.Button.Submit colorPalette="fg" size="lg" width="full">
          Сохранить телесный профиль
        </Form.Button.Submit>
      </Stack>
    </Form>
  )
}
