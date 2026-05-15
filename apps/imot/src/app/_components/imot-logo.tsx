import { Box, type BoxProps } from '@chakra-ui/react'

interface ImotLogoProps extends BoxProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  animated?: boolean
}

/**
 * Логотип IMOT с анимациями
 * Использует цветовую схему методики (фиолетовый градиент #667eea)
 *
 * @example
 * <ImotLogo size="lg" animated />
 */
export function ImotLogo({ size = 'md', animated = true, ...props }: ImotLogoProps) {
  const sizes = {
    sm: { width: '120px', height: '40px', fontSize: '20px' },
    md: { width: '180px', height: '60px', fontSize: '28px' },
    lg: { width: '240px', height: '80px', fontSize: '36px' },
    xl: { width: '300px', height: '100px', fontSize: '44px' },
  }

  const { width, height, fontSize } = sizes[size]

  return (
    <Box
      width={width}
      height={height}
      display="flex"
      alignItems="center"
      justifyContent="center"
      position="relative"
      {...props}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 300 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          animation: animated ? 'fadeIn 0.8s ease-in-out' : undefined,
        }}
      >
        <defs>
          {/* Градиент для логотипа */}
          <linearGradient id="imot-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#667eea" />
            <stop offset="50%" stopColor="#764ba2" />
            <stop offset="100%" stopColor="#667eea" />
          </linearGradient>

          {/* Анимация градиента */}
          {animated && (
            <animate
              xlinkHref="#imot-gradient"
              attributeName="x1"
              values="0%;100%;0%"
              dur="3s"
              repeatCount="indefinite"
            />
          )}
        </defs>

        {/* Текст ИМОТ */}
        <text
          x="150"
          y="60"
          fontSize={fontSize}
          fontWeight="bold"
          textAnchor="middle"
          fill="url(#imot-gradient)"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="2"
        >
          ИМОТ
        </text>

        {/* Подзаголовок */}
        <text
          x="150"
          y="85"
          fontSize="10"
          textAnchor="middle"
          fill="#667eea"
          opacity="0.8"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="1"
        >
          Интегративная Матрица Осознанной Трансформации
        </text>

        {/* Декоративные элементы */}
        <circle cx="30" cy="50" r="3" fill="#667eea" opacity="0.6">
          {animated && <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />}
        </circle>
        <circle cx="270" cy="50" r="3" fill="#764ba2" opacity="0.6">
          {animated && (
            <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" begin="0.5s" repeatCount="indefinite" />
          )}
        </circle>
      </svg>
    </Box>
  )
}
