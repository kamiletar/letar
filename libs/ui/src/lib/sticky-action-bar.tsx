'use client'

import { Box, type BoxProps, HStack, mergeRefs, type StackProps } from '@chakra-ui/react'
import { forwardRef, type ReactNode, useLayoutEffect, useRef } from 'react'

export interface StickyActionBarProps extends BoxProps {
  /** Кнопки действия (обычно одна основная CTA) */
  children: ReactNode
  /** Пропсы внутреннего HStack — выравнивание и расположение кнопок */
  contentProps?: StackProps
}

/**
 * CSS-переменная с текущей высотой панели — читают экраны, где контент выше панели
 * должен резервировать под неё отступ (та же проблема, что решает `--letar-cookie-
 * banner-height` у {@link CookieBanner}, но наоборот: не «поднять CTA над баннером»,
 * а «не дать скроллящемуся контенту заехать под sticky-панель»). Прецедент (archetest,
 * 2026-07-29): чекбокс согласия на интро квиза при полной прокрутке физически попадал
 * под эту же панель — `position: sticky` занимает своё место в потоке, но при скролле
 * «до конца» контент, идущий непосредственно перед панелью, оказывается в её визуально
 * перекрытой зоне (высота панели + `bottom`-отступ от cookie-баннера).
 */
const ACTION_BAR_HEIGHT_VAR = '--letar-sticky-actionbar-height'

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
  const innerRef = useRef<HTMLDivElement>(null)

  // Публикует свою высоту, чтобы контент выше мог зарезервировать под неё отступ и не
  // оказаться в её визуально перекрытой зоне при полной прокрутке (см. JSDoc переменной
  // выше). Тот же паттерн (ResizeObserver + getBoundingClientRect для немедленного значения
  // при монтировании), что уже проверен на CookieBanner.
  useLayoutEffect(() => {
    const root = document.documentElement
    const el = innerRef.current
    if (!el) {
      root.style.setProperty(ACTION_BAR_HEIGHT_VAR, '0px')
      return
    }
    root.style.setProperty(ACTION_BAR_HEIGHT_VAR, `${el.getBoundingClientRect().height}px`)

    const observer = new ResizeObserver(() => {
      root.style.setProperty(ACTION_BAR_HEIGHT_VAR, `${el.getBoundingClientRect().height}px`)
    })
    observer.observe(el)
    return () => {
      observer.disconnect()
      root.style.setProperty(ACTION_BAR_HEIGHT_VAR, '0px')
    }
  }, [])

  return (
    <Box
      ref={mergeRefs(ref, innerRef)}
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
