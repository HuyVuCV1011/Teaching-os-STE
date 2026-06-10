'use client'

import React, { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Bot, Loader2 } from 'lucide-react'
import { askAITutorAction } from '@/app/learn/actions/ai_tutor'

interface Message {
  role: 'user' | 'model'
  content: string
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
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loading])

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
        setMessages((prev) => [...prev, { role: 'model', content: response.text }])
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            content: `Lỗi: ${response.error || 'Không thể nhận phản hồi từ AI'}`,
          },
        ])
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'model', content: `Lỗi kết nối: ${err.message || 'Vui lòng thử lại sau'}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all z-40 flex items-center justify-center border border-blue-500/25 cursor-pointer"
        title="Hỏi Trợ Lý AI"
      >
        <MessageSquare className="w-6 h-6 animate-pulse" />
      </button>

      {/* Slide-out Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end animate-fade-in bg-slate-950/20 backdrop-blur-xs">
          {/* Backdrop Closer */}
          <div className="flex-1" onClick={() => setIsOpen(false)} />

          {/* Chat Drawer Body */}
          <div className="w-full max-w-md bg-slate-950 border-l border-slate-800 h-full flex flex-col shadow-2xl relative animate-slide-in-right">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-500">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">AI Tutor Copilot</h3>
                  <span className="text-[10px] text-slate-500 font-medium">Hỗ trợ học tập STE tự động</span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat History Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/10">
              {messages.map((msg, idx) => {
                const isModel = msg.role === 'model'
                return (
                  <div
                    key={idx}
                    className={`flex gap-3 max-w-[85%] ${
                      isModel ? 'mr-auto' : 'ml-auto flex-row-reverse'
                    }`}
                  >
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

            {/* Input Form Footer */}
            <form
              onSubmit={handleSend}
              className="p-4 border-t border-slate-800 bg-slate-900 flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Hỏi về lý thuyết bài học, cách viết hàm..."
                disabled={loading}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-600 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
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
