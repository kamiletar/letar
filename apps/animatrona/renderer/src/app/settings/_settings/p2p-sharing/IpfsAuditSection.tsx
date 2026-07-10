'use client'

/**
 * Секция аудита IPFS хранилища
 * Находит осиротевшие pins и позволяет их удалить
 */

import { Badge, Box, Button, Collapsible, Grid, Heading, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { LuChevronDown, LuChevronUp, LuPin, LuSearch, LuTrash2, LuWrench } from 'react-icons/lu'

import { ProgressLog } from '@/components/ui/ProgressLog'

import { formatBytes } from './format-utils'
import { useIpfsAudit } from './use-ipfs-audit'

/**
 * Компонент аудита IPFS — поиск и очистка осиротевших pins
 */
export function IpfsAuditSection() {
  const {
    result,
    isRunning,
    auditLog,
    auditProgress,
    isCleaning,
    cleanProgress,
    isPinning,
    isNormalizing,
    normalizeLog,
    normalizeProgress,
    normalizeResult,
    cleanedCount,
    pinnedCount,
    error,
    runAudit,
    cleanOrphans,
    pinMissing,
    runGc,
    normalizePins,
  } = useIpfsAudit()

  const [showDetails, setShowDetails] = useState(false)
  const [gcResult, setGcResult] = useState<{ blocksRemoved: number; savedBytes: number } | null>(null)

  const orphanedSize = result?.orphanedPins.reduce((sum, p) => sum + (p.size ?? 0), 0) ?? 0

  const handleCleanAndGc = async () => {
    await cleanOrphans()
    const gc = await runGc()
    if (gc) {
      setGcResult(gc)
    }
  }

  return (
    <Box>
      <HStack mb={4} gap={3} justify="space-between">
        <HStack gap={3}>
          <Icon as={LuSearch} color="orange.400" boxSize={5} />
          <Heading size="sm">Аудит хранилища</Heading>
          {result && (
            <Badge colorPalette={result.orphanedPins.length > 0 ? 'orange' : 'green'} size="sm">
              {result.orphanedPins.length > 0 ? `${result.orphanedPins.length} мусор` : 'Чисто'}
            </Badge>
          )}
        </HStack>
        <HStack gap={2}>
          <Button
            size="xs"
            variant="outline"
            onClick={normalizePins}
            loading={isNormalizing}
            loadingText="Нормализация..."
            title="Снимает recursive pin с дочерних CID — оставляет только корневые directoryCid'ы. Безопасно: контент остаётся защищён от GC через indirect pin."
          >
            <LuWrench />
            Нормализовать pins
          </Button>
          <Button size="xs" variant="outline" onClick={runAudit} loading={isRunning} loadingText="Сканирование...">
            <LuSearch />
            Проверить
          </Button>
        </HStack>
      </HStack>

      {/* Прогресс нормализации */}
      {(isNormalizing || normalizeLog.length > 0) && !normalizeResult && (
        <Box mb={4}>
          <ProgressLog
            entries={normalizeLog}
            progress={normalizeProgress ?? undefined}
            isRunning={isNormalizing}
            maxH="150px"
          />
        </Box>
      )}

      {/* Результат нормализации */}
      {normalizeResult && (
        <Box mb={4} p={3} bg="bg.subtle" borderRadius="md">
          <Text fontSize="sm" color="green.400" fontWeight="bold" mb={1}>
            Нормализация завершена
          </Text>
          <Text fontSize="xs" color="fg.muted">
            Снято recursive pin'ов: <b>{normalizeResult.unpinned}</b> (стали indirect)
            {' • '}
            Оставлено: <b>{normalizeResult.kept}</b>
            {normalizeResult.errors > 0 ? ` • Ошибок: ${normalizeResult.errors}` : ''}
            {' • '}
            Директорий обработано: {normalizeResult.directoriesProcessed}
            {normalizeResult.directoriesFailed > 0 ? ` (ошибок ${normalizeResult.directoriesFailed})` : ''}
          </Text>
        </Box>
      )}

      <Text fontSize="xs" color="fg.muted" mb={4}>
        Сканирует все манифесты и базу данных, сравнивает с запиненными CID. Находит мусор от неудачных импортов.
      </Text>

      {/* Прогресс аудита */}
      {(isRunning || auditLog.length > 0) && !result && (
        <Box mb={4}>
          <ProgressLog entries={auditLog} progress={auditProgress ?? undefined} isRunning={isRunning} maxH="150px" />
        </Box>
      )}

      {error && (
        <Text fontSize="sm" color="red.400" mb={3}>
          {error}
        </Text>
      )}

      {result && (
        <VStack align="stretch" gap={4}>
          {/* Статистика */}
          <Grid templateColumns="repeat(2, 1fr)" gap={3}>
            <StatBox label="Pinned" value={result.pinnedCids.length} />
            <StatBox label="Referenced" value={result.referencedCids.length} />
            <StatBox
              label="Мусор"
              value={result.orphanedPins.length}
              color={result.orphanedPins.length > 0 ? 'orange.400' : 'green.400'}
              subtitle={orphanedSize > 0 ? formatBytes(orphanedSize) : undefined}
            />
            <StatBox
              label="Не запинены"
              value={result.missingPins.length}
              color={result.missingPins.length > 0 ? 'yellow.400' : 'green.400'}
            />
          </Grid>

          {/* Кнопка очистки */}
          {result.orphanedPins.length > 0 && (
            <Button
              size="sm"
              colorPalette="red"
              variant="outline"
              onClick={handleCleanAndGc}
              loading={isCleaning}
              loadingText={
                cleanProgress ? `Удаление: ${cleanProgress.current}/${cleanProgress.total}...` : 'Удаление...'
              }
            >
              <LuTrash2 />
              Удалить {result.orphanedPins.length} осиротевших pins ({formatBytes(orphanedSize)})
            </Button>
          )}

          {/* Кнопка закрепления missing pins + инлайн список (короткий, чтобы было видно сразу что не запинено) */}
          {result.missingPins.length > 0 && (
            <Box>
              <Button
                size="sm"
                colorPalette="yellow"
                variant="outline"
                onClick={pinMissing}
                loading={isPinning}
                loadingText="Закрепление..."
                width="full"
              >
                <LuPin />
                Закрепить {result.missingPins.length} незапиненных CID
              </Button>
              {result.missingPinDetails && result.missingPinDetails.length > 0 && (
                <VStack align="stretch" gap={1} mt={2} fontSize="xs">
                  {result.missingPinDetails.slice(0, 20).map((mp) => (
                    <HStack key={mp.cid} gap={2} color="fg.muted">
                      <Text fontFamily="mono" truncate maxW="160px">
                        {mp.cid}
                      </Text>
                      <Text color="yellow.400" truncate flex={1}>
                        {mp.source}
                      </Text>
                    </HStack>
                  ))}
                  {result.missingPinDetails.length > 20 && (
                    <Text color="fg.subtle">… ещё {result.missingPinDetails.length - 20} (см. «Показать детали»)</Text>
                  )}
                </VStack>
              )}
            </Box>
          )}

          {/* Результат очистки */}
          {cleanedCount > 0 && (
            <Text fontSize="sm" color="green.400">
              Удалено {cleanedCount} pins
              {gcResult ? `, GC освободил ${gcResult.blocksRemoved} блоков (${formatBytes(gcResult.savedBytes)})` : ''}
            </Text>
          )}

          {/* Результат закрепления */}
          {pinnedCount > 0 && (
            <Text fontSize="sm" color="green.400">
              Закреплено {pinnedCount} CID
            </Text>
          )}

          {/* Ошибки парсинга манифестов */}
          {result.errors.length > 0 && (
            <Text fontSize="xs" color="yellow.400">
              {result.errors.length} ошибок при чтении манифестов
            </Text>
          )}

          {/* Детали — раскрываемый блок */}
          <Collapsible.Root open={showDetails} onOpenChange={(e) => setShowDetails(e.open)}>
            <Collapsible.Trigger asChild>
              <Button size="xs" variant="ghost" width="full">
                <HStack gap={1}>
                  <Text>{showDetails ? 'Скрыть детали' : 'Показать детали'}</Text>
                  <Icon as={showDetails ? LuChevronUp : LuChevronDown} />
                </HStack>
              </Button>
            </Collapsible.Trigger>

            <Collapsible.Content>
              <VStack align="stretch" gap={3} mt={3}>
                {/* Осиротевшие pins */}
                {result.orphanedPins.length > 0 && (
                  <Box>
                    <Text fontSize="xs" fontWeight="bold" mb={2}>
                      Осиротевшие pins:
                    </Text>
                    <VStack align="stretch" gap={1} maxH="200px" overflowY="auto">
                      {result.orphanedPins.map((pin) => (
                        <HStack key={pin.cid} fontSize="xs" color="fg.muted" gap={2}>
                          <Text fontFamily="mono" truncate flex={1}>
                            {pin.cid}
                          </Text>
                          {pin.name && (
                            <Text color="fg.subtle" truncate maxW="150px">
                              {pin.name}
                            </Text>
                          )}
                          <Text whiteSpace="nowrap">{formatBytes(pin.size ?? 0)}</Text>
                        </HStack>
                      ))}
                    </VStack>
                  </Box>
                )}

                {/* Не запинены — детали */}
                {result.missingPinDetails && result.missingPinDetails.length > 0 && (
                  <Box>
                    <Text fontSize="xs" fontWeight="bold" mb={2}>
                      Не запинены ({result.missingPinDetails.length}):
                    </Text>
                    <VStack align="stretch" gap={1} maxH="200px" overflowY="auto">
                      {result.missingPinDetails.map((mp) => (
                        <HStack key={mp.cid} fontSize="xs" color="fg.muted" gap={2}>
                          <Text fontFamily="mono" truncate maxW="200px">
                            {mp.cid}
                          </Text>
                          <Text color="yellow.400" truncate flex={1}>
                            {mp.source}
                          </Text>
                          {mp.animeName && (
                            <Text color="fg.subtle" truncate maxW="200px">
                              {mp.animeName}
                            </Text>
                          )}
                        </HStack>
                      ))}
                    </VStack>
                  </Box>
                )}

                {/* Ошибки */}
                {result.errors.length > 0 && (
                  <Box>
                    <Text fontSize="xs" fontWeight="bold" mb={2}>
                      Ошибки чтения манифестов:
                    </Text>
                    <VStack align="stretch" gap={1} maxH="150px" overflowY="auto">
                      {result.errors.map((err, i) => (
                        <Text key={i} fontSize="xs" color="yellow.400">
                          {err}
                        </Text>
                      ))}
                    </VStack>
                  </Box>
                )}

                {/* Breakdown */}
                <Box>
                  <Text fontSize="xs" fontWeight="bold" mb={1}>
                    Источники CID:
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    База данных: {result.dbCids.length} • Итого уникальных: {result.referencedCids.length}
                  </Text>
                </Box>
              </VStack>
            </Collapsible.Content>
          </Collapsible.Root>
        </VStack>
      )}
    </Box>
  )
}

/** Карточка статистики */
function StatBox({
  label,
  value,
  color,
  subtitle,
}: {
  label: string
  value: number
  color?: string
  subtitle?: string
}) {
  return (
    <Box bg="bg.subtle" p={3} borderRadius="md">
      <Text fontSize="xs" color="fg.muted">
        {label}
      </Text>
      <Text fontSize="lg" fontWeight="bold" color={color}>
        {value}
      </Text>
      {subtitle && (
        <Text fontSize="xs" color="fg.muted">
          {subtitle}
        </Text>
      )}
    </Box>
  )
}
