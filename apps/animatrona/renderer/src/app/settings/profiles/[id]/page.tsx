'use client'

import { Badge, Box, Button, Card, Heading, HStack, Spinner, Text, VStack } from '@chakra-ui/react'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { LuArrowLeft, LuCheck, LuCopy, LuCpu, LuGauge, LuSettings, LuStar, LuTrash2, LuZap } from 'react-icons/lu'

import { VmafCqButton } from '@/components/vmaf'

import {
  AnimatronaForm,
  AnimatronaSegmented,
  type EncodingProfileFormData,
  EncodingProfileSchema,
} from '@/animatrona-form'
import { duplicateEncodingProfile, resetBuiltInProfile } from '@/app/_actions/encoding-profile.action'
import { Header } from '@/components/layout'
import { useDeleteEncodingProfile, useFindUniqueEncodingProfile, useUpdateEncodingProfile } from '@/lib/hooks'

// Отключаем статическую генерацию
export const dynamic = 'force-dynamic'

/**
 * Страница редактирования профиля кодирования
 * Мигрировано на AnimatronaForm
 */
export default function ProfileEditorPage() {
  const params = useParams()
  const router = useRouter()
  const profileId = params.id as string

  const { data: profile, isLoading } = useFindUniqueEncodingProfile({
    where: { id: profileId },
  })

  const { mutate: updateProfile, isPending: isUpdating } = useUpdateEncodingProfile()
  const { mutate: deleteProfile, isPending: isDeleting } = useDeleteEncodingProfile()
  const [isResetting, setIsResetting] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)

  const handleReset = async () => {
    if (!profile?.isBuiltIn) {
      return
    }
    if (!confirm('Сбросить профиль к начальным настройкам?')) {
      return
    }

    setIsResetting(true)
    try {
      await resetBuiltInProfile(profileId)
      // Перезагружаем страницу для обновления данных
      window.location.reload()
    } finally {
      setIsResetting(false)
    }
  }

  const handleDuplicate = async () => {
    setIsDuplicating(true)
    try {
      const newProfile = await duplicateEncodingProfile(profileId)
      router.push(`/settings/profiles/${newProfile.id}`)
    } finally {
      setIsDuplicating(false)
    }
  }

  const handleSubmit = (data: EncodingProfileFormData) => {
    updateProfile(
      {
        where: { id: profileId },
        data,
      },
      {
        onSuccess: () => {
          router.push('/settings')
        },
      },
    )
  }

  const handleDelete = () => {
    if (!profile?.isBuiltIn && confirm('Удалить профиль?')) {
      deleteProfile(
        { where: { id: profileId } },
        {
          onSuccess: () => {
            router.push('/settings')
          },
        },
      )
    }
  }

  if (isLoading) {
    return (
      <Box minH="100vh" bg="bg" color="fg">
        <Header title="Редактор профиля" />
        <Box p={6}>
          <HStack>
            <Spinner size="sm" />
            <Text color="fg.subtle">Загрузка профиля...</Text>
          </HStack>
        </Box>
      </Box>
    )
  }

  if (!profile) {
    return (
      <Box minH="100vh" bg="bg" color="fg">
        <Header title="Профиль не найден" />
        <Box p={6}>
          <Text color="fg.subtle">Профиль не найден</Text>
          <Button mt={4} onClick={() => router.push('/settings')}>
            Назад к настройкам
          </Button>
        </Box>
      </Box>
    )
  }

  // Преобразуем данные профиля в формат формы
  const initialValue: EncodingProfileFormData = {
    name: profile.name,
    codec: profile.codec as EncodingProfileFormData['codec'],
    useGpu: profile.useGpu,
    preferCpu: profile.preferCpu,
    rateControl: profile.rateControl as EncodingProfileFormData['rateControl'],
    cq: profile.cq,
    maxBitrate: profile.maxBitrate,
    preset: profile.preset as EncodingProfileFormData['preset'],
    tune: profile.tune as EncodingProfileFormData['tune'],
    multipass: profile.multipass as EncodingProfileFormData['multipass'],
    spatialAq: profile.spatialAq,
    temporalAq: profile.temporalAq,
    aqStrength: profile.aqStrength,
    lookahead: profile.lookahead,
    lookaheadLevel: profile.lookaheadLevel,
    gopSize: profile.gopSize,
    bRefMode: profile.bRefMode as EncodingProfileFormData['bRefMode'],
    force10Bit: profile.force10Bit,
    temporalFilter: profile.temporalFilter,
  }

  // Встроенные профили доступны только для просмотра
  const isReadOnly = profile.isBuiltIn

  return (
    <Box minH="100vh" bg="bg" color="fg">
      <Header title={isReadOnly ? 'Просмотр профиля' : 'Редактор профиля'} />

      <Box p={6}>
        <AnimatronaForm initialValue={initialValue} schema={EncodingProfileSchema} onSubmit={handleSubmit}>
          <VStack gap={6} align="stretch" maxW="800px">
            {/* Шапка с кнопками */}
            <HStack justify="space-between">
              <Button variant="ghost" onClick={() => router.push('/settings')}>
                <LuArrowLeft size={16} style={{ marginRight: 8 }} />
                Назад
              </Button>
              <HStack gap={2}>
                {isReadOnly
                  ? (
                    <>
                      <Button variant="outline" onClick={handleReset} disabled={isResetting}>
                        <LuSettings size={16} style={{ marginRight: 8 }} />
                        {isResetting ? 'Сброс...' : 'Сбросить'}
                      </Button>
                      <Button colorPalette="purple" onClick={handleDuplicate} disabled={isDuplicating}>
                        <LuCopy size={16} style={{ marginRight: 8 }} />
                        {isDuplicating ? 'Копирование...' : 'Создать копию'}
                      </Button>
                    </>
                  )
                  : (
                    <>
                      <Button variant="outline" colorPalette="red" onClick={handleDelete} disabled={isDeleting}>
                        <LuTrash2 size={16} style={{ marginRight: 8 }} />
                        Удалить
                      </Button>
                      <AnimatronaForm.Button.Submit colorPalette="purple" disabled={isUpdating}>
                        <LuCheck size={16} style={{ marginRight: 8 }} />
                        {isUpdating ? 'Сохранение...' : 'Сохранить'}
                      </AnimatronaForm.Button.Submit>
                    </>
                  )}
              </HStack>
            </HStack>

            {/* Предупреждение для встроенных профилей */}
            {isReadOnly && (
              <Card.Root bg="yellow.950" border="1px" borderColor="yellow.800">
                <Card.Body py={3}>
                  <Text color="yellow.200" fontSize="sm">
                    Встроенный профиль доступен только для просмотра. Создайте копию для редактирования.
                  </Text>
                </Card.Body>
              </Card.Root>
            )}

            {/* Основная информация */}
            <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
              <Card.Header>
                <HStack gap={3}>
                  <LuSettings size={20} color="var(--chakra-colors-purple-400)" />
                  <Heading size="md">Основные параметры</Heading>
                  {profile.isBuiltIn && (
                    <Badge colorPalette="purple" variant="subtle">
                      Встроенный
                    </Badge>
                  )}
                  {profile.isDefault && (
                    <Badge colorPalette="yellow" variant="subtle">
                      <LuStar size={16} style={{ marginRight: 4 }} />
                      По умолчанию
                    </Badge>
                  )}
                </HStack>
              </Card.Header>
              <Card.Body>
                <AnimatronaForm.Field.String
                  name="name"
                  label="Название профиля"
                  placeholder="Название профиля"
                  disabled={isReadOnly}
                  required
                />
              </Card.Body>
            </Card.Root>

            {/* Rate Control */}
            <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
              <Card.Header>
                <HStack gap={3}>
                  <LuGauge size={20} color="var(--chakra-colors-purple-400)" />
                  <Heading size="md">Rate Control</Heading>
                </HStack>
              </Card.Header>
              <Card.Body>
                <VStack gap={6} align="stretch">
                  <AnimatronaForm.Select.RateControl
                    name="rateControl"
                    label="Режим контроля битрейта"
                    disabled={isReadOnly}
                  />

                  <HStack align="flex-end" gap={2}>
                    <Box flex={1}>
                      <AnimatronaForm.Field.CqSlider name="cq" label="Качество (CQ)" disabled={isReadOnly} />
                    </Box>
                    <Box mb={1}>
                      <VmafCqButton disabled={isReadOnly} />
                    </Box>
                  </HStack>

                  <AnimatronaForm.When field="rateControl" is="VBR">
                    <AnimatronaForm.Field.Number
                      name="maxBitrate"
                      label="Максимальный битрейт (kbps, опционально)"
                      placeholder="Без ограничения"
                      min={1000}
                      max={100000}
                      disabled={isReadOnly}
                    />
                  </AnimatronaForm.When>
                </VStack>
              </Card.Body>
            </Card.Root>

            {/* Скорость/Качество */}
            <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
              <Card.Header>
                <HStack gap={3}>
                  <LuZap size={20} color="var(--chakra-colors-purple-400)" />
                  <Heading size="md">Скорость/Качество</Heading>
                </HStack>
              </Card.Header>
              <Card.Body>
                <VStack gap={6} align="stretch">
                  <Box>
                    <AnimatronaSegmented.Preset name="preset" label="Пресет" disabled={isReadOnly} />
                  </Box>

                  <AnimatronaForm.Select.Tune name="tune" label="Tune" disabled={isReadOnly} />

                  <AnimatronaForm.Select.Multipass name="multipass" label="Multipass" disabled={isReadOnly} />
                </VStack>
              </Card.Body>
            </Card.Root>

            {/* Adaptive Quantization */}
            <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
              <Card.Header>
                <HStack gap={3}>
                  <LuCpu size={20} color="var(--chakra-colors-purple-400)" />
                  <Heading size="md">Adaptive Quantization</Heading>
                </HStack>
              </Card.Header>
              <Card.Body>
                <VStack gap={6} align="stretch">
                  <AnimatronaForm.Field.Switch
                    name="spatialAq"
                    label="Spatial AQ"
                    helperText="Адаптивное квантование по кадру"
                    disabled={isReadOnly}
                  />

                  <AnimatronaForm.Field.Switch
                    name="temporalAq"
                    label="Temporal AQ"
                    helperText="Адаптивное квантование по времени"
                    disabled={isReadOnly}
                  />

                  <AnimatronaForm.Field.Slider
                    name="aqStrength"
                    label="AQ Strength"
                    min={1}
                    max={15}
                    step={1}
                    disabled={isReadOnly}
                  />
                </VStack>
              </Card.Body>
            </Card.Root>

            {/* Продвинутые параметры */}
            <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
              <Card.Header>
                <HStack gap={3}>
                  <LuSettings size={20} color="var(--chakra-colors-purple-400)" />
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
                        max={250}
                        disabled={isReadOnly}
                      />
                    </Box>
                    <Box flex={1}>
                      <AnimatronaForm.Field.Number
                        name="lookaheadLevel"
                        label="Lookahead Level"
                        placeholder="Авто"
                        min={0}
                        max={3}
                        disabled={isReadOnly}
                      />
                    </Box>
                  </HStack>

                  <HStack gap={4}>
                    <Box flex={1}>
                      <AnimatronaForm.Field.Number
                        name="gopSize"
                        label="GOP Size"
                        min={0}
                        max={600}
                        disabled={isReadOnly}
                      />
                    </Box>
                    <Box flex={1}>
                      <AnimatronaForm.Select.BRefMode name="bRefMode" label="B-Ref Mode" disabled={isReadOnly} />
                    </Box>
                  </HStack>

                  <AnimatronaForm.Field.Switch
                    name="temporalFilter"
                    label="Temporal Filter"
                    helperText="Blackwell: +4-5% качества, немного медленнее"
                    disabled={isReadOnly}
                  />

                  <AnimatronaForm.Field.Switch
                    name="force10Bit"
                    label="Принудительно 10-bit"
                    helperText="Всегда использовать p010le (даже для 8-bit источников)"
                    disabled={isReadOnly}
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
