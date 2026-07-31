'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import type { Project } from '@/lib/project-data'

interface TableOfContentsProps {
  iframeLink: string | null
  youtubeLink: string | null
  flowDiagram: Project['flow_diagram']
  nodesLength: number
  description: string
  filesLength: number
  maxPages: number
  isSidebarOpen: boolean
  setIsSidebarOpen: (val: boolean) => void
  isShrunk: boolean
  handleNavClick: (id: string) => void
  handleButtonClick: () => void
}

export function TableOfContents({
  iframeLink,
  youtubeLink,
  flowDiagram,
  nodesLength,
  description,
  filesLength,
  maxPages,
  isSidebarOpen,
  setIsSidebarOpen,
  isShrunk,
  handleNavClick,
  handleButtonClick,
}: TableOfContentsProps) {
  if (isShrunk && !isSidebarOpen) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-10 left-10 w-12 h-12 rounded-full bg-white/80 backdrop-blur-md shadow-lg z-10"
        onClick={handleButtonClick}
        aria-label="Mở mục lục dự án"
      >
        <Menu className="h-5 w-5 text-gray-600" aria-hidden="true" />
      </Button>
    )
  }

  return (
    <div
      className={`overflow-y-auto fixed inset-y-0 left-0 w-48 bg-white/80 backdrop-blur-md p-4 shadow-lg rounded-r-lg z-10 transition-all duration-300 ease-in-out ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } md:top-0 md:h-auto md:rounded-lg`}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-semibold text-gray-800">Mục lục</h3>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Đóng mục lục dự án"
        >
          <X className="h-5 w-5 text-gray-600" aria-hidden="true" />
        </Button>
      </div>
      <ul className="space-y-1 text-sm">
        {iframeLink && (
          <li>
            <button
              onClick={() => handleNavClick('dashboard-iframe')}
              className="w-full rounded px-2 py-1 text-left text-blue-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Dashboard
            </button>
          </li>
        )}
        {youtubeLink && (
          <li>
            <button
              onClick={() => handleNavClick('youtube-iframe')}
              className="w-full rounded px-2 py-1 text-left text-blue-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Video
            </button>
          </li>
        )}
        {flowDiagram && nodesLength > 0 && (
          <li>
            <button
              onClick={() => handleNavClick('flow-diagram')}
              className="w-full rounded px-2 py-1 text-left text-blue-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Luồng xử lý
            </button>
          </li>
        )}
        {description && (
          <li>
            <button
              onClick={() => handleNavClick('description')}
              className="w-full rounded px-2 py-1 text-left text-blue-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Mô tả
            </button>
          </li>
        )}
        {filesLength > 0 && maxPages > 0 && (
          <li>
            <button
              onClick={() => handleNavClick('files')}
              className="w-full rounded px-2 py-1 text-left text-blue-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Tệp
            </button>
          </li>
        )}
      </ul>
    </div>
  )
}
