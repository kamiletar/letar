'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Box, Grid, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { type NeuroPsychProfileFormData, NeuroPsychProfileFormSchema } from '../_schemas/profile-forms.schema'

interface NeuroPsychProfileFormProps {
  onSubmit: (data: NeuroPsychProfileFormData) => Promise<{ success: boolean; error?: string }>
  clientId: string
  defaultValue?: Partial<NeuroPsychProfileFormData>
}

/**
 * Форма нейропсихологического профиля - Паттерны поведения
 */
export function NeuroPsychProfileForm({ onSubmit, clientId, defaultValue }: NeuroPsychProfileFormProps) {
  const handleSubmit = async (data: NeuroPsychProfileFormData) => {
    const result = await onSubmit(data)

    if (!result.success && result.error) {
      toaster.error({
        title: 'Ошибка',
        description: result.error,
      })
    } else if (result.success) {
      toaster.success({
        title: 'Сохранено',
        description: 'Нейропсихологический профиль успешно сохранен',
      })
    }
  }

  return (
    <Form
      initialValue={{
        clientId,
        behaviorPatterns: defaultValue?.behaviorPatterns ?? '',
        cognitiveStyle: defaultValue?.cognitiveStyle ?? '',
        learningStyle: defaultValue?.learningStyle ?? '',
        decisionMaking: defaultValue?.decisionMaking ?? '',
        defenseMechanisms: defaultValue?.defenseMechanisms ?? '',
        copingStrategies: defaultValue?.copingStrategies ?? '',
        emotionalPatterns: defaultValue?.emotionalPatterns ?? '',
        triggers: defaultValue?.triggers ?? '',
        resourceStates: defaultValue?.resourceStates ?? '',
        strengths: defaultValue?.strengths ?? '',
        notes: defaultValue?.notes ?? '',
      }}
      schema={NeuroPsychProfileFormSchema}
      onSubmit={handleSubmit}
    >
      <Stack gap={6}>
        <Form.Errors />

        {/* Паттерны поведения */}
        <Box>
          <Text fontSize="lg" fontWeight="medium" mb={3}>
            Паттерны поведения
          </Text>
          <Form.Field.Textarea
            name="behaviorPatterns"
            label="Основные паттерны поведения"
            placeholder="Опишите повторяющиеся модели поведения клиента"
            rows={5}
          />
        </Box>

        {/* Когнитивные особенности */}
        <Box>
          <Text fontSize="lg" fontWeight="medium" mb={3}>
            Когнитивные особенности
          </Text>
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr 1fr' }} gap={4}>
            <Form.Field.Textarea
              name="cognitiveStyle"
              label="Стиль мышления"
              placeholder="Например: визуальный, аналитический, интуитивный"
              rows={3}
            />

            <Form.Field.Textarea
              name="learningStyle"
              label="Стиль обучения"
              placeholder="Как клиент лучше всего усваивает информацию"
              rows={3}
            />

            <Form.Field.Textarea
              name="decisionMaking"
              label="Стиль принятия решений"
              placeholder="Как клиент принимает решения"
              rows={3}
            />
          </Grid>
        </Box>

        {/* Защитные механизмы */}
        <Box>
          <Text fontSize="lg" fontWeight="medium" mb={3}>
            Защитные механизмы
          </Text>
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
            <Form.Field.Textarea
              name="defenseMechanisms"
              label="Защитные механизмы"
              placeholder="Например: отрицание, проекция, рационализация"
              rows={4}
            />

            <Form.Field.Textarea
              name="copingStrategies"
              label="Стратегии совладания"
              placeholder="Как клиент справляется со стрессом"
              rows={4}
            />
          </Grid>
        </Box>

        {/* Эмоциональное реагирование */}
        <Box>
          <Text fontSize="lg" fontWeight="medium" mb={3}>
            Эмоциональное реагирование
          </Text>
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
            <Form.Field.Textarea
              name="emotionalPatterns"
              label="Эмоциональные паттерны"
              placeholder="Типичные эмоциональные реакции"
              rows={4}
            />

            <Form.Field.Textarea
              name="triggers"
              label="Триггеры"
              placeholder="Что вызывает сильные эмоциональные реакции"
              rows={4}
            />
          </Grid>
        </Box>

        {/* Ресурсные состояния */}
        <Box>
          <Text fontSize="lg" fontWeight="medium" mb={3}>
            Ресурсные состояния
          </Text>
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
            <Form.Field.Textarea
              name="resourceStates"
              label="Ресурсные состояния"
              placeholder="В каких состояниях клиент наиболее эффективен"
              rows={4}
            />

            <Form.Field.Textarea
              name="strengths"
              label="Сильные стороны"
              placeholder="Психологические сильные стороны клиента"
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
          Сохранить нейропсихологический профиль
        </Form.Button.Submit>
      </Stack>
    </Form>
  )
}
