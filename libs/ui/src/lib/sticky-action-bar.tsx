'use client'

import { Box, type BoxProps, HStack, type StackProps } from '@chakra-ui/react'
import { forwardRef, type ReactNode } from 'react'

export interface StickyActionBarProps extends BoxProps {
  /** Кнопки действия (обычно одна основная CTA) */
  children: ReactNode
  /** Пропсы внутреннего HStack — выравнивание и расположение кнопок */
  contentProps?: StackProps
}

/**
 * Липкая панель основного действия внизу экрана.
 *
 * Решает системную проблему: основная CTA (например «Начать тест», «Отправить»,
 * «Продолжить») уходит под фолд на длинных интро/формах, и её не видно без скролла.
 * `position: sticky; bottom: 0` держит её всегда на виду; при прокрутке до конца
 * контента панель садится на своё место в потоке.
 *
 * Учитывает `safe-area-inset-bottom` (home-indicator iOS) и рисует границу+тень
 * сверху для отделения от прокручиваемого контента.
 *
 * ⚠️ Sticky ломается, если у любого предка задан `overflow` (кроме `visible`).
 * Размещай как **последний ребёнок** прокручиваемого контейнера.
 *
 * Гейтинг «прочитай сначала»: оберни кнопку в `disabled` от {@link useScrollGate}.
 *
 * @example
 * ```tsx
 * <StickyActionBar>
 *   <Button colorPalette="brand" size="lg" onClick={onStart} disabled={!consent}>
 *     Начать
 *   </Button>
 * </StickyActionBar>
 * ```
 */
export const StickyActionBar = forwardRef<HTMLDivElement, StickyActionBarProps>(function StickyActionBar(
  { children, contentProps, ...rest },
  ref,
) {
  return (
    <Box
      ref={ref}
      position="sticky"
      // Приподнимается над CookieBanner (@letar/ui), если он сейчас показан — оба компонента
      // bottom:0, без координации баннер (zIndex выше) перекрывает эту CTA по pointer-events
      // (archetest, 2026-07-28: клики по «Начать экспресс»/«Пропустить» перехватывала ссылка
      // из баннера). Переменная публикуется самим CookieBanner, 0px если он скрыт/не подключён.
      bottom="var(--letar-cookie-banner-height, 0px)"
      insetInline="0"
      zIndex="docked"
      w="100%"
      bg="bg"
      borderTopWidth="1px"
      borderColor="border"
      // тень вверх — отделяет панель от контента под ней при прокрутке
      boxShadow="0 -4px 12px -8px rgba(0, 0, 0, 0.45)"
      pt="3"
      px="4"
      // отступ снизу + системная зона (home-indicator) на мобильных
      pb="calc(env(safe-area-inset-bottom, 0px) + var(--chakra-spacing-3))"
      {...rest}
    >
      <HStack justify="center" gap="3" w="100%" {...contentProps}>
        {children}
      </HStack>
    </Box>
  )
})
