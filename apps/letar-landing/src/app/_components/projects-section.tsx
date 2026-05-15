'use client'

import { ProjectCard } from '@/app/_components/project-card'
import { projectCategories } from '@/lib/projects-data'
import { Box, Container, Flex, SimpleGrid, Text } from '@chakra-ui/react'
import { useState } from 'react'

/** Секция проектов по категориям с возможностью свернуть */
export function ProjectsSection() {
  return (
    <Box as="section" pb={{ base: '16', md: '24' }}>
      <Container maxW="5xl">
        <Flex direction="column" gap={{ base: 12, md: 16 }}>
          {projectCategories.map((category) => (
            <CategoryBlock key={category.title} title={category.title} defaultCollapsed={category.defaultCollapsed}>
              <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={4}>
                {category.projects.map((project) => (
                  <ProjectCard key={project.name} project={project} />
                ))}
              </SimpleGrid>
            </CategoryBlock>
          ))}
        </Flex>
      </Container>
    </Box>
  )
}

interface CategoryBlockProps {
  title: string
  defaultCollapsed?: boolean
  children: React.ReactNode
}

/** Блок категории с заголовком и toggle для свёрнутых секций */
function CategoryBlock({ title, defaultCollapsed, children }: CategoryBlockProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed ?? false)

  return (
    <Box>
      <Flex
        align="center"
        gap={3}
        mb={collapsed ? 0 : 6}
        cursor={defaultCollapsed ? 'pointer' : 'default'}
        onClick={defaultCollapsed ? () => setCollapsed((v) => !v) : undefined}
        userSelect="none"
      >
        <Text as="h2" fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" color="fg">
          {title}
        </Text>
        {defaultCollapsed && (
          <Text
            color="fg.subtle"
            fontSize="sm"
            transition="transform 0.2s"
            transform={collapsed ? 'rotate(0deg)' : 'rotate(90deg)'}
          >
            ▶
          </Text>
        )}
      </Flex>
      {!collapsed && children}
    </Box>
  )
}
