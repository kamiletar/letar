'use client'

import { PressableCta as PressableCtaBase, type PressableCtaProps as PressableCtaBaseProps } from '@letar/ui'

export type PressableCtaProps = Omit<PressableCtaBaseProps, 'borderRadius' | 'focusRingColorToken'>

/** CTA-обёртка time — `borderRadius="l2"` под дефолтный рецепт кнопки Chakra (своего рецепта нет). */
export function PressableCta(props: PressableCtaProps) {
  return <PressableCtaBase borderRadius="l2" focusRingColorToken="focus.ring" {...props} />
}
