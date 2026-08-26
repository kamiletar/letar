'use client'

/**
 * Кнопка автоподбора CQ с интеграцией в форму
 *
 * Должна использоваться внутри AnimatronaForm для доступа к контексту формы.
 */

import { Button } from '@chakra-ui/react'
import { useState } from 'react'
import { LuTarget } from 'react-icons/lu'

import { useDeclarativeForm } from '@letar/forms'

import { toaster } from '@/components/ui/toaster'
import type { VideoTranscodeOptions } from '../../../../shared/types'
import type { CqSearchResult } from '../../../../shared/types/vmaf'
import { VmafAutoDialog } from './VmafAutoDialog'

interface VmafCqButtonProps {
  /** Отключено */
  disabled?: boolean
  /** Размер кнопки */
  size?: 'xs' | 'sm' | 'md'
}

/**
 * Кнопка автоподбора CQ через VMAF
 *
 * При нахождении оптимального CQ автоматически обновляет поле формы.
 */
export function VmafCqButton({ disabled, size = 'sm' }: VmafCqButtonProps) {
  const { form } = useDeclarativeForm()
  const [dialogOpen, setDialogOpen] = useState(false)

  /**
   * Обработчик успешного нахождения CQ
   */
  const handleOptimalCqFound = (result: CqSearchResult) => {
    form.setFieldValue('cq', result.optimalCq)

    // GPU NVENC недоступен — снимаем галочку чтобы финальный энкод тоже шёл через CPU
    if (result.useCpuFallback) {
      form.setFieldValue('useGpu', false)
    }

    toaster.success({
      title: `CQ установлен: ${result.optimalCq}`,
      description: result.useCpuFallback
        ? `VMAF ${result.vmafScore.toFixed(1)} — GPU недоступен, переключено на CPU`
        : `VMAF ${result.vmafScore.toFixed(1)}, экономия ${(result.estimatedSavings * 100).toFixed(0)}%`,
    })
  }

  /**
   * Получаем текущие настройки кодирования из формы
   */
  const getVideoOptions = (): Omit<VideoTranscodeOptions, 'cq'> => {
    const codec = (form.getFieldValue('codec') as string) || 'av1'
    const useGpu = (form.getFieldValue('useGpu') as boolean) ?? true
    const preset = (form.getFieldValue('preset') as string) || 'p4'

    return {
      codec: codec as VideoTranscodeOptions['codec'],
      useGpu,
      preset: preset as VideoTranscodeOptions['preset'],
    }
  }

  return (
    <>
      <Button
        size={size}
        variant="outline"
        colorPalette="purple"
        onClick={() => setDialogOpen(true)}
        disabled={disabled}
      >
        <LuTarget style={{ marginRight: '4px' }} />
        Авто VMAF
      </Button>

      <VmafAutoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        videoOptions={getVideoOptions()}
        onOptimalCqFound={handleOptimalCqFound}
      />
    </>
  )
}
