'use client'

import type { VideoCodec } from '@/generated/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { videoCodecLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  /** Исключить COPY из списка (для транскодирования) */
  excludeCopy?: boolean
}

const allValues: VideoCodec[] = ['AV1', 'HEVC', 'H264', 'COPY']

/**
 * Select для видеокодека
 */
export function SelectVideoCodec({ name, excludeCopy, ...props }: Props): ReactElement {
  const values = excludeCopy ? allValues.filter((v) => v !== 'COPY') : allValues

  const options: SelectOption<VideoCodec>[] = values.map((value) => ({
    label: videoCodecLabels[value],
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}
