'use client'

import React from 'react'
import { Button } from '@/components/ui/button'

interface ProjectDescriptionViewProps {
  description: string
  isDescriptionExpanded: boolean
  setIsDescriptionExpanded: (val: boolean) => void
}

export function ProjectDescriptionView({
  description,
  isDescriptionExpanded,
  setIsDescriptionExpanded,
}: ProjectDescriptionViewProps) {
  return (
    <div id="description" className="mb-4">
      <h3 className="text-lg font-semibold mb-2">Mô tả</h3>
      <div
        className={`prose max-w-none relative ${
          isDescriptionExpanded ? '' : 'max-h-[200px] overflow-hidden'
        } transition-all duration-300`}
      >
        <div dangerouslySetInnerHTML={{ __html: description }} />
        {!isDescriptionExpanded && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        )}
      </div>
      <Button
        variant="outline"
        className="mt-2"
        onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
      >
        {isDescriptionExpanded ? 'Thu gọn' : 'Xem thêm'}
      </Button>
    </div>
  )
}
