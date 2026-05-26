import { describe, it, expect } from 'vitest'
import { cn } from '../utils'

describe('cn', () => {
  it('joins multiple class strings', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2')
  })

  it('filters out falsy values', () => {
    expect(cn('base', false && 'hidden', null, undefined, 'visible')).toBe('base visible')
  })

  it('resolves Tailwind class conflicts (last wins)', () => {
    expect(cn('px-4', 'px-6')).toBe('px-6')
  })

  it('handles conditional classes with ternary', () => {
    expect(cn('base', true ? 'active' : 'inactive')).toBe('base active')
    expect(cn('base', false ? 'active' : 'inactive')).toBe('base inactive')
  })

  it('handles empty inputs', () => {
    expect(cn()).toBe('')
  })

  it('handles class-variance-authority style object arguments', () => {
    const result = cn('btn', { 'btn-primary': true, 'btn-secondary': false })
    expect(result).toContain('btn')
    expect(result).toContain('btn-primary')
    expect(result).not.toContain('btn-secondary')
  })

  it('merges Tailwind classes intelligently', () => {
    // padding conflicts
    expect(cn('p-4', 'p-2')).toBe('p-2')
    // margin conflicts
    expect(cn('m-4', 'm-2')).toBe('m-2')
    // color conflicts
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })
})
