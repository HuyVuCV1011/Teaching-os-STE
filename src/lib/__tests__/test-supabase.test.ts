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

const describeIntegration = process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true'
  ? describe
  : describe.skip

describeIntegration('Supabase read-only integration', () => {
  it('can read the classes table without mutating live data', async () => {
    const { getSupabaseServer } = await import('../supabase')
    const supabase = getSupabaseServer(true)

    const { data, error } = await supabase
      .from('classes')
      .select('id')
      .limit(1)

    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })
})
