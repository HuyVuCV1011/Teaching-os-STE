'use client'
/**
 * Node modules
 */
import { useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  motion,
  Variants,
  useScroll,
  useSpring,
  useTransform,
  useReducedMotion,
} from 'motion/react'

const heroVariant: Variants = {
  start: {},
  end: {
    transition: {
      staggerChildren: 0.4,
    },
  },
}
const heroChildVariant: Variants = {
  start: {
    opacity: 0,
    y: 30,
    filter: 'blur(5px)',
  },
  end: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

const Hero = () => {
  const heroBannerRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: heroBannerRef,
    offset: ['start 1080px', '50% start'],
  })

  const scrollYTransform = useTransform(scrollYProgress, [0, 1], [0.85, 1.15])

  const scale = useSpring(scrollYTransform, {
    stiffness: 300,
    damping: 30,
    restDelta: 0.001,
  })

  return (
    <section id="about" className="section mt-24 py-12 md:mt-28 md:py-20">
      <motion.div
        variants={heroVariant}
        initial={reduceMotion ? false : 'start'}
        animate="end"
        className="container grid gap-12 md:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] md:items-center"
      >
        <div className="max-w-3xl">
          <motion.p
            variants={heroChildVariant}
            initial={reduceMotion ? false : 'start'}
            animate="end"
            className="mb-6 max-w-max rounded-full border border-blue-500/10 bg-secondary/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-secondary-foreground md:mb-8 md:text-sm"
          >
            Teaching OS · Data advisory · Portfolio
          </motion.p>
          <motion.h1
            variants={heroChildVariant}
            className="mb-5 text-balance text-5xl font-extrabold !leading-[1.02] text-slate-100 md:text-7xl xl:text-8xl"
          >
            Trần Huy Vũ
          </motion.h1>
          <motion.p
            variants={heroChildVariant}
            className="max-w-[62ch] text-pretty text-base leading-7 text-muted-foreground md:text-xl md:leading-8"
          >
            Cố vấn dữ liệu và giảng viên thực chiến, xây dựng Teaching OS để
            biến lớp học BI, Python, SQL thành một hệ vận hành có thể đo lường.
          </motion.p>
          <motion.div
            variants={heroChildVariant}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link
              href="/projects"
              className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors duration-300 ease-premium hover:bg-blue-550 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-[0.98]"
            >
              Xem dự án
            </Link>
            <Link
              href="/learn"
              className="rounded-full border border-slate-800 bg-slate-950 px-5 py-3 text-sm font-semibold text-slate-100 transition-colors duration-300 ease-premium hover:border-slate-600 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-[0.98]"
            >
              Vào lớp học
            </Link>
          </motion.div>
        </div>
        <div className="max-w-screen-xl mx-auto">
          <motion.figure
            initial={reduceMotion ? false : {
              y: 120,
              opacity: 0,
              filter: 'blur(5px)',
            }}
            animate={{
              y: 0,
              opacity: 1,
              filter: 'blur(0px)',
            }}
            transition={{
              duration: 1.5,
              delay: 0.5,
              ease: [0.32, 0.72, 0, 1],
            }}
            ref={heroBannerRef}
            className="relative"
            style={{ scale: reduceMotion ? 1 : scale }}
          >
            <div className="relative mx-auto aspect-[4/5] w-full max-w-[360px] rounded-[2rem] bg-slate-900 p-2 shadow-[0_24px_90px_rgba(37,99,235,0.12)] ring-1 ring-slate-800/70 md:max-w-[420px]">
              <Image
                src="/images/programming.png"
                alt=""
                width={180}
                height={180}
                aria-hidden="true"
                className="absolute left-[4%] top-[22%] z-10 w-[25%] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white/80 p-2 shadow-sm"
              />
              <Image
                src="/images/database.png"
                alt=""
                width={180}
                height={180}
                aria-hidden="true"
                className="absolute bottom-[8%] right-[6%] z-10 w-[25%] translate-x-1/2 translate-y-1/2 rounded-2xl bg-white/80 p-2 shadow-sm"
              />
              <Image
                src="/images/hero.jpg"
                alt="Trần Huy Vũ trong không gian làm việc dữ liệu và giảng dạy"
                width={720}
                height={900}
                priority
                sizes="(max-width: 768px) 80vw, 420px"
                className="h-full w-full rounded-[calc(2rem-0.5rem)] object-cover shadow-sm"
              />
            </div>
          </motion.figure>
        </div>
      </motion.div>
    </section>
  )
}

export default Hero
