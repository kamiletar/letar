import { FeaturedProjectsSection } from '@/app/_components/featured-projects-section'
import { Footer } from '@/app/_components/footer'
import { HeroSection } from '@/app/_components/hero-section'
import { ProjectsSection } from '@/app/_components/projects-section'
import { SiteHeader } from '@/app/_components/site-header'
import { featuredProjects, projectCategories, projectCount } from '@/lib/projects-data'

const projectListJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Каталог проектов Letar',
  description: 'Сайты, приложения, инфраструктура и open source-проекты экосистемы Letar',
  numberOfItems: projectCount,
  itemListOrder: 'https://schema.org/ItemListOrderAscending',
  itemListElement: projectCategories
    .flatMap((category) => category.projects)
    .map((project, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'CreativeWork',
        name: project.name,
        description: project.description,
        ...(project.url ? { url: project.url } : {}),
      },
    })),
}

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json">{JSON.stringify(projectListJsonLd)}</script>
      <SiteHeader />
      <main>
        <HeroSection />
        <FeaturedProjectsSection projects={featuredProjects} />
        <ProjectsSection />
      </main>
      <Footer />
    </>
  )
}
