'use server'

import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/jwt'

const RUBICORE_API_URL = process.env.RUBICORE_API_URL || 'http://localhost:8080'
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''

interface Message {
  role: 'user' | 'model'
  content: string
}

async function verifyStudentSession(classCode: string) {
  const cookieStore = await cookies()
  const token = cookieStore.get(`class_session_${classCode}`)?.value

  if (!token) {
    throw new Error('Unauthorized: Session not found')
  }

  const secret = process.env.JWT_SECRET || 'fallback_development_secret_key_1234567890'
  const payload = await verifyJWT(token, secret)

  if (!payload || payload.role !== 'student') {
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
    // 1. Verify student auth
    await verifyStudentSession(classCode)

    if (!GEMINI_API_KEY) {
      throw new Error('AI service credentials not configured on the server.')
    }

    // 2. Query RAG chunks from FastAPI rubricore-engine
    let ragContext = ''
    try {
      const ragRes = await fetch(`${RUBICORE_API_URL}/pilot/knowledge/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-pilot-actor-user-id': '00000000-0000-0000-0000-000000000000',
          'x-pilot-organization-id': '00000000-0000-0000-0000-000000000000',
          'x-pilot-roles': 'system',
        },
        body: JSON.stringify({
          query: message,
          limit: 3,
          allowed_access_scopes: ['organization', 'public'],
        }),
      })

      if (ragRes.ok) {
        const ragData = await ragRes.json()
        if (ragData.results && ragData.results.length > 0) {
          ragContext = ragData.results
            .map((r: any, idx: number) => `[Context Document ${idx + 1} - ${r.citation?.knowledge_source_title || 'Material'}]:\n${r.content}`)
            .join('\n\n')
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
      ...chatHistory.map((h) => ({
        role: h.role === 'model' ? 'model' : 'user',
        parts: [{ text: h.content }],
      })),
      {
        role: 'user',
        parts: [{ text: message }],
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
      throw new Error(`Gemini API returned error code ${geminiRes.status}: ${errText}`)
    }

    const geminiData = await geminiRes.json()
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

    if (!responseText) {
      throw new Error('Gemini API returned empty text.')
    }

    return { success: true, text: responseText }
  } catch (error: any) {
    console.error('Error in askAITutorAction:', error)
    return { success: false, error: error.message || 'An unknown error occurred' }
  }
}
