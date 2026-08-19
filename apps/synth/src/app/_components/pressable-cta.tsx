'use client'

import { Pressable, type PressableProps } from '@letar/ui'

export type PressableCtaProps = PressableProps

/**
 * Обёртка главной CTA-кнопки: добавляет position-aware ripple от точки клика мышью.
 *
 * Ripple — отдельный канал обратной связи: показывает, ГДЕ нажали (в отличие от `scale`,
 * который показывает только сам факт нажатия). В synth своего рецепта кнопки нет, поэтому
 * глубину нажатия обёртка не трогает намеренно — см. комментарий у `theme/index.ts`.
 *
 * Тема synth всегда тёмная (`forcedTheme="dark"`), поэтому в отличие от domwellbes здесь не
 * важно различать solid/outline — ripple `rgba(255,255,255,0.2)` из `@letar/ui` виден на любой
 * тёмной поверхности приложения. Ограничение остаётся то же: только мышь (десктоп), не мобильный
 * тач, и не элементы самого синтеза (клавиши/ручки) — там важна мгновенная реакция без обёртки.
 *
 * `outlineColor: 'accent.DEFAULT'` — не `colorPalette.focusRing`: кнопки synth не выставляют
 * `colorPalette` (используют `accent.*` напрямую), поэтому `colorPalette.*` резолвился бы в
 * дефолтную серую палитру Chakra, а не в золото темы.
 *
 * `borderRadius="4px"` — под реальный радиус кнопок studio/gallery (см. `button-style.ts` и
 * инлайновые стили `btnStyle`), а не дефолт Chakra-рецепта.
 *
 * @example
 * ```tsx
 * <PressableCta>
 *   <Button onClick={handleStart}>▶ Запустить звук</Button>
 * </PressableCta>
 * ```
 */
export function PressableCta({ children, ...props }: PressableCtaProps) {
  return (
    <Pressable
      display="inline-flex"
      borderRadius="4px"
      // `Pressable` обрезает ripple по своим границам (`overflow: hidden`), а focus ring Chakra
      // рисуется СНАРУЖИ кнопки (`outline-offset`) — обрезался бы целиком, потому что обёртка
      // совпадает с кнопкой по прямоугольнику. `:has(:focus-visible)`, а не `_focusWithin` —
      // иначе ring вылезал бы и на клик мышью, не только на Tab.
      css={{
        '&:has(:focus-visible)': {
          outline: '2px solid',
          outlineColor: 'accent.DEFAULT',
          outlineOffset: '2px',
        },
      }}
      {...props}
    >
      {children}
    </Pressable>
  )
}
