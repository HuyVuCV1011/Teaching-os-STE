'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { Activity, ArrowUpRight, Cpu, Layers } from 'lucide-react'

// Simple animated counter for KPIs
const Counter = ({ value, suffix = '', duration = 1.5 }: { value: number; suffix?: string; duration?: number }) => {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let start = 0
    const end = value
    if (start === end) {
      setCount(end)
      return
    }

    const totalMs = duration * 1000
    const stepTime = Math.max(Math.floor(totalMs / end), 15)
    
    const timer = setInterval(() => {
      start += 1
      setCount(start)
      if (start >= end) {
        setCount(end)
        clearInterval(timer)
      }
    }, stepTime)

    return () => clearInterval(timer)
  }, [value, duration])

  return (
    <span className="font-mono font-extrabold text-3xl md:text-4xl text-slate-50">
      {count}{suffix}
    </span>
  )
}

const MetricsStack = () => {
  return (
    <section className="section py-16 bg-slate-955 border-t border-slate-850">
      <div className="container">
        
        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
          
          {/* Card 1: Interactive KPI Hub */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="md:col-span-2 bg-slate-900/40 border border-slate-800/80 p-6 rounded-3xl flex flex-col justify-between min-h-[220px] shadow-sm hover:border-slate-700/85 transition-all duration-300"
          >
            <div className="flex items-center gap-2 text-emerald-500 font-semibold text-xs uppercase tracking-widest">
              <Activity className="w-4 h-4 animate-pulse" />
              <span>Chỉ số thực chiến</span>
            </div>
            
            <div className="grid grid-cols-3 gap-4 py-4">
              <div className="flex flex-col border-r border-slate-800/65 pr-4">
                <span className="text-slate-550 text-[10px] font-bold uppercase tracking-wider mb-2">Học viên</span>
                <Counter value={500} suffix="+" />
              </div>
              <div className="flex flex-col border-r border-slate-800/65 px-4">
                <span className="text-slate-550 text-[10px] font-bold uppercase tracking-wider mb-2">Dự án DN</span>
                <Counter value={50} suffix="+" />
              </div>
              <div className="flex flex-col pl-4">
                <span className="text-slate-550 text-[10px] font-bold uppercase tracking-wider mb-2">Tối ưu HT</span>
                <Counter value={96} suffix="%" />
              </div>
            </div>

            <div className="text-[9px] text-slate-500 font-semibold font-mono uppercase tracking-wider text-right border-t border-slate-800/50 pt-2">
              KPI Hub Verified
            </div>
          </motion.div>

          {/* Card 2: Tech Stack tags */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="md:col-span-1 bg-slate-900/40 border border-slate-800/80 p-6 rounded-3xl flex flex-col justify-between min-h-[220px] shadow-sm hover:border-slate-700/85 transition-all duration-300"
          >
            <div className="flex items-center gap-2 text-indigo-500 font-semibold text-xs uppercase tracking-widest">
              <Cpu className="w-4 h-4" />
              <span>Công nghệ lõi</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 py-4">
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center gap-1.5 hover:bg-slate-850 hover:border-slate-700 transition-colors">
                <img src="/images/tools/power-bi.svg" alt="Power BI" className="w-4 h-4 shrink-0" />
                <span className="text-[9px] font-bold text-slate-100 uppercase tracking-wider">Power BI</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center gap-1.5 hover:bg-slate-850 hover:border-slate-700 transition-colors">
                <img src="/images/tools/python.svg" alt="Python" className="w-4 h-4 shrink-0" />
                <span className="text-[9px] font-bold text-slate-100 uppercase tracking-wider">Python</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center gap-1.5 hover:bg-slate-850 hover:border-slate-700 transition-colors">
                <img src="/images/tools/excel.svg" alt="Excel" className="w-4 h-4 shrink-0" />
                <span className="text-[9px] font-bold text-slate-100 uppercase tracking-wider">Excel</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center gap-1.5 hover:bg-slate-850 hover:border-slate-700 transition-colors">
                <img src="/images/tools/sql.svg" alt="SQL" className="w-4 h-4 shrink-0" />
                <span className="text-[9px] font-bold text-slate-100 uppercase tracking-wider">SQL</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-550 leading-tight">
              Công cụ tự động hóa & phân tích dữ liệu chuyên nghiệp.
            </div>
          </motion.div>

          {/* Card 3: Classroom Gateway */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="md:col-span-1 bg-gradient-to-br from-blue-600/5 to-indigo-600/5 border border-blue-500/20 p-6 rounded-3xl flex flex-col justify-between min-h-[220px] shadow-sm hover:border-blue-500/30 hover:shadow-[0_0_15px_rgba(37,99,235,0.08)] transition-all duration-300"
          >
            <div className="flex items-center gap-2 text-blue-600 font-semibold text-xs uppercase tracking-widest">
              <Layers className="w-4 h-4 text-blue-500" />
              <span>Học viện STE</span>
            </div>

            <div className="py-2">
              <h4 className="font-bold text-xs text-slate-100">Khóa Học Vận Hành</h4>
              <p className="text-slate-550 text-[10px] leading-relaxed mt-1">
                Khai thác SQL, Python, Power BI ứng dụng thực tế.
              </p>
            </div>

            <a
              href="/learn"
              className="w-full py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10"
            >
              <span>Vào lớp học</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </motion.div>

        </div>

      </div>
    </section>
  )
}

export default MetricsStack
