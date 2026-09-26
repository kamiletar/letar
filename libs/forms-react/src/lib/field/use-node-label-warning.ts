'use client'

import { isNodeLabelWithoutText } from '@letar/forms-core/uikit'
import { useEffect, useRef } from 'react'

/**
 * Dev-only: warns once per field when an option has a non-string `label` (a node) and no
 * `textValue`. Such an option is searched, typeahead-ed and captioned in the trigger by its
 * `value`, which is rarely what the user sees.
 */
export function useNodeLabelWarning(
  fieldKind: string,
  options: readonly { label?: unknown; textValue?: string }[],
): void {
  const warnedRef = useRef(false)
  useEffect(() => {
    // Только диагностика для разработчика (dev и тесты); решение «прод или нет» здесь не принимается
    const env = process.env.NODE_ENV
    if ((env !== 'development' && env !== 'test') || warnedRef.current) {
      return
    }
    if (options.some(isNodeLabelWithoutText)) {
      warnedRef.current = true
      console.warn(
        `[@letar/forms] ${fieldKind}: an option has a non-string \`label\` without \`textValue\` — `
          + 'search, typeahead and the trigger caption will use its `value`. Set `textValue` on such options.',
      )
    }
  }, [fieldKind, options])
}
