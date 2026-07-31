'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { MessageSquare, Send, Trash2, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { formatDate, formatDateTime } from '@/lib/date'
import { toast } from 'react-hot-toast'
import {
  createLessonDiscussionCommentAction,
  deleteLessonDiscussionCommentAction,
  fetchLessonDiscussionAction,
} from '@/app/learn/[classCode]/assignments/[assignmentId]/actions'

interface LessonDiscussionProps {
  classCode: string
  lessonId: string
  studentEmail: string
}

interface DiscussionComment {
  id: string
  student_email: string
  comment_text: string
  is_instructor?: boolean | null
  created_at: string
}

/** Returns initials for an email address or display name */
function getInitials(email: string): string {
  const local = email.split('@')[0]
  const parts = local.split(/[._-]/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return local.slice(0, 2).toUpperCase()
}

/** Returns a deterministic Tailwind bg color based on the email string */
const AVATAR_COLORS = [
  'bg-blue-600',
  'bg-violet-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-cyan-600',
]
function getAvatarColor(email: string): string {
  let hash = 0
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

/** Formats a date string as a human-readable "time ago" string */
function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`
  return formatDate(dateStr)
}

export default function LessonDiscussion({
  classCode,
  lessonId,
  studentEmail,
}: LessonDiscussionProps) {
  const [comments, setComments] = useState<DiscussionComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isInstructor, setIsInstructor] = useState(false)
  const [currentUserEmail, setCurrentUserEmail] = useState(studentEmail)
  const [isOpen, setIsOpen] = useState(true)
  // double-click delete: track first click per comment id
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const fetchComments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchLessonDiscussionAction(classCode, lessonId)
      if (!res.success) {
        throw new Error(res.error || 'Failed to fetch comments')
      }
      setComments(res.comments || [])
      setCurrentUserEmail(res.email || studentEmail)
      setIsInstructor(false)
    } catch (err) {
      console.error('Error fetching comments:', err)
    } finally {
      setLoading(false)
    }
  }, [classCode, lessonId, studentEmail])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || submitting) return

    const emailToUse = currentUserEmail || studentEmail
    if (!emailToUse) {
      toast.error('Vui lòng xác minh email trước khi đăng bình luận.')
      return
    }

    setSubmitting(true)
    try {
      const res = await createLessonDiscussionCommentAction(classCode, lessonId, newComment)
      if (!res.success) {
        throw new Error(res.error || 'Failed to send comment')
      }
      setNewComment('')
      await fetchComments()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Vui lòng thử lại.'
      toast.error(`Không thể gửi bình luận: ${message}`)
    } finally {
      setSubmitting(false)
    }
  }

  /** 2.G Double-click delete: first click = "pending", second click within 3s = delete */
  const handleDeleteClick = useCallback(
    async (commentId: string) => {
      if (pendingDeleteId === commentId) {
        // Second click → execute delete
        setPendingDeleteId(null)
        setDeletingId(commentId)
        try {
          const res = await deleteLessonDiscussionCommentAction(classCode, commentId)
          if (!res.success) {
            throw new Error(res.error || 'Failed to delete comment')
          }
          setComments((prev) => prev.filter((c) => c.id !== commentId))
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Vui lòng thử lại.'
          toast.error(`Không thể xóa bình luận: ${message}`)
        } finally {
          setDeletingId(null)
        }
      } else {
        // First click → enter pending state, auto-reset after 3s
        setPendingDeleteId(commentId)
        setTimeout(() => {
          setPendingDeleteId((prev) => (prev === commentId ? null : prev))
        }, 3000)
      }
    },
    [classCode, pendingDeleteId]
  )

  return (
    <div className="border border-slate-800 bg-slate-900/10 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header with toggle */}
      <div
        className="flex justify-between items-center cursor-pointer border-b border-slate-800 pb-3"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="font-bold text-white text-sm flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-600" />
          <span>Class Discussion Q&amp;A Forum ({comments.length})</span>
        </h3>
        <span className="text-xs text-slate-500 hover:text-slate-300 select-none">
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
              <p className="text-xs text-slate-500 italic py-4 text-center">
                No discussion comments posted yet. Start the conversation below!
              </p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {comments.map((comment) => {
                  const isOwnComment = comment.student_email === currentUserEmail
                  const canDelete = isInstructor || isOwnComment
                  const isPending = pendingDeleteId === comment.id
                  const initials = getInitials(comment.student_email)
                  const avatarColor = getAvatarColor(comment.student_email)

                  return (
                    <div
                      key={comment.id}
                      className={`p-3 rounded-xl border flex gap-3 transition-all ${
                        comment.is_instructor
                          ? 'border-blue-500/20 bg-blue-500/5'
                          : 'border-slate-800 bg-slate-950/20'
                      }`}
                    >
                      {/* Avatar initials */}
                      <div
                        className={`${avatarColor} w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5`}
                        title={comment.student_email}
                      >
                        {initials}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Header row */}
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[11px] font-semibold text-slate-200 truncate">
                              {comment.student_email.split('@')[0]}
                            </span>
                            {comment.is_instructor && (
                              <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0">
                                Instructor
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className="text-[10px] text-slate-500"
                              title={formatDateTime(comment.created_at)}
                            >
                              {timeAgo(comment.created_at)}
                            </span>
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteClick(comment.id)}
                                disabled={deletingId === comment.id}
                                className={`text-[10px] flex items-center gap-0.5 transition-colors ${
                                  isPending
                                    ? 'text-rose-400 font-semibold'
                                    : 'text-slate-600 hover:text-rose-400'
                                }`}
                                title={
                                  isPending ? 'Click again to confirm delete' : 'Click twice to delete'
                                }
                              >
                                {deletingId === comment.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3 h-3" />
                                )}
                                {isPending && (
                                  <span className="ml-0.5">Confirm?</span>
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Comment text */}
                        <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {comment.comment_text}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Comment Form */}
            {currentUserEmail || studentEmail ? (
              <form onSubmit={handleSubmit} className="space-y-3 pt-4 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500">
                    Posting as:{' '}
                    <strong className="text-slate-300">{currentUserEmail || studentEmail}</strong>
                  </span>
                  {isInstructor && (
                    <span className="text-[8px] bg-blue-600 text-white px-1 py-0.5 rounded font-bold uppercase">
                      Staff
                    </span>
                  )}
                </div>
                <div className="flex gap-3">
                  <textarea
                    rows={2}
                    required
                    placeholder="Type your question or comment here…"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
                  />
                  <button
                    type="submit"
                    disabled={submitting || !newComment.trim()}
                    className="px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0 cursor-pointer border-0"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
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
