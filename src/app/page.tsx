/**
 * Components
 */
import Header from '@/components/Header'
import { Suspense } from 'react'
import Hero from '@/components/Hero'
import MetricsStack from '@/components/MetricsStack'
import SystemArchitecture from '@/components/SystemArchitecture'
import BeforeAfterShowcase from '@/components/BeforeAfterShowcase'
import StudentsProjectSection from '@/components/StudentsProjectSection'
import ConsultingProjectSection from '@/components/ConsultingProjectSection'
import Experience from '@/components/Experience'

/**
 * Constants
 */

export default function Home() {
  return (
    <main id="main-content" tabIndex={-1} className="focus:outline-none">
      <Header />
      <Hero />
      <MetricsStack />
      <SystemArchitecture />
      <BeforeAfterShowcase />
      <Experience />
      <div id="projects">
        <Suspense
          fallback={
            <section className="section py-20">
              <div className="container" aria-live="polite">
                <div className="h-8 w-72 animate-pulse rounded-lg bg-slate-900" />
                <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
                  {[0, 1, 2, 3].map((item) => (
                    <div key={item} className="h-[420px] animate-pulse rounded-2xl bg-slate-900" />
                  ))}
                </div>
              </div>
            </section>
          }
        >
          <ConsultingProjectSection />
        </Suspense>
        <Suspense
          fallback={
            <section className="section border-t border-slate-700 bg-slate-955/20 py-20">
              <div className="container mx-auto px-4" aria-live="polite">
                <div className="mx-auto h-8 w-72 animate-pulse rounded-lg bg-slate-900" />
                <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2">
                  {[0, 1, 2, 3].map((item) => (
                    <div key={item} className="h-[420px] animate-pulse rounded-2xl bg-slate-900" />
                  ))}
                </div>
              </div>
            </section>
          }
        >
          <StudentsProjectSection />
        </Suspense>
      </div>
    </main>
  )
}
