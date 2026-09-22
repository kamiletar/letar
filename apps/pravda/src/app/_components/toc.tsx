'use client'

import { Box, Flex, Link, Text, VStack } from '@chakra-ui/react'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

import { HEADER_HEIGHT, scrollbarStyles } from '@/lib/constants'

import { useTocScroll } from './use-toc-scroll'

/**
 * Table of Contents - автоматически строится из h2/h3 на странице.
 * Sticky справа на десктопе, скрыт на мобильных.
 * Включает индикатор прогресса чтения и плавные переходы.
 */
export function TableOfContents() {
  const pathname = usePathname()
  // pathname — resetKey хука: сброс и пересбор заголовков при клиентской навигации.
  // Начальное состояние — [] на сервере И на клиенте (пока не сработает useEffect внутри хука).
  const { headings, activeId, progress } = useTocScroll(pathname)
  const tocRef = useRef<HTMLElement>(null)

  // Автоскролл к активному пункту в TOC.
  // `behavior: 'instant'`, не `'smooth'` — плавная анимация зависит от rAF-тика, а он не идёт,
  // пока у окна нет фокуса (тот же класс проблемы, что и застывающий rAF в фоновой вкладке, см.
  // .claude/docs/raf-vs-timers-background-tab.md): без фокуса `scrollIntoView({behavior:'smooth'})`
  // не сдвигает скролл НИКОГДА, даже за много секунд, а не просто медленнее. Playwright-браузеры
  // в CI регулярно без реального фокуса окна — ловило `toc.spec.ts` (автоскролл TOC к активному
  // пункту, клик по пункту TOC) стабильно в chromium/firefox.
  useEffect(() => {
    if (!activeId || !tocRef.current) {
      return
    }

    const activeLink = tocRef.current.querySelector(`[data-toc-id="${activeId}"]`)
    if (activeLink) {
      activeLink.scrollIntoView({ behavior: 'instant', block: 'nearest' })
    }
  }, [activeId])

  // ⚠️ НЕ `return null`, пока headings.length === 0. Раньше компонент до первого эффекта не
  // рендерил вообще ничего — колонка `.toc` (родитель в (docs)/layout.tsx) не резервировала
  // ширину, а как только заголовки собирались, здесь появлялся `<nav w="220px">` и вся страница
  // сдвигалась (main content column сужался). Этот сдвиг ловил Playwright на webkit ровно в
  // окне между mousedown и mouseup клика по кнопке закладки в статье: курсор оставался на старых
  // координатах, элемент под ним уже съехал — WebKit тихо отменял событие click (pointerdown и
  // mousedown долетали, click — нет). Chromium/Firefox такие сдвиги "прощают". Теперь `<nav>`
  // рендерится сразу с фиксированной шириной (пустой при headings.length === 0), контент
  // сдвига по ширине больше не создаёт — сдвигается только его начинка.
  return (
    <Box
      ref={tocRef}
      as="nav"
      aria-label="Содержание документа"
      w="220px"
      h={`calc(100vh - ${HEADER_HEIGHT})`}
      position="sticky"
      top={HEADER_HEIGHT}
      overflowY="auto"
      py={4}
      px={3}
      borderLeftWidth="1px"
      borderLeftColor="border"
      display={{ base: 'none', xl: 'block' }}
      css={scrollbarStyles}
    >
      {/* Заголовок с индикатором прогресса */}
      <Box mb={4}>
        <Flex align="center" justify="space-between" mb={2}>
          <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wide" color="fg.muted">
            Содержание
          </Text>
          {/* Процент прочитанного */}
          <Text fontSize="xs" fontWeight="semibold" color="brand.500">
            {Math.round(progress)}%
          </Text>
        </Flex>

        {/* Прогресс-бар чтения */}
        <Box
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Прогресс чтения"
          h="2px"
          bg="bg.subtle"
          borderRadius="full"
          overflow="hidden"
        >
          <Box
            h="full"
            bg="brand.500"
            borderRadius="full"
            transition="width 0.15s ease-out"
            style={{ width: `${progress}%` }}
          />
        </Box>
      </Box>

      {/* Список заголовков с вертикальной линией-индикатором */}
      <Box position="relative">
        {/* Вертикальная линия */}
        <Box position="absolute" left="0" top="0" bottom="0" w="2px" bg="border" borderRadius="full" />

        <VStack align="stretch" gap={0.5} pl={3}>
          {headings.map((heading) => {
            const isActive = activeId === heading.id

            return (
              <Box key={heading.id} position="relative">
                {/* Индикатор активного элемента с glow эффектом */}
                <Box
                  position="absolute"
                  left="-12px"
                  top="50%"
                  transform="translateY(-50%)"
                  w="2px"
                  h={isActive ? '16px' : '0px'}
                  bg="brand.500"
                  borderRadius="full"
                  transitionProperty="height, box-shadow"
                  transitionDuration="0.2s"
                  transitionTimingFunction="ease"
                  boxShadow={isActive ? '0 0 8px var(--chakra-colors-brand-500)' : 'none'}
                />

                <Link
                  href={`#${heading.id}`}
                  data-toc-id={heading.id}
                  aria-current={isActive ? 'location' : undefined}
                  display="block"
                  py={1.5}
                  px={2}
                  pl={heading.level === 3 ? 4 : 2}
                  fontSize="xs"
                  color={isActive ? 'brand.600' : 'fg.muted'}
                  fontWeight={isActive ? 'semibold' : 'normal'}
                  borderRadius="sm"
                  transitionProperty="color, background-color"
                  transitionDuration="0.2s"
                  transitionTimingFunction="ease"
                  _hover={{
                    color: 'brand.600',
                    textDecoration: 'none',
                    bg: 'bg.subtle',
                  }}
                  _focus={{
                    outline: 'none',
                    boxShadow: 'outline',
                  }}
                  _dark={{ color: isActive ? 'brand.400' : 'fg.muted' }}
                  onClick={(e) => {
                    e.preventDefault()
                    const target = document.getElementById(heading.id)
                    if (target) {
                      // 'instant', не 'smooth' — см. комментарий у автоскролла TOC выше
                      target.scrollIntoView({ behavior: 'instant' })
                      // Обновляем URL без перезагрузки
                      window.history.pushState(null, '', `#${heading.id}`)
                    }
                  }}
                >
                  {heading.text}
                </Link>
              </Box>
            )
          })}
        </VStack>
      </Box>
    </Box>
  )
}
