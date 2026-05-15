'use client'

/**
 * Бейджи с настройками кодирования
 *
 * Компактное отображение настроек для карточки элемента очереди:
 * - Кодек и пресет
 * - CQ / VMAF
 * - GPU / CPU потоки
 */

import { Badge, HStack, Icon } from '@chakra-ui/react'
import { LuCpu, LuMonitor, LuTarget, LuVideo } from 'react-icons/lu'

import type { ImportQueueEntry } from '../../../../shared/types/import-queue'

interface EncodingSettingsBadgesProps {
  /** Элемент очереди */
  item: ImportQueueEntry
  /** Компактный режим (меньше бейджей) */
  compact?: boolean
}

export function EncodingSettingsBadges({ item, compact = false }: EncodingSettingsBadgesProps) {
  const { importSettings, vmafSettings, vmafResult } = item

  return (
    <HStack gap={2} flexWrap="wrap">
      {/* VMAF / CQ */}
      {vmafResult ? (
        <Badge colorPalette="green" variant="subtle" size="sm">
          <Icon as={LuTarget} boxSize={3} mr={1} />
          CQ {vmafResult.optimalCq} (VMAF {vmafResult.vmafScore.toFixed(0)})
        </Badge>
      ) : vmafSettings?.enabled ? (
        <Badge colorPalette="yellow" variant="subtle" size="sm">
          <Icon as={LuTarget} boxSize={3} mr={1} />
          VMAF {vmafSettings.targetVmaf} → ?
        </Badge>
      ) : importSettings?.cqOverride ? (
        <Badge colorPalette="gray" variant="subtle" size="sm">
          CQ {importSettings.cqOverride}
        </Badge>
      ) : null}

      {/* Кодек (в полном режиме) */}
      {!compact && (
        <Badge colorPalette="purple" variant="subtle" size="sm">
          <Icon as={LuVideo} boxSize={3} mr={1} />
          AV1
        </Badge>
      )}

      {/* Потоки (в полном режиме) */}
      {!compact && (
        <>
          <Badge colorPalette="purple" variant="outline" size="sm">
            <Icon as={LuMonitor} boxSize={3} mr={1} />
            {importSettings?.videoMaxConcurrent ?? 2} GPU
          </Badge>
          <Badge colorPalette="green" variant="outline" size="sm">
            <Icon as={LuCpu} boxSize={3} mr={1} />
            {importSettings?.audioMaxConcurrent ?? 4} CPU
          </Badge>
        </>
      )}
    </HStack>
  )
}
