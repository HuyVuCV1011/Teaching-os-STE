'use client'

import React from 'react'
import { Megaphone, Send, Loader2, Trash2 } from 'lucide-react'

interface NoticeBoardWorkspaceProps {
  noticeTitle: string
  setNoticeTitle: (val: string) => void
  noticeContent: string
  setNoticeContent: (val: string) => void
  noticeSubmitting: boolean
  noticeLoading: boolean
  announcements: any[]
  handleCreateAnnouncement: (e: React.FormEvent) => void
  handleDeleteAnnouncement: (id: string) => void
}

export function NoticeBoardWorkspace({
  noticeTitle,
  setNoticeTitle,
  noticeContent,
  setNoticeContent,
  noticeSubmitting,
  noticeLoading,
  announcements,
  handleCreateAnnouncement,
  handleDeleteAnnouncement,
}: NoticeBoardWorkspaceProps) {
  return (
    <div className="space-y-8 animate-fade-in">
      <form onSubmit={handleCreateAnnouncement} className="p-6 rounded-2xl border border-slate-700 bg-slate-900/20 space-y-4">
        <h4 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
          <Megaphone className="w-4 h-4 text-blue-500" />
          Broadcast Cohort Announcement
        </h4>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Notice Title
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Schedule Update or Final Project Handouts"
            value={noticeTitle}
            onChange={(e) => setNoticeTitle(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Detailed Content
          </label>
          <textarea
            required
            rows={3}
            placeholder="Write announcement text here..."
            value={noticeContent}
            onChange={(e) => setNoticeContent(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-medium resize-none"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={noticeSubmitting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
          >
            {noticeSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Publish Notice</span>
          </button>
        </div>
      </form>

      {/* Announcements Timeline Feed */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Broadcast Timeline Feed</h4>
        
        {noticeLoading ? (
          <div className="flex justify-center items-center py-10 text-slate-500 text-xs font-semibold gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-650" /> Loading timeline history...
          </div>
        ) : announcements.length === 0 ? (
          <p className="text-slate-500 text-xs italic py-6">Notice board is clear. No notices published for this class.</p>
        ) : (
          <div className="space-y-4 relative pl-5">
            <div className="absolute left-[7px] top-2 bottom-8 border-l border-slate-800" />

            {announcements.map((ann) => (
              <div key={ann.id} className="relative p-5 rounded-xl border border-slate-800 bg-slate-950/20 hover:border-slate-750 transition-all space-y-2 group">
                <div className="absolute -left-[23px] top-5 w-2 h-2 rounded-full bg-blue-600 ring-4 ring-slate-950" />

                <div className="flex justify-between items-baseline gap-3">
                  <h5 className="font-bold text-slate-100 text-sm">{ann.title}</h5>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-medium">
                      {new Date(ann.created_at).toLocaleString()}
                    </span>
                    <button
                      onClick={() => handleDeleteAnnouncement(ann.id)}
                      className="p-1 rounded hover:bg-rose-500/10 text-slate-500 hover:text-rose-450 transition-colors opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line">{ann.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
