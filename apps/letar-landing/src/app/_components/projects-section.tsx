import { ProjectCard } from '@/app/_components/project-card'
import { projectCategories } from '@/lib/projects-data'
import { Box, Container, Flex, SimpleGrid, Text } from '@chakra-ui/react'
import { ChevronDown } from 'lucide-react'

/** Полный каталог с нативно доступными сворачиваемыми категориями */
export function ProjectsSection() {
  return (
    <Box asChild pt={{ base: '12', md: '20' }} pb={{ base: '16', md: '24' }} scrollMarginTop="20">
      <section id="catalog">
        <Container maxW="7xl">
          <Flex
            direction={{ base: 'column', md: 'row' }}
            align={{ base: 'start', md: 'end' }}
            justify="space-between"
            gap={5}
            mb={{ base: 10, md: 14 }}
          >
            <Box>
              <Text className="section-kicker signal-font">INDEX / ALL PROJECTS</Text>
              <Text
                asChild
                fontSize={{ base: '3xl', md: '5xl' }}
                fontWeight="700"
                letterSpacing="-0.04em"
                lineHeight="1.05"
                mt={3}
              >
                <h2>Полный каталог</h2>
              </Text>
            </Box>
            <Text color="fg.muted" maxW="lg" lineHeight="1.7">
              Сайты, приложения, инфраструктура и открытые инструменты. Второстепенные разделы можно свернуть, чтобы
              быстрее найти нужное.
            </Text>
          </Flex>

          <Flex direction="column" gap={4}>
            {projectCategories.map((category) => (
              <CategoryBlock
                key={category.title}
                title={category.title}
                count={category.projects.length}
                defaultCollapsed={category.defaultCollapsed}
              >
                <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={3}>
                  {category.projects.map((project) => <ProjectCard key={project.name} project={project} />)}
                </SimpleGrid>
              </CategoryBlock>
            ))}
          </Flex>
        </Container>
      </section>
    </Box>
  )
}

interface CategoryBlockProps {
  title: string
  count: number
  defaultCollapsed?: boolean
  children: React.ReactNode
}

/** Категория на нативном details/summary с клавиатурной поддержкой */
function CategoryBlock({ title, count, defaultCollapsed, children }: CategoryBlockProps) {
  return (
    <Box borderTopWidth="1px" borderColor="border">
      <details className="category-details" open={!defaultCollapsed || undefined}>
        <Flex
          asChild
          align="center"
          gap={4}
          py={{ base: 5, md: 6 }}
          cursor="pointer"
          userSelect="none"
          borderRadius="lg"
          _focusVisible={{ outline: '2px solid', outlineColor: 'brand.300', outlineOffset: '3px' }}
        >
          <summary>
            <Text asChild fontSize={{ base: 'xl', md: '2xl' }} fontWeight="650" color="fg" flex="1">
              <h3>{title}</h3>
            </Text>
            <Text className="signal-font" color="fg.subtle" fontSize="xs">
              {String(count).padStart(2, '0')}
            </Text>
            <Flex
              className="category-chevron"
              boxSize="9"
              borderRadius="full"
              borderWidth="1px"
              borderColor="border"
              align="center"
              justify="center"
              color="fg.muted"
            >
              <ChevronDown aria-hidden="true" size={17} />
            </Flex>
          </summary>
        </Flex>
        <Box pb={{ base: 8, md: 10 }}>{children}</Box>
      </details>
    </Box>
  )
}
