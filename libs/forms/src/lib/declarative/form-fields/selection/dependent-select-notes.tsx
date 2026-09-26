'use client'

import { Box } from '@chakra-ui/react'
import type { ReactElement } from 'react'
import type { DependentSelectFieldState } from './use-dependent-select-field'

/**
 * Тексты зависимого поля под контролом (§18.10): видимая подсказка «Сначала выберите «Страна»» (её `id` — в
 * `aria-describedby` триггера; заблокированный триггер не получает фокус, поэтому подсказка видна всем) и вежливая
 * визуально скрытая live-область, объявляющая автоочистку. Обновление списка не объявляется — шум при каждой смене.
 * Рисуется внутри `Field.Root` поля; без `dependsOn` — ничего.
 */
export function DependentSelectNotes({ dependent }: { dependent: DependentSelectFieldState }): ReactElement | null {
  if (!dependent.active) {
    return null
  }
  return (
    <>
      {dependent.hint && (
        <Box id={dependent.hintId} mt={1} fontSize="sm" color="fg.muted" data-dependent-hint="">
          {dependent.hint}
        </Box>
      )}
      {/* Область смонтирована всегда (иначе первое объявление теряется); `key` — тот же текст объявляется повторно */}
      <Box aria-live="polite" srOnly data-dependent-cleared="">
        {dependent.announcement && <span key={dependent.cleared?.id}>{dependent.announcement}</span>}
      </Box>
    </>
  )
}
