'use client'

import { Pressable, type PressableProps } from '@letar/ui'

export type PressableCtaProps = PressableProps

/**
 * Обёртка основной CTA-кнопки: добавляет position-aware ripple от точки клика мышью.
 *
 * Ripple — отдельный канал обратной связи: он показывает, ГДЕ нажали, тогда как `scale`
 * у кнопки (если он есть) показывает только САМ факт нажатия. Глубину обёртка не трогает.
 *
 * `borderRadius="l2"` — в time нет своего рецепта кнопки, действует дефолтный рецепт Chakra
 * (`theme/recipes/button.ts` в `@chakra-ui/react` задаёт `borderRadius: 'l2'`). Обёртка должна
 * повторять радиус кнопки, иначе `overflow: hidden` обрежет её либо квадратными, либо слишком
 * скруглёнными углами относительно реальной кнопки внутри.
 *
 * Применять только к кнопкам с тёмной заливкой (`colorPalette="brand"`, `variant="solid"`):
 * ripple в `@letar/ui` захардкожен белым полупрачным (`rgba(255,255,255,0.2)`), на светлых
 * поверхностях (`variant="outline"`/`"ghost"`) он не виден. И только там, где кнопка доступна
 * на десктопе — на тач-устройствах `useRipple` не срабатывает вовсе.
 *
 * @example
 * ```tsx
 * <PressableCta>
 *   <Button colorPalette="brand" onClick={handleSave}>
 *     {t('save')}
 *   </Button>
 * </PressableCta>
 * ```
 */
export function PressableCta({ children, ...props }: PressableCtaProps) {
  return (
    <Pressable
      display="inline-flex"
      borderRadius="l2"
      // `Pressable` отсекает ripple по своим границам (`overflow: hidden`), а focus ring Chakra
      // рисуется СНАРУЖИ кнопки (`outline-offset: 2px`) — и обрезался бы целиком, потому что
      // обёртка совпадает с кнопкой по прямоугольнику. Собственный outline элемента его же
      // `overflow` не режет, поэтому ring дублируется на обёртке — те же 2px/2px и тот же
      // `focus.ring`, что у кнопки, так что визуально он неотличим от необёрнутой.
      // `:has(:focus-visible)`, а не `_focusWithin` — иначе ring вылезал бы и на клик мышью.
      css={{
        '&:has(:focus-visible)': {
          outline: '2px solid',
          outlineColor: 'focus.ring',
          outlineOffset: '2px',
        },
      }}
      {...props}
    >
      {children}
    </Pressable>
  )
}
