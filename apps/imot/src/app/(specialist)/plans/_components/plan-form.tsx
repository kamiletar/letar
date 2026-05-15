'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { ImotForm } from '@/imot-form'
import { Box, Button, Grid, Stack, Text } from '@chakra-ui/react'
import Link from 'next/link'
import type { PlanFormData } from '../_schemas/plan-form.schema'
import { PlanFormSchema } from '../_schemas/plan-form.schema'

interface RequestHistoryEntry {
  id: string
  requestText: string
  version: number
  changedBy?: string | null
  changeReason?: string | null
  isApproved: boolean
  approvedAt?: Date | null
  createdAt: Date
}

interface PlanFormProps {
  onSubmit: (data: PlanFormData) => Promise<{ success: boolean; error?: string; field?: string }>
  clients: Array<{ id: string; name: string }>
  defaultValue?: Partial<PlanFormData>
  submitLabel?: string
  requestHistory?: RequestHistoryEntry[]
}

/**
 * Переиспользуемый компонент формы для создания и редактирования плана трансформации.
 * Использует @letar/forms с TanStack Form.
 */
export function PlanForm({
  onSubmit,
  clients,
  defaultValue,
  submitLabel = 'Сохранить',
  requestHistory = [],
}: PlanFormProps) {
  const clientOptions = [
    { value: '', title: 'Выберите клиента' },
    ...clients.map((client) => ({ value: client.id, title: client.name })),
  ]

  const handleSubmit = async (data: PlanFormData) => {
    const result = await onSubmit(data)

    if (!result.success && result.error) {
      toaster.error({
        title: 'Ошибка',
        description: result.error,
      })
    }
  }

  return (
    <ImotForm
      initialValue={{
        clientId: defaultValue?.clientId ?? '',
        currentStage: defaultValue?.currentStage ?? 'DIAGNOSTICS',
        primaryRequest: defaultValue?.primaryRequest ?? '',
        changeReason: defaultValue?.changeReason ?? '',
        diagnosticsDescription: defaultValue?.diagnosticsDescription ?? '',
        integrationDescription: defaultValue?.integrationDescription ?? '',
        strategyDescription: defaultValue?.strategyDescription ?? '',
        practiceDescription: defaultValue?.practiceDescription ?? '',
        expectedResults: defaultValue?.expectedResults ?? '',
        keyPoints: defaultValue?.keyPoints ?? '',
        priorities: defaultValue?.priorities ?? '',
        startDate: defaultValue?.startDate ?? '',
        expectedEndDate: defaultValue?.expectedEndDate ?? '',
        isActive: defaultValue?.isActive ?? true,
        isCompleted: defaultValue?.isCompleted ?? false,
        notes: defaultValue?.notes ?? '',
      }}
      schema={PlanFormSchema}
      onSubmit={handleSubmit}
    >
      <Stack gap={4}>
        <ImotForm.Errors />

        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
          {/* Клиент */}
          <ImotForm.Field.NativeSelect name="clientId" label="Клиент" options={clientOptions} required />

          {/* Текущий этап */}
          <ImotForm.Select.TransformationStage name="currentStage" label="Текущий этап" />
        </Grid>

        {/* Основной запрос клиента */}
        <Box>
          <ImotForm.Field.Textarea
            name="primaryRequest"
            label="Основной запрос клиента"
            helperText="Запрос клиента, над которым мы работаем. Изменения будут сохранены в истории."
            placeholder="С каким запросом пришел клиент?..."
            rows={3}
            required
          />

          {/* Причина изменения (если есть история) */}
          {requestHistory.length > 0 && (
            <Box mt={3}>
              <ImotForm.Field.String
                name="changeReason"
                label="Причина изменения запроса (опционально)"
                helperText="Укажите, почему запрос был изменен"
                placeholder="Например: уточнение после диагностики..."
              />
            </Box>
          )}
        </Box>

        {/* Временные рамки */}
        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
          <ImotForm.Field.Date name="startDate" label="Дата начала" />
          <ImotForm.Field.Date name="expectedEndDate" label="Планируемое завершение" />
        </Grid>

        {/* Статус плана */}
        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
          <ImotForm.Field.Checkbox name="isActive" label="Активный план" />
          <ImotForm.Field.Checkbox name="isCompleted" label="Завершен" />
        </Grid>

        {/* Описания этапов */}
        <Box>
          <Text fontSize="lg" fontWeight="semibold" mb={4}>
            Этапы трансформации
          </Text>

          {/* 1. Диагностика */}
          <ImotForm.Field.Textarea
            name="diagnosticsDescription"
            label="1. Диагностика"
            helperText="Что было обнаружено в ходе диагностики всех 5 уровней"
            placeholder="Результаты диагностики по 5 уровням..."
            rows={4}
          />

          {/* 2. Интеграция */}
          <Box mt={4}>
            <ImotForm.Field.Textarea
              name="integrationDescription"
              label="2. Интеграция"
              helperText="Точки пересечения между уровнями, связи и взаимовлияния"
              placeholder="Ключевые точки пересечения..."
              rows={4}
            />
          </Box>

          {/* 3. Стратегия */}
          <Box mt={4}>
            <ImotForm.Field.Textarea
              name="strategyDescription"
              label="3. Стратегия"
              helperText="Индивидуальная стратегия трансформации"
              placeholder="Стратегия работы..."
              rows={4}
            />
          </Box>

          {/* 4. Практика */}
          <Box mt={4}>
            <ImotForm.Field.Textarea
              name="practiceDescription"
              label="4. Практика"
              helperText="План практик и упражнений на всех уровнях"
              placeholder="Практики для клиента..."
              rows={4}
            />
          </Box>

          {/* 5. Ожидаемые результаты */}
          <Box mt={4}>
            <ImotForm.Field.Textarea
              name="expectedResults"
              label="5. Ожидаемые результаты"
              helperText="Что должно измениться, к чему стремимся"
              placeholder="Ожидаемые результаты трансформации..."
              rows={4}
            />
          </Box>
        </Box>

        {/* Заметки */}
        <ImotForm.Field.Textarea
          name="notes"
          label="Дополнительные заметки"
          placeholder="Дополнительные наблюдения, важные моменты..."
          rows={3}
        />

        {/* Кнопки */}
        <Box display="flex" gap={3}>
          <ImotForm.Button.Submit colorPalette="fg">{submitLabel}</ImotForm.Button.Submit>
          <Button type="button" variant="outline" asChild>
            <Link href="/plans">Отмена</Link>
          </Button>
        </Box>
      </Stack>
    </ImotForm>
  )
}
