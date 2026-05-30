'use client'
import React from 'react'

import { workExperience } from '@/data'
import { Button } from '@/components/ui/MovingBorders'

const Experience = () => {
  return (
    <section className="section" id="experience">
      <div className="container">
        <div className="section-head">
          <h2 className="section-title">Kinh nghiệm.</h2>
          {/* <p className="section-subtitle"></p> */}
        </div>

        <div className="w-full grid lg:grid-cols-4 grid-cols-1 gap-10">
          {workExperience.map((card, idx) => (
            <Button
              key={card.id}
              // use index-based staggered duration to prevent hydration mismatch
              duration={10000 + idx * 2000}
              // remove bg-white dark:bg-slate-900
              className="flex-1 border-neutral-200"
            >
              <div className="flex lg:flex-row flex-col lg:items-center p-3 py-6 md:p-5 lg:p-10 gap-2">
                <img
                  src={card.thumbnail}
                  alt={card.thumbnail}
                  className="lg:w-32 md:w-20 w-16"
                />
                <div className="lg:ms-5">
                  <h1 className="text-start text-xl font-semibold">
                    {card.title}
                  </h1>
                  <p className="text-start text-muted-foreground mt-3">
                    {card.desc}
                  </p>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Experience
