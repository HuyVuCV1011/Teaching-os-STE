'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { getSupabaseFetchErrorMessage } from '@/lib/error-messages'
import { getAdminDashboardStatsAction } from './actions'
import {
  BookOpen,
  Users,
  GraduationCap,
  FolderOpen,
  ArrowRight,
  TrendingUp,
  Plus,
  AlertCircle,
} from 'lucide-react'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    coursesCount: 0,
    classesCount: 0,
    submissionsPending: 0,
    subjectsCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [errorState, setErrorState] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setErrorState(null)

    try {
      const result = await getAdminDashboardStatsAction()
      if (!result.success) throw new Error(result.error)
      setStats(result.data)
    } catch (err) {
      const message = getSupabaseFetchErrorMessage(err, 'Không thể tải số liệu vận hành.')
      console.warn('Unable to fetch dashboard statistics:', message)
      setErrorState(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const cards = [
    {
      title: 'Nhóm môn học',
      description: 'Tổ chức các lĩnh vực và lộ trình học.',
      count: stats.subjectsCount,
      href: '/admin/library?tab=subjects',
      icon: FolderOpen,
      color: 'border-slate-700 text-blue-600',
    },
    {
      title: 'Danh mục khóa học',
      description: 'Quản lý đề cương, học phần và bài học.',
      count: stats.coursesCount,
      href: '/admin/library?tab=courses',
      icon: BookOpen,
      color: 'border-slate-700 text-blue-600',
    },
    {
      title: 'Lớp đang vận hành',
      description: 'Quản lý học viên, mã lớp và lịch phát hành.',
      count: stats.classesCount,
      href: '/admin/classes',
      icon: Users,
      color: 'border-slate-700 text-blue-600',
    },
    {
      title: 'Bài đang chờ chấm',
      description: 'Đánh giá bài nộp theo rubric của môn học.',
      count: stats.submissionsPending,
      href: '/admin/grading',
      icon: GraduationCap,
      color: 'border-slate-700 text-blue-600',
    },
  ]

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {errorState && (
        <div className="flex flex-col gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
            <div>
              <p className="text-sm font-semibold text-slate-100">Không thể tải số liệu dashboard</p>
              <p className="mt-1 text-xs text-slate-500">{errorState}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchStats}
            className="rounded-lg border border-rose-500/30 px-3 py-2 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-500/10"
          >
            Thử lại
          </button>
        </div>
      )}
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 p-6 shadow-sm sm:p-8">
        <div className="relative z-10 space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">
            Tổng quan giảng dạy
          </h1>
          <p className="text-slate-400 max-w-xl text-sm">
            Theo dõi lớp học, nội dung và các bài nộp cần xử lý trong một không gian thống nhất.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => (
          <div
            key={idx}
            className={`border rounded-2xl bg-slate-950 ${card.color} p-6 flex flex-col justify-between hover:border-slate-500 hover:shadow-sm transition-colors duration-200 group relative`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <card.icon className="w-5 h-5" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Tổng
                </span>
              </div>
              <div>
                {loading ? (
                  <div className="h-9 w-12 bg-slate-800 rounded animate-pulse" />
                ) : (
                  <span className="text-3xl font-extrabold text-slate-100">{card.count}</span>
                )}
                <h3 className="font-bold text-slate-200 mt-2">{card.title}</h3>
                <p className="text-xs text-slate-400 mt-1">{card.description}</p>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/20 flex justify-end">
              <Link
                href={card.href}
                className="text-xs font-semibold flex items-center gap-1 hover:text-slate-100 transition-colors"
              >
                <span>Mở quản lý</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 motion-reduce:transform-none transition-transform" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Admin Quick Action Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Core Actions */}
        <div className="lg:col-span-2 border border-slate-700 bg-slate-900/20 rounded-2xl p-6 space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            Thao tác nhanh
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/admin/library?tab=courses&action=new"
              className="p-4 rounded-xl border border-slate-500 hover:border-slate-400 bg-slate-950/40 hover:bg-slate-800/10 transition-colors flex items-start gap-3 group"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-slate-200 group-hover:text-slate-100">Tạo khóa học mới</h4>
                <p className="text-xs text-slate-500 mt-0.5">Soạn đề cương và thêm các học phần.</p>
              </div>
            </Link>

            <Link
              href="/admin/classes?action=new"
              className="p-4 rounded-xl border border-slate-500 hover:border-slate-400 bg-slate-950/40 hover:bg-slate-800/10 transition-colors flex items-start gap-3 group"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-slate-200 group-hover:text-slate-100">Thiết lập lớp học</h4>
                <p className="text-xs text-slate-500 mt-0.5">Cấp mã lớp, thêm học viên và đặt lịch.</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Operational priorities */}
        <div className="border border-slate-700 bg-slate-900/20 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">Việc cần xử lý</h2>
          <div className="space-y-3.5">
            <Link href="/admin/grading" className="flex items-center justify-between rounded-lg p-2 text-xs transition-colors hover:bg-slate-900">
              <span className="text-slate-400">Bài chờ chấm</span>
              <span className="font-semibold text-slate-200">{loading ? '…' : stats.submissionsPending}</span>
            </Link>
            <Link href="/admin/classes" className="flex items-center justify-between rounded-lg p-2 text-xs transition-colors hover:bg-slate-900">
              <span className="text-slate-400">Lớp đang quản lý</span>
              <span className="font-semibold text-slate-200">{loading ? '…' : stats.classesCount}</span>
            </Link>
            <Link href="/admin/library?tab=courses" className="flex items-center justify-between rounded-lg p-2 text-xs transition-colors hover:bg-slate-900">
              <span className="text-slate-400">Khóa học trong thư viện</span>
              <span className="font-semibold text-slate-200">{loading ? '…' : stats.coursesCount}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
