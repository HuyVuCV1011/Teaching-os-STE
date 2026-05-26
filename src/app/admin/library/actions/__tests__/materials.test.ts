import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------- Hoisted mocks ----------
const { mockSupabase } = vi.hoisted(() => {
  const mockSelect = vi.fn()
  const mockInsert = vi.fn(() => ({ select: vi.fn() }))
  const mockFrom = vi.fn((table: string) => {
    if (table === 'canonical_materials') {
      return {
        select: mockSelect,
        insert: mockInsert,
      }
    }
    return { select: vi.fn(), insert: vi.fn() }
  })

  const mockSupabase = {
    from: mockFrom,
    select: mockSelect,
    insert: mockInsert,
  }

  return { mockSupabase }
})

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}))

import {
  checkMaterialDeduplication,
  registerCanonicalMaterial,
  type MaterialInput,
} from '../materials'
import { supabase } from '@/lib/supabase'

// ---------- Tests ----------
describe('checkMaterialDeduplication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the existing material if a file with the same hash exists', async () => {
    const existing = {
      storage_url: '/files/same.pdf',
      title: 'Existing Doc',
      type: 'pdf',
    }

    // Mock the chain: supabase.from('canonical_materials').select('...').eq('...', fileHash).limit(1)
    const mockEq = vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: [existing], error: null }) })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any)

    const result = await checkMaterialDeduplication('abc123hash')
    expect(result).toEqual(existing)
    expect(mockSelect).toHaveBeenCalledWith('storage_url, title, type')
    expect(mockEq).toHaveBeenCalledWith('metadata->>file_hash', 'abc123hash')
  })

  it('returns null if no matching material exists', async () => {
    const mockEq = vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: [], error: null }) })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any)

    const result = await checkMaterialDeduplication('nonexistent-hash')
    expect(result).toBeNull()
  })

  it('returns null on database error', async () => {
    const mockEq = vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }) })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any)

    const result = await checkMaterialDeduplication('hash-with-error')
    expect(result).toBeNull()
  })

  it('returns null if caught exception occurs', async () => {
    vi.mocked(supabase.from).mockImplementation(() => { throw new Error('Unexpected') })

    const result = await checkMaterialDeduplication('hash-crash')
    expect(result).toBeNull()
  })
})

describe('registerCanonicalMaterial', () => {
  const input: MaterialInput = {
    lessonId: 'lesson-1',
    title: 'Course PDF',
    type: 'pdf',
    storageUrl: '/teaching-materials/lesson-1.pdf',
    fileHash: 'abc123hash',
    metadata: { pageCount: 10 },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('inserts a new canonical_material record', async () => {
    const mockSelectChain = vi.fn().mockResolvedValue({ data: [{ id: 'mat-1' }], error: null })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelectChain })
    vi.mocked(supabase.from).mockReturnValue({ insert: mockInsert } as any)

    const result = await registerCanonicalMaterial(input)

    expect(result.success).toBe(true)
    expect(mockInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        lesson_id: 'lesson-1',
        title: 'Course PDF',
        type: 'pdf',
        storage_url: '/teaching-materials/lesson-1.pdf',
        metadata: expect.objectContaining({
          file_hash: 'abc123hash',
          pageCount: 10,
        }),
      }),
    ])
  })

  it('merges file_hash into metadata', async () => {
    const mockSelectChain = vi.fn().mockResolvedValue({ data: [], error: null })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelectChain })
    vi.mocked(supabase.from).mockReturnValue({ insert: mockInsert } as any)

    await registerCanonicalMaterial(input)

    const insertArg = mockInsert.mock.calls[0][0][0]
    expect(insertArg.metadata.file_hash).toBe('abc123hash')
  })

  it('returns success: false and error message on DB failure', async () => {
    const mockSelectChain = vi.fn().mockResolvedValue({ data: null, error: null })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelectChain })
    vi.mocked(supabase.from).mockReturnValue({ insert: mockInsert } as any)

    mockSelectChain.mockRejectedValue(new Error('DB insert failed'))

    const result = await registerCanonicalMaterial(input)
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('handles missing optional fields', async () => {
    const minimalInput: MaterialInput = {
      lessonId: 'lesson-2',
      title: 'Minimal',
      type: 'link',
      storageUrl: 'https://example.com',
    }

    const mockSelectChain = vi.fn().mockResolvedValue({ data: [{ id: 'mat-2' }], error: null })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelectChain })
    vi.mocked(supabase.from).mockReturnValue({ insert: mockInsert } as any)

    const result = await registerCanonicalMaterial(minimalInput)
    expect(result.success).toBe(true)
  })

  it('inserts with code_repo type', async () => {
    const repoInput: MaterialInput = {
      lessonId: 'lesson-3',
      title: 'Source Code',
      type: 'code_repo',
      storageUrl: 'https://github.com/org/repo',
    }

    const mockSelectChain = vi.fn().mockResolvedValue({ data: [{ id: 'mat-3' }], error: null })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelectChain })
    vi.mocked(supabase.from).mockReturnValue({ insert: mockInsert } as any)

    const result = await registerCanonicalMaterial(repoInput)
    expect(result.success).toBe(true)
  })
})
