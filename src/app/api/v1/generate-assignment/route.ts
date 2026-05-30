import { NextRequest, NextResponse } from 'next/server'

const RUBICORE_API_URL = process.env.RUBICORE_API_URL || 'http://localhost:8080'

export async function POST(request: NextRequest) {
  try {
    const params = await request.json()
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
          question_count: params.questionCount,
          generate_sample_data: params.generateSampleData,
          lesson_content: params.lessonContent,
        }),
      })
    } catch (fetchErr: any) {
      console.error(`[API Route] Connection failed to backend ${url}:`, fetchErr)
      return NextResponse.json(
        { error: `Could not connect to AI engine at ${url}. ${fetchErr.message}` },
        { status: 502 }
      )
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      let parsedDetail = ''
      try {
        const errJson = JSON.parse(errText)
        parsedDetail = errJson.detail
      } catch {}
      const errMsg = parsedDetail || errText || `HTTP error ${res.status}`
      console.error(`[API Route] Backend returned status ${res.status}: ${errMsg}`)
      return NextResponse.json(
        { error: errMsg },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json({ success: true, questions: data.questions })
  } catch (error: any) {
    console.error('[API Route] Unhandled exception:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
