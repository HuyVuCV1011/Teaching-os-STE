import { describe, it, expect } from 'vitest'
import { navItems, projects, workExperience, socialMedia } from '../index'
import { Github, Twitter, Linkedin } from 'lucide-react'

describe('navItems', () => {
  it('contains exactly 5 navigation items', () => {
    expect(navItems).toHaveLength(5)
  })

  it('includes About, Projects, Contact, Classroom, and Admin Hub', () => {
    const names = navItems.map((n) => n.name)
    expect(names).toContain('Về tôi')
    expect(names).toContain('Dự án')
    expect(names).toContain('Liên hệ')
    expect(names).toContain('Classroom')
    expect(names).toContain('Admin Hub')
  })

  it('all items have name and link', () => {
    for (const item of navItems) {
      expect(item.name).toBeTruthy()
      expect(item.link).toBeTruthy()
    }
  })
})

describe('projects', () => {
  it('has exactly 4 projects', () => {
    expect(projects).toHaveLength(4)
  })

  it('each project has required fields', () => {
    for (const p of projects) {
      expect(p.id).toBeTruthy()
      expect(typeof p.id).toBe('string')
      expect(p.title).toBeTruthy()
      expect(typeof p.title).toBe('string')
      expect(p.desc).toBeTruthy()
      expect(typeof p.desc).toBe('string')
      expect(Array.isArray(p.thumbnails)).toBe(true)
      expect(p.thumbnails.length).toBeGreaterThan(0)
      expect(Array.isArray(p.files)).toBe(true)
      expect(p.files.length).toBeGreaterThan(0)
      expect(Array.isArray(p.icons)).toBe(true)
      expect(p.icons.length).toBeGreaterThan(0)
    }
  })

  it('each project has unique id', () => {
    const ids = projects.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('each thumbnail path starts with /files/', () => {
    for (const p of projects) {
      for (const thumb of p.thumbnails) {
        expect(thumb).toMatch(/^\/files\//)
      }
    }
  })

  it('each file path starts with /files/', () => {
    for (const p of projects) {
      for (const file of p.files) {
        expect(file).toMatch(/^\/files\//)
      }
    }
  })

  it('each icon path starts with /images/tools/', () => {
    for (const p of projects) {
      for (const icon of p.icons) {
        expect(icon).toMatch(/^\/images\/tools\//)
      }
    }
  })
})

describe('workExperience', () => {
  it('has exactly 4 experiences', () => {
    expect(workExperience).toHaveLength(4)
  })

  it('each entry has required fields', () => {
    for (const w of workExperience) {
      expect(w.id).toBeGreaterThan(0)
      expect(w.title).toBeTruthy()
      expect(w.desc).toBeTruthy()
      expect(w.className).toBeTruthy()
      expect(w.thumbnail).toBeTruthy()
      expect(w.thumbnail).toMatch(/^\/images\//)
    }
  })

  it('each entry has a unique id', () => {
    const ids = workExperience.map((w) => w.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('titles describe data-related roles', () => {
    const titles = workExperience.map((w) => w.title)
    expect(titles).toContain('Giảng dạy & Ứng dụng Data')
    expect(titles).toContain('Tư vấn & Triển khai Giải pháp Data')
    expect(titles).toContain('Quản lý & Tối ưu Hệ thống & Quy trình')
    expect(titles).toContain('Cố vấn & Phát triển Hệ thống Giáo dục')
  })
})

describe('socialMedia', () => {
  it('has exactly 3 entries', () => {
    expect(socialMedia).toHaveLength(3)
  })

  it('each entry has id, link, and icon', () => {
    for (const s of socialMedia) {
      expect(s.id).toBeGreaterThan(0)
      expect(s).toHaveProperty('link')
      expect(s).toHaveProperty('icon')
    }
  })

  it('uses Github, Twitter, and Linkedin icons', () => {
    const icons = socialMedia.map((s) => s.icon)
    expect(icons).toContain(Github)
    expect(icons).toContain(Twitter)
    expect(icons).toContain(Linkedin)
  })
})
