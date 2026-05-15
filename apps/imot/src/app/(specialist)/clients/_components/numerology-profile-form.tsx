'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Box, Button, Grid, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useTransition } from 'react'
import { generateNumerologyProfileFromBirthdate } from '../_actions/profile.actions'
import { type NumerologyProfileFormData, NumerologyProfileFormSchema } from '../_schemas/profile-forms.schema'

interface NumerologyProfileFormProps {
  onSubmit: (data: NumerologyProfileFormData) => Promise<{ success: boolean; error?: string }>
  clientId: string
  defaultValue?: Partial<NumerologyProfileFormData>
}

/**
 * Форма нумерологического профиля - Матрица судьбы
 */
export function NumerologyProfileForm({ onSubmit, clientId, defaultValue }: NumerologyProfileFormProps) {
  const [isPending, startTransition] = useTransition()

  // Обработчик автоматической генерации
  const handleAutoGenerate = () => {
    startTransition(async () => {
      try {
        await generateNumerologyProfileFromBirthdate(clientId)
        toaster.success({
          title: 'Профиль сгенерирован',
          description: 'Нумерологический профиль успешно создан на основе даты рождения',
        })
        // Перезагрузка страницы для отображения новых данных
        window.location.reload()
      } catch (error) {
        toaster.error({
          title: 'Ошибка генерации',
          description: error instanceof Error ? error.message : 'Не удалось сгенерировать профиль',
        })
      }
    })
  }

  const handleSubmit = async (data: NumerologyProfileFormData) => {
    const result = await onSubmit(data)

    if (!result.success && result.error) {
      toaster.error({
        title: 'Ошибка',
        description: result.error,
      })
    } else if (result.success) {
      toaster.success({
        title: 'Сохранено',
        description: 'Нумерологический профиль успешно сохранен',
      })
    }
  }

  return (
    <Stack gap={6}>
      {/* Кнопка автоматической генерации */}
      <Box p={4} bg="blue.subtle" borderWidth="1px" borderColor="blue.solid" borderRadius="md">
        <Text fontSize="sm" mb={2}>
          Если у клиента указана дата рождения, вы можете автоматически сгенерировать нумерологический профиль на основе
          Матрицы судьбы
        </Text>
        <Button onClick={handleAutoGenerate} loading={isPending} colorPalette="blue" size="sm">
          Сгенерировать автоматически из даты рождения
        </Button>
      </Box>

      <Form
        initialValue={{
          clientId,
          lifePathNumber: defaultValue?.lifePathNumber,
          destinyNumber: defaultValue?.destinyNumber,
          soulNumber: defaultValue?.soulNumber,
          personalityNumber: defaultValue?.personalityNumber,
          maturityNumber: defaultValue?.maturityNumber,
          currentCycle: defaultValue?.currentCycle ?? '',
          cycleDescription: defaultValue?.cycleDescription ?? '',
          talents: defaultValue?.talents ?? '',
          gifts: defaultValue?.gifts ?? '',
          purpose: defaultValue?.purpose ?? '',
          karmicLessons: defaultValue?.karmicLessons ?? '',
          karmicDebts: defaultValue?.karmicDebts ?? '',
          matrixData: defaultValue?.matrixData ?? '',
          notes: defaultValue?.notes ?? '',
        }}
        schema={NumerologyProfileFormSchema}
        onSubmit={handleSubmit}
      >
        <Stack gap={6}>
          <Form.Errors />

          {/* Матрица судьбы */}
          <Box>
            <Text fontSize="lg" fontWeight="medium" mb={3}>
              Матрица судьбы
            </Text>
            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr 1fr' }} gap={4}>
              <Form.Field.NumberInput name="lifePathNumber" label="Число жизненного пути (1-22)" min={1} max={22} />
              <Form.Field.NumberInput name="destinyNumber" label="Число судьбы (1-22)" min={1} max={22} />
              <Form.Field.NumberInput name="soulNumber" label="Число души (1-22)" min={1} max={22} />
              <Form.Field.NumberInput name="personalityNumber" label="Число личности (1-22)" min={1} max={22} />
              <Form.Field.NumberInput name="maturityNumber" label="Число зрелости (1-22)" min={1} max={22} />
            </Grid>
          </Box>

          {/* Жизненные циклы */}
          <Box>
            <Text fontSize="lg" fontWeight="medium" mb={3}>
              Жизненные циклы
            </Text>
            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
              <Form.Field.String
                name="currentCycle"
                label="Текущий жизненный цикл"
                placeholder="Например: 3-й цикл (45-54 года)"
              />

              <Form.Field.Textarea
                name="cycleDescription"
                label="Описание цикла"
                placeholder="Краткое описание текущего жизненного цикла"
                rows={3}
              />
            </Grid>
          </Box>

          {/* Таланты и дары */}
          <Box>
            <Text fontSize="lg" fontWeight="medium" mb={3}>
              Таланты и дары
            </Text>
            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
              <Form.Field.Textarea
                name="talents"
                label="Таланты"
                placeholder="Перечислите таланты (можно списком через запятую)"
                rows={4}
              />

              <Form.Field.Textarea
                name="gifts"
                label="Дары"
                placeholder="Перечислите дары (можно списком через запятую)"
                rows={4}
              />
            </Grid>
          </Box>

          {/* Предназначение */}
          <Box>
            <Text fontSize="lg" fontWeight="medium" mb={3}>
              Предназначение
            </Text>
            <Form.Field.Textarea
              name="purpose"
              label="Описание предназначения"
              placeholder="Опишите предназначение клиента"
              rows={5}
            />
          </Box>

          {/* Кармические уроки */}
          <Box>
            <Text fontSize="lg" fontWeight="medium" mb={3}>
              Кармические уроки
            </Text>
            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
              <Form.Field.Textarea
                name="karmicLessons"
                label="Кармические уроки"
                placeholder="Перечислите кармические уроки"
                rows={4}
              />

              <Form.Field.Textarea
                name="karmicDebts"
                label="Кармические долги"
                placeholder="Кармические долги (если есть)"
                rows={4}
              />
            </Grid>
          </Box>

          {/* Расчетная матрица */}
          <Box>
            <Form.Field.Textarea
              name="matrixData"
              label="Полная матрица судьбы (JSON, необязательно)"
              placeholder='{"positions": [], "calculations": []}'
              rows={4}
              helperText="Для расширенных данных матрицы судьбы в формате JSON"
            />
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
            Сохранить нумерологический профиль
          </Form.Button.Submit>
        </Stack>
      </Form>
    </Stack>
  )
}
