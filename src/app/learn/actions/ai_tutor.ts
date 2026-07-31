'use server'

import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/jwt'
import { getSupabaseServer } from '@/lib/supabase'

const RUBICORE_API_URL = process.env.RUBICORE_API_URL || 'http://localhost:8080'
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''

interface Message {
  role: 'user' | 'model'
  content: string
}

type RagResult = {
  content?: string | null
  citation?: {
    knowledge_source_title?: string | null
  } | null
  metadata?: {
    title?: string | null
  } | null
}

type RagResponse = {
  results?: RagResult[]
}

function extractLessonText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content.map(extractLessonText).filter(Boolean).join('\n')
  }
  if (content && typeof content === 'object') {
    const node = content as Record<string, unknown>
    const ownText = typeof node.text === 'string' ? node.text : ''
    const childText = extractLessonText(node.content)
    return [ownText, childText].filter(Boolean).join(' ')
  }
  return ''
}

async function verifyStudentSession(classCode: string) {
  const cookieStore = await cookies()
  const token = cookieStore.get(`class_session_${classCode}`)?.value

  if (!token) {
    throw new Error('Unauthorized: Session not found')
  }

  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('Server configuration error: JWT_SECRET is required')
  }
  const payload = await verifyJWT(token, secret)

  if (
    !payload ||
    payload.role !== 'student' ||
    payload.class_code?.toUpperCase() !== classCode.toUpperCase()
  ) {
    throw new Error('Unauthorized: Invalid student credentials')
  }

  return payload
}

export async function askAITutorAction(
  classCode: string,
  lessonId: string,
  message: string,
  chatHistory: Message[]
) {
  try {
    const normalizedMessage = message.trim()
    if (!normalizedMessage || normalizedMessage.length > 2_000) {
      throw new Error('Invalid tutor message length.')
    }

    const safeHistory = chatHistory
      .filter(
        (item): item is Message =>
          (item.role === 'user' || item.role === 'model') &&
          typeof item.content === 'string' &&
          item.content.trim().length > 0,
      )
      .slice(-12)
      .map((item) => ({ ...item, content: item.content.slice(0, 2_000) }))

    // 1. Verify student auth
    const session = await verifyStudentSession(classCode)

    if (!GEMINI_API_KEY) {
      throw new Error('AI service credentials not configured on the server.')
    }

    const supabase = getSupabaseServer(true)
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('course_id')
      .eq('id', session.class_id)
      .single()

    if (classError || !classData) {
      throw classError || new Error('Class not found.')
    }

    const { data: mappedCourses, error: mappedCoursesError } = await supabase
      .from('class_courses')
      .select('course_id')
      .eq('class_id', session.class_id)

    if (mappedCoursesError) throw mappedCoursesError

    const allowedCourseIds = new Set<string>(
      [classData.course_id, ...(mappedCourses || []).map((course) => course.course_id)]
        .filter(Boolean)
    )

    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('id, title, content, metadata, modules(course_id)')
      .eq('id', lessonId)
      .single()

    const lessonModule = Array.isArray(lesson?.modules) ? lesson.modules[0] : lesson?.modules
    if (
      lessonError ||
      !lesson ||
      lesson.metadata?.status === 'draft' ||
      !lessonModule?.course_id ||
      !allowedCourseIds.has(lessonModule.course_id)
    ) {
      throw new Error('Unauthorized: Lesson is not available in this class.')
    }

    const officialLessonText = extractLessonText(lesson.content).trim().slice(0, 8000)

    // 2. Query RAG chunks from FastAPI rubricore-engine
    let ragContext = officialLessonText
      ? `[Official Lesson - ${lesson.title}]:\n${officialLessonText}`
      : ''
    const citations: string[] = officialLessonText ? [lesson.title] : []
    try {
      const { data: organization, error: organizationError } = await supabase
        .from('organizations')
        .select('id')
        .limit(1)
        .single()

      if (organizationError || !organization) {
        throw organizationError || new Error('Knowledge organization boundary is unavailable.')
      }

      const ragRes = await fetch(`${RUBICORE_API_URL}/pilot/knowledge/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-pilot-actor-user-id': session.class_id,
          'x-pilot-organization-id': organization.id,
          'x-pilot-roles': 'system',
        },
        body: JSON.stringify({
          query: normalizedMessage,
          limit: 3,
          allowed_access_scopes: ['organization', 'public_safe'],
        }),
      })

      if (ragRes.ok) {
        const ragData = await ragRes.json() as RagResponse
        if (ragData.results && ragData.results.length > 0) {
          const retrievedContext = ragData.results
            .map((r, idx) => {
              const sourceTitle = r.citation?.knowledge_source_title || r.metadata?.title || 'Tài liệu lớp học'
              if (!citations.includes(sourceTitle)) {
                citations.push(sourceTitle)
              }
              return `[Context Document ${idx + 1} - ${sourceTitle}]:\n${r.content || ''}`
            })
            .join('\n\n')
          ragContext = [ragContext, retrievedContext].filter(Boolean).join('\n\n')
        }
      }
    } catch (ragErr) {
      console.warn('RAG retrieval failed, falling back to pure LLM chat:', ragErr)
    }

    // 3. Construct the prompt with RAG Context & strict assignment boundaries
    const systemInstruction = `You are a helpful, professional, and knowledgeable AI Teaching Assistant / Tutor for a Scientific, Technical, and Engineering (STE) class.
Your primary role is to help the student understand the lesson concepts.

Here is the retrieved context from the course materials:
${ragContext || 'No specific course materials found for this query. Use general knowledge.'}

STRICT CONSTRAINTS & RULES:
1. Help the student understand the concepts, algorithms, code logic, or formulas.
2. NEVER write complete solutions, complete code snippets, or answers for their assignments or quizzes.
3. If the student asks you to solve an assignment question, write code for them, or give direct answers, you must politely decline and instead guide them with step-by-step concepts, hints, or debugging strategies so they can solve it themselves.
4. Keep your responses structured, clear, and encouraging. Use Markdown formatting.
5. Answer in the language the student queries (Vietnamese or English).`

    const formattedContents = [
      ...safeHistory.map((h) => ({
        role: h.role === 'model' ? 'model' : 'user',
        parts: [{ text: h.content }],
      })),
      {
        role: 'user',
        parts: [{ text: normalizedMessage }],
      },
    ]

    // 4. Call Google Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`
    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: formattedContents,
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        generationConfig: {
          temperature: 0.3,
        },
      }),
    })

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      console.error(`Gemini API returned ${geminiRes.status}:`, errText)
      throw new Error(`Gemini API returned error code ${geminiRes.status}.`)
    }

    const geminiData = await geminiRes.json()
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

    if (!responseText) {
      throw new Error('Gemini API returned empty text.')
    }

    return { success: true, text: responseText, citations }
  } catch (error) {
    console.error('Error in askAITutorAction:', error)
    return {
      success: false,
      error: 'AI Tutor hiện chưa thể phản hồi. Vui lòng thử lại sau.',
    }
  }
}
