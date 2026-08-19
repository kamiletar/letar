'use client'

import { Box, Flex, Link, Text, VStack } from '@chakra-ui/react'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { HEADER_HEIGHT, scrollbarStyles } from '@/lib/constants'

interface TocItem {
  id: string
  text: string
  level: number
}

/**
 * Собирает заголовки документа из DOM (один проход querySelectorAll).
 * Вызывается только из useEffect (после коммита), НЕ из ленивого инициализатора useState —
 * так и пробовали: ленивый initializer читает `document` уже в первом клиентском рендере при
 * гидратации, из-за чего сервер (headings=[], nav=null) и клиент (headings=N, nav есть)
 * расходятся — React ловит это как hydration mismatch и на неудачных прогонах откатывается к
 * ПОЛНОМУ пересозданию поддерева `<body>` ("Hydration failed... this tree will be regenerated
 * on the client", см. .claude/docs/nextjs16-turbopack-default-emotion-hydration.md — тот же
 * класс бага, здесь источник другой: этот компонент, не Chakra Global). Клик, попавший в
 * середину такого remount, срабатывает на уже отсоединённом узле и теряется — так ломались
 * apps/pravda-e2e/src/bookmarks.spec.ts (webkit) и cross-refs.spec.ts «Переход по CrossRef
 * ссылке» (chromium+webkit). Гонка `.count()` в toc.spec.ts решена на уровне теста
 * (`toBeVisible()` перед чтением количества ссылок) — там она безопасна, act не провоцирует.
 */
function collectHeadings(): TocItem[] {
  const elements = Array.from(document.querySelectorAll('h2[id], h3[id], [id^="section-"], [id^="chapter-"]'))

  return elements.map((el) => {
    let text: string

    // Для Section/Chapter ищем заголовок внутри
    if (el.id.startsWith('section-') || el.id.startsWith('chapter-')) {
      const heading = el.querySelector('h2, h3')
      text = heading?.textContent || ''

      // Для Chapter добавляем "Глава X" из Badge
      if (el.id.startsWith('chapter-')) {
        const badge = el.querySelector('[class*="badge"]')
        const badgeText = badge?.textContent || ''
        text = badgeText ? `${badgeText}. ${text}` : text
      }
    } else {
      text = el.textContent || ''
    }

    return {
      id: el.id,
      text,
      level: el.tagName === 'H2' || el.id.startsWith('section-') ? 2 : 3,
    }
  })
}

/**
 * Table of Contents - автоматически строится из h2/h3 на странице.
 * Sticky справа на десктопе, скрыт на мобильных.
 * Включает индикатор прогресса чтения и плавные переходы.
 */
export function TableOfContents() {
  const pathname = usePathname()
  // Начальное состояние — [] на сервере И на клиенте (пока не сработает useEffect ниже).
  // См. collectHeadings — почему НЕ ленивый инициализатор.
  const [headings, setHeadings] = useState<TocItem[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [progress, setProgress] = useState<number>(0)
  const rafIdRef = useRef<number | null>(null)
  const tocRef = useRef<HTMLElement>(null)

  // Автоскролл к активному пункту в TOC
  useEffect(() => {
    if (!activeId || !tocRef.current) {
      return
    }

    const activeLink = tocRef.current.querySelector(`[data-toc-id="${activeId}"]`)
    if (activeLink) {
      activeLink.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [activeId])

  // Объединённый эффект: заголовки, scroll handler (прогресс + активный пункт)
  // pathname в зависимостях — перезапуск при клиентской навигации
  useEffect(() => {
    // Сбрасываем состояние при смене страницы
    setActiveId('')
    setProgress(0)

    // 1. Собираем заголовки (один проход по DOM) — та же логика, что и в ленивом инициализаторе
    const elements = Array.from(document.querySelectorAll('h2[id], h3[id], [id^="section-"], [id^="chapter-"]'))
    setHeadings(collectHeadings())

    // 2. Scroll handler с throttle через requestAnimationFrame — прогресс чтения И активный пункт.
    // Раньше активный пункт считал отдельный IntersectionObserver с rootMargin (-80px 0px -80%
    // 0px). Он давал недетерминированный результат: Section оборачивает ВСЕ свои Chapter целиком
    // (это огромный контейнер), поэтому остаётся "intersecting" всю прокрутку внутри раздела —
    // одновременно с текущей вложенной Chapter. IntersectionObserver сообщает entries в
    // произвольном порядке (не порядке DOM), а обработчик брал последний entry с
    // isIntersecting=true — какой из двух одновременно пересекающихся элементов "победит",
    // зависело от порядка callback, а не от реальной позиции скролла. Симптом: `aria-current`
    // ставился на случайный/неверный пункт (напр. вложенную главу вместо раздела, к которому
    // реально проскроллили).
    // Фикс — детерминированный расчёт на основе `getBoundingClientRect().top`: активный пункт —
    // последний (по порядку документа) заголовок, чей верхний край уже пересёк линию триггера
    // (ACTIVE_THRESHOLD, совпадает с HEADER_HEIGHT/SCROLL_MARGIN_TOP). Классический паттерн
    // scroll-spy, устойчив к вложенности/размеру наблюдаемых контейнеров.
    const ACTIVE_THRESHOLD = 80

    const handleScroll = () => {
      // Пропускаем если уже запланировано обновление
      if (rafIdRef.current !== null) {
        return
      }

      rafIdRef.current = requestAnimationFrame(() => {
        const scrollTop = window.scrollY
        const docHeight = document.documentElement.scrollHeight - window.innerHeight
        const scrollProgress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0
        setProgress(Math.min(100, Math.max(0, scrollProgress)))

        let active = ''
        for (const el of elements) {
          if (el.getBoundingClientRect().top <= ACTIVE_THRESHOLD) {
            active = el.id
          }
        }
        setActiveId(active)

        rafIdRef.current = null
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Инициализируем значение

    // Общий cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        // Сбрасываем ref после отмены — иначе после StrictMode double-invoke (или повторного
        // запуска эффекта при смене pathname) handleScroll() новой инстанции эффекта видит
        // "устаревший" ненулевой id отменённого rAF и НАВСЕГДА пропускает планирование нового
        // кадра (ранний return по `rafIdRef.current !== null`). Прогресс-бар застревал на 0%.
        rafIdRef.current = null
      }
    }
  }, [pathname])

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
                      target.scrollIntoView({ behavior: 'smooth' })
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
