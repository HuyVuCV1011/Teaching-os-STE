import * as fs from 'fs'
import * as path from 'path'

const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8')
  content.split('\n').forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)$/)
    if (match) {
      const key = match[1]
      let value = match[2].trim()
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1)
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.substring(1, value.length - 1)
      }
      process.env[key] = value
    }
  })
}

import { describe, it, expect } from 'vitest'

describe('Supabase Cohort Cleanup', () => {
  it('should find and delete existing E2E-LEARN classes', async () => {
    const { getSupabaseServer } = await import('../supabase')
    const supabase = getSupabaseServer(true)
    
    // Check if class exists
    const { data: existingClasses } = await supabase
      .from('classes')
      .select('id')
      .eq('class_code', 'E2E-LEARN')
    
    console.log('EXISTING E2E-LEARN CLASSES:', existingClasses)
    
    if (existingClasses && existingClasses.length > 0) {
      for (const cls of existingClasses) {
        // Delete related schedules, enrollments, courses, etc.
        await supabase.from('class_schedules').delete().eq('class_id', cls.id)
        await supabase.from('class_enrollments').delete().eq('class_id', cls.id)
        await supabase.from('class_courses').delete().eq('class_id', cls.id)
        const { error: delErr } = await supabase.from('classes').delete().eq('id', cls.id)
        console.log(`Deleted class ${cls.id}:`, delErr)
      }
    }
    
    const { data: verifyClasses } = await supabase
      .from('classes')
      .select('id')
      .eq('class_code', 'E2E-LEARN')
    expect(verifyClasses?.length || 0).toBe(0)
  })
})
