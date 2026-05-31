'use client'

import React from 'react'
import NextImage from 'next/image'
import Select from 'react-select'
import { Input } from '@/components/ui/input'

interface IconOption {
  value: string
  label: string
  icon: string
}

const iconOptions: IconOption[] = [
  { value: 'power-bi', label: 'Power BI', icon: '/images/tools/power-bi.svg' },
  { value: 'excel', label: 'Excel', icon: '/images/tools/excel.svg' },
  { value: 'python', label: 'Python', icon: '/images/tools/python.svg' },
]

interface LinksTaxonomyProps {
  productOption: string | null
  setProductOption: (val: string | null) => void
  iframeLink: string | null
  setIframeLink: (val: string | null) => void
  youtubeLink: string | null
  setYoutubeLink: (val: string | null) => void
  icons: string[]
  setIcons: (val: string[]) => void
  isSubmitting?: boolean
  submitButtonText: string
}

export function LinksTaxonomy({
  productOption,
  setProductOption,
  iframeLink,
  setIframeLink,
  youtubeLink,
  setYoutubeLink,
  icons,
  setIcons,
  isSubmitting = false,
  submitButtonText,
}: LinksTaxonomyProps) {
  return (
    <div className="border border-slate-700 bg-slate-900/10 rounded-2xl p-6 space-y-4">
      <h3 className="font-bold text-white text-sm">Links & Taxonomy</h3>

      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
          Target Category
        </label>
        <select
          required
          value={productOption || ''}
          onChange={(e) => setProductOption(e.target.value || null)}
          className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
        >
          <option value="">Select category</option>
          <option value="student">Student Project</option>
          <option value="customer">Client Showcase</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
          Interactive Iframe Link
        </label>
        <Input
          value={iframeLink || ''}
          onChange={(e) => setIframeLink(e.target.value || null)}
          placeholder="https://app.powerbi.com/view..."
          className="bg-slate-950 border-slate-700 text-xs text-white"
          type="url"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
          YouTube Embed URL
        </label>
        <Input
          value={youtubeLink || ''}
          onChange={(e) => setYoutubeLink(e.target.value || null)}
          placeholder="https://www.youtube.com/embed/..."
          className="bg-slate-950 border-slate-700 text-xs text-white"
          type="url"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
          Technology Icons
        </label>
        <Select
          isMulti
          options={iconOptions}
          value={iconOptions.filter((opt) => icons.includes(opt.value))}
          onChange={(selected) => setIcons(selected ? selected.map((opt) => opt.value) : [])}
          formatOptionLabel={(option) => (
            <div className="flex items-center gap-2 text-xs">
              <NextImage src={option.icon} alt={option.label} width={16} height={16} className="w-4 h-4" />
              <span>{option.label}</span>
            </div>
          )}
          styles={{
            control: (base) => ({
              ...base,
              backgroundColor: 'rgb(2, 6, 23)',
              borderColor: 'rgb(30, 41, 59)',
              color: 'white',
            }),
            menu: (base) => ({
              ...base,
              backgroundColor: 'rgb(2, 6, 23)',
            }),
            option: (base, state) => ({
              ...base,
              backgroundColor: state.isFocused ? 'rgb(30, 41, 59)' : 'transparent',
              color: 'white',
            }),
          }}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors shadow-md shadow-blue-500/10"
      >
        {submitButtonText}
      </button>
    </div>
  )
}
