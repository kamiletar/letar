'use client'

import { Box, Button, Card, Heading, HStack, Icon, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { LuArrowLeft, LuCheck, LuCpu, LuGauge, LuSettings, LuZap } from 'react-icons/lu'

import {
  AnimatronaForm,
  AnimatronaSegmented,
  encodingProfileDefaults,
  type EncodingProfileFormData,
  EncodingProfileSchema,
} from '@/animatrona-form'
import { Header } from '@/components/layout'
import { useCreateEncodingProfile } from '@/lib/hooks'

// Отключаем статическую генерацию
export const dynamic = 'force-dynamic'

/**
 * Страница создания нового профиля кодирования
 * Мигрировано на AnimatronaForm
 */
export default function NewProfilePage() {
  const router = useRouter()
  const { mutate: createProfile, isPending: isCreating } = useCreateEncodingProfile()

  const handleSubmit = (data: EncodingProfileFormData) => {
    createProfile(
      {
        data: {
          ...data,
          isBuiltIn: false,
          isDefault: false,
          codec: 'AV1',
          useGpu: true,
        },
      },
      {
        onSuccess: () => {
          router.push('/settings')
        },
      }
    )
  }

  return (
    <Box minH="100vh" bg="bg" color="fg">
      <Header title="Новый профиль" />

      <Box p={6}>
        <AnimatronaForm initialValue={encodingProfileDefaults} schema={EncodingProfileSchema} onSubmit={handleSubmit}>
          <VStack gap={6} align="stretch" maxW="800px">
            {/* Шапка с кнопками */}
            <HStack justify="space-between">
              <Button variant="ghost" onClick={() => router.push('/settings')}>
                <Icon as={LuArrowLeft} mr={2} />
                Назад
              </Button>
              <AnimatronaForm.Button.Submit colorPalette="purple" disabled={isCreating}>
                <Icon as={LuCheck} mr={2} />
                {isCreating ? 'Создание...' : 'Создать'}
              </AnimatronaForm.Button.Submit>
            </HStack>

            {/* Основная информация */}
            <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
              <Card.Header>
                <HStack gap={3}>
                  <Icon as={LuSettings} color="purple.400" boxSize={5} />
                  <Heading size="md">Основные параметры</Heading>
                </HStack>
              </Card.Header>
              <Card.Body>
                <AnimatronaForm.Field.String name="name" label="Название профиля" placeholder="Мой профиль" required />
              </Card.Body>
            </Card.Root>

            {/* Rate Control */}
            <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
              <Card.Header>
                <HStack gap={3}>
                  <Icon as={LuGauge} color="purple.400" boxSize={5} />
                  <Heading size="md">Rate Control</Heading>
                </HStack>
              </Card.Header>
              <Card.Body>
                <VStack gap={6} align="stretch">
                  <AnimatronaForm.Select.RateControl name="rateControl" label="Режим контроля битрейта" />

                  <AnimatronaForm.Field.CqSlider name="cq" label="Качество (CQ)" />

                  <AnimatronaForm.When field="rateControl" is="VBR">
                    <AnimatronaForm.Field.Number
                      name="maxBitrate"
                      label="Максимальный битрейт (kbps, опционально)"
                      placeholder="Без ограничения"
                      min={1000}
                      max={100000}
                    />
                  </AnimatronaForm.When>
                </VStack>
              </Card.Body>
            </Card.Root>

            {/* Скорость/Качество */}
            <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
              <Card.Header>
                <HStack gap={3}>
                  <Icon as={LuZap} color="purple.400" boxSize={5} />
                  <Heading size="md">Скорость/Качество</Heading>
                </HStack>
              </Card.Header>
              <Card.Body>
                <VStack gap={6} align="stretch">
                  <Box>
                    <AnimatronaSegmented.Preset name="preset" label="Пресет" />
                  </Box>

                  <AnimatronaForm.Select.Tune name="tune" label="Tune" />

                  <AnimatronaForm.Select.Multipass name="multipass" label="Multipass" />
                </VStack>
              </Card.Body>
            </Card.Root>

            {/* Adaptive Quantization */}
            <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
              <Card.Header>
                <HStack gap={3}>
                  <Icon as={LuCpu} color="purple.400" boxSize={5} />
                  <Heading size="md">Adaptive Quantization</Heading>
                </HStack>
              </Card.Header>
              <Card.Body>
                <VStack gap={6} align="stretch">
                  <AnimatronaForm.Field.Switch
                    name="spatialAq"
                    label="Spatial AQ"
                    helperText="Адаптивное квантование по кадру"
                  />

                  <AnimatronaForm.Field.Switch
                    name="temporalAq"
                    label="Temporal AQ"
                    helperText="Адаптивное квантование по времени"
                  />

                  <AnimatronaForm.Field.Slider name="aqStrength" label="AQ Strength" min={1} max={15} step={1} />
                </VStack>
              </Card.Body>
            </Card.Root>

            {/* Продвинутые параметры */}
            <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
              <Card.Header>
                <HStack gap={3}>
                  <Icon as={LuSettings} color="purple.400" boxSize={5} />
                  <Heading size="md">Продвинутые параметры</Heading>
                </HStack>
              </Card.Header>
              <Card.Body>
                <VStack gap={6} align="stretch">
                  <HStack gap={4}>
                    <Box flex={1}>
                      <AnimatronaForm.Field.Number
                        name="lookahead"
                        label="Lookahead"
                        placeholder="Авто"
                        min={0}
                        max={32}
                      />
                    </Box>
                    <Box flex={1}>
                      <AnimatronaForm.Field.Number
                        name="lookaheadLevel"
                        label="Lookahead Level"
                        placeholder="Авто"
                        min={0}
                        max={3}
                      />
                    </Box>
                  </HStack>

                  <HStack gap={4}>
                    <Box flex={1}>
                      <AnimatronaForm.Field.Number name="gopSize" label="GOP Size" min={0} max={600} />
                    </Box>
                    <Box flex={1}>
                      <AnimatronaForm.Select.BRefMode name="bRefMode" label="B-Ref Mode" />
                    </Box>
                  </HStack>

                  <AnimatronaForm.Field.Switch
                    name="temporalFilter"
                    label="Temporal Filter"
                    helperText="Blackwell: +4-5% качества, немного медленнее"
                  />

                  <AnimatronaForm.Field.Switch
                    name="force10Bit"
                    label="Принудительно 10-bit"
                    helperText="Всегда использовать p010le (даже для 8-bit источников)"
                  />
                </VStack>
              </Card.Body>
            </Card.Root>
          </VStack>
        </AnimatronaForm>
      </Box>
    </Box>
  )
}
