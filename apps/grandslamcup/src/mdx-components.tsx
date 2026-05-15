import { Code, Heading, Link, Text } from '@chakra-ui/react'
import type { MDXComponents } from 'mdx/types'

/**
 * MDX компоненты для Grand Slam Cup
 *
 * Маппинг HTML элементов на Chakra UI компоненты
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: (props) => <Heading as="h1" size="3xl" mt={8} mb={4} {...props} />,
    h2: (props) => <Heading as="h2" size="2xl" mt={6} mb={3} {...props} />,
    h3: (props) => <Heading as="h3" size="xl" mt={4} mb={2} {...props} />,
    h4: (props) => <Heading as="h4" size="lg" mt={3} mb={2} {...props} />,
    p: (props) => <Text mb={4} lineHeight="tall" {...props} />,
    a: (props) => <Link color="brand.fg" textDecoration="underline" {...props} />,
    code: (props) => <Code fontSize="sm" {...props} />,
    ...components,
  }
}
