/**
 * Components
 */
import Header from '@/components/Header'
import Hero from '@/components/Hero'
import MetricsStack from '@/components/MetricsStack'
import SystemArchitecture from '@/components/SystemArchitecture'
import BeforeAfterShowcase from '@/components/BeforeAfterShowcase'
import StudentsProject from '@/components/StudentsProject'
import ConsultingProject from '@/components/ConsultingProject'
import Experience from '@/components/Experience'

/**
 * Constants
 */

export default function Home() {
  return (
    <main>
      <Header />
      <Hero />
      <MetricsStack />
      <SystemArchitecture />
      <BeforeAfterShowcase />
      <Experience />
      <div id="projects">
        <ConsultingProject />
        <StudentsProject />
      </div>
    </main>
  )
}
