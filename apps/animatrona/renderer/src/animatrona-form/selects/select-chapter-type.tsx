'use client'

import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'

/** Локальный тип главы (модель Chapter удалена из schema) */
type ChapterType = 'CHAPTER' | 'OP' | 'ED' | 'RECAP' | 'PREVIEW'

/** Лейблы типов глав */
const CHAPTER_TYPE_LABELS: Record<ChapterType, string> = {
  CHAPTER: 'Глава',
  OP: 'Опенинг',
  ED: 'Эндинг',
  RECAP: 'Рекап',
  PREVIEW: 'Превью',
}

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  /** Показать опцию "Все типы" */
  showAll?: boolean
}

const allTypes: ChapterType[] = ['CHAPTER', 'OP', 'ED', 'RECAP', 'PREVIEW']

/**
 * Select для типа главы
 */
export function SelectChapterType({ name, showAll, ...props }: Props): ReactElement {
  const options: SelectOption<ChapterType | ''>[] = [
    ...(showAll ? [{ label: 'Все типы', value: '' as ChapterType }] : []),
    ...allTypes.map((value) => ({
      label: CHAPTER_TYPE_LABELS[value],
      value,
    })),
  ]

  return <FieldSelect name={name} options={options} {...props} />
}
