'use client'

/**
 * Шаг предпросмотра и настроек перед импортом
 *
 * Анализирует файлы, показывает информацию о дорожках и позволяет изменить настройки.
 * VMAF подбор CQ теперь выполняется в очереди импорта, не здесь.
 */

import { Badge, Box, Button, HStack, Icon, Progress, Tabs, Text, VStack } from '@chakra-ui/react'
import { useEffect, useRef } from 'react'
import { LuAudioLines, LuCheck, LuRefreshCw, LuSettings2, LuX } from 'react-icons/lu'

import {
  type AudioRecommendation,
  EncodingSettingsCard,
  type FileAnalysis,
  FileCard,
  type ImportSettings,
  type PreviewStepProps,
  type SubtitleRecommendation,
  useEncodingSettings,
  usePreviewAnalysis,
} from './preview'

/**
 * Шаг предпросмотра
 * Использует probe вместо demux для анализа без извлечения файлов
 */
export function PreviewStep({ files, folderPath, sourceYear, onAnalysisComplete, onSettingsChange }: PreviewStepProps) {
  // Хук для анализа файлов
  const analysis = usePreviewAnalysis({
    files,
    folderPath,
    onAnalysisComplete,
  })

  // Хук для настроек кодирования
  const encodingSettings = useEncodingSettings({
    onSettingsChange,
  })

  // Авто-предложение по первому проанализированному файлу (однократно)
  const autoSuggestApplied = useRef(false)
  useEffect(() => {
    if (autoSuggestApplied.current) return
    const first = analysis.analyses.find((a) => a.mediaInfo)
    if (!first?.mediaInfo) return
    const video = first.mediaInfo.videoTracks?.[0]
    encodingSettings.applyAutoSuggest(video?.height, video?.fieldOrder, sourceYear)
    autoSuggestApplied.current = true
  }, [analysis.analyses, encodingSettings])

  return (
    <VStack gap={4} align="stretch">
      {/* Заголовок и прогресс */}
      <HStack justify="space-between">
        <VStack align="start" gap={0}>
          <Text fontWeight="medium">Предпросмотр ({analysis.selectedFiles.length} файлов)</Text>
          <Text fontSize="sm" color="fg.muted">
            Анализ дорожек и настройки транскодирования
          </Text>
        </VStack>

        {!analysis.isAnalyzing && (
          <Button
            size="sm"
            variant="ghost"
            onClick={analysis.startAnalysis}
            disabled={analysis.selectedFiles.length === 0}
          >
            <Icon as={LuRefreshCw} mr={2} />
            Перезапустить
          </Button>
        )}
      </HStack>

      {/* Общий прогресс */}
      {analysis.isAnalyzing && (
        <VStack gap={2} align="stretch">
          <Progress.Root value={analysis.overallProgress} size="sm" colorPalette="purple">
            <Progress.Track>
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
          <Text fontSize="sm" color="fg.muted" textAlign="center">
            Анализ файлов... {Math.round(analysis.overallProgress)}%
          </Text>
        </VStack>
      )}

      {/* Статистика */}
      {!analysis.isAnalyzing && analysis.analyses.length > 0 && (
        <HStack gap={4}>
          <Badge colorPalette="green">
            <LuCheck /> {analysis.analyzedCount} готово
          </Badge>
          {analysis.errorCount > 0 && (
            <Badge colorPalette="red">
              <LuX /> {analysis.errorCount} ошибок
            </Badge>
          )}
        </HStack>
      )}

      {/* Вкладки: Дорожки / Кодирование */}
      {!analysis.isAnalyzing && analysis.analyzedCount > 0 && (
        <Tabs.Root defaultValue="tracks" variant="line" colorPalette="purple">
          <Tabs.List>
            <Tabs.Trigger value="tracks">
              <Icon as={LuAudioLines} boxSize={4} />
              Дорожки
            </Tabs.Trigger>
            <Tabs.Trigger value="encoding">
              <Icon as={LuSettings2} boxSize={4} />
              Кодирование
            </Tabs.Trigger>
          </Tabs.List>

          {/* Вкладка: Дорожки */}
          <Tabs.Content value="tracks">
            <VStack gap={3} align="stretch" pt={3}>
              {/* Список файлов */}
              <VStack gap={3} align="stretch" maxH="45vh" overflowY="auto">
                {analysis.analyses.map((item) => (
                  <FileCard
                    key={item.file.path}
                    analysis={item}
                    folderPath={folderPath}
                    onToggleTrack={analysis.handleToggleTrack}
                    onToggleSubtitle={analysis.handleToggleSubtitle}
                    onTrackGroupEdit={analysis.handleTrackGroupEdit}
                    onApplyToAll={analysis.applyTrackGroupToAll}
                  />
                ))}
              </VStack>

              {/* Легенда */}
              <Box p={3} bg="bg.subtle" borderRadius="md">
                <Text fontSize="xs" color="fg.subtle">
                  💡 <strong>Пропустить</strong> — дорожка уже в оптимальном формате. <strong>Транскодировать</strong>
                  {' '}
                  — будет перекодировано в AAC 256 kbps для уменьшения размера.
                </Text>
              </Box>
            </VStack>
          </Tabs.Content>

          {/* Вкладка: Кодирование */}
          <Tabs.Content value="encoding">
            <Box pt={3}>
              <EncodingSettingsCard settings={encodingSettings} />
            </Box>
          </Tabs.Content>
        </Tabs.Root>
      )}

      {/* Список файлов во время анализа (без вкладок) */}
      {(analysis.isAnalyzing || analysis.analyzedCount === 0) && (
        <VStack gap={3} align="stretch" maxH="45vh" overflowY="auto">
          {analysis.analyses.map((item) => (
            <FileCard
              key={item.file.path}
              analysis={item}
              folderPath={folderPath}
              onToggleTrack={analysis.handleToggleTrack}
              onToggleSubtitle={analysis.handleToggleSubtitle}
              onTrackGroupEdit={analysis.handleTrackGroupEdit}
              onApplyToAll={analysis.applyTrackGroupToAll}
            />
          ))}
        </VStack>
      )}
    </VStack>
  )
}

// Реэкспорт типов для обратной совместимости
export type { AudioRecommendation, FileAnalysis, ImportSettings, SubtitleRecommendation }
