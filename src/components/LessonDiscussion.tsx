'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { MessageSquare, Send, Trash2, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface LessonDiscussionProps {
  classId: string
  lessonId: string
  studentEmail: string
}

export default function LessonDiscussion({
  classId,
  lessonId,
  studentEmail
}: LessonDiscussionProps) {
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isInstructor, setIsInstructor] = useState(false)
  const [currentUserEmail, setCurrentUserEmail] = useState(studentEmail)
  const [isOpen, setIsOpen] = useState(true)

  useEffect(() => {
    async function checkAuthAndFetch() {
      try {
        // Check if there is an active Supabase Auth user (instructor)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setIsInstructor(true)
          setCurrentUserEmail(user.email || '')
        } else {
          setIsInstructor(false)
          setCurrentUserEmail(studentEmail)
        }
      } catch (err) {
        console.error('Error verifying auth session:', err)
      }

      await fetchComments()
    }

    checkAuthAndFetch()
  }, [classId, lessonId, studentEmail])

  const fetchComments = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('discussion_comments')
        .select('*')
        .eq('class_id', classId)
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setComments(data || [])
    } catch (err) {
      console.error('Error fetching comments:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || submitting) return

    const emailToUse = currentUserEmail || studentEmail
    if (!emailToUse) {
      alert('Please verify your email or log in to post comments.')
      return
    }

    setSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('discussion_comments')
        .insert([
          {
            class_id: classId,
            lesson_id: lessonId,
            student_email: emailToUse,
            comment_text: newComment.trim(),
            is_instructor: isInstructor
          }
        ])
        .select()

      if (error) throw error
      
      setNewComment('')
      // Refresh local comment list
      await fetchComments()
    } catch (err: any) {
      alert(`Failed to submit comment: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return
    setDeletingId(commentId)
    try {
      const { error } = await supabase
        .from('discussion_comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="border border-slate-800 bg-slate-900/10 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header with toggle */}
      <div 
        className="flex justify-between items-center cursor-pointer border-b border-slate-800 pb-3"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="font-bold text-white text-sm flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-600" />
          <span>Class Discussion Q&A Forum ({comments.length})</span>
        </h3>
        <span className="text-xs text-slate-500 hover:text-slate-355 select-none">
          {isOpen ? 'Collapse' : 'Expand'}
        </span>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-6 overflow-hidden"
          >
            {/* Comment Thread List */}
            {loading && comments.length === 0 ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-xs text-slate-550 italic py-4 text-center">
                No discussion comments posted yet. Start the conversation below!
              </p>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {comments.map((comment) => {
                  const isOwnComment = comment.student_email === currentUserEmail
                  const canDelete = isInstructor || isOwnComment

                  return (
                    <div
                      key={comment.id}
                      className={`p-4 rounded-xl border flex flex-col justify-between gap-2 transition-all ${
                        comment.is_instructor
                          ? 'border-blue-500/20 bg-blue-500/5'
                          : 'border-slate-850 bg-slate-950/20'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-205 break-all">
                            {comment.student_email}
                          </span>
                          {comment.is_instructor && (
                            <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                              Instructor
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-505 shrink-0">
                          {new Date(comment.created_at).toLocaleDateString()} {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className="text-xs text-slate-350 whitespace-pre-wrap leading-relaxed">
                        {comment.comment_text}
                      </p>

                      {canDelete && (
                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => handleDelete(comment.id)}
                            disabled={deletingId === comment.id}
                            className="text-[10px] text-slate-500 hover:text-rose-400 flex items-center gap-1 transition-colors"
                          >
                            {deletingId === comment.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Comment Form */}
            {(currentUserEmail || studentEmail) ? (
              <form onSubmit={handleSubmit} className="space-y-3 pt-4 border-t border-slate-850">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-455">
                    Posting as: <strong className="text-slate-350">{currentUserEmail || studentEmail}</strong>
                  </span>
                  {isInstructor && (
                    <span className="text-[8px] bg-blue-600 text-white px-1 py-0.2 rounded font-bold uppercase">
                      Staff
                    </span>
                  )}
                </div>
                <div className="flex gap-3">
                  <textarea
                    rows={2}
                    required
                    placeholder="Type your question or comment here..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
                  />
                  <button
                    type="submit"
                    disabled={submitting || !newComment.trim()}
                    className="px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0 cursor-pointer border-0"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                Please verify your student email to post in the forum.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
