'use client'

import React, { useEffect, useState } from 'react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'

export default function ZenModeToggle() {
  const [isZen, setIsZen] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('zen_mode') === 'true'
    setIsZen(saved)
  }, [])

  const handleToggle = () => {
    const nextState = !isZen
    setIsZen(nextState)
    localStorage.setItem('zen_mode', String(nextState))
    
    // Dispatch custom event for other components to synchronize
    const event = new CustomEvent('toggle-zen-mode', { detail: nextState })
    window.dispatchEvent(event)
  }

  return (
    <button
      onClick={handleToggle}
      className={`p-2 rounded-lg border transition-all cursor-pointer shadow-sm flex items-center justify-center ${
        isZen 
          ? 'bg-blue-600/10 border-blue-500/30 text-blue-600 hover:bg-blue-600/20' 
          : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-100 hover:border-slate-600'
      }`}
      title={isZen ? 'Thoát Chế độ tập trung (Zen Mode)' : 'Chế độ tập trung (Zen Mode)'}
    >
      {isZen ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
    </button>
  )
}
