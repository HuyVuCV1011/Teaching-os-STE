import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/admin-auth'

const RUBICORE_API_URL = process.env.RUBICORE_API_URL || 'http://localhost:8080'

type GenerateAssignmentParams = {
  modelChoice?: unknown
  assignmentType?: unknown
  category?: unknown
  questionCount?: unknown
  generateSampleData?: unknown
  lessonContent?: unknown
}

type BackendErrorResponse = {
  detail?: string
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Internal Server Error'
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminUser()
    const params = await request.json() as GenerateAssignmentParams
    const questionCount = Number(params.questionCount)
    if (
      typeof params.lessonContent !== 'string' ||
      params.lessonContent.trim().length === 0 ||
      params.lessonContent.length > 50_000 ||
      !Number.isInteger(questionCount) ||
      questionCount < 1 ||
      questionCount > 30
    ) {
      return NextResponse.json(
        { error: 'Invalid lesson content or question count.' },
        { status: 400 },
      )
    }
    const url = `${RUBICORE_API_URL}/pilot/generate-assignment`
    
    console.log(`[API Route] Forwarding request to FastAPI: ${url}`)
    
    let res
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_choice: params.modelChoice,
          assignment_type: params.assignmentType,
          category: params.category,
          question_count: questionCount,
          generate_sample_data: params.generateSampleData,
          lesson_content: params.lessonContent,
        }),
      })
    } catch (fetchErr) {
      console.error(`[API Route] Connection failed to backend ${url}:`, fetchErr)
      return NextResponse.json(
        { error: `Could not connect to AI engine at ${url}. ${getErrorMessage(fetchErr)}` },
        { status: 502 }
      )
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      let parsedDetail = ''
      try {
        const errJson = JSON.parse(errText) as BackendErrorResponse
        parsedDetail = errJson.detail || ''
      } catch {}
      const errMsg = parsedDetail || errText || `HTTP error ${res.status}`
      console.error(`[API Route] Backend returned status ${res.status}: ${errMsg}`)
      return NextResponse.json(
        { error: errMsg },
        { status: res.status }
      )
    }

    const data = await res.json() as { questions?: unknown }
    return NextResponse.json({ success: true, questions: data.questions })
  } catch (error) {
    console.error('[API Route] Unhandled exception:', error)
    const message = getErrorMessage(error)
    if (message.startsWith('Unauthorized:')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
