'use client'
/**
 * Node modules
 */
import { useRef } from 'react'
import {
  motion,
  Variants,
  useScroll,
  useSpring,
  useTransform,
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
      ease: 'easeOut',
    },
  },
}

const Hero = () => {
  const heroBannerRef = useRef<HTMLDivElement>(null)

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
    <section className="section py-10 md:py-16 mt-28">
      <motion.div
        variants={heroVariant}
        initial="start"
        animate="end"
        className="container grid gap-14 md:grid-cols-2 md:items-center justify-center"
      >
        <div className="w-80 md:w-96 lg:w-auto">
          <motion.p
            variants={heroChildVariant}
            initial="start"
            animate="end"
            className="text-xs md:text-sm uppercase tracking-wider bg-secondary/50 text-secondary-foreground max-w-max px-3 py-1 rounded-full border-t border-blue-500/10 backdrop-blur-3xl mb-6 md:mb-10"
          >
            Chuyển hóa dữ liệu thành giải pháp tối ưu
          </motion.p>
          <motion.h2
            variants={heroChildVariant}
            className="text-4xl font-semibold !leading-tight mb-4 md:mb-5 lg:text-5xl xl:text-7xl"
          >
            Xin chào, <br />
            Tôi là
            <span className="relative isolate ms-4">
              Trần Huy Vũ
              <span className="absolute -z-10 top-2 -left-6 -right-4 bottom-0.5 bg-foreground/5 rounded-full px-8 ms-3 border-t border-foreground/20 shadow-[inset_0px_0px_30px_0px] shadow-foreground/20 md:top-3 md:bottom-1 lg:top-4 lg:bottom-2"></span>
            </span>
            .
          </motion.h2>
          <motion.p
            variants={heroChildVariant}
            className="text-muted-foreground md:text-xl"
          >
            Cố vấn dữ liệu và tối ưu hệ thống
          </motion.p>
          {/* <motion.div
            variants={heroChildVariant}
            className="flex gap-2 mt-6 md:mt-10"
          >
            <Button variant="outline" size="lg">
              Register
            </Button>
            <Button size="lg">Free Trial</Button>
          </motion.div> */}
        </div>
        <div className="max-w-screen-xl mx-auto">
          <motion.figure
            className=""
            initial={{
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
              ease: 'backInOut',
            }}
            ref={heroBannerRef}
            style={{
              scale,
            }}
          >
            <div className="relative w-[90%] lg:w-96 mx-auto">
              <img
                src="/images/programming.png"
                alt=""
                className="absolute top-[25%] left-[10%] transform -translate-x-1/2 -translate-y-1/2 w-[25%]"
              />
              <img
                src="/images/database.png"
                alt=""
                className="absolute bottom-[5%] right-[10%] transform translate-x-1/2 translate-y-1/2 w-[25%]"
              />
              <img
                src="/images/hero.jpg"
                alt=""
                className="rounded-lg shadow-lg w-[80%] mx-auto"
              />
            </div>
          </motion.figure>
        </div>
      </motion.div>
    </section>
  )
}

export default Hero
