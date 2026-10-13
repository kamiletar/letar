/**
 * Цели касания ≥44×44 px на сенсорном указателе (WCAG 2.5.8, мобильный гейт студии).
 * На мыши вид не меняется: правила действуют только под `@media (pointer: coarse)`.
 */
export const TOUCH_TARGET_PX = 44

/**
 * `css` для `NumberInput.Root`: степперы «+/−» встают в ряд, каждый 44×44, поле получает высоту 44
 * и отступ под обе кнопки. На мыши степперы остаются узкой колонкой в высоту поля.
 */
export const numberTouchControlsCss = {
  '@media (pointer: coarse)': {
    '& [data-part="input"]': {
      minHeight: `${TOUCH_TARGET_PX}px`,
      paddingInlineEnd: `${TOUCH_TARGET_PX * 2 + 4}px`,
    },
    '& [data-part="control"]': {
      flexDirection: 'row',
      width: 'auto',
    },
    '& [data-part="increment-trigger"], & [data-part="decrement-trigger"]': {
      width: `${TOUCH_TARGET_PX}px`,
      minHeight: `${TOUCH_TARGET_PX}px`,
      height: 'auto',
    },
  },
} as const

/** `css` для одиночной кнопки-иконки внутри поля (показ пароля и т.п.): 44×44 на сенсорном указателе */
export const touchIconButtonCss = {
  '@media (pointer: coarse)': {
    width: `${TOUCH_TARGET_PX}px`,
    minWidth: `${TOUCH_TARGET_PX}px`,
    height: `${TOUCH_TARGET_PX}px`,
    minHeight: `${TOUCH_TARGET_PX}px`,
  },
} as const
