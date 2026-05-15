'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Box, Grid, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { type EnergyProfileFormData, EnergyProfileFormSchema } from '../_schemas/profile-forms.schema'

interface EnergyProfileFormProps {
  onSubmit: (data: EnergyProfileFormData) => Promise<{ success: boolean; error?: string }>
  clientId: string
  defaultValue?: Partial<EnergyProfileFormData>
}

/**
 * Форма энергетического профиля - 7 чакр и энергетическая карта
 */
export function EnergyProfileForm({ onSubmit, clientId, defaultValue }: EnergyProfileFormProps) {
  const handleSubmit = async (data: EnergyProfileFormData) => {
    const result = await onSubmit(data)

    if (!result.success && result.error) {
      toaster.error({
        title: 'Ошибка',
        description: result.error,
      })
    } else if (result.success) {
      toaster.success({
        title: 'Сохранено',
        description: 'Энергетический профиль успешно сохранен',
      })
    }
  }

  return (
    <Form
      initialValue={{
        clientId,
        rootChakra: defaultValue?.rootChakra,
        sacralChakra: defaultValue?.sacralChakra,
        solarPlexusChakra: defaultValue?.solarPlexusChakra,
        heartChakra: defaultValue?.heartChakra,
        throatChakra: defaultValue?.throatChakra,
        thirdEyeChakra: defaultValue?.thirdEyeChakra,
        crownChakra: defaultValue?.crownChakra,
        energyBlocks: defaultValue?.energyBlocks ?? '',
        blockageAreas: defaultValue?.blockageAreas ?? '',
        moneyChannelLevel: defaultValue?.moneyChannelLevel,
        moneyBlockages: defaultValue?.moneyBlockages ?? '',
        relationshipEnergy: defaultValue?.relationshipEnergy,
        relationshipBlocks: defaultValue?.relationshipBlocks ?? '',
        vitalityLevel: defaultValue?.vitalityLevel,
        energyLeaks: defaultValue?.energyLeaks ?? '',
        notes: defaultValue?.notes ?? '',
      }}
      schema={EnergyProfileFormSchema}
      onSubmit={handleSubmit}
    >
      <Stack gap={6}>
        <Form.Errors />

        {/* Состояние 7 чакр */}
        <Box>
          <Text fontSize="lg" fontWeight="medium" mb={3}>
            Состояние 7 чакр (оценка 1-10)
          </Text>
          <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }} gap={4}>
            <Box>
              <Form.Field.NumberInput name="rootChakra" label="🔴 Муладхара (Корневая)" min={1} max={10} />
              <Text fontSize="xs" color="fg.muted" mt={1}>
                Безопасность, выживание
              </Text>
            </Box>

            <Box>
              <Form.Field.NumberInput name="sacralChakra" label="🟠 Свадхистхана (Сакральная)" min={1} max={10} />
              <Text fontSize="xs" color="fg.muted" mt={1}>
                Эмоции, творчество
              </Text>
            </Box>

            <Box>
              <Form.Field.NumberInput
                name="solarPlexusChakra"
                label="🟡 Манипура (Солнечное сплетение)"
                min={1}
                max={10}
              />
              <Text fontSize="xs" color="fg.muted" mt={1}>
                Воля, власть
              </Text>
            </Box>

            <Box>
              <Form.Field.NumberInput name="heartChakra" label="🟢 Анахата (Сердечная)" min={1} max={10} />
              <Text fontSize="xs" color="fg.muted" mt={1}>
                Любовь, отношения
              </Text>
            </Box>

            <Box>
              <Form.Field.NumberInput name="throatChakra" label="🔵 Вишудха (Горловая)" min={1} max={10} />
              <Text fontSize="xs" color="fg.muted" mt={1}>
                Самовыражение
              </Text>
            </Box>

            <Box>
              <Form.Field.NumberInput name="thirdEyeChakra" label="🟣 Аджна (Третий глаз)" min={1} max={10} />
              <Text fontSize="xs" color="fg.muted" mt={1}>
                Интуиция, видение
              </Text>
            </Box>

            <Box>
              <Form.Field.NumberInput name="crownChakra" label="⚪ Сахасрара (Коронная)" min={1} max={10} />
              <Text fontSize="xs" color="fg.muted" mt={1}>
                Духовность, связь с высшим
              </Text>
            </Box>
          </Grid>
        </Box>

        {/* Энергетические блоки */}
        <Box>
          <Text fontSize="lg" fontWeight="medium" mb={3}>
            Энергетические блоки
          </Text>
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
            <Form.Field.Textarea
              name="energyBlocks"
              label="Энергетические блоки"
              placeholder="Опишите обнаруженные энергетические блоки"
              rows={4}
            />

            <Form.Field.Textarea
              name="blockageAreas"
              label="Области блокировок"
              placeholder="В каких сферах жизни проявляются блокировки"
              rows={4}
            />
          </Grid>
        </Box>

        {/* Денежный канал */}
        <Box>
          <Text fontSize="lg" fontWeight="medium" mb={3}>
            Денежный канал
          </Text>
          <Grid templateColumns={{ base: '1fr', md: '1fr 2fr' }} gap={4}>
            <Form.Field.NumberInput name="moneyChannelLevel" label="Уровень денежного канала (1-10)" min={1} max={10} />

            <Form.Field.Textarea
              name="moneyBlockages"
              label="Блоки в денежном канале"
              placeholder="Что блокирует финансовый поток"
              rows={3}
            />
          </Grid>
        </Box>

        {/* Энергия отношений */}
        <Box>
          <Text fontSize="lg" fontWeight="medium" mb={3}>
            Энергия отношений
          </Text>
          <Grid templateColumns={{ base: '1fr', md: '1fr 2fr' }} gap={4}>
            <Form.Field.NumberInput
              name="relationshipEnergy"
              label="Уровень энергии отношений (1-10)"
              min={1}
              max={10}
            />

            <Form.Field.Textarea
              name="relationshipBlocks"
              label="Блоки в отношениях"
              placeholder="Что мешает гармоничным отношениям"
              rows={3}
            />
          </Grid>
        </Box>

        {/* Жизненная сила */}
        <Box>
          <Text fontSize="lg" fontWeight="medium" mb={3}>
            Жизненная сила
          </Text>
          <Grid templateColumns={{ base: '1fr', md: '1fr 2fr' }} gap={4}>
            <Form.Field.NumberInput name="vitalityLevel" label="Уровень жизненной силы (1-10)" min={1} max={10} />

            <Form.Field.Textarea
              name="energyLeaks"
              label="Утечки энергии"
              placeholder="Куда уходит энергия клиента"
              rows={3}
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
          Сохранить энергетический профиль
        </Form.Button.Submit>
      </Stack>
    </Form>
  )
}
