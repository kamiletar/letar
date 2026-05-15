'use client'

/**
 * Карточка настроек кодирования для PreviewStep
 *
 * VMAF подбор CQ теперь выполняется в очереди импорта.
 * Здесь только чекбокс включения и слайдер целевого VMAF.
 *
 * Также содержит кнопки для работы с шаблонами импорта:
 * - "Использовать шаблон" — загрузить настройки из сохранённого шаблона
 * - "Сохранить как шаблон" — сохранить текущие настройки для переиспользования
 */

import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  HStack,
  Icon,
  NativeSelect,
  Slider,
  Spinner,
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import { LuBookmark, LuBookmarkPlus, LuCpu, LuSettings2, LuSparkles, LuTarget, LuWind } from 'react-icons/lu'
import type { ImportTemplate } from '../../../../../shared/types/import-template'

import { useTemplates } from '../../../hooks/useTemplates'
import { SaveTemplateDialog, TemplateSelectorDialog } from '../templates'
import type { UseEncodingSettingsReturn } from './use-encoding-settings'

interface EncodingSettingsCardProps {
  settings: UseEncodingSettingsReturn
}

/**
 * Компонент карточки настроек кодирования
 */
export function EncodingSettingsCard({ settings }: EncodingSettingsCardProps) {
  const {
    profiles,
    selectedProfileId,
    isLoadingProfiles,
    setSelectedProfileId,
    vmafEnabled,
    targetVmaf,
    setVmafEnabled,
    setTargetVmaf,
    forceCpu,
    setForceCpu,
    audioMaxConcurrent,
    videoMaxConcurrent,
    setAudioMaxConcurrent,
    setVideoMaxConcurrent,
    anime4kEnabled,
    setAnime4kEnabled,
    denoiseEnabled,
    setDenoiseEnabled,
  } = settings

  // Состояние диалогов шаблонов
  const [isSelectorOpen, setIsSelectorOpen] = useState(false)
  const [isSaveOpen, setIsSaveOpen] = useState(false)
  const { markAsUsed } = useTemplates()

  // Текущий профиль для отображения в SaveTemplateDialog
  const selectedProfile = profiles.find((p) => p.id === selectedProfileId)

  /**
   * Обработка выбора шаблона
   */
  const handleSelectTemplate = useCallback(
    (template: ImportTemplate) => {
      // Применяем настройки из шаблона
      setSelectedProfileId(template.profileId)
      setVmafEnabled(template.vmafSettings.enabled)
      setTargetVmaf(template.vmafSettings.targetVmaf)
      setVideoMaxConcurrent(template.videoMaxConcurrent)
      setAudioMaxConcurrent(template.audioMaxConcurrent)

      // Отмечаем шаблон как использованный
      markAsUsed(template.id)
    },
    [setSelectedProfileId, setVmafEnabled, setTargetVmaf, setVideoMaxConcurrent, setAudioMaxConcurrent, markAsUsed],
  )

  return (
    <>
      <Card.Root bg="bg.subtle" borderColor="border.subtle" variant="outline">
        <Card.Header py={3} px={4}>
          <HStack justify="space-between" w="full">
            <HStack gap={2}>
              <Icon as={LuSettings2} color="purple.400" boxSize={4} />
              <Text fontWeight="medium" fontSize="sm">
                Настройки кодирования
              </Text>
            </HStack>

            {/* Кнопки шаблонов */}
            <HStack gap={1}>
              <Button size="xs" variant="ghost" onClick={() => setIsSelectorOpen(true)} title="Использовать шаблон">
                <LuBookmark />
                Шаблон
              </Button>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => setIsSaveOpen(true)}
                title="Сохранить как шаблон"
                disabled={!selectedProfileId}
              >
                <LuBookmarkPlus />
              </Button>
            </HStack>
          </HStack>
        </Card.Header>
        <Card.Body pt={0} pb={4} px={4}>
          <VStack gap={4} align="stretch">
            {/* Профиль кодирования */}
            <HStack justify="space-between" align="center">
              <VStack align="start" gap={0}>
                <Text fontSize="sm">Профиль видео</Text>
                <Text fontSize="xs" color="fg.subtle">
                  Настройки качества и скорости
                </Text>
              </VStack>
              <Box w="200px">
                {isLoadingProfiles ? <Spinner size="sm" /> : (
                  <NativeSelect.Root size="sm">
                    <NativeSelect.Field
                      value={selectedProfileId ?? ''}
                      onChange={(e) => setSelectedProfileId(e.target.value || null)}
                    >
                      {profiles.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.name}
                          {profile.isDefault ? ' ★' : ''}
                        </option>
                      ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                )}
              </Box>
            </HStack>

            {/* Принудительное использование CPU */}
            <HStack justify="space-between" align="center">
              <HStack gap={2}>
                <Icon as={LuCpu} color={forceCpu ? 'orange.400' : 'fg.subtle'} boxSize={4} />
                <VStack align="start" gap={0}>
                  <Text fontSize="sm">Использовать CPU</Text>
                  <Text fontSize="xs" color="fg.subtle">
                    Кодирование на процессоре вместо GPU
                  </Text>
                </VStack>
              </HStack>
              <Switch.Root checked={forceCpu} onCheckedChange={(e) => setForceCpu(e.checked)} colorPalette="orange">
                <Switch.HiddenInput />
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch.Root>
            </HStack>

            {/* VMAF подбор CQ (выполняется в очереди) */}
            <Box
              p={3}
              bg={vmafEnabled ? 'yellow.950/50' : 'bg.muted'}
              borderRadius="md"
              borderWidth="1px"
              borderColor={vmafEnabled ? 'yellow.800/50' : 'border.subtle'}
            >
              <VStack gap={3} align="stretch">
                <Checkbox.Root
                  checked={vmafEnabled}
                  onCheckedChange={(e) => setVmafEnabled(!!e.checked)}
                  colorPalette="yellow"
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label>
                    <HStack gap={2}>
                      <Icon as={LuTarget} color={vmafEnabled ? 'yellow.400' : 'fg.subtle'} boxSize={4} />
                      <Text fontWeight="medium">VMAF подбор CQ</Text>
                    </HStack>
                  </Checkbox.Label>
                </Checkbox.Root>

                <Text fontSize="xs" color="fg.muted">
                  {vmafEnabled
                    ? 'Оптимальный CQ будет подобран перед кодированием (один раз на сериал)'
                    : 'Будет использован CQ из профиля кодирования'}
                </Text>

                {/* Слайдер целевого VMAF */}
                {vmafEnabled && (
                  <VStack align="stretch" gap={2}>
                    <HStack justify="space-between">
                      <Text fontSize="sm">Целевой VMAF</Text>
                      <Badge colorPalette="yellow" size="lg" px={3}>
                        {targetVmaf}
                      </Badge>
                    </HStack>
                    <Slider.Root
                      min={90}
                      max={99}
                      step={1}
                      value={[targetVmaf]}
                      onValueChange={(e) => setTargetVmaf(e.value[0])}
                      colorPalette="yellow"
                    >
                      <Slider.Control>
                        <Slider.Track>
                          <Slider.Range />
                        </Slider.Track>
                        <Slider.Thumb index={0} />
                      </Slider.Control>
                    </Slider.Root>
                    <Text fontSize="xs" color="fg.muted">
                      {targetVmaf >= 97 && '⚠️ Высокий VMAF — большой размер файла'}
                      {targetVmaf >= 94 && targetVmaf < 97 && '✓ Рекомендуемый диапазон для качества'}
                      {targetVmaf < 94 && '💡 Меньший размер файла, чуть ниже качество'}
                    </Text>
                  </VStack>
                )}
              </VStack>
            </Box>

            {/* Денойз hqdn3d */}
            <HStack justify="space-between" align="center">
              <HStack gap={2}>
                <Icon as={LuWind} color={denoiseEnabled ? 'teal.400' : 'fg.subtle'} boxSize={4} />
                <VStack align="start" gap={0}>
                  <Text fontSize="sm">Денойз</Text>
                  <Text fontSize="xs" color="fg.subtle">
                    hqdn3d — убирает зерно перед кодированием
                  </Text>
                </VStack>
              </HStack>
              <Switch.Root
                checked={denoiseEnabled}
                onCheckedChange={(e) => setDenoiseEnabled(e.checked)}
                colorPalette="teal"
              >
                <Switch.HiddenInput />
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch.Root>
            </HStack>

            {/* Anime4K апскейл (libplacebo + GPU шейдеры) */}
            <Box
              p={3}
              bg={anime4kEnabled ? 'purple.950/50' : 'bg.muted'}
              borderRadius="md"
              borderWidth="1px"
              borderColor={anime4kEnabled ? 'purple.800/50' : 'border.subtle'}
            >
              <VStack gap={2} align="stretch">
                <Checkbox.Root
                  checked={anime4kEnabled}
                  onCheckedChange={(e) => setAnime4kEnabled(!!e.checked)}
                  colorPalette="purple"
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label>
                    <HStack gap={2}>
                      <Icon as={LuSparkles} color={anime4kEnabled ? 'purple.400' : 'fg.subtle'} boxSize={4} />
                      <Text fontWeight="medium">Anime4K апскейл</Text>
                      <Badge size="xs" colorPalette="purple" variant="subtle">
                        GPU
                      </Badge>
                    </HStack>
                  </Checkbox.Label>
                </Checkbox.Root>

                <Text fontSize="xs" color="fg.muted">
                  {anime4kEnabled
                    ? 'DVD → 1440×1080 через libplacebo. Интерлейс определяется автоматически (yadif bob). VMAF ищет оптимальный CQ.'
                    : 'Апскейл DVD и низкого разрешения через нейросетевые шейдеры Anime4K. Деинтерлейс — автоматически.'}
                </Text>
              </VStack>
            </Box>
          </VStack>
        </Card.Body>
      </Card.Root>

      {/* Диалог выбора шаблона */}
      <TemplateSelectorDialog
        open={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
        onSelect={handleSelectTemplate}
      />

      {/* Диалог сохранения шаблона */}
      <SaveTemplateDialog
        open={isSaveOpen}
        onClose={() => setIsSaveOpen(false)}
        currentSettings={{
          profileId: selectedProfileId,
          profileName: selectedProfile?.name,
          vmafEnabled,
          targetVmaf,
          audioMaxConcurrent,
          videoMaxConcurrent,
        }}
      />
    </>
  )
}
