import { FeaturedProjectsSection } from '@/app/_components/featured-projects-section'
import { Footer } from '@/app/_components/footer'
import { HeroSection } from '@/app/_components/hero-section'
import { ProjectsSection } from '@/app/_components/projects-section'
import { SiteHeader } from '@/app/_components/site-header'
import { featuredProjects } from '@/lib/projects-data'

export default function HomePage() {
  return (
    <>
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
