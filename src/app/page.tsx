/**
 * Components
 */
import Header from '@/components/Header'
import Hero from '@/components/Hero'
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
      <Experience />
      <ConsultingProject />
      <StudentsProject />
    </main>
  )
}
