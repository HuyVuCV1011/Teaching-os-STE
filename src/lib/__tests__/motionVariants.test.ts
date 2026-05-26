import { describe, it, expect } from 'vitest'
import {
  fadeIn,
  fadeInUp,
  fadeInRight,
  fadeInLeft,
  fadeInScale,
  staggerContainer,
} from '../motionVariants'

describe('motionVariants', () => {
  describe('fadeIn', () => {
    it('starts with opacity 0', () => {
      expect(fadeIn.start).toEqual({ opacity: 0 })
    })
    it('ends with opacity 1 and default duration', () => {
      expect(fadeIn.end).toEqual({ opacity: 1, transition: { duration: 0.7 } })
    })
  })

  describe('fadeInUp', () => {
    it('starts with y:30 and opacity 0', () => {
      expect(fadeInUp.start).toEqual({ y: 30, opacity: 0 })
    })
    it('ends at y:0 and opacity 1', () => {
      expect(fadeInUp.end).toMatchObject({ y: 0, opacity: 1 })
    })
  })

  describe('fadeInRight', () => {
    it('starts with x:-30 and opacity 0', () => {
      expect(fadeInRight.start).toEqual({ x: -30, opacity: 0 })
    })
    it('ends at x:0 and opacity 1', () => {
      expect(fadeInRight.end).toMatchObject({ x: 0, opacity: 1 })
    })
  })

  describe('fadeInLeft', () => {
    it('starts with x:30 and opacity 0', () => {
      expect(fadeInLeft.start).toEqual({ x: 30, opacity: 0 })
    })
    it('ends at x:0 and opacity 1', () => {
      expect(fadeInLeft.end).toMatchObject({ x: 0, opacity: 1 })
    })
  })

  describe('fadeInScale', () => {
    it('starts with scale:0.8 and opacity 0', () => {
      expect(fadeInScale.start).toEqual({ scale: 0.8, opacity: 0 })
    })
    it('ends at scale:1 and opacity 1', () => {
      expect(fadeInScale.end).toMatchObject({ scale: 1, opacity: 1 })
    })
  })

  describe('staggerContainer', () => {
    it('has empty start state', () => {
      expect(staggerContainer.start).toEqual({})
    })
    it('has staggerChildren in end transition', () => {
      expect(staggerContainer.end).toEqual({
        transition: { staggerChildren: 0.1 },
      })
    })
  })

  describe('all variants have correct structure', () => {
    const variants = [fadeIn, fadeInUp, fadeInRight, fadeInLeft, fadeInScale, staggerContainer]
    const variantNames = ['fadeIn', 'fadeInUp', 'fadeInRight', 'fadeInLeft', 'fadeInScale', 'staggerContainer']

    variants.forEach((variant, index) => {
      it(`${variantNames[index]} has start and end states`, () => {
        expect(variant).toHaveProperty('start')
        expect(variant).toHaveProperty('end')
      })
    })
  })
})
