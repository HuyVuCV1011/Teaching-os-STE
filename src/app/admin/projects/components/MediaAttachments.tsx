'use client'

import React from 'react'
import { Input } from '@/components/ui/input'

interface MediaAttachmentsProps {
  thumbnails: File[]
  setThumbnails: React.Dispatch<React.SetStateAction<File[]>>
  files: File[]
  setFiles: React.Dispatch<React.SetStateAction<File[]>>
  existingThumbnails?: string[]
  existingFiles?: string[]
}

export function MediaAttachments({
  thumbnails,
  setThumbnails,
  files,
  setFiles,
  existingThumbnails = [],
  existingFiles = [],
}: MediaAttachmentsProps) {
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<File[]>>,
    accept: string
  ) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length > 2) {
      alert('Bạn chỉ có thể tải lên tối đa 2 tệp.')
      return
    }
    for (const file of selectedFiles) {
      const isImage = accept === 'image/*' && file.type.startsWith('image/')
      const isPdf = accept === 'application/pdf' && file.name.toLowerCase().endsWith('.pdf')
      if (!(isImage || isPdf)) {
        alert(`Loại tệp không hợp lệ.`)
        return
      }
      if (file.size > 100 * 1024 * 1024) {
        alert('Kích thước tệp vượt quá giới hạn 100MB.')
        return
      }
    }
    setter(selectedFiles)
  }

  return (
    <div className="border border-slate-700 bg-slate-900/10 rounded-2xl p-6 space-y-4">
      <h3 className="font-bold text-white text-sm">Media Attachments</h3>

      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
          Cover Image Thumbnail (Max 2 for comparison slider)
        </label>
        <Input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFileChange(e, setThumbnails, 'image/*')}
          className="bg-slate-955 border-slate-700 text-slate-400 file:bg-blue-600/10 file:text-blue-600 file:border-0 hover:file:bg-blue-600/20 text-xs file:py-1 file:px-2.5 file:rounded"
        />
        {existingThumbnails.length > 0 && (
          <div className="text-[10px] text-slate-500 mt-1.5">
            Currently uploaded: {existingThumbnails.length} image(s). Uploading new images will replace them.
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
          PDF Document (Max 2 for slider comparison)
        </label>
        <Input
          type="file"
          accept="application/pdf"
          multiple
          onChange={(e) => handleFileChange(e, setFiles, 'application/pdf')}
          className="bg-slate-955 border-slate-700 text-slate-400 file:bg-blue-600/10 file:text-blue-600 file:border-0 hover:file:bg-blue-600/20 text-xs file:py-1 file:px-2.5 file:rounded"
        />
        {existingFiles.length > 0 && (
          <div className="text-[10px] text-slate-500 mt-1.5">
            Currently uploaded: {existingFiles.length} PDF(s). Uploading new files will replace them.
          </div>
        )}
      </div>
    </div>
  )
}
