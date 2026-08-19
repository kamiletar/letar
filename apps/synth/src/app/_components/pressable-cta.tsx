'use client'

import { PressableCta as PressableCtaBase, type PressableCtaProps as PressableCtaBaseProps } from '@letar/ui'

export type PressableCtaProps = Omit<PressableCtaBaseProps, 'borderRadius' | 'focusRingColorToken'>

/**
 * CTA-обёртка synth — `borderRadius="4px"` под реальный радиус кнопок studio/gallery
 * (см. `button-style.ts`), `focusRingColorToken="accent.DEFAULT"`: кнопки synth не выставляют
 * `colorPalette`, поэтому `colorPalette.focusRing` резолвился бы в дефолтную серую палитру.
 */
export function PressableCta(props: PressableCtaProps) {
  return <PressableCtaBase borderRadius="4px" focusRingColorToken="accent.DEFAULT" {...props} />
}
