'use client'

import React, { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Bot, Loader2, BookOpen } from 'lucide-react'
import { askAITutorAction } from '@/app/learn/actions/ai_tutor'

interface Message {
  role: 'user' | 'model'
  content: string
  citations?: string[]
}

interface AITutorDrawerProps {
  classCode: string
  lessonId: string
}

export function AITutorDrawer({ classCode, lessonId }: AITutorDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content: 'Xin chào! Tôi là Trợ lý AI học tập của lớp. Tôi có thể giải thích lý thuyết bài học và hướng dẫn bạn cách giải quyết các vấn đề lập trình/kỹ thuật. Hãy đặt câu hỏi cho tôi nhé!',
    },
  ])
  const [loading, setLoading] = useState(false)
  const [isZen, setIsZen] = useState(false)
  const [pulsing, setPulsing] = useState(true)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('zen_mode') === 'true'
    setIsZen(saved)

    const handleToggle = (e: Event) => {
      const customEvent = e as CustomEvent
      setIsZen(customEvent.detail)
      if (customEvent.detail) {
        setIsOpen(false) // Auto-close drawer when Zen mode is activated
      }
    }
    window.addEventListener('toggle-zen-mode', handleToggle)
    return () => window.removeEventListener('toggle-zen-mode', handleToggle)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setPulsing(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loading])

  // Escape key close support
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Scroll lock and focus management
  useEffect(() => {
    if (!isOpen) return

    previousFocusRef.current = document.activeElement as HTMLElement
    const previousOverflow = document.body.style.overflow
    const previousOverscrollBehavior = document.body.style.overscrollBehavior
    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'contain'

    const focusTimer = window.setTimeout(() => {
      const inputField = drawerRef.current?.querySelector('input')
      inputField?.focus()
    }, 100)

    return () => {
      window.clearTimeout(focusTimer)
      document.body.style.overflow = previousOverflow
      document.body.style.overscrollBehavior = previousOverscrollBehavior
      previousFocusRef.current?.focus()
    }
  }, [isOpen])

  // Focus trap inside drawer
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return
    const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (!focusable || focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (e.shiftKey) {
      if (document.activeElement === first) {
        last.focus()
        e.preventDefault()
      }
    } else {
      if (document.activeElement === last) {
        first.focus()
        e.preventDefault()
      }
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const chatHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const response = await askAITutorAction(classCode, lessonId, userMessage, chatHistory)

      if (response.success && response.text) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            content: response.text,
            citations: response.citations
          }
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            content: `Lỗi: ${response.error || 'Không thể nhận phản hồi từ AI'}`,
          },
        ])
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Vui lòng thử lại sau'
      setMessages((prev) => [
        ...prev,
        { role: 'model', content: `Lỗi kết nối: ${message}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating Toggle Button */}
      {!isZen && (
        <button
          ref={triggerRef}
          onClick={() => setIsOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls="tutor-drawer"
          className="fixed bottom-6 right-6 p-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all z-40 flex items-center justify-center border border-blue-500/25 cursor-pointer motion-reduce:transition-none"
          title="Ask AI Tutor"
          aria-label="Open AI Tutor Chatbot Panel"
        >
          <MessageSquare className={`w-6 h-6 ${pulsing ? 'animate-pulse' : ''}`} />
        </button>
      )}

      {/* Slide-out Drawer */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/20 backdrop-blur-xs animate-fade-in"
          onKeyDown={handleKeyDown}
        >
          {/* Backdrop Closer */}
          <div
            className="flex-1"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Chat Drawer Body */}
          <div
            ref={drawerRef}
            id="tutor-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tutor-dialog-title"
            aria-describedby="tutor-dialog-desc"
            className="w-full max-w-md bg-slate-950 border-l border-slate-800 h-full flex flex-col shadow-2xl relative animate-slide-in-right motion-reduce:transition-none"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-500">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="tutor-dialog-title" className="text-sm font-bold text-slate-100">AI Tutor Copilot</h3>
                  <span id="tutor-dialog-desc" className="text-[10px] text-slate-500 font-medium">Hỗ trợ học tập STE tự động</span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                aria-label="Close AI Tutor panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat History Messages */}
            <div
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/10"
              aria-live="polite"
            >
              {messages.map((msg, idx) => {
                const isModel = msg.role === 'model'
                return (
                  <div
                    key={idx}
                    className={`flex flex-col gap-1.5 max-w-[85%] ${
                      isModel ? 'mr-auto items-start' : 'ml-auto items-end'
                    }`}
                  >
                    <div className={`flex gap-3 ${isModel ? '' : 'flex-row-reverse'}`}>
                      {isModel && (
                        <div className="w-8 h-8 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center shrink-0 text-blue-600">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}
                      <div
                        className={`p-3 rounded-2xl text-xs leading-relaxed ${
                          isModel
                            ? 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                            : 'bg-blue-600 text-white rounded-tr-none shadow-sm'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>

                    {/* Citations / Trust Layer Warning */}
                    {isModel && idx > 0 && (
                      <div className="pl-11 text-[10px] leading-relaxed">
                        {msg.citations && msg.citations.length > 0 ? (
                          <div className="space-y-0.5">
                            <span className="font-semibold text-blue-400 flex items-center gap-1">
                              <BookOpen className="w-3 h-3" /> Nguồn tham chiếu:
                            </span>
                            <ul className="list-disc list-inside text-slate-400 pl-1">
                              {msg.citations.map((cite, cIdx) => (
                                <li key={cIdx} className="truncate max-w-[280px]" title={cite}>
                                  {cite}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">
                            💡 Hãy đối chiếu với nội dung bài học và tài liệu do giảng viên cung cấp.
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              {loading && (
                <div className="flex gap-3 max-w-[85%] mr-auto items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center shrink-0 text-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 text-xs italic">
                    AI đang suy nghĩ và lập luận...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Disclaimer */}
            <div className="px-4 py-2 border-t border-slate-850 bg-slate-950 text-[10px] text-slate-550 leading-relaxed shrink-0">
              ⚠️ <span className="font-semibold text-slate-450">Lưu ý:</span> Trợ lý AI hỗ trợ giải thích lý thuyết bài học và gợi ý phương hướng thực hiện bài tập. Kết quả không thay thế tài liệu học tập chính thức.
            </div>

            {/* Input Form Footer */}
            <form
              onSubmit={handleSend}
              className="p-4 border-t border-slate-800 bg-slate-900 flex gap-2 shrink-0"
            >
              <input
                name="tutorQuestion"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Hỏi về lý thuyết bài học, cách viết hàm..."
                disabled={loading}
                aria-label="Nhập câu hỏi cho trợ lý AI"
                autoComplete="off"
                spellCheck={true}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-600 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                aria-label="Gửi câu hỏi cho trợ lý AI"
                className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors flex items-center justify-center cursor-pointer shadow-md shadow-blue-500/5"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
