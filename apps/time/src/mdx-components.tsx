import { Box, Code, Heading, Link, Separator, Text } from '@chakra-ui/react'
import type { MDXComponents } from 'mdx/types'
import type { ComponentPropsWithoutRef } from 'react'

/**
 * Стилизованный pre элемент для блоков кода.
 */
function Pre({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <Box as="pre" p={4} bg="bg.muted" borderRadius="lg" overflowX="auto" mb={4} className={className}>
      {children}
    </Box>
  )
}

/**
 * Глобальные компоненты для MDX файлов.
 * Переопределяет стандартные HTML элементы на Chakra UI.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // Заголовки
    h1: (props: ComponentPropsWithoutRef<'h1'>) => <Heading as="h1" size="2xl" mt={8} mb={4} {...props} />,
    h2: (props: ComponentPropsWithoutRef<'h2'>) => <Heading as="h2" size="xl" mt={6} mb={3} {...props} />,
    h3: (props: ComponentPropsWithoutRef<'h3'>) => <Heading as="h3" size="lg" mt={4} mb={2} {...props} />,
    h4: (props: ComponentPropsWithoutRef<'h4'>) => <Heading as="h4" size="md" mt={3} mb={2} {...props} />,

    // Текст
    p: (props: ComponentPropsWithoutRef<'p'>) => <Text mb={4} {...props} />,

    // Ссылки
    a: (props: ComponentPropsWithoutRef<'a'>) => (
      <Link color="brand.600" _dark={{ color: 'brand.400' }} _hover={{ textDecoration: 'underline' }} {...props} />
    ),

    // Код
    code: (props: ComponentPropsWithoutRef<'code'>) => (
      <Code colorPalette="gray" px={1} py={0.5} borderRadius="md" {...props} />
    ),
    pre: (props: ComponentPropsWithoutRef<'pre'>) => <Pre {...props} />,

    // Разделитель
    hr: () => <Separator my={8} />,

    ...components,
  }
}
