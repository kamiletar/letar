'use client'

import { Box, Grid, Text } from '@chakra-ui/react'
import { useImageRotation } from '../_hooks'
import { useTransition } from './transition-context'

// ============================================
// CENTERED PETAL — Кнопка вокруг центра
// ============================================

interface CenteredPetalProps {
  href: string
  children: React.ReactNode
  color: string
  position: 'top' | 'bottom' | 'left' | 'right'
}

/**
 * Кнопка-лепесток, позиционированная вокруг центра экрана
 * На мобильных — ближе к краям, на десктопе — вокруг центральной мандалы
 * При клике запускает анимацию перехода в направлении кнопки
 */
function CenteredPetal({ href, children, color, position }: CenteredPetalProps) {
  const { navigateWithTransition } = useTransition()

  // Скругление в зависимости от позиции (лепесток раскрывается от центра)
  const radiusMap = {
    top: { base: '16px 16px 6px 6px', md: '28px 28px 10px 10px', lg: '36px 36px 12px 12px' },
    bottom: { base: '6px 6px 16px 16px', md: '10px 10px 28px 28px', lg: '12px 12px 36px 36px' },
    left: { base: '16px 6px 6px 16px', md: '28px 10px 10px 28px', lg: '36px 12px 12px 36px' },
    right: { base: '6px 16px 16px 6px', md: '10px 28px 28px 10px', lg: '12px 36px 36px 12px' },
  }

  // Градиент направлен от центра
  const gradientMap = {
    top: '180deg',
    bottom: '0deg',
    left: '90deg',
    right: '270deg',
  }

  const handleClick = () => {
    navigateWithTransition(href, position)
  }

  // Центральная мандала занимает колонки 4-10 из 12 (50% ширины, от 25% до 75%)
  // Кнопки позиционируются относительно краёв мандалы
  return (
    <Box
      as="button"
      position="absolute"
      zIndex={9999}
      onClick={handleClick}
      cursor="pointer"
      {
        // Позиционирование: на mobile — по краям, на desktop — вокруг центральной мандалы
        ...(position === 'top' && {
          top: { base: '12%', md: '18%' },
          left: '50%',
          transform: 'translateX(-50%)',
        })
      }
      {...(position === 'bottom' && {
        bottom: { base: 'calc(18% + 20px)', md: '18%' },
        left: '50%',
        transform: 'translateX(-50%)',
      })}
      {...(position === 'left' && {
        top: '50%',
        left: { base: '8px', md: '20%' },
        transform: { base: 'translateY(-50%)', md: 'translate(-50%, -50%)' },
      })}
      {...(position === 'right' && {
        top: '50%',
        right: { base: '8px', md: '20%' },
        transform: { base: 'translateY(-50%)', md: 'translate(50%, -50%)' },
      })}
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={{ base: 5, sm: 5, md: 6, lg: 8, xl: 10 }}
      py={{ base: 3, sm: 3, md: 3, lg: 4, xl: 5 }}
      minH={{ base: '44px', md: 'auto' }}
      borderRadius={radiusMap[position]}
      bg={`linear-gradient(${gradientMap[position]}, rgba(17,17,17,0.95) 0%, rgba(17,17,17,0.9) 100%)`}
      border={`2px solid ${color}99`}
      boxShadow={`0 0 30px ${color}40, inset 0 0 25px ${color}1a`}
      backdropFilter="blur(12px) saturate(150%)"
      backgroundSize="200% auto"
      css={{
        animation: 'shimmer 8s linear infinite, breathe 6s ease-in-out infinite',
        '@keyframes shimmer': {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        '@keyframes breathe': {
          '0%, 100%': { opacity: 0.85 },
          '50%': { opacity: 1 },
        },
      }}
      transition="background 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease"
      _hover={{
        bg: `linear-gradient(${gradientMap[position]}, rgba(30,30,30,1) 0%, rgba(25,25,25,1) 100%)`,
        boxShadow: `0 0 50px ${color}66, inset 0 0 35px ${color}26`,
        borderColor: color,
        borderWidth: '2px',
      }}
      _focusVisible={{
        outline: 'none',
        boxShadow: `0 0 0 2px ${color}80, 0 0 40px ${color}4d`,
      }}
      _active={{ opacity: 0.8 }}
    >
      <Text
        color={color}
        fontWeight="medium"
        fontSize={{ base: 'sm', sm: 'sm', md: 'sm', lg: 'md', xl: 'lg' }}
        textTransform="uppercase"
        letterSpacing={{ base: 'normal', md: 'wide', lg: 'wider' }}
        textShadow={`0 0 20px ${color}, 0 0 40px ${color}80`}
        whiteSpace="nowrap"
      >
        {children}
      </Text>
    </Box>
  )
}

// ============================================
// NAVIGATION PETALS — Лепестки вокруг мандалы
// ============================================

/**
 * 4 кнопки-лепестка вокруг центра экрана (вокруг мандалы)
 */
function NavigationPetals() {
  return (
    <>
      <CenteredPetal href="/mandalas" color="#ceffd2" position="top">
        Галерея
      </CenteredPetal>
      <CenteredPetal href="/about-elfafeya" color="#ebafff" position="bottom">
        Об Авторе
      </CenteredPetal>
      <CenteredPetal href="/about-mandalas" color="#98e0ff" position="left">
        О Мандалах
      </CenteredPetal>
      <CenteredPetal href="/contacts" color="#ffded8" position="right">
        Контакты
      </CenteredPetal>
    </>
  )
}

// ============================================
// HOME GRID
// ============================================

interface HomeGridProps {
  images: string[]
  rotationInterval?: number // в миллисекундах
}

// Количество обычных ячеек в сетке (без больших)
const REGULAR_CELLS = 54

// Большие ячейки с custom grid positioning
const BIG_CELLS = [
  // Левая колонка - 3 ячейки 2x4
  {
    gridColumn: '2 / span 2',
    gridRow: '1 / span 4',
    portrait: { gridColumn: '2 / span 4', gridRow: '1 / span 3' },
  },
  {
    gridColumn: '2 / span 2',
    gridRow: '5 / span 4',
    portrait: { gridColumn: '8 / span 4', gridRow: '1 / span 3' },
  },
  {
    gridColumn: '2 / span 2',
    gridRow: '9 / span 4',
    portrait: { gridColumn: '2 / span 4', gridRow: '10 / span 3' },
  },
  // Правая колонка - 3 ячейки 2x4
  {
    gridColumn: '10 / span 2',
    gridRow: '1 / span 4',
    portrait: { gridColumn: '8 / span 4', gridRow: '10 / span 3' },
  },
  {
    gridColumn: '10 / span 2',
    gridRow: '5 / span 4',
    portrait: { gridColumn: 'auto', gridRow: 'auto' },
  },
  {
    gridColumn: '10 / span 2',
    gridRow: '9 / span 4',
    portrait: { gridColumn: 'auto', gridRow: 'auto' },
  },
  // Центральная большая мандала 6x12
  {
    gridColumn: '4 / span 6',
    gridRow: '1 / span 12',
    portrait: { gridColumn: '2 / span 10', gridRow: '4 / span 6' },
  },
]

export function HomeGrid({ images, rotationInterval = 10800 }: HomeGridProps) {
  const currentImage = useImageRotation(images, rotationInterval)

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      width="100vw"
      height="100dvh" // dvh учитывает мобильную клавиатуру и адресную строку
      overflow="hidden"
      bg="#111"
    >
      {/* Сетка с мандалой */}
      <Grid
        templateRows="repeat(12, 1fr)"
        templateColumns="repeat(12, 1fr)"
        height="100dvh"
        width="100vw"
        alignItems="center"
        justifyContent="center"
        alignContent="center"
      >
        {/* Обычные ячейки */}
        {Array.from({ length: REGULAR_CELLS }).map((_, i) => (
          <Box
            key={`regular-${i}`}
            as="section"
            position="relative"
            width="100%"
            height="100%"
            zIndex={1}
            backgroundImage={currentImage ? `url(${currentImage})` : undefined}
            backgroundSize="contain"
            backgroundPosition="center"
            backgroundRepeat="no-repeat"
            transition={`background ${2000 + i * 108}ms linear`}
            transitionDelay={`${i * 10}ms`}
          />
        ))}

        {/* Большие ячейки с custom positioning */}
        {BIG_CELLS.map((cell, i) => (
          <Box
            key={`big-${i}`}
            as="section"
            position="relative"
            width="100%"
            height="100%"
            zIndex={1}
            gridColumn={{ base: cell.portrait.gridColumn, md: cell.gridColumn }}
            gridRow={{ base: cell.portrait.gridRow, md: cell.gridRow }}
            backgroundImage={currentImage ? `url(${currentImage})` : undefined}
            backgroundSize="contain"
            backgroundPosition="center"
            backgroundRepeat="no-repeat"
            transition={`background ${2000 + (REGULAR_CELLS + i) * 108}ms linear`}
            transitionDelay={`${(REGULAR_CELLS + i) * 10}ms`}
          />
        ))}
      </Grid>

      {/* Лепестки вокруг мандалы */}
      <NavigationPetals />
    </Box>
  )
}
