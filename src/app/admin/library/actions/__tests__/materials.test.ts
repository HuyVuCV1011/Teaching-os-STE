import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------- Hoisted mocks ----------
const { mockSupabase } = vi.hoisted(() => {
  const mockSelect = vi.fn()
  const mockInsert = vi.fn(() => ({ select: vi.fn() }))
  const mockUpdate = vi.fn()
  const mockRpc = vi.fn()
  const mockFrom = vi.fn((table: string) => {
    if (table === 'canonical_materials' || table === 'lessons') {
      return {
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
      }
    }
    return { select: vi.fn(), insert: vi.fn(), update: vi.fn() }
  })

  const mockSupabase = {
    from: mockFrom,
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    rpc: mockRpc,
  }

  return { mockSupabase }
})

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
  getSupabaseServer: vi.fn(() => mockSupabase),
}))


import {
  checkMaterialDeduplication,
  registerCanonicalMaterial,
  type MaterialInput,
  reorderMaterialsAction,
  updateLessonLayoutAction,
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

describe('reorderMaterialsAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls rpc for reordering canonical materials successfully', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ error: null } as any)

    const updates = [{ id: '1', display_order: 1 }, { id: '2', display_order: 2 }]
    const result = await reorderMaterialsAction(updates)

    expect(result.success).toBe(true)
    expect(supabase.rpc).toHaveBeenCalledWith('reorder_canonical_materials', { updates })
  })

  it('returns success: false on rpc error', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ error: { message: 'RPC Error' } } as any)

    const result = await reorderMaterialsAction([])
    expect(result.success).toBe(false)
    expect(result.error).toBe('RPC Error')
  })
})

describe('updateLessonLayoutAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches metadata, updates mapping and layout successfully', async () => {
    const lesson = { metadata: { existing: 'data' } }
    
    // Mock select & single chain: supabase.from('lessons').select('metadata').eq('id', 'l1').single()
    const mockSingle = vi.fn().mockResolvedValue({ data: lesson, error: null })
    const mockEqFetch = vi.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEqFetch })

    // Mock update chain: supabase.from('lessons').update({ ... }).eq('id', 'l1')
    const mockEqUpdate = vi.fn().mockResolvedValue({ error: null })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqUpdate })

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'lessons') {
        return {
          select: mockSelect,
          update: mockUpdate,
        } as any
      }
      return { select: vi.fn(), update: vi.fn() } as any
    })

    const result = await updateLessonLayoutAction('l1', '2-cols', { 1: ['mat-1'] })

    expect(result.success).toBe(true)
    expect(mockSelect).toHaveBeenCalledWith('metadata')
    expect(mockEqFetch).toHaveBeenCalledWith('id', 'l1')
    expect(mockUpdate).toHaveBeenCalledWith({
      grid_layout: '2-cols',
      metadata: {
        existing: 'data',
        grid_cell_mapping: { 1: ['mat-1'] }
      }
    })
  })

  it('returns success: false when lesson fetch fails', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
    const mockEqFetch = vi.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEqFetch })

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'lessons') {
        return {
          select: mockSelect,
        } as any
      }
      return {} as any
    })

    const result = await updateLessonLayoutAction('l1', '2-cols', {})
    expect(result.success).toBe(false)
    expect(result.error).toBe('Lesson not found: Not found')
  })
})

