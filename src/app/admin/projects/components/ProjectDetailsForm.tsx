'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import RichTextEditor from '@/components/RichTextEditor'

interface ProjectDetailsFormProps {
  title: string
  setTitle: (val: string) => void
  description: string
  setDescription: (val: string) => void
}

export function ProjectDetailsForm({
  title,
  setTitle,
  description,
  setDescription,
}: ProjectDetailsFormProps) {
  return (
    <div className="border border-slate-700 bg-slate-900/10 rounded-2xl p-6 space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Project Title
        </label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Data Pipeline Integration Showcase"
          className="bg-slate-950 border-slate-700 focus:border-blue-500 text-white"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-450 uppercase tracking-wider mb-2">
          Detailed Description (Rich HTML editor)
        </label>
        <RichTextEditor content={description} onChange={setDescription} />
      </div>
    </div>
  )
}
