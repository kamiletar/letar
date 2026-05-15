'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { ImotForm } from '@/imot-form'
import { Box, Grid, Stack, Text } from '@chakra-ui/react'
import { type StyleProfileFormData, StyleProfileFormSchema } from '../_schemas/profile-forms.schema'

interface StyleProfileFormProps {
  onSubmit: (data: StyleProfileFormData) => Promise<{ success: boolean; error?: string }>
  clientId: string
  defaultValue?: Partial<StyleProfileFormData>
}

/**
 * Форма стилевого профиля - Цветотип и архетип
 */
export function StyleProfileForm({ onSubmit, clientId, defaultValue }: StyleProfileFormProps) {
  const handleSubmit = async (data: StyleProfileFormData) => {
    const result = await onSubmit(data)

    if (!result.success && result.error) {
      toaster.error({
        title: 'Ошибка',
        description: result.error,
      })
    } else if (result.success) {
      toaster.success({
        title: 'Сохранено',
        description: 'Стилевой профиль успешно сохранен',
      })
    }
  }

  return (
    <ImotForm
      initialValue={{
        clientId,
        colorType: defaultValue?.colorType,
        colorPalette: defaultValue?.colorPalette ?? '',
        colorRecommendations: defaultValue?.colorRecommendations ?? '',
        primaryArchetype: defaultValue?.primaryArchetype,
        secondaryArchetype: defaultValue?.secondaryArchetype,
        archetypeDescription: defaultValue?.archetypeDescription ?? '',
        selfExpression: defaultValue?.selfExpression ?? '',
        authenticityLevel: defaultValue?.authenticityLevel,
        innerOuterAlignment: defaultValue?.innerOuterAlignment ?? '',
        styleConflicts: defaultValue?.styleConflicts ?? '',
        styleRecommendations: defaultValue?.styleRecommendations ?? '',
        notes: defaultValue?.notes ?? '',
      }}
      schema={StyleProfileFormSchema}
      onSubmit={handleSubmit}
    >
      <Stack gap={6}>
        <ImotForm.Errors />

        {/* Цветотип */}
        <Box>
          <Text fontSize="lg" fontWeight="medium" mb={3}>
            Цветотип
          </Text>
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
            <ImotForm.Select.ColorType name="colorType" label="Цветотип" />

            <ImotForm.Field.Textarea
              name="colorPalette"
              label="Цветовая палитра (текст или JSON)"
              placeholder='["#RRGGBB", "#RRGGBB"] или описание цветов'
              rows={3}
            />
          </Grid>

          <Box mt={4}>
            <ImotForm.Field.Textarea
              name="colorRecommendations"
              label="Рекомендации по цветам"
              placeholder="Какие цвета подходят клиенту и почему"
              rows={4}
            />
          </Box>
        </Box>

        {/* Архетип */}
        <Box>
          <Text fontSize="lg" fontWeight="medium" mb={3}>
            Архетип
          </Text>
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
            <ImotForm.Select.Archetype name="primaryArchetype" label="Основной архетип" />

            <ImotForm.Select.Archetype name="secondaryArchetype" label="Дополнительный архетип" />
          </Grid>

          <Box mt={4}>
            <ImotForm.Field.Textarea
              name="archetypeDescription"
              label="Описание архетипа"
              placeholder="Как архетип проявляется у клиента"
              rows={4}
            />
          </Box>
        </Box>

        {/* Самовыражение */}
        <Box>
          <Text fontSize="lg" fontWeight="medium" mb={3}>
            Самовыражение
          </Text>
          <Grid templateColumns={{ base: '1fr', md: '2fr 1fr' }} gap={4}>
            <ImotForm.Field.Textarea
              name="selfExpression"
              label="Как клиент выражает себя"
              placeholder="Стиль одежды, манера речи, поведение"
              rows={4}
            />

            <Box>
              <ImotForm.Field.NumberInput
                name="authenticityLevel"
                label="Уровень аутентичности (1-10)"
                min={1}
                max={10}
              />
              <Text fontSize="xs" color="fg.muted" mt={1}>
                Насколько клиент аутентичен в самовыражении
              </Text>
            </Box>
          </Grid>
        </Box>

        {/* Внешнее = внутреннее */}
        <Box>
          <Text fontSize="lg" fontWeight="medium" mb={3}>
            Соответствие внутреннего и внешнего
          </Text>
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
            <ImotForm.Field.Textarea
              name="innerOuterAlignment"
              label="Соответствие внутреннего и внешнего"
              placeholder="Насколько внешний вид отражает внутреннее состояние"
              rows={4}
            />

            <ImotForm.Field.Textarea
              name="styleConflicts"
              label="Конфликты в стиле"
              placeholder="Несоответствия, противоречия в образе"
              rows={4}
            />
          </Grid>
        </Box>

        {/* Рекомендации */}
        <ImotForm.Field.Textarea
          name="styleRecommendations"
          label="Рекомендации по стилю"
          placeholder="Конкретные рекомендации по изменению стиля"
          rows={5}
        />

        {/* Заметки специалиста */}
        <ImotForm.Field.Textarea
          name="notes"
          label="Заметки специалиста"
          placeholder="Дополнительные заметки и наблюдения"
          rows={4}
        />

        {/* Кнопка submit */}
        <ImotForm.Button.Submit colorPalette="fg" size="lg" width="full">
          Сохранить стилевой профиль
        </ImotForm.Button.Submit>
      </Stack>
    </ImotForm>
  )
}
